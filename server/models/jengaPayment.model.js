import mongoose from 'mongoose';

const jengaPaymentSchema = new mongoose.Schema(
  {
    // Reference we generate and send to Jenga as payment.ref — the single
    // source of truth for matching callbacks/status queries back to this doc.
    orderReference:  { type: String, index: true, unique: true },
    orderId:         { type: String, index: true }, // links to OrderModel.orderId once the order exists
    userId:          { type: mongoose.Schema.ObjectId, ref: 'User' },
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
    // validated (see reconcilePayment in jenga.controller.js). Account-based
    // settlement has no separate status-query API — the callback is
    // authoritative once validated.
    verifiedAt:      { type: Date },
    // Guards against a callback and a poll both trying to finalize the order.
    finalizedAt:     { type: Date },
    rawCallback:     { type: Object },
  },
  { timestamps: true }
);

const JengaPayment = mongoose.model('jenga_payment', jengaPaymentSchema);

export default JengaPayment;
