import mongoose from 'mongoose';
import crypto from 'crypto';
import {
  getAuthToken,
  signStkPushRequest,
  signPgwCheckoutRequest,
  signReference,
  JENGA_STK_PUSH_URL,
  JENGA_PGW_CHECKOUT_URL,
  getTransactionDetailsUrl,
  requireEnv,
} from '../config/jenga.js';
import axios from 'axios';
import JengaPayment from '../models/jengaPayment.model.js';
import OrderModel from '../models/order.model.js';
import ProductModel from '../models/product.model.js';
import CartProductModel from '../models/cartproduct.model.js';
import UserModel from '../models/user.model.js';
import AddressModel from '../models/address.model.js';
import NotificationModel from '../models/notification.model.js';
import DeliveryZoneModel from '../models/deliveryzone.model.js';
import SaccoOperatorModel from '../models/saccooperator.model.js';
import { normalizeKenyanPhone, isValidAmount, amountsMatch } from '../utils/jengaValidation.js';
import {
  DEFAULT_DELIVERY_CHARGE,
  extractCoordinatesFromPayload,
  getCbdFootDeliveryStatus,
  getDeliveryModeFromPayload,
  isBikeDeliveryMode,
  SACCO_TERMINAL_DROPOFF_CHARGE,
} from '../utils/cbdDelivery.js';
import { getEffectiveUnitPrice, getWholesalePricingSettings, isWholesaleEligible } from '../utils/wholesalePricing.js';
import { reserveStockGuarded } from '../utils/stockGuard.js';

// buildValidatedOrderPricing / pricewithDiscount live in order.controller.js but
// aren't exported there — re-derive the pieces this controller needs directly
// against ProductModel to keep this module self-contained.
const roundMoney = (amount = 0) => Number(Number(amount || 0).toFixed(2));

// Jenga's account-based settlement flow has no status-query API and doesn't
// document a signature on its inbound callback (unlike Stripe-style HMAC
// webhooks) — so orderReference alone (client-visible, needed for polling)
// isn't enough to trust a callback. Appending a shared secret to the
// callBackUrl we register per-request means a forged callback also needs to
// know this value, which never reaches the client. Optional but strongly
// recommended: set JENGA_CALLBACK_SECRET in the environment.
let warnedMissingJengaCallbackSecret = false;
const buildJengaCallbackUrl = (baseUrl) => {
  const secret = process.env.JENGA_CALLBACK_SECRET;
  if (!secret) {
    if (!warnedMissingJengaCallbackSecret) {
      console.warn('JENGA_CALLBACK_SECRET is not set — Jenga payment callbacks are unauthenticated. Set this env var to harden against forged "payment successful" callbacks.');
      warnedMissingJengaCallbackSecret = true;
    }
    return baseUrl;
  }
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}token=${encodeURIComponent(secret)}`;
};

// Mirrors pricewithDiscount() in order.controller.js — this module doesn't
// apply royal loyalty discounts (Jenga checkout runs before that lookup), so
// the signature only takes price/discount.
const pricewithDiscount = (price, dis = 0) => {
  const basePrice = Number(price || 0);
  const productDiscount = Math.max(0, Number(dis || 0));
  const discountAmount = Math.round((basePrice * productDiscount) / 100);
  return Math.max(0, basePrice - discountAmount);
};

// Jenga's stkussdpush/initiate docs cap payment.ref at 6 alphanumeric
// characters ("For now we support up to 6 alphanumeric characters length but
// will later update to more characters") — UAT did not enforce this against
// a longer reference, but production is expected to, so this must stay <= 6.
const ORDER_REFERENCE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const ORDER_REFERENCE_LENGTH = 6;
// PGW checkout requires an alphanumeric merchant reference of at least eight
// characters. Keep the M-Pesa reference at Jenga's documented six-character
// limit, while generating a longer reference for card checkout.
const PGW_ORDER_REFERENCE_LENGTH = 12;
const buildOrderReference = (length = ORDER_REFERENCE_LENGTH) => {
  const bytes = crypto.randomBytes(length);
  let ref = '';
  for (let i = 0; i < length; i++) {
    ref += ORDER_REFERENCE_CHARS[bytes[i] % ORDER_REFERENCE_CHARS.length];
  }
  return ref;
};

// 6 alphanumeric characters is a small enough space (36^6) that collisions
// are plausible at scale, and Jenga itself rejects a duplicate ref with a
// 400 — so claim a reference that isn't already in use before it's written
// to any record.
const claimOrderReference = async (length = ORDER_REFERENCE_LENGTH) => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = buildOrderReference(length);
    const exists = await JengaPayment.exists({ orderReference: candidate });
    if (!exists) return candidate;
  }
  const err = new Error('Could not generate a unique payment reference. Please try again.');
  err.statusCode = 500;
  throw err;
};

const priceItems = async (items) => {
  const orderItems = Array.isArray(items) ? items : [];
  if (orderItems.length === 0) {
    const err = new Error('Your cart is empty. Add items before checking out.');
    err.statusCode = 400;
    throw err;
  }

  const productIds = [...new Set(
    orderItems
      .map((item) => item?.productId?._id || item?.productId)
      .filter((id) => mongoose.Types.ObjectId.isValid(String(id)))
      .map(String)
  )];

  const products = await ProductModel.find({ _id: { $in: productIds } })
    .select('_id name image price discount wholesalePrice stock')
    .lean();
  const productsById = new Map(products.map((p) => [String(p._id), p]));

  const totalQuantity = orderItems.reduce(
    (sum, item) => sum + Math.max(0, Math.floor(Number(item?.quantity) || 0)),
    0
  );
  const wholesaleEligible = isWholesaleEligible(totalQuantity);
  const wholesaleSettings = await getWholesalePricingSettings();

  let subTotalAmt = 0;
  const normalizedItems = orderItems.map((item) => {
    const productId = item?.productId?._id || item?.productId;
    const product = productsById.get(String(productId));
    if (!product) {
      const err = new Error(`Product ${item?.name || 'in your cart'} not found`);
      err.statusCode = 404;
      throw err;
    }

    const quantity = Math.max(0, Math.floor(Number(item?.quantity) || 0));
    if (!quantity) {
      const err = new Error(`Invalid quantity for ${product.name}`);
      err.statusCode = 400;
      throw err;
    }

    if (Number(product.stock || 0) < quantity) {
      const err = new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${quantity}`);
      err.statusCode = 409;
      throw err;
    }

    const unitPrice = getEffectiveUnitPrice({
      price: product.price,
      discount: product.discount,
      wholesalePrice: product.wholesalePrice,
      wholesaleEligible,
      stackDiscounts: wholesaleSettings.stackDiscounts,
      pricewithDiscountFn: pricewithDiscount,
    });
    subTotalAmt += unitPrice * quantity;

    return { productId: product, quantity };
  });

  return { normalizedItems, subTotalAmt: roundMoney(subTotalAmt) };
};

