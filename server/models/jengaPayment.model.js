import mongoose from 'mongoose';

const jengaPaymentSchema = new mongoose.Schema(
  {
    // Reference we generate and send to Jenga as payment.ref — the single
    // source of truth for matching callbacks/status queries back to this doc.
    orderReference:  { type: String, index: true, unique: true },
    orderId:         { type: String, index: true }, // links to OrderModel.orderId once the order exists
    userId:          { type: mongoose.Schema.ObjectId, ref: 'User' },
    // 'mpesa' = Jenga Payment Gateway wallet-based STK push. 'card' is the
    // legacy storage value for Jenga PGW hosted checkout, whose active methods
    // can include M-Pesa as well as card networks.
    channel:         { type: String, enum: ['mpesa', 'card'], default: 'mpesa' },
    // 'checkout' pays for a new order (created once paid). 'delivery_collection'
    // is a rider collecting payment for an existing Pay on Delivery order at
    // the door — confirming it only marks that order paid
    // (finalizeDeliveryCollection in jenga.controller.js).
    purpose:         { type: String, enum: ['checkout', 'delivery_collection'], default: 'checkout' },
    requestedBy:     { type: mongoose.Schema.ObjectId, ref: 'User' },
    phoneNumber:     { type: String },
    amount:          { type: Number },
    currency:        { type: String, default: 'KES' },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'cancelled', 'expired'],
      default: 'pending',
    },
    resultCode:      { type: String },
    resultDesc:      { type: String },
    // Set only once, when the callback's reference/amount/status have been
    // validated (see reconcilePayment in jenga.controller.js).
    verifiedAt:      { type: Date },
    // Set once the paid order exists. finalizingAt is a short lock so a
    // callback and a poll don't both finalize; if finalization fails part-way
    // the lock lapses and the next callback/poll retries (finalizePaidOrder).
    finalizedAt:     { type: Date },
    finalizingAt:    { type: Date },
    // Stock for this payment has been decremented (so a retry doesn't take
    // it twice); stockShortfall when it couldn't be reserved in full.
    stockReservedAt: { type: Date },
    stockShortfall:  { type: Boolean },
    // Loyalty points and community reward priced into this checkout; redeemed
    // only when the payment is confirmed.
    appliedPoints:   { type: Number, default: 0 },
    communityRewardId: { type: mongoose.Schema.ObjectId },
    rawCallback:     { type: Object },
    // Jenga's response when it rejected the STK initiation itself (no
    // callback will ever arrive for those) — kept for Jenga support.
    initResponse:    { type: Object },
    // The order rows for this checkout. Orders are only created from these
    // once Jenga confirms payment (finalizePaidOrder in jenga.controller.js),
    // so abandoned checkouts never appear as orders.
    pendingOrder:    { type: Array, default: undefined },
    // Order rows removed from the orders collection because the checkout was
    // never paid (see scripts/one-off/voidUnpaidJengaOrders.js) — kept so a
    // late-confirmed payment could still be restored.
    archivedOrders:  { type: Array, default: undefined },
  },
  { timestamps: true }
);

const JengaPayment = mongoose.model('jenga_payment', jengaPaymentSchema);

export default JengaPayment;
