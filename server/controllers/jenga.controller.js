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
import CartProductModel from '../models/cartproduct.model.js';
import UserModel from '../models/user.model.js';
import AddressModel from '../models/address.model.js';
import NotificationModel from '../models/notification.model.js';
import DeliveryZoneModel from '../models/deliveryzone.model.js';
import SaccoOperatorModel from '../models/saccooperator.model.js';
import DeliveryPersonnelModel from '../models/deliverypersonnel.model.js';
import { nawiriBrand } from '../utils/brand.js';
import { normalizeKenyanPhone, isValidAmount, amountCovers } from '../utils/jengaValidation.js';
import {
  DEFAULT_DELIVERY_CHARGE,
  extractCoordinatesFromPayload,
  getCbdFootDeliveryStatus,
  getDeliveryModeFromPayload,
  isBikeDeliveryMode,
  SACCO_TERMINAL_DROPOFF_CHARGE,
} from '../utils/cbdDelivery.js';
import { reserveStockGuarded } from '../utils/stockGuard.js';
import LoyaltyCardModel from '../models/loyaltycard.model.js';
import {
  buildValidatedOrderPricing,
  redeemLoyaltyPoints,
  sendOrderLifecycleEmail,
  updateLoyaltyPoints,
} from './order.controller.js';
import { markRewardAsUsed, processOrderContribution } from './communitycampaign.controller.js';

// The request-level STK callback is protected by a URL token. Jenga's
// account-level IPN uses HTTP Basic authentication instead; both are accepted
// below because Jenga can send both notifications for one successful payment.
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

// Jenga Payment Gateway wallet-STK uses the order reference in both the order
// and payment sections. Keep the merchant reference compact and alphanumeric.
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

/**
 * Shared by both the STK (M-Pesa) and Jenga PGW (card) payment paths:
 * validates fulfillment/delivery inputs, prices the cart, and builds the
 * order rows for this checkout. The rows are NOT saved to the orders
 * collection here — callers keep them on the JengaPayment record
 * (pendingOrder) and finalizePaidOrder creates the real orders only once
 * Jenga confirms payment, so an abandoned or failed checkout never shows up
 * in My Orders, the dispatch queue or reports. Throws an Error with
 * .statusCode (and optionally .code, matching the SACCO/delivery zone error
 * codes the client already handles) on any validation failure — callers are
 * expected to catch and translate that into the JSON response.
 */