/**
 * Shared by both the STK (M-Pesa) and Jenga PGW (card) payment paths:
 * validates fulfillment/delivery inputs, prices the cart, and creates the
 * local PENDING order rows before any request reaches Jenga. Throws an
 * Error with .statusCode (and optionally .code, matching the SACCO/delivery
 * zone error codes the client already handles) on any validation failure —
 * callers are expected to catch and translate that into the JSON response.
 * Does not touch JengaPayment — each channel creates its own record with
 * its own channel-specific fields (e.g. phoneNumber semantics differ).
 */
const buildPendingOrder = async (request, { orderReferenceLength = ORDER_REFERENCE_LENGTH } = {}) => {
  const userId = request.userId;
  const {
    list_items,
    addressId,
    fulfillment_type = 'delivery',
    pickup_location,
    pickup_instructions,
    saccoOperatorId,
    saccoDestinationTown,
  } = request.body;

  const deliveryMode = getDeliveryModeFromPayload(request.body);
  const customerLocation = extractCoordinatesFromPayload(request.body);

  if (fulfillment_type === 'delivery' && !addressId) {
    const err = new Error('Delivery address is required for delivery orders');
    err.statusCode = 400;
    throw err;
  }
  if (fulfillment_type === 'pickup' && !pickup_location) {
    const err = new Error('Pickup location is required for pickup orders');
    err.statusCode = 400;
    throw err;
  }

  let saccoOperator = null;
  if (fulfillment_type === 'sacco_pickup') {
    if (!saccoOperatorId || !mongoose.Types.ObjectId.isValid(String(saccoOperatorId)) || !saccoDestinationTown) {
      const err = new Error('Please select a SACCO/coach operator and destination town');
      err.statusCode = 400;
      err.code = 'INVALID_SACCO_OPERATOR';
      throw err;
    }
    saccoOperator = await SaccoOperatorModel.findOne({ _id: saccoOperatorId, isActive: true });
    if (!saccoOperator) {
      const err = new Error('Selected operator is no longer available. Please pick another.');
      err.statusCode = 400;
      err.code = 'INVALID_SACCO_OPERATOR';
      throw err;
    }
  }

  if (fulfillment_type === 'delivery' && deliveryMode === 'foot') {
    const cbdStatus = getCbdFootDeliveryStatus(customerLocation);
    if (!cbdStatus.allowed) {
      const message = cbdStatus.reason === 'outside_cbd'
        ? `Foot delivery is only available within Nairobi CBD (${cbdStatus.radiusKm}km radius). Your selected location is ${Number(cbdStatus.distanceKm || 0).toFixed(2)}km away.`
        : 'Please enable location and pin your delivery point within Nairobi CBD.';
      const err = new Error(message);
      err.statusCode = 400;
      err.code = 'DELIVERY_OUTSIDE_CBD';
      throw err;
    }
  }

  let deliveryZone = null;
  if (fulfillment_type === 'delivery' && isBikeDeliveryMode(deliveryMode)) {
    const zoneId = request.body.deliveryZoneId;
    if (!zoneId || !mongoose.Types.ObjectId.isValid(String(zoneId))) {
      const err = new Error('Please select a delivery zone for bike delivery.');
      err.statusCode = 400;
      err.code = 'INVALID_DELIVERY_ZONE';
      throw err;
    }
    deliveryZone = await DeliveryZoneModel.findOne({ _id: zoneId, isActive: true });
    if (!deliveryZone) {
      const err = new Error('Selected delivery zone is no longer available. Please pick another zone.');
      err.statusCode = 400;
      err.code = 'INVALID_DELIVERY_ZONE';
      throw err;
    }
  }

  const { normalizedItems, subTotalAmt } = await priceItems(list_items);
  // Never trust a client-supplied deliveryCharge — recompute from the
  // authoritative zone fare or the flat default, same as the other
  // order-creation paths in order.controller.js.
  const deliveryCharge = fulfillment_type === 'delivery'
    ? (deliveryZone ? deliveryZone.fare : DEFAULT_DELIVERY_CHARGE)
    : fulfillment_type === 'sacco_pickup'
      ? SACCO_TERMINAL_DROPOFF_CHARGE
      : 0;
  const totalAmt = roundMoney(subTotalAmt + deliveryCharge);

  if (!isValidAmount(totalAmt)) {
    const err = new Error('Order amount is invalid');
    err.statusCode = 400;
    throw err;
  }

  const orderReference = await claimOrderReference(orderReferenceLength);
  const sharedOrderId = `ORD-${new mongoose.Types.ObjectId()}`;

  // Create the local pending order BEFORE contacting Jenga.
  const orderPayload = normalizedItems.map((item) => ({
    userId,
    orderId: sharedOrderId,
    productId: item.productId._id,
    product_details: { name: item.productId.name, image: item.productId.image },
    quantity: item.quantity,
    paymentId: orderReference,
    payment_status: 'PENDING',
    delivery_address: fulfillment_type === 'delivery' ? addressId : null,
    fulfillment_type,
    delivery_mode: deliveryMode || 'standard',
    delivery_zone: deliveryZone ? deliveryZone._id : undefined,
    delivery_zone_name: deliveryZone ? deliveryZone.name : '',
    delivery_zone_fare: deliveryZone ? deliveryZone.fare : undefined,
    customer_location: customerLocation || undefined,
    deliveryInstructions: request.body.deliveryInstructions || '',
    pickup_location: pickup_location || '',
    pickup_instructions: pickup_instructions || '',
    sacco_operator: saccoOperator ? saccoOperator._id : undefined,
    sacco_operator_name: saccoOperator ? saccoOperator.name : '',
    sacco_destination_town: fulfillment_type === 'sacco_pickup' ? saccoDestinationTown : '',
    subTotalAmt,
    deliveryCharge,
    totalAmt,
  }));

  await OrderModel.insertMany(orderPayload);

  return { orderReference, sharedOrderId, totalAmt, fulfillment_type };
};

