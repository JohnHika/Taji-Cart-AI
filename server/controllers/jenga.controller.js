import mongoose from 'mongoose';
import crypto from 'crypto';
import {
  getAuthToken,
  signStkPushRequest,
  JENGA_STK_PUSH_URL,
  requireEnv,
} from '../config/jenga.js';
import axios from 'axios';
import JengaPayment from '../models/jengaPayment.model.js';
import OrderModel from '../models/order.model.js';
import ProductModel from '../models/product.model.js';
import CartProductModel from '../models/cartproduct.model.js';
import UserModel from '../models/user.model.js';
import NotificationModel from '../models/notification.model.js';
import { normalizeKenyanPhone, isValidAmount, amountsMatch } from '../utils/jengaValidation.js';

// buildValidatedOrderPricing / pricewithDiscount live in order.controller.js but
// aren't exported there — re-derive the pieces this controller needs directly
// against ProductModel to keep this module self-contained.
const roundMoney = (amount = 0) => Number(Number(amount || 0).toFixed(2));

// Jenga requires payment.ref to be 6-20 alphanumeric characters (no separators).
// Epoch seconds (not ms) fits in 10 digits; combined with a 4-char random
// suffix this is 17 chars total, comfortably under the limit while keeping
// enough entropy to avoid collisions across concurrent checkouts.
const buildOrderReference = () =>
  `JGA${Math.floor(Date.now() / 1000)}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

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
    .select('_id name image price discount stock')
    .lean();
  const productsById = new Map(products.map((p) => [String(p._id), p]));

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

    const discountAmount = Math.round((product.price * Math.max(0, Number(product.discount || 0))) / 100);
    const unitPrice = Math.max(0, product.price - discountAmount);
    subTotalAmt += unitPrice * quantity;

    return { productId: product, quantity };
  });

  return { normalizedItems, subTotalAmt: roundMoney(subTotalAmt) };
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
    const {
      list_items,
      addressId,
      fulfillment_type = 'delivery',
      pickup_location,
      pickup_instructions,
      phoneNumber,
    } = request.body;

    const normalizedPhone = normalizeKenyanPhone(phoneNumber);
    if (!normalizedPhone) {
      return response.status(400).json({
        message: 'Enter a valid Kenyan phone number (e.g. 07XXXXXXXX or 2547XXXXXXXX).',
        error: true,
        success: false,
      });
    }

    if (fulfillment_type === 'delivery' && !addressId) {
      return response.status(400).json({ message: 'Delivery address is required for delivery orders', error: true, success: false });
    }
    if (fulfillment_type === 'pickup' && !pickup_location) {
      return response.status(400).json({ message: 'Pickup location is required for pickup orders', error: true, success: false });
    }

    const { normalizedItems, subTotalAmt } = await priceItems(list_items);
    const totalAmt = subTotalAmt;

    if (!isValidAmount(totalAmt)) {
      return response.status(400).json({ message: 'Order amount is invalid', error: true, success: false });
    }

    const orderReference = buildOrderReference();
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
      pickup_location: pickup_location || '',
      pickup_instructions: pickup_instructions || '',
      subTotalAmt,
      totalAmt,
    }));

    await OrderModel.insertMany(orderPayload);

    await JengaPayment.create({
      orderReference,
      orderId: sharedOrderId,
      userId,
      phoneNumber: normalizedPhone,
      amount: totalAmt,
      currency: 'KES',
      status: 'pending',
    });

    const merchantAccountNumber = requireEnv('JENGA_ACCOUNT_NUMBER');
    const merchantName = requireEnv('JENGA_MERCHANT_NAME');
    const callbackUrl = requireEnv('JENGA_CALLBACK_URL');

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

    return response.status(200).json({
      success: true,
      message: 'Payment request sent. Approve the STK prompt on your phone.',
      data: { orderReference, orderId: sharedOrderId, status: 'pending', jenga: jengaResponse.data },
    });
  } catch (error) {
    console.error('Jenga initiate error:', error?.response?.data || error.message);
    const message =
      error?.response?.data?.message ||
      error?.message ||
      'Failed to initiate Jenga payment';
    return response.status(error.statusCode || 500).json({ success: false, error: true, message });
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

  await Promise.all(orders.map(async (order) => {
    const updated = await ProductModel.findByIdAndUpdate(
      order.productId,
      { $inc: { stock: -1 * (order.quantity || 1) } },
      { new: true }
    );
    if (updated && updated.stock < 5) {
      await NotificationModel.create({
        type: 'low_stock',
        title: 'Low Stock Alert',
        message: `Product "${updated.name}" is running low (${updated.stock} remaining)`,
        isRead: false,
        forAdmin: true,
      });
    }
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
 * Reconciles a pending payment against a Jenga callback payload. Account-based
 * settlement has no dedicated status-query endpoint (Jenga's docs: "await
 * final transaction status on callback"), so the callback is authoritative —
 * but reference, amount, and status/code are still validated strictly before
 * anything is marked paid. Idempotent: a second call with status !== 'pending'
 * is a no-op.
 */
const reconcilePayment = async (paymentDoc, callbackData) => {
  if (paymentDoc.status !== 'pending') {
    // Already resolved (paid/failed/cancelled/expired) — repeated calls are no-ops.
    return paymentDoc;
  }

  const localStatus = mapJengaCallbackToLocal(callbackData);
  const returnedAmount = callbackData?.debitedAmount ?? callbackData?.requestAmount;
  const returnedRef = callbackData?.transactionReference;

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
          rawCallback: callbackData,
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
      { $set: { status: localStatus, resultCode: String(callbackData?.code ?? ''), resultDesc: callbackData?.message, rawCallback: callbackData } },
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

    const doc = await JengaPayment.findOne({ orderReference });
    if (!doc) {
      return response.json({ success: true, status: 'unknown' });
    }

    if (doc.userId && String(doc.userId) !== String(request.userId)) {
      return response.status(403).json({ success: false, message: 'Access denied' });
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

    await reconcilePayment(doc, callbackData);

    return response.status(200).json({ success: true });
  } catch (err) {
    console.error('Jenga callback error:', err);
    // Still 200 — Jenga should not indefinitely retry on our internal errors.
    return response.status(200).json({ success: true });
  }
};
