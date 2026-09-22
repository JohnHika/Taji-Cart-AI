import mongoose from 'mongoose';

const jengaPaymentSchema = new mongoose.Schema(
  {
    // Reference we generate and send to Jenga as payment.ref — the single
    // source of truth for matching callbacks/status queries back to this doc.
    orderReference:  { type: String, index: true, unique: true },
    orderId:         { type: String, index: true }, // links to OrderModel.orderId once the order exists
    userId:          { type: mongoose.Schema.ObjectId, ref: 'User' },
    // 'mpesa' = Jenga Payment Gateway wallet-based STK push. 'card' = Jenga PGW
    // hosted checkout redirect (Visa/Mastercard/Amex/UnionPay).
    channel:         { type: String, enum: ['mpesa', 'card'], default: 'mpesa' },
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
    // Guards against a callback and a poll both trying to finalize the order.
    finalizedAt:     { type: Date },
    rawCallback:     { type: Object },
  },
  { timestamps: true }
);

const JengaPayment = mongoose.model('jenga_payment', jengaPaymentSchema);

export default JengaPayment;