/**
 * POST /api/jenga/pay
 * Authenticated. Validates phone/amount, creates a PENDING order + payment
 * record locally, then initiates the Jenga STK push. Order is not finalized
 * and stock is not touched here — only after verified payment.
 */
export const initiateJengaPayment = async (request, response) => {
  try {
    const userId = request.userId;
    const { phoneNumber } = request.body;

    const normalizedPhone = normalizeKenyanPhone(phoneNumber);
    if (!normalizedPhone) {
      return response.status(400).json({
        message: 'Enter a valid Kenyan phone number (e.g. 07XXXXXXXX or 2547XXXXXXXX).',
        error: true,
        success: false,
      });
    }

    const { orderReference, sharedOrderId, totalAmt } = await buildPendingOrder(request);

    await JengaPayment.create({
      orderReference,
      orderId: sharedOrderId,
      userId,
      channel: 'mpesa',
      phoneNumber: normalizedPhone,
      amount: totalAmt,
      currency: 'KES',
      status: 'pending',
    });

    try {
      const merchantAccountNumber = requireEnv('JENGA_ACCOUNT_NUMBER');
      const merchantName = requireEnv('JENGA_MERCHANT_NAME');
      const callbackUrl = buildJengaCallbackUrl(requireEnv('JENGA_CALLBACK_URL'));

      const token = await getAuthToken();
      const signature = signStkPushRequest({
        accountNumber: merchantAccountNumber,
        ref: orderReference,
        mobileNumber: normalizedPhone,
        telco: 'Safaricom',
        amount: totalAmt.toFixed(2),
        currency: 'KES',
      });

      const today = new Date().toISOString().slice(0, 10);

      const jengaResponse = await axios.post(
        JENGA_STK_PUSH_URL,
        {
          merchant: {
            accountNumber: merchantAccountNumber,
            countryCode: 'KE',
            name: merchantName,
          },
          payment: {
            ref: orderReference,
            mobileNumber: normalizedPhone,
            telco: 'Safaricom',
            amount: totalAmt.toFixed(2),
            currency: 'KES',
            date: today,
            callBackUrl: callbackUrl,
            pushType: 'STK',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Signature: signature,
          },
          timeout: 15000,
        }
      );

      // Jenga acknowledges a failed push initiation with HTTP 200 too (e.g.
      // code 106201 "push initiation failed") — axios only throws on
      // non-2xx, so a failure here must be caught explicitly or the customer
      // is told to expect an STK prompt that will never arrive.
      if (jengaResponse.data?.status !== true) {
        const err = new Error(jengaResponse.data?.message || 'Could not start the M-Pesa payment. Please try again.');
        err.statusCode = 502;
        throw err;
      }

      return response.status(200).json({
        success: true,
        message: 'Payment request sent. Approve the STK prompt on your phone.',
        data: { orderReference, orderId: sharedOrderId, status: 'pending', jenga: jengaResponse.data },
      });
    } catch (jengaError) {
      // The STK push was never actually sent — don't leave behind a PENDING
      // order/payment that can never resolve (no callback will ever arrive
      // for a request Jenga never processed).
      await OrderModel.deleteMany({ orderId: sharedOrderId });
      await JengaPayment.deleteOne({ orderReference });
      throw jengaError;
    }
  } catch (error) {
    console.error('Jenga initiate error:', error?.response?.data || error.message);
    const message =
      error?.response?.data?.message ||
      error?.message ||
      'Failed to start M-Pesa payment';
    return response.status(error.statusCode || 500).json({ success: false, error: true, message, code: error.code });
  }
};