const buildPendingOrder = async (request, { orderReferenceLength = ORDER_REFERENCE_LENGTH, isGuest = false } = {}) => {
  const userId = request.userId;
  const {
    list_items,
    addressId,
    fulfillment_type = 'delivery',
    pickup_location,
    pickup_instructions,
    saccoOperatorId,
    saccoDestinationTown,
    guestEmail,
    guestPhone,
    guestShipping,
  } = request.body;

  const deliveryMode = getDeliveryModeFromPayload(request.body);
  const customerLocation = extractCoordinatesFromPayload(request.body);

  if (fulfillment_type === 'delivery' && isGuest && (!guestShipping?.address || !guestShipping?.city)) {
    const err = new Error('Delivery address is required for delivery orders');
    err.statusCode = 400;
    throw err;
  }
  if (fulfillment_type === 'delivery' && !isGuest && !addressId) {
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

  // Never trust a client-supplied deliveryCharge — recompute from the
  // authoritative zone fare or the flat default, same as the other
  // order-creation paths in order.controller.js.
  const deliveryCharge = fulfillment_type === 'delivery'
    ? (deliveryZone ? deliveryZone.fare : DEFAULT_DELIVERY_CHARGE)
    : fulfillment_type === 'sacco_pickup'
      ? SACCO_TERMINAL_DROPOFF_CHARGE
      : 0;

  // Same server-side pricing as cash orders: product/wholesale discounts,
  // the Royal card rate, a validated community reward and loyalty points —
  // so the M-Pesa amount matches the total the checkout page shows. Points
  // and the reward are only consumed once the payment is confirmed
  // (finalizePaidOrder). Guests get product/wholesale pricing only.
  const {
    normalizedItems,
    subTotalAmt,
    totalAmt,
    appliedPoints,
    communityReward,
  } = await buildValidatedOrderPricing({
    items: list_items,
    userId: isGuest ? null : userId,
    usePoints: isGuest ? false : request.body.usePoints,
    pointsUsed: isGuest ? 0 : request.body.pointsUsed,
    communityRewardId: isGuest ? null : request.body.communityRewardId,
    communityDiscountAmount: isGuest ? 0 : request.body.communityDiscountAmount,
    deliveryCharge,
  });

  if (!isValidAmount(totalAmt)) {
    const err = new Error('Order amount is invalid');
    err.statusCode = 400;
    throw err;
  }

  const orderReference = await claimOrderReference(orderReferenceLength);
  const sharedOrderId = `ORD-${new mongoose.Types.ObjectId()}`;
  // Staff release pickup orders against this code (completePickupController
  // rejects an empty one), same format as cash pickup orders.
  const pickupVerificationCode = fulfillment_type === 'pickup'
    ? crypto.randomBytes(3).toString('hex').toUpperCase()
    : '';

  const orderRows = normalizedItems.map((item) => ({
    userId: isGuest ? undefined : userId,
    isGuest,
    guestEmail: isGuest ? String(guestEmail || '').trim().toLowerCase() : undefined,
    guestPhone: isGuest ? (guestPhone || '') : undefined,
    guestShipping: isGuest ? (guestShipping || {}) : undefined,
    orderId: sharedOrderId,
    productId: item.productId._id,
    product_details: { name: item.productId.name, image: item.productId.image },
    quantity: item.quantity,
    paymentId: orderReference,
    payment_status: 'PENDING',
    delivery_address: fulfillment_type === 'delivery' && !isGuest ? addressId : null,
    fulfillment_type,
    delivery_mode: deliveryMode || 'standard',
    delivery_zone: deliveryZone ? deliveryZone._id : undefined,
    delivery_zone_name: deliveryZone ? deliveryZone.name : '',
    delivery_zone_fare: deliveryZone ? deliveryZone.fare : undefined,
    customer_location: customerLocation || undefined,
    deliveryInstructions: request.body.deliveryInstructions || '',
    pickup_location: pickup_location || '',
    pickup_instructions: pickup_instructions || '',
    pickupVerificationCode,
    sacco_operator: saccoOperator ? saccoOperator._id : undefined,
    sacco_operator_name: saccoOperator ? saccoOperator.name : '',
    sacco_destination_town: fulfillment_type === 'sacco_pickup' ? saccoDestinationTown : '',
    subTotalAmt,
    deliveryCharge,
    totalAmt,
  }));

  return {
    orderReference,
    sharedOrderId,
    totalAmt,
    fulfillment_type,
    normalizedItems,
    orderRows,
    // Kept on the JengaPayment record and consumed by finalizePaidOrder.
    redemption: { appliedPoints, communityRewardId: communityReward?._id },
  };
};

// Jenga Payment Gateway's wallet-STK API documents MSISDN values in Kenyan
// local format (07XXXXXXXX). The checkout accepts either local or 254-prefixed
// values, so normalize once then convert only for this provider request.
const toJengaWalletMsisdn = (normalizedPhone) =>
  normalizedPhone.startsWith('254') ? `0${normalizedPhone.slice(3)}` : normalizedPhone;

const resolveJengaWalletCustomer = async (request, { isGuest, userId, normalizedPhone }) => {
  if (isGuest) {
    const shipping = request.body.guestShipping || {};
    const name = String(
      shipping.name || shipping.recipientName ||
      `${shipping.firstName || ''} ${shipping.lastName || ''}`.trim() ||
      'Guest Customer'
    ).trim();
    const email = String(request.body.guestEmail || '').trim();
    if (!email) {
      const err = new Error('Guest email is required for M-Pesa checkout.');
      err.statusCode = 400;
      throw err;
    }
    return { name, email, phoneNumber: toJengaWalletMsisdn(normalizedPhone) };
  }

  const user = await UserModel.findById(userId).select('name email').lean();
  if (!user?.email) {
    const err = new Error('Your account needs an email address before starting an M-Pesa payment.');
    err.statusCode = 400;
    throw err;
  }
  return {
    name: String(user.name || 'Customer').trim() || 'Customer',
    email: String(user.email).trim(),
    phoneNumber: toJengaWalletMsisdn(normalizedPhone),
  };
};

/**
 * Shared by both the authenticated and guest M-Pesa STK entry points:
 * validates the phone number, builds the PENDING order (guest or authenticated
 * per `isGuest`), and initiates the Jenga Payment Gateway wallet-STK push.
 * Order is not finalized and stock is not touched here — only after verified payment.
 */
const performJengaStkInitiate = async (request, response, { isGuest = false } = {}) => {
  try {
    const userId = isGuest ? undefined : request.userId;
    const { phoneNumber } = request.body;

    const normalizedPhone = normalizeKenyanPhone(phoneNumber);
    if (!normalizedPhone) {
      return response.status(400).json({
        message: 'Enter a valid Kenyan phone number (e.g. 07XXXXXXXX or 2547XXXXXXXX).',
        error: true,
        success: false,
      });
    }

    const customer = await resolveJengaWalletCustomer(request, {
      isGuest,
      userId,
      normalizedPhone,
    });

    const { orderReference, sharedOrderId, totalAmt, orderRows, redemption } = await buildPendingOrder(request, { isGuest });

    await JengaPayment.create({
      orderReference,
      orderId: sharedOrderId,
      userId,
      channel: 'mpesa',
      phoneNumber: normalizedPhone,
      amount: totalAmt,
      currency: 'KES',
      status: 'pending',
      pendingOrder: orderRows,
      ...redemption,
    });

    try {
      const callbackUrl = buildJengaCallbackUrl(requireEnv('JENGA_CALLBACK_URL'));

      const token = await getAuthToken();
      // Keep the numeric request value and the signed value identical. Jenga
      // signs the literal value sent in payment.details.paymentAmount.
      const paymentAmount = Number(totalAmt.toFixed(2));
      const signature = signStkPushRequest({
        orderReference,
        currency: 'KES',
        mobileNumber: customer.phoneNumber,
        amount: paymentAmount,
      });

      const jengaResponse = await axios.post(
        JENGA_STK_PUSH_URL,
        {
          order: {
            orderReference,
            orderAmount: paymentAmount,
            orderCurrency: 'KES',
            source: 'APICHECKOUT',
            countryCode: 'KE',
            // The wallet-STK validator rejects punctuation in this field.
            // Keep it merchant-readable while limiting it to letters/digits.
            description: `NawiriHairOrder${orderReference}`,
          },
          customer: {
            name: customer.name,
            email: customer.email,
            phoneNumber: customer.phoneNumber,
            // Jenga documents this as required for wallet STK. Nawiri does
            // not collect national IDs at checkout, so use its documented
            // placeholder unless a caller explicitly supplies one.
            identityNumber: String(request.body.identityNumber || '0000000'),
            firstAddress: '',
            secondAddress: '',
          },
          payment: {
            paymentReference: orderReference,
            paymentCurrency: 'KES',
            channel: 'MOBILE',
            service: 'MPESA',
            provider: 'JENGA',
            callbackUrl,
            details: {
              msisdn: customer.phoneNumber,
              paymentAmount,
            },
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
        err.jengaResponse = jengaResponse.data;
        throw err;
      }

      return response.status(200).json({
        success: true,
        message: 'Payment request sent. Approve the STK prompt on your phone.',
        data: { orderReference, orderId: sharedOrderId, status: 'pending', jenga: jengaResponse.data },
      });
    } catch (jengaError) {
      // The STK push was never actually sent, so no callback will ever
      // arrive. Mark the payment record failed with Jenga's own code and
      // message (no order was created — that only happens once paid): Jenga
      // support asks for the reference, error code and timestamp of a
      // failed request.
      const jengaData = jengaError.jengaResponse || jengaError?.response?.data;
      await JengaPayment.updateOne(
        { orderReference },
        {
          $set: {
            status: 'failed',
            resultCode: String(jengaData?.code ?? ''),
            resultDesc: jengaData?.message || jengaError.message,
            initResponse: jengaData ?? null,
          },
        }
      );
      jengaError.orderReference = orderReference;
      throw jengaError;
    }
  } catch (error) {
    console.error(
      `Jenga initiate error${error.orderReference ? ` (ref ${error.orderReference})` : ''}:`,
      error.jengaResponse || error?.response?.data || error.message
    );
    const message =
      error?.response?.data?.message ||
      error?.message ||
      'Failed to start M-Pesa payment';
    return response.status(error.statusCode || 500).json({ success: false, error: true, message, code: error.code });
  }
};

/**
 * POST /api/jenga/pay
 * Authenticated.
 */
export const initiateJengaPayment = (request, response) =>
  performJengaStkInitiate(request, response, { isGuest: false });

/**
 * POST /api/jenga/guest/pay
 * Public — no account required. Same STK flow, but the PENDING order is
 * tagged isGuest with guestEmail/guestPhone/guestShipping instead of a
 * userId/addressId (see buildPendingOrder).
 */
export const initiateGuestJengaPayment = (request, response) =>
  performJengaStkInitiate(request, response, { isGuest: true });

// Jenga documents this as the product category, with Product/Service as the
// accepted values. Nawiri sells physical products, so avoid the undocumented
// "General" value previously sent to the hosted checkout.
const JENGA_PGW_PRODUCT_TYPE = 'Product';
// Jenga's checkout reference expresses this duration with the `mins` suffix
// (for example, `15mins`). Use the same documented format rather than a bare
// number that the hosted form could reject. The hosted page itself ends every
// session 15 minutes after it loads (its countdown is fixed, not driven by this
// field), which is also the lifetime of the merchant token we pass it — so
// match that rather than let Jenga's order window differ from what the
// customer sees.
const JENGA_PGW_PAYMENT_TIME_LIMIT = '15mins';
const JENGA_PGW_DEFAULT_COUNTRY_CODE = 'KE';
const JENGA_PGW_DEFAULT_POSTAL_CODE = '00100';
const JENGA_PGW_DESCRIPTION_ITEMS_SHOWN = 2;

// Shown to the customer as the "Service Description" on Jenga's hosted page
// and kept by Jenga as the order description, e.g.
// "Nawiri Hair - 2 x Deep Twist Crochet, 1 x Gogo Curls and 3 more items".
// Product names are reduced to the character set the page accepts in its
// other free-text fields (letters, digits, spaces and , . - _); anything else
// becomes a space so colour codes like "OT33/3O" don't run together.
const buildPgwProductDescription = (items) => {
  const clean = (text) => String(text || '')
    .replace(/[^a-zA-Z0-9\s,.\-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40)
    .trim();
  const listed = items
    .slice(0, JENGA_PGW_DESCRIPTION_ITEMS_SHOWN)
    .map(({ productId, quantity }) => `${quantity} x ${clean(productId?.name) || 'item'}`);
  const remaining = items.length - listed.length;
  const more = remaining > 0 ? ` and ${remaining} more item${remaining === 1 ? '' : 's'}` : '';
  return `Nawiri Hair - ${listed.join(', ')}${more}`;
};

// The signed form fields for Jenga PGW's hosted Web Checkout Form. The client
// builds a hidden form from them and submits it, which takes the browser to
// Jenga's page.
const buildPgwCheckoutFields = async ({
  orderReference,
  amount,
  productDescription,
  firstName,
  lastName,
  customerEmail,
  customerAddress,
  customerPostalCodeZip,
}) => {
  const merchantCode = requireEnv('JENGA_MERCHANT_CODE');
  // The checkout fields are browser-visible while the form is submitted.
  // Do not append a private callback token here: it would be exposed to the
  // customer. The card callback is instead safe because it only triggers a
  // server-side, RSA-signed transaction-status query before finalization.
  const callbackUrl = requireEnv('JENGA_CARD_CALLBACK_URL');
  // The hosted page uses this token for its whole session — never hand it
  // a cached one that could expire part-way through.
  const token = await getAuthToken({ fresh: true });
  // No trailing zeros ("2800", not "2800.00"). Jenga's hosted page signs its
  // M-Pesa charge lookup over this exact string but sends
  // Number(orderAmount) in the request body, so a trailing ".00" makes the
  // signed text and the body disagree. M-Pesa only takes whole shillings, so
  // String() of the rounded total is always the exact amount.
  const orderAmount = String(amount);

  return {
    token,
    merchantCode,
    currency: 'KES',
    orderAmount,
    orderReference,
    productType: JENGA_PGW_PRODUCT_TYPE,
    productDescription,
    paymentTimeLimit: JENGA_PGW_PAYMENT_TIME_LIMIT,
    customerFirstName: firstName || 'Customer',
    customerLastName: lastName || 'Customer',
    customerEmail,
    // Left blank so the customer types their own contact number on
    // Jenga's page (it is required there). The M-Pesa number that gets
    // charged is entered separately in the page's M-Pesa form.
    customerPhone: '',
    customerAddress: customerAddress || 'Nairobi',
    customerPostalCodeZip: customerPostalCodeZip || JENGA_PGW_DEFAULT_POSTAL_CODE,
    countryCode: JENGA_PGW_DEFAULT_COUNTRY_CODE,
    callbackUrl,
    signature: signPgwCheckoutRequest({
      merchantCode,
      orderReference,
      currency: 'KES',
      orderAmount,
      callbackUrl,
    }),
  };
};

// Identity and contact details for the hosted page. Guests bring their own
// from the checkout form; logged-in customers from their profile and saved
// address.
const resolvePgwCustomerDetails = async (request, { isGuest, userId, fulfillment_type }) => {
  if (isGuest) {
    const shipping = request.body.guestShipping || {};
    const name = String(
      shipping.name || shipping.recipientName ||
      `${shipping.firstName || ''} ${shipping.lastName || ''}`.trim() ||
      'Guest Customer'
    ).trim();
    const customerEmail = String(request.body.guestEmail || '').trim();
    if (!isEmailAddress(customerEmail)) {
      const err = new Error('Enter a valid email address before paying with M-Pesa.');
      err.statusCode = 400;
      throw err;
    }
    const [firstName, ...lastNameParts] = name.split(/\s+/);
    return {
      firstName,
      lastName: lastNameParts.join(' ') || firstName,
      customerEmail,
      customerAddress: shipping.address || shipping.city || 'Nairobi',
      customerPostalCodeZip: shipping.zipCode || JENGA_PGW_DEFAULT_POSTAL_CODE,
      phoneNumber: String(request.body.guestPhone || ''),
    };
  }

  const user = await UserModel.findById(userId).select('name email mobile').lean();
  const [firstName, ...lastNameParts] = String(user?.name || 'Customer').trim().split(/\s+/);
  const lastName = lastNameParts.join(' ') || firstName;
  const customerEmail = String(user?.email || '').trim();
  if (!isEmailAddress(customerEmail)) {
    const err = new Error('Add a valid email address to your profile before paying with M-Pesa.');
    err.statusCode = 400;
    throw err;
  }

  let customerAddress = 'Nairobi';
  let customerPostalCodeZip = JENGA_PGW_DEFAULT_POSTAL_CODE;
  if (fulfillment_type === 'delivery' && request.body.addressId) {
    const address = await AddressModel.findById(request.body.addressId).select('address_line city pincode').lean();
    if (address) {
      customerAddress = address.address_line || address.city || customerAddress;
      customerPostalCodeZip = address.pincode || customerPostalCodeZip;
    }
  }
  return {
    firstName,
    lastName,
    customerEmail,
    customerAddress,
    customerPostalCodeZip,
    phoneNumber: user?.mobile ? String(user.mobile) : '',
  };
};

/**
 * POST /api/jenga/checkout/pay and POST /api/jenga/guest/checkout/pay.
 * Creates the same kind of PENDING order as the M-Pesa path (tagged isGuest
 * for guests, see buildPendingOrder), then returns the fields for Jenga PGW's
 * hosted Web Checkout Form. The client builds a hidden form from these fields
 * and submits it, which navigates the browser to Jenga's hosted page. Jenga
 * then presents the merchant's active methods, including M-Pesa for Nawiri
 * Hair.
 */
const performJengaPgwInitiate = async (request, response, { isGuest = false } = {}) => {
  let orderReference;
  let sharedOrderId;
  try {
    if (!JENGA_PGW_CHECKOUT_URL) {
      const err = new Error('Secure M-Pesa checkout is not configured yet.');
      err.statusCode = 503;
      throw err;
    }

    const userId = isGuest ? undefined : request.userId;
    const built = await buildPendingOrder(request, { orderReferenceLength: PGW_ORDER_REFERENCE_LENGTH, isGuest });
    orderReference = built.orderReference;
    sharedOrderId = built.sharedOrderId;
    const { totalAmt, normalizedItems, orderRows, redemption } = built;

    const customer = await resolvePgwCustomerDetails(request, {
      isGuest,
      userId,
      fulfillment_type: built.fulfillment_type,
    });

    await JengaPayment.create({
      orderReference,
      orderId: sharedOrderId,
      userId,
      channel: 'card',
      phoneNumber: customer.phoneNumber,
      amount: totalAmt,
      currency: 'KES',
      status: 'pending',
      pendingOrder: orderRows,
      ...redemption,
    });

    const fields = await buildPgwCheckoutFields({
      orderReference,
      amount: totalAmt,
      productDescription: buildPgwProductDescription(normalizedItems),
      firstName: customer.firstName,
      lastName: customer.lastName,
      customerEmail: customer.customerEmail,
      customerAddress: customer.customerAddress,
      customerPostalCodeZip: customer.customerPostalCodeZip,
    });
    console.log(`[JENGA PGW] checkout started ref=${orderReference} amount=${fields.orderAmount} KES timeLimit=${JENGA_PGW_PAYMENT_TIME_LIMIT}${isGuest ? ' (guest)' : ''}`);

    return response.status(200).json({
      success: true,
      data: {
        orderReference,
        orderId: sharedOrderId,
        checkoutUrl: JENGA_PGW_CHECKOUT_URL,
        fields,
      },
    });
  } catch (error) {
    // Nothing was ever sent to Jenga (the browser form POST is what starts
    // the checkout, not this call) — but if we got as far as creating the
    // payment record before failing, don't leave it behind.
    if (orderReference) await JengaPayment.deleteOne({ orderReference });

    console.error('Jenga card initiate error:', error?.response?.data || error.message);
    const message =
      error?.response?.data?.message ||
      error?.message ||
      'Failed to start card payment';
    return response.status(error.statusCode || 500).json({ success: false, error: true, message, code: error.code });
  }
};

/**
 * POST /api/jenga/checkout/pay
 * Authenticated.
 */
export const initiateJengaCardPayment = (request, response) =>
  performJengaPgwInitiate(request, response, { isGuest: false });

/**
 * POST /api/jenga/guest/checkout/pay
 * Public — the same hosted checkout for guests. Jenga's wallet-STK API
 * (the previous /guest/pay rail) is not enabled for this merchant, so guests
 * pay on this page like everyone else; their PENDING order carries
 * guestEmail/guestPhone/guestShipping instead of a userId/addressId.
 */
export const initiateGuestJengaCardPayment = (request, response) =>
  performJengaPgwInitiate(request, response, { isGuest: true });

const isEmailAddress = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

/**
 * POST /api/jenga/collect  { orderId }
 * Authenticated — the rider delivering the order, or staff. Collects payment
 * for an unpaid Pay on Delivery order at the door: returns the fields for
 * Jenga's hosted checkout for the order total, which opens on the rider's
 * phone; the rider enters the customer's M-Pesa number and the customer
 * approves the prompt on theirs. Jenga's IPN then marks the order paid
 * (finalizeDeliveryCollection).
 */
export const initiateDeliveryCollection = async (request, response) => {
  let orderReference;
  try {
    if (!JENGA_PGW_CHECKOUT_URL) {
      const err = new Error('M-Pesa collection is not configured yet.');
      err.statusCode = 503;
      throw err;
    }

    const orderId = String(request.body?.orderId || '').trim();
    if (!orderId) {
      return response.status(400).json({ success: false, message: 'orderId is required' });
    }

    const rows = await OrderModel.find({ orderId }).populate('userId', 'name email mobile').lean();
    if (rows.length === 0) {
      return response.status(404).json({ success: false, message: 'Order not found' });
    }
    const first = rows[0];
    if (rows.some((row) => String(row.payment_status || '').toUpperCase() === 'PAID')) {
      return response.status(409).json({ success: false, message: 'This order is already paid.' });
    }
    if (!rows.every((row) => row.payment_status === 'CASH ON DELIVERY')) {
      return response.status(400).json({ success: false, message: 'Only Pay on Delivery orders can be collected here.' });
    }
    if (first.status === 'cancelled') {
      return response.status(400).json({ success: false, message: 'This order was cancelled.' });
    }

    // Only the rider assigned to the order, or staff, may collect for it.
    const requester = await UserModel.findById(request.userId).select('role isAdmin isStaff').lean();
    const isStaff = Boolean(requester)
      && (['admin', 'staff'].includes(requester.role) || requester.isAdmin === true || requester.isStaff === true);
    if (!isStaff) {
      const riderProfile = await DeliveryPersonnelModel.findOne({ userId: request.userId }).select('_id').lean();
      const riderIds = [String(request.userId), riderProfile ? String(riderProfile._id) : ''].filter(Boolean);
      if (!first.deliveryPersonnel || !riderIds.includes(String(first.deliveryPersonnel))) {
        return response.status(403).json({ success: false, message: 'Only the rider delivering this order can collect its payment.' });
      }
    }

    // M-Pesa only takes whole shillings.
    const amount = Math.round(Number(first.totalAmt));
    if (!isValidAmount(amount)) {
      return response.status(400).json({ success: false, message: 'This order has no valid total to collect.' });
    }

    const customer = first.userId || {};
    const customerName = customer.name
      || [first.guestShipping?.firstName, first.guestShipping?.lastName].filter(Boolean).join(' ')
      || 'Customer';
    const [firstName, ...lastNameParts] = String(customerName).trim().split(/\s+/);
    // Jenga's page needs an email; the shop's inbox stands in when the
    // customer never gave one.
    const customerEmail = [customer.email, first.guestEmail, nawiriBrand.supportEmail].find(isEmailAddress).trim();

    orderReference = await claimOrderReference(PGW_ORDER_REFERENCE_LENGTH);
    await JengaPayment.create({
      orderReference,
      orderId,
      userId: customer._id,
      requestedBy: request.userId,
      purpose: 'delivery_collection',
      channel: 'card',
      phoneNumber: String(customer.mobile || first.guestPhone || ''),
      amount,
      currency: 'KES',
      status: 'pending',
    });

    const fields = await buildPgwCheckoutFields({
      orderReference,
      amount,
      productDescription: buildPgwProductDescription(
        rows.map((row) => ({ productId: { name: row.product_details?.name }, quantity: row.quantity }))
      ),
      firstName,
      lastName: lastNameParts.join(' ') || firstName,
      customerEmail,
    });
    console.log(`[JENGA PGW] delivery collection started ref=${orderReference} order=${orderId} amount=${amount} KES`);

    return response.status(200).json({
      success: true,
      data: { orderReference, orderId, checkoutUrl: JENGA_PGW_CHECKOUT_URL, fields },
    });
  } catch (error) {
    if (orderReference) await JengaPayment.deleteOne({ orderReference });

    console.error('Jenga delivery collection error:', error?.response?.data || error.message);
    const message = error?.response?.data?.message || error?.message || 'Failed to start M-Pesa collection';
    return response.status(error.statusCode || 500).json({ success: false, error: true, message });
  }
};

// Wallet-STK Complete Callback messages expose the merchant reference in
// customer.reference and the final state in transaction.status. We only mark
// an order paid for the documented SUCCESS state; all other/unrecognized
// states fail closed as pending or failed.
const mapJengaCallbackToLocal = (callbackData) => {
  const status = String(callbackData?.transaction?.status || '').trim().toUpperCase();
  if (status === 'SUCCESS' || status === 'COMPLETED') return 'paid';
  if (['PENDING', 'PROCESSING', 'AWAITING_SETTLEMENT'].includes(status)) return 'pending';
  if (['CANCELLED', 'CANCELED'].includes(status)) return 'cancelled';
  if (['FAILED', 'REJECTED', 'DECLINED', 'EXPIRED'].includes(status)) return 'failed';
  return 'unknown';
};

// State codes documented for the Query Transaction Details API (used by the
// card/PGW flow, which has a real status-query
// endpoint): 2 = Success, 1 = Failed, -1 = Awaiting callback response.
const mapTxnDetailsToLocal = (txn) => {
  const stateCode = Number(txn?.stateCode);
  if (stateCode === 2) return 'paid';
  if (stateCode === 1) return 'failed';
  // -1 (awaiting) and anything undocumented: fail closed, stay pending.
  return 'pending';
};

// Short lock so a callback and a status poll don't both finalize one payment.
// If finalization dies part-way the lock lapses and the next one retries.
const FINALIZE_LOCK_MS = 2 * 60 * 1000;

// Order rows to create for a paid payment: the checkout's pendingOrder or —
// for an unpaid checkout voided before Jenga's confirmation arrived — the
// rows archived by scripts/one-off/voidUnpaidJengaOrders.js, stripped of the
// fulfilment state they had picked up.
const getRowsToCreate = (payment) => {
  if (Array.isArray(payment.pendingOrder) && payment.pendingOrder.length > 0) {
    return payment.pendingOrder;
  }
  if (Array.isArray(payment.archivedOrders) && payment.archivedOrders.length > 0) {
    return payment.archivedOrders.map(({
      _id, __v, createdAt, updatedAt, status, statusHistory, dispatchInfo, deliveryPersonnel, ...row
    }) => row);
  }
  return [];
};

/**
 * Finalizes a paid payment: reserves stock, creates the PAID order, then runs
 * the follow-ups (cart, loyalty, rewards, notification, email). finalizedAt is
 * only set once the order exists, so if anything before that throws, the next
 * Jenga callback or status poll retries it (reconcilePayment,
 * getJengaPaymentStatus) — a paid customer is never left without an order.
 * Also used by scripts/one-off/recoverRejectedJengaPayment.js.
 */
export const finalizePaidOrder = async (paymentDoc) => {
  const now = new Date();
  const claimed = await JengaPayment.findOneAndUpdate(
    {
      _id: paymentDoc._id,
      status: 'paid',
      finalizedAt: { $exists: false },
      $or: [
        { finalizingAt: { $exists: false } },
        { finalizingAt: { $lt: new Date(now.getTime() - FINALIZE_LOCK_MS) } },
      ],
    },
    { $set: { finalizingAt: now } },
    { new: true }
  );

  if (!claimed) {
    // Already finalized, or another callback/poll is finalizing it right now.
    return;
  }

  let orders;
  let stockShortfall = Boolean(claimed.stockShortfall);
  try {
    // Payments started before orders were deferred already have PENDING
    // rows in the orders collection — those are updated instead of created.
    orders = await OrderModel.find({ orderId: claimed.orderId });
    const rowsToCreate = orders.length === 0 ? getRowsToCreate(claimed) : [];
    const lines = orders.length > 0 ? orders : rowsToCreate;

    if (lines.length === 0) {
      console.error(`[JENGA] Paid payment ${claimed.orderReference} has no order rows to create.`);
      await NotificationModel.create({
        type: 'low_stock',
        title: 'Paid Payment Without Order',
        message: `Payment ${claimed.orderReference} (KES ${claimed.amount}) was confirmed but has no order details. Needs manual resolution.`,
        isRead: false,
        forAdmin: true,
      });
    }

    if (!claimed.stockReservedAt && lines.length > 0) {
      // Atomically reserve (decrement) stock for every line of the paid
      // order, guarded so no product can ever be driven below zero.
      // Pre-validated at payment time, but a concurrent sale may have
      // drained stock since. Recorded on the payment so a retry of this
      // function never takes the stock twice.
      const reserved = await reserveStockGuarded(
        lines.map((line) => ({
          id: line.productId,
          quantity: line.quantity || 1,
          label: (line.product_details?.name) || 'product',
        }))
      );
      stockShortfall = !reserved.ok;
      await JengaPayment.updateOne(
        { _id: claimed._id },
        { $set: { stockReservedAt: new Date(), stockShortfall } }
      );

      if (reserved.ok) {
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
      } else {
        // A verified, paid order we can no longer fully fulfill. Leave stock
        // untouched and flag the order (stockShortfall) for manual attention
        // instead of booking a phantom decrement below zero.
        console.error(
          `[JENGA] Paid order ${claimed.orderId} could not reserve stock: ${
            reserved.row?.label || reserved.reason || 'unknown'
          } — holding for manual resolution.`
        );
        await NotificationModel.create({
          type: 'low_stock',
          title: 'Stock Shortfall on Paid Order',
          message: `Paid order ${claimed.orderId} could not be fully stocked (${reserved.product?.name || reserved.reason || ''} unavailable). Needs manual resolution.`,
          isRead: false,
          forAdmin: true,
        });
      }
    }

    const paidFields = {
      payment_status: 'PAID',
      paymentId: claimed.orderReference,
      ...(stockShortfall ? { stockShortfall: true } : {}),
    };
    if (orders.length === 0) {
      orders = rowsToCreate.length > 0
        ? await OrderModel.insertMany(rowsToCreate.map((row) => ({ ...row, ...paidFields })))
        : [];
    } else {
      await OrderModel.updateMany({ orderId: claimed.orderId }, { $set: paidFields });
    }

    await JengaPayment.updateOne(
      { _id: claimed._id },
      { $set: { finalizedAt: new Date() }, $unset: { finalizingAt: 1 } }
    );
  } catch (error) {
    await JengaPayment.updateOne({ _id: claimed._id }, { $unset: { finalizingAt: 1 } });
    throw error;
  }

  // The order exists now — nothing below may undo it, so each follow-up is
  // isolated and only logged if it fails.
  await runPaidOrderFollowUps(claimed, orders, { stockShortfall });
};

const runPaidOrderFollowUps = async (payment, orders, { stockShortfall }) => {
  const first = orders[0] || {};
  const safely = async (label, task) => {
    try {
      await task();
    } catch (error) {
      console.error(`[JENGA] ${label} failed for ${payment.orderId}:`, error);
    }
  };

  let user = null;
  if (payment.userId) {
    await safely('cart clear', async () => {
      await CartProductModel.deleteMany({ userId: payment.userId });
      await UserModel.updateOne({ _id: payment.userId }, { shopping_cart: [] });
    });

    // Points and the community reward were priced into this payment at
    // checkout; consume them now that it's confirmed. Then earn points and
    // count the order toward campaigns, as cash orders do.
    if (Number(payment.appliedPoints) > 0) {
      await safely('points redemption', async () => {
        const loyaltyCard = await LoyaltyCardModel.findOne({ userId: payment.userId });
        await redeemLoyaltyPoints({ loyaltyCard, pointsToRedeem: payment.appliedPoints, orderId: payment.orderId });
      });
    }
    if (payment.communityRewardId) {
      await safely('reward redemption', () => markRewardAsUsed(payment.userId, payment.communityRewardId, payment.orderId));
    }
    await safely('loyalty points', () => updateLoyaltyPoints(payment.userId, payment.amount, payment.orderId));
    await safely('campaign contribution', () => processOrderContribution(payment.userId, payment.amount, payment.orderId));

    await safely('notification', () => NotificationModel.create({
      type: 'order_placed',
      title: stockShortfall ? 'Payment Received — Confirming Stock' : 'Order Placed Successfully',
      message: stockShortfall
        ? 'Your payment was received, but an item in your order just sold out. Our team will contact you shortly to arrange a replacement or refund.'
        : first.fulfillment_type === 'pickup' && first.pickupVerificationCode
          ? `Your payment was received and your order is confirmed. Your pickup verification code is ${first.pickupVerificationCode}.`
          : 'Your payment was received and your order is confirmed.',
      isRead: false,
      userId: payment.userId,
    }));

    await safely('user lookup', async () => {
      user = await UserModel.findById(payment.userId).select('name email').lean();
    });
  }

  const email = user?.email || first.guestEmail;
  if (!email) return;
  // Not awaited — a slow mail server must not hold up the callback response.
  sendOrderLifecycleEmail({
    user: { email, name: user?.name || first.guestShipping?.firstName || email.split('@')[0] },
    title: stockShortfall ? 'Payment received' : 'Order Confirmed!',
    intro: stockShortfall
      ? 'Your M-Pesa payment was received, but an item in your order just sold out. Our team will contact you shortly to arrange a replacement or refund.'
      : first.fulfillment_type === 'pickup'
        ? `Your M-Pesa payment was received and your order is confirmed for pickup at ${first.pickup_location || 'our store'}. Keep the verification code below ready when collecting it.`
        : 'Your M-Pesa payment was received and your order is confirmed. Our team is preparing it now.',
    orderId: payment.orderId,
    totalAmt: payment.amount,
    fulfillmentType: first.fulfillment_type || 'delivery',
    pickupLocation: first.pickup_location,
    verificationCode: first.pickupVerificationCode,
  }).catch((emailError) => {
    console.error('Error sending M-Pesa order confirmation email:', emailError);
  });
};

/**
 * Confirms a rider's collection for a Pay on Delivery order: marks the order
 * paid and tells the customer. Stock, loyalty points and the cart were all
 * settled when the order was placed, so nothing else runs. Safe to repeat.
 */
const finalizeDeliveryCollection = async (paymentDoc) => {
  await OrderModel.updateMany(
    { orderId: paymentDoc.orderId, payment_status: 'CASH ON DELIVERY' },
    { $set: { payment_status: 'PAID', paymentId: paymentDoc.orderReference } }
  );
  const claimed = await JengaPayment.findOneAndUpdate(
    { _id: paymentDoc._id, finalizedAt: { $exists: false } },
    { $set: { finalizedAt: new Date() } },
    { new: true }
  );
  if (!claimed) return; // another callback or poll already finished it

  const rows = await OrderModel.find({ orderId: claimed.orderId }).select('paymentId guestEmail guestShipping totalAmt fulfillment_type').lean();
  if (!rows.some((row) => row.paymentId === claimed.orderReference)) {
    // Paid twice (e.g. two collection attempts both approved) — the order
    // already carries another payment. Needs a refund decision by staff.
    console.error(`[JENGA] Collection ${claimed.orderReference} paid for order ${claimed.orderId}, which was already paid.`);
    await NotificationModel.create({
      type: 'payment_received',
      title: 'Order Paid Twice',
      message: `M-Pesa collection ${claimed.orderReference} (KES ${claimed.amount}) was paid for order ${claimed.orderId}, which was already paid. Check and refund if needed.`,
      isRead: false,
      forAdmin: true,
    });
    return;
  }

  let user = null;
  if (claimed.userId) {
    try {
      await NotificationModel.create({
        type: 'payment_received',
        title: 'Payment Received',
        message: `We received your M-Pesa payment of KES ${claimed.amount} for order ${claimed.orderId}. Thank you!`,
        isRead: false,
        userId: claimed.userId,
      });
      user = await UserModel.findById(claimed.userId).select('name email').lean();
    } catch (error) {
      console.error(`[JENGA] Collection notification failed for ${claimed.orderId}:`, error);
    }
  }

  const first = rows[0] || {};
  const email = user?.email || first.guestEmail;
  if (!email) return;
  sendOrderLifecycleEmail({
    user: { email, name: user?.name || first.guestShipping?.firstName || email.split('@')[0] },
    title: 'Payment received',
    intro: 'We received your M-Pesa payment for this order. Thank you for shopping with Nawiri Hair.',
    orderId: claimed.orderId,
    totalAmt: first.totalAmt ?? claimed.amount,
    fulfillmentType: first.fulfillment_type || 'delivery',
  }).catch((emailError) => {
    console.error('Error sending collection receipt email:', emailError);
  });
};

// A confirmed payment either creates its checkout's order, or — for a rider's
// collection — marks an existing Pay on Delivery order paid.
const finalizePayment = (paymentDoc) => (
  paymentDoc.purpose === 'delivery_collection'
    ? finalizeDeliveryCollection(paymentDoc)
    : finalizePaidOrder(paymentDoc)
);

// Only payments started before orders were deferred to finalizePaidOrder have
// order rows to mark; for newer ones this matches nothing. A failed rider
// collection leaves its Pay on Delivery order as it was, so it can be retried.
const markOrderUnpaid = async (paymentDoc, localStatus) => {
  if (paymentDoc.purpose === 'delivery_collection') return;
  await OrderModel.updateMany(
    { orderId: paymentDoc.orderId },
    { $set: { payment_status: localStatus.toUpperCase() } }
  );
};

/**
 * Reconciles a payment against a normalized result from Jenga — shared by
 * the wallet-STK callback/IPN (handleJengaCallback) and the card flow's
 * status-query result (handleJengaCardCallback). `normalized` is
 * { localStatus, returnedRef, returnedAmount, resultCode, resultDesc, raw } —
 * callers map their channel-specific payload into that shape first.
 * Reference, amount, and status are validated strictly before anything is
 * marked paid. Idempotent: repeated calls for a finalized payment are no-ops.
 */
const reconcilePayment = async (paymentDoc, normalized) => {
  if (paymentDoc.status === 'paid') {
    // Paid earlier but the order wasn't created (finalization failed
    // part-way) — a repeated callback retries it.
    if (!paymentDoc.finalizedAt) {
      await finalizePayment(paymentDoc);
    }
    return paymentDoc;
  }

  const { localStatus, returnedRef, returnedAmount, resultCode, resultDesc, raw } = normalized;

  if (localStatus === 'paid') {
    // A rejected success is kept on the payment (status unchanged) so it can
    // be checked by hand, and so scripts/one-off/voidUnpaidJengaOrders.js
    // never voids a checkout Jenga reported as paid.
    const keepRejected = async (reason) => {
      console.error(`Jenga callback ${reason} for ${paymentDoc.orderReference}`);
      await JengaPayment.updateOne(
        { _id: paymentDoc._id },
        { $set: { rawCallback: raw, resultDesc: `Success callback rejected: ${reason}` } }
      );
      return paymentDoc;
    };

    if (returnedRef && String(returnedRef) !== String(paymentDoc.orderReference)) {
      return keepRejected(`reference mismatch (got ${returnedRef})`);
    }
    if (returnedAmount != null && !amountCovers(returnedAmount, paymentDoc.amount)) {
      return keepRejected(`amount short (expected ${paymentDoc.amount}, got ${returnedAmount})`);
    }

    // A success can follow a failed/cancelled attempt under the same
    // reference (the hosted page lets the customer retry M-Pesa), and a
    // voided unpaid checkout can still be confirmed late — money taken must
    // always produce an order.
    const updated = await JengaPayment.findOneAndUpdate(
      { _id: paymentDoc._id, status: { $in: ['pending', 'failed', 'cancelled', 'expired'] } },
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
      await finalizePayment(updated);
    }
    return updated || paymentDoc;
  }

  if (paymentDoc.status !== 'pending') {
    // Already resolved — a late failure never overrides it.
    return paymentDoc;
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

  // Unknown/malformed status — fail closed, stay pending, but keep the
  // payload so an unexpected success wording can be spotted.
  if (localStatus === 'unknown') {
    console.error(`Jenga callback with unrecognized status "${resultCode}" for ${paymentDoc.orderReference}`);
    await JengaPayment.updateOne({ _id: paymentDoc._id, status: 'pending' }, { $set: { rawCallback: raw } });
  }
  return paymentDoc;
};

// A payment still 'pending' past this window is reported to the client as
// 'stale' — never auto-promoted to paid/failed — so the UI can offer
// "check again" instead of waiting forever. An STK prompt times out on the
// phone within about a minute; Jenga's hosted checkout session lasts 15
// minutes and the customer only returns afterwards, so card payments get
// the full session plus a margin before they count as stale.
const PENDING_STALE_AFTER_MS = 100 * 1000;
const CARD_PENDING_STALE_AFTER_MS = 20 * 60 * 1000;

/**
 * GET /api/jenga/status/:orderReference
 * Authenticated. Polled by the checkout UI while a payment is pending. Reads
 * whatever the callback has already reconciled.
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

    // The customer's own payment, or a collection the rider started for them.
    const isOwner = !doc.userId || String(doc.userId) === String(request.userId);
    const isCollector = doc.requestedBy && String(doc.requestedBy) === String(request.userId);
    if (!isOwner && !isCollector) {
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

    // Paid, but the order wasn't created (a previous finalization failed
    // part-way) — polling retries it too.
    if (doc.status === 'paid' && !doc.finalizedAt) {
      try {
        await finalizePayment(doc);
        doc = (await JengaPayment.findById(doc._id)) || doc;
      } catch (finalizeErr) {
        console.error('Jenga finalize retry error:', finalizeErr);
      }
    }

    // Only report 'paid' once the order exists, so the client never lands
    // on a success page with no order behind it.
    const awaitingOrder = doc.status === 'paid' && !doc.finalizedAt;
    const staleAfterMs = doc.channel === 'card' ? CARD_PENDING_STALE_AFTER_MS : PENDING_STALE_AFTER_MS;
    const isStale = doc.status === 'pending'
      && (Date.now() - doc.createdAt.getTime()) > staleAfterMs;

    return response.json({
      success: true,
      status: awaitingOrder ? 'pending' : isStale ? 'stale' : doc.status,
      orderId: doc.orderId,
      amount: doc.amount,
      resultDesc: isStale
        ? 'No confirmation received yet. If you approved the payment, it can take a few minutes to show — check again shortly, or contact support with your order reference.'
        : doc.resultDesc,
    });
  } catch (err) {
    console.error('Jenga status lookup error:', err);
    return response.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/jenga/callback
 * Public — Jenga calls this after the customer approves/rejects the wallet-STK
 * prompt. Every field we act on
 * — reference, amount, status/code — is validated strictly in reconcilePayment
 * before anything is marked paid or finalized.
 */
export const handleJengaCallback = async (request, response) => {
  try {
    const expectedToken = process.env.JENGA_CALLBACK_SECRET;
    const ipnUsername = process.env.JENGA_IPN_USERNAME;
    const ipnPassword = process.env.JENGA_IPN_PASSWORD;
    const receivedAuthorization = request.get('authorization') || '';
    const expectedAuthorization = (ipnUsername && ipnPassword)
      ? `Basic ${Buffer.from(`${ipnUsername}:${ipnPassword}`).toString('base64')}`
      : null;

    const isConstantTimeMatch = (left, right) => {
      const leftBuffer = Buffer.from(String(left));
      const rightBuffer = Buffer.from(String(right));
      return leftBuffer.length === rightBuffer.length
        && crypto.timingSafeEqual(leftBuffer, rightBuffer);
    };

    const hasValidRequestToken = Boolean(expectedToken)
      && isConstantTimeMatch(request.query?.token || '', expectedToken);
    const hasValidIpnAuthorization = Boolean(expectedAuthorization)
      && isConstantTimeMatch(receivedAuthorization, expectedAuthorization);

    if (!hasValidRequestToken && !hasValidIpnAuthorization) {
      console.error('Jenga callback rejected: invalid request token or IPN Basic authentication');
      // 200 (not 401) so a genuine misconfiguration doesn't trigger Jenga's
      // retry storm — this is logged for investigation either way.
      return response.status(200).json({ success: true });
    }

    const callbackData = request.body;
    const orderReference = callbackData?.customer?.reference;

    if (!orderReference) {
      console.error('Jenga IPN callback missing customer.reference:', callbackData);
      return response.status(200).json({ success: true });
    }

    const doc = await JengaPayment.findOne({ orderReference });
    if (!doc) {
      console.error(`Jenga callback for unknown orderReference: ${orderReference}`);
      return response.status(200).json({ success: true });
    }

    await reconcilePayment(doc, {
      localStatus: mapJengaCallbackToLocal(callbackData),
      returnedRef: callbackData?.customer?.reference,
      returnedAmount: callbackData?.transaction?.orderAmount ?? callbackData?.transaction?.amount,
      resultCode: callbackData?.transaction?.status,
      resultDesc: callbackData?.transaction?.remarks || callbackData?.transaction?.status,
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
// Jenga answers 401 "Not Authorized to access the API" while the merchant
// isn't subscribed to Query Transaction Details. Confirmation then relies on
// the IPN alone, so stop re-querying on every status poll for a while.
const TXN_QUERY_BACKOFF_MS = 10 * 60 * 1000;
let txnQueryUnavailableUntil = 0;

const queryAndReconcileCardPayment = async (doc) => {
  if (!doc || doc.channel !== 'card' || doc.status !== 'pending') {
    return doc;
  }
  if (Date.now() < txnQueryUnavailableUntil) {
    return doc;
  }

  const token = await getAuthToken();
  let txnResponse;
  try {
    txnResponse = await axios.get(getTransactionDetailsUrl(doc.orderReference), {
      headers: {
        Authorization: `Bearer ${token}`,
        Signature: signReference(doc.orderReference),
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });
  } catch (error) {
    if (error?.response?.status === 401) {
      txnQueryUnavailableUntil = Date.now() + TXN_QUERY_BACKOFF_MS;
      console.warn('[JENGA] Transaction status query not authorized for this merchant — relying on the IPN; retrying the query in 10 minutes.');
      return doc;
    }
    throw error;
  }

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
  let doc = null;
  const redirectTo = (status, orderReference) => {
    // A rider's collection goes back to the rider's deliveries, not to the
    // customer's order result page. A guest checkout (no account) comes back
    // with guest=1 so the result page polls the public guest status endpoint
    // instead of the authenticated one. Only a hint — the status endpoints
    // enforce their own access rules.
    const url = doc?.purpose === 'delivery_collection'
      ? `${frontendBase}/delivery/active?collection=${encodeURIComponent(status)}&orderId=${encodeURIComponent(doc.orderId)}`
      : `${frontendBase}/order/card-result?status=${encodeURIComponent(status)}${
        orderReference ? `&orderReference=${encodeURIComponent(orderReference)}` : ''
      }${doc?.userId ? '' : '&guest=1'}`;
    return response.redirect(302, url);
  };

  try {
    const orderReference = request.query?.orderReference;
    if (!orderReference) {
      console.error('Jenga card callback missing orderReference:', request.query);
      return redirectTo('error');
    }

    doc = await JengaPayment.findOne({ orderReference });
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