// Jenga's PGW checkout form docs don't publish a fixed enum for productType —
// it renders as a free-text merchant-supplied label in every example. Kept
// as a constant so it's one place to fix if a live UAT submission rejects it.
const JENGA_PGW_PRODUCT_TYPE = 'General';
// Jenga's checkout reference expresses this duration with the `mins` suffix
// (for example, `15mins`). Use the same documented format rather than a bare
// number that the hosted form could reject.
const JENGA_PGW_PAYMENT_TIME_LIMIT = '30mins';
const JENGA_PGW_DEFAULT_COUNTRY_CODE = 'KE';
const JENGA_PGW_DEFAULT_POSTAL_CODE = '00100';

/**
 * POST /api/jenga/card/pay
 * Authenticated. Creates the same kind of PENDING order as the M-Pesa path,
 * then returns the fields for Jenga PGW's hosted Web Checkout Form. The
 * client builds a hidden form from these fields and submits it, which
 * navigates the browser to Jenga's hosted page to collect the card —
 * raw card numbers never touch this server.
 */
export const initiateJengaCardPayment = async (request, response) => {
  let orderReference;
  let sharedOrderId;
  try {
    if (!JENGA_PGW_CHECKOUT_URL) {
      const err = new Error('Card payments are not configured yet. Please pay with M-Pesa instead.');
      err.statusCode = 503;
      throw err;
    }

    const userId = request.userId;
    const built = await buildPendingOrder(request, { orderReferenceLength: PGW_ORDER_REFERENCE_LENGTH });
    orderReference = built.orderReference;
    sharedOrderId = built.sharedOrderId;
    const { totalAmt, fulfillment_type } = built;

    const user = await UserModel.findById(userId).select('name email mobile').lean();
    const [firstName, ...lastNameParts] = String(user?.name || 'Customer').trim().split(/\s+/);
    const lastName = lastNameParts.join(' ') || firstName;

    let customerAddress = 'Nairobi';
    let customerPostalCodeZip = JENGA_PGW_DEFAULT_POSTAL_CODE;
    if (fulfillment_type === 'delivery' && request.body.addressId) {
      const address = await AddressModel.findById(request.body.addressId).select('address_line city pincode').lean();
      if (address) {
        customerAddress = address.address_line || address.city || customerAddress;
        customerPostalCodeZip = address.pincode || customerPostalCodeZip;
      }
    }

    await JengaPayment.create({
      orderReference,
      orderId: sharedOrderId,
      userId,
      channel: 'card',
      phoneNumber: user?.mobile ? String(user.mobile) : '',
      amount: totalAmt,
      currency: 'KES',
      status: 'pending',
    });

    const merchantCode = requireEnv('JENGA_MERCHANT_CODE');
    // The checkout fields are browser-visible while the form is submitted.
    // Do not append a private callback token here: it would be exposed to the
    // customer. The card callback is instead safe because it only triggers a
    // server-side, RSA-signed transaction-status query before finalization.
    const callbackUrl = requireEnv('JENGA_CARD_CALLBACK_URL');
    const token = await getAuthToken();
    const orderAmount = totalAmt.toFixed(2);

    return response.status(200).json({
      success: true,
      data: {
        orderReference,
        orderId: sharedOrderId,
        checkoutUrl: JENGA_PGW_CHECKOUT_URL,
        fields: {
          token,
          merchantCode,
          currency: 'KES',
          orderAmount,
          orderReference,
          productType: JENGA_PGW_PRODUCT_TYPE,
          productDescription: `Nawiri Hair order ${sharedOrderId}`,
          paymentTimeLimit: JENGA_PGW_PAYMENT_TIME_LIMIT,
          customerFirstName: firstName || 'Customer',
          customerLastName: lastName || 'Customer',
          customerEmail: user?.email || '',
          customerPhone: user?.mobile ? String(user.mobile) : '',
          customerAddress,
          customerPostalCodeZip,
          countryCode: JENGA_PGW_DEFAULT_COUNTRY_CODE,
          callbackUrl,
          signature: signPgwCheckoutRequest({
            merchantCode,
            orderReference,
            currency: 'KES',
            orderAmount,
            callbackUrl,
          }),
        },
      },
    });
  } catch (error) {
    // Nothing was ever sent to Jenga (the browser form POST is what starts
    // the checkout, not this call) — but if we got as far as creating the
    // pending order/payment before failing, don't leave it behind.
    if (sharedOrderId) await OrderModel.deleteMany({ orderId: sharedOrderId });
    if (orderReference) await JengaPayment.deleteOne({ orderReference });

    console.error('Jenga card initiate error:', error?.response?.data || error.message);
    const message =
      error?.response?.data?.message ||
      error?.message ||
      'Failed to start card payment';
    return response.status(error.statusCode || 500).json({ success: false, error: true, message, code: error.code });
  }
};

// Account-based settlement has no dedicated STK status-query endpoint — Jenga's
// own docs say to "await final transaction status on callback". The callback
// body is therefore authoritative for this flow, but every field we rely on
// (reference, amount, status/code) is still validated strictly below.
//
// Documented codes (developer.jengahq.io, account-based settlement callback):
//   0  PENDING            "Request pending to be processed"
//   1  FAILED             "Transaction Failed due to various reasons"
//   2  AWAITING_SETTLEMENT "Transaction Successful - Awaiting Third Party Settlement"
//   3  COMPLETED          "Transaction completed successfully and credited to merchant"
//   4  AWAITING_SETTLEMENT "Transaction was successful, But failed to credit merchant account"
//   5  CANCELLED          "Transaction was Cancelled, E.g by user"
//   6  CANCELLED          "Transaction was Cancelled"
//   7  REJECTED           "Transaction rejected due to validation errors"
//
// Note: an earlier version of this mapping treated code 6 as "expired" based
// on a single observed message string ("No response from user.") without
// checking Jenga's documented code table — that message text does not
// determine the code's general meaning, and code 6 is documented as
// "Cancelled". Fixed after live testing showed real PAID transactions (code
// 3, status: true) were never being recognized because this function only
// checked for code === 0.
const JENGA_SUCCESS_CODES = new Set([3]);
const JENGA_AWAITING_SETTLEMENT_CODES = new Set([2, 4]);
const JENGA_CANCELLED_CODES = new Set([5, 6]);
const JENGA_REJECTED_CODES = new Set([1, 7]);

const mapJengaCallbackToLocal = (callbackData) => {
  const success = callbackData?.status === true;
  const code = Number(callbackData?.code);

  if (success && JENGA_SUCCESS_CODES.has(code)) return 'paid';
  // Successful debit but merchant settlement is still pending/failed on
  // Jenga's side — not yet safe to treat as paid; keep polling.
  if (JENGA_AWAITING_SETTLEMENT_CODES.has(code)) return 'pending';
  if (JENGA_CANCELLED_CODES.has(code)) return 'cancelled';
  if (JENGA_REJECTED_CODES.has(code) || !success) return 'failed';
  return 'unknown';
};

// State codes documented for the Query Transaction Details API (used by the
// card/PGW flow, which — unlike account-based STK — has a real status-query
// endpoint): 2 = Success, 1 = Failed, -1 = Awaiting callback response.
const mapTxnDetailsToLocal = (txn) => {
  const stateCode = Number(txn?.stateCode);
  if (stateCode === 2) return 'paid';
  if (stateCode === 1) return 'failed';
  // -1 (awaiting) and anything undocumented: fail closed, stay pending.
  return 'pending';
};

/**
 * Finalizes a payment exactly once: marks the order PAID and decrements stock,
 * guarded by an atomic findOneAndUpdate on finalizedAt so duplicate callers
 * (callback + poll, or repeated callbacks) can't double-finalize.
 */
const finalizePaidOrder = async (paymentDoc) => {
  const claimed = await JengaPayment.findOneAndUpdate(
    { _id: paymentDoc._id, finalizedAt: { $exists: false } },
    { $set: { finalizedAt: new Date() } },
    { new: true }
  );

  if (!claimed) {
    // Already finalized by a concurrent callback/poll — nothing more to do.
    return;
  }

  const orders = await OrderModel.find({ orderId: paymentDoc.orderId });

  // Atomically reserve (decrement) stock for every line of the paid order,
  // guarded so no product can ever be driven below zero by the finalization
  // of this payment. Pre-validated at payment time, but a concurrent sale may
  // have drained stock since — never let this decrement take stock negative.
  const reserved = await reserveStockGuarded(
    orders.map((order) => ({
      id: order.productId,
      quantity: order.quantity || 1,
      label: (order.product_details?.name) || 'product',
    }))
  );

  if (!reserved.ok) {
    // A verified, paid order we can no longer fully fulfill. Leave stock
    // untouched and flag the order for manual attention instead of booking a
    // phantom decrement that would drive a product below zero.
    console.error(
      `[JENGA] Paid order ${paymentDoc.orderId} could not reserve stock: ${
        reserved.row?.label || reserved.reason || 'unknown'
      } — holding for manual resolution.`
    );
    await OrderModel.updateMany(
      { orderId: paymentDoc.orderId },
      { $set: { payment_status: 'PAID', paymentId: paymentDoc.orderReference, stockShortfall: true } }
    );
    await NotificationModel.create({
      type: 'low_stock',
      title: 'Stock Shortfall on Paid Order',
      message: `Paid order ${paymentDoc.orderId} could not be fully stocked (${reserved.product?.name || reserved.reason || ''} unavailable). Needs manual resolution.`,
      isRead: false,
      forAdmin: true,
    });
    return;
  }

  // Flag low-stock items once after the whole batch has been reserved.
  await Promise.all(reserved.lowStock.map(async ({ product: updated }) => {
    await NotificationModel.create({
      type: 'low_stock',
      title: 'Low Stock Alert',
      message: `Product "${updated.name}" is running low (${updated.stock} remaining)`,
      isRead: false,
      forAdmin: true,
    });
  }));

  await OrderModel.updateMany(
    { orderId: paymentDoc.orderId },
    { $set: { payment_status: 'PAID', paymentId: paymentDoc.orderReference } }
  );

  await CartProductModel.deleteMany({ userId: paymentDoc.userId });
  await UserModel.updateOne({ _id: paymentDoc.userId }, { shopping_cart: [] });

  await NotificationModel.create({
    type: 'order_placed',
    title: 'Order Placed Successfully',
    message: 'Your payment was received and your order is confirmed.',
    isRead: false,
    userId: paymentDoc.userId,
  });
};

const markOrderUnpaid = async (paymentDoc, localStatus) => {
  await OrderModel.updateMany(
    { orderId: paymentDoc.orderId },
    { $set: { payment_status: localStatus.toUpperCase() } }
  );
};

/**
 * Reconciles a pending payment against a normalized result from Jenga —
 * shared by both the STK callback (server/controllers/jenga.controller.js:
 * handleJengaCallback) and the card flow's status-query result
 * (handleJengaCardCallback). `normalized` is { localStatus, returnedRef,
 * returnedAmount, resultCode, resultDesc, raw } — callers are responsible
 * for mapping their channel-specific payload into that shape first, since
 * the STK callback and the Query Transaction Details response use entirely
 * different field names and status codes. Reference, amount, and status are
 * still validated strictly before anything is marked paid. Idempotent: a
 * second call once status !== 'pending' is a no-op.
 */
const reconcilePayment = async (paymentDoc, normalized) => {
  if (paymentDoc.status !== 'pending') {
    // Already resolved (paid/failed/cancelled/expired) — repeated calls are no-ops.
    return paymentDoc;
  }

  const { localStatus, returnedRef, returnedAmount, resultCode, resultDesc, raw } = normalized;

  if (localStatus === 'paid') {
    if (returnedRef && String(returnedRef) !== String(paymentDoc.orderReference)) {
      console.error(`Jenga callback reference mismatch for ${paymentDoc.orderReference}: got ${returnedRef}`);
      return paymentDoc;
    }
    if (returnedAmount != null && !amountsMatch(returnedAmount, paymentDoc.amount)) {
      console.error(`Jenga callback amount mismatch for ${paymentDoc.orderReference}: expected ${paymentDoc.amount}, got ${returnedAmount}`);
      return paymentDoc;
    }

    const updated = await JengaPayment.findOneAndUpdate(
      { _id: paymentDoc._id, status: 'pending' },
      {
        $set: {
          status: 'paid',
          verifiedAt: new Date(),
          rawCallback: raw,
        },
      },
      { new: true }
    );

    if (updated) {
      await finalizePaidOrder(updated);
    }
    return updated || paymentDoc;
  }

  if (['failed', 'cancelled', 'expired'].includes(localStatus)) {
    const updated = await JengaPayment.findOneAndUpdate(
      { _id: paymentDoc._id, status: 'pending' },
      { $set: { status: localStatus, resultCode: String(resultCode ?? ''), resultDesc, rawCallback: raw } },
      { new: true }
    );
    if (updated) {
      await markOrderUnpaid(updated, localStatus);
    }
    return updated || paymentDoc;
  }

  // Unknown/malformed status — fail closed, stay pending.
  return paymentDoc;
};

// Jenga's UAT environment has been observed to never deliver a callback for
// some genuinely paid account-based STK transactions (confirmed via real
// M-Pesa SMS receipts with no corresponding callback after 5+ minutes), while
// still delivering callbacks promptly for expired/no-response outcomes. A
// payment stuck in 'pending' past this window is reported to the client as
// 'stale' — never auto-promoted to paid/failed — so the UI stops polling and
// prompts the customer to contact support instead of waiting forever.
// Kept just under the client's 2-minute poll timeout so the client sees a
// specific 'stale' message before its own generic timeout fires.
const PENDING_STALE_AFTER_MS = 100 * 1000;

/**
 * GET /api/jenga/status/:orderReference
 * Authenticated. Polled by the checkout UI while a payment is pending. Reads
 * whatever the callback has already reconciled — this endpoint does not call
 * out to Jenga itself, since account-based settlement has no status-query API.
 */
export const getJengaPaymentStatus = async (request, response) => {
  try {
    const { orderReference } = request.params;
    if (!orderReference) {
      return response.status(400).json({ success: false, message: 'orderReference is required' });
    }

    let doc = await JengaPayment.findOne({ orderReference });
    if (!doc) {
      return response.json({ success: true, status: 'unknown' });
    }

    if (doc.userId && String(doc.userId) !== String(request.userId)) {
      return response.status(403).json({ success: false, message: 'Access denied' });
    }

    // Card payments have a real status-query API (unlike STK) — worth a
    // fresh check on every poll rather than only at the one-shot redirect
    // callback, since that's the only self-healing path this flow gets.
    if (doc.channel === 'card' && doc.status === 'pending') {
      try {
        doc = (await queryAndReconcileCardPayment(doc)) || doc;
      } catch (queryErr) {
        console.error('Jenga card status re-query error:', queryErr?.response?.data || queryErr.message);
      }
    }

    const isStale = doc.status === 'pending'
      && (Date.now() - doc.createdAt.getTime()) > PENDING_STALE_AFTER_MS;

    return response.json({
      success: true,
      status: isStale ? 'stale' : doc.status,
      resultDesc: isStale
        ? 'No confirmation received yet. If you approved the payment, contact support with your order reference.'
        : doc.resultDesc,
    });
  } catch (err) {
    console.error('Jenga status lookup error:', err);
    return response.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/jenga/callback
 * Public — Jenga calls this after the customer approves/rejects the STK
 * prompt. This is the sole source of truth for account-based settlement (no
 * separate status-query API exists for this flow), so every field we act on
 * — reference, amount, status/code — is validated strictly in reconcilePayment
 * before anything is marked paid or finalized.
 */
export const handleJengaCallback = async (request, response) => {
  try {
    const expectedToken = process.env.JENGA_CALLBACK_SECRET;
    if (expectedToken && request.query?.token !== expectedToken) {
      console.error('Jenga callback rejected: missing/incorrect token');
      // 200 (not 401) so a genuine misconfiguration doesn't trigger Jenga's
      // retry storm — this is logged for investigation either way.
      return response.status(200).json({ success: true });
    }

    const callbackData = request.body;
    const orderReference = callbackData?.transactionReference;

    if (!orderReference) {
      console.error('Jenga callback missing transactionReference:', callbackData);
      return response.status(200).json({ success: true });
    }

    const doc = await JengaPayment.findOne({ orderReference });
    if (!doc) {
      console.error(`Jenga callback for unknown orderReference: ${orderReference}`);
      return response.status(200).json({ success: true });
    }

    await reconcilePayment(doc, {
      localStatus: mapJengaCallbackToLocal(callbackData),
      returnedRef: callbackData?.transactionReference,
      returnedAmount: callbackData?.debitedAmount ?? callbackData?.requestAmount,
      resultCode: callbackData?.code,
      resultDesc: callbackData?.message,
      raw: callbackData,
    });

    return response.status(200).json({ success: true });
  } catch (err) {
    console.error('Jenga callback error:', err);
    // Still 200 — Jenga should not indefinitely retry on our internal errors.
    return response.status(200).json({ success: true });
  }
};

/**
 * Queries Jenga's Query Transaction Details API for a still-pending card
 * payment and reconciles the result. Shared by the redirect callback (which
 * only fires once, when the customer's browser bounces back from Jenga) and
 * the status-poll endpoint (which can retry this on the card flow's behalf
 * if that one redirect-time check hit a transient network/auth error — the
 * card flow has no second delivery mechanism the way STK's callback does).
 * No-op if the payment isn't 'pending' or isn't a card payment.
 */
const queryAndReconcileCardPayment = async (doc) => {
  if (!doc || doc.channel !== 'card' || doc.status !== 'pending') {
    return doc;
  }

  const token = await getAuthToken();
  const txnResponse = await axios.get(getTransactionDetailsUrl(doc.orderReference), {
    headers: {
      Authorization: `Bearer ${token}`,
      Signature: signReference(doc.orderReference),
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  });

  const txn = txnResponse.data?.data;
  return reconcilePayment(doc, {
    localStatus: mapTxnDetailsToLocal(txn),
    returnedRef: txn?.transactionReference,
    returnedAmount: txn?.amount,
    resultCode: txn?.code ?? txn?.stateCode,
    resultDesc: txn?.message,
    raw: txnResponse.data,
  });
};

/**
 * GET /api/jenga/card/callback
 * Public — Jenga PGW redirects the customer's browser here (not a
 * server-to-server POST) after they complete or abandon the hosted card
 * checkout. Unlike the STK flow, PGW has a real status-query endpoint
 * (Query Transaction Details), so that's treated as authoritative here
 * rather than trusting the GET query params, which are visible to and could
 * be replayed/edited by the customer's own browser. Always ends by
 * redirecting to the SPA's result page — never renders JSON, since this is
 * a browser navigation, not an API call.
 */
export const handleJengaCardCallback = async (request, response) => {
  const frontendBase = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
  const redirectTo = (status, orderReference) => {
    const url = `${frontendBase}/order/card-result?status=${encodeURIComponent(status)}${
      orderReference ? `&orderReference=${encodeURIComponent(orderReference)}` : ''
    }`;
    return response.redirect(302, url);
  };

  try {
    const orderReference = request.query?.orderReference;
    if (!orderReference) {
      console.error('Jenga card callback missing orderReference:', request.query);
      return redirectTo('error');
    }

    const doc = await JengaPayment.findOne({ orderReference });
    if (!doc) {
      console.error(`Jenga card callback for unknown orderReference: ${orderReference}`);
      return redirectTo('error');
    }

    if (doc.status !== 'pending') {
      // Already reconciled (e.g. customer hit back/refresh on Jenga's page).
      return redirectTo(doc.status, orderReference);
    }

    const updated = await queryAndReconcileCardPayment(doc);
    return redirectTo(updated.status, orderReference);
  } catch (err) {
    console.error('Jenga card callback error:', err?.response?.data || err.message);
    // The Query Transaction Details call itself failed (network/auth) —
    // leave the payment 'pending' rather than guessing; the status-poll
    // endpoint retries this same query on every poll, so a transient
    // failure here isn't the end of the road for this payment.
    return redirectTo('pending', request.query?.orderReference);
  }
};
