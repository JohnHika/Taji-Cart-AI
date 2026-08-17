import mongoose from 'mongoose';

// A hair-only exchange against a completed Sale (POS/counter) or Order
// (online). Never involves a cash refund: exchanging for a same-priced
// item is free, exchanging up to a pricier item requires paying the
// difference (collected like a normal payment), and exchanging down to a
// cheaper item forfeits the difference — no refund, no store credit.
//
// The original item is only restocked, and the replacement only handed
// over/dispatched, once the customer's original hair has physically
// arrived back at the shop (status: hair_received), reflecting the real
// workflow: the swap isn't instant.
const exchangeSchema = new mongoose.Schema({
  exchangeNumber: {
    type: String,
    required: true,
    unique: true
  },
  // Source transaction this exchange is against. Either a Sale (POS) or
  // an Order (online) — sourceType tells you which collection to look in.
  sourceType: {
    type: String,
    enum: ['sale', 'order'],
    required: true
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  // Human-readable receipt/order number, snapshotted for display without
  // needing to re-populate the source document.
  sourceNumber: {
    type: String,
    required: true
  },
  customerName: {
    type: String,
    default: ''
  },
  customerPhone: {
    type: String,
    default: ''
  },
  returnedItem: {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'product', required: true },
    name: { type: String, required: true },
    sku: { type: String, default: '' },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 }
  },
  replacementItem: {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'product', required: true },
    name: { type: String, required: true },
    sku: { type: String, default: '' },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 }
  },
  // (replacement total) - (returned total). Positive = customer owes the
  // difference; negative = they exchanged down (forfeited, not refunded);
  // zero = same-type/even swap, no payment involved.
  priceDifference: {
    type: Number,
    required: true
  },
  // Only present when priceDifference > 0 and it's been collected.
  payment: {
    method: { type: String, enum: ['cash', 'equity', 'split'] },
    amount: { type: Number },
    payments: [{
      method: { type: String, enum: ['cash', 'equity'] },
      amount: { type: Number },
      proofImageUrl: { type: String },
      approved: { type: Boolean, default: false }
    }]
  },
  status: {
    type: String,
    enum: ['requested', 'hair_received', 'completed', 'cancelled'],
    default: 'requested'
  },
  reason: {
    type: String,
    default: ''
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requestedByName: {
    type: String,
    required: true
  },
  hairReceivedAt: {
    type: Date
  },
  hairReceivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  completedAt: {
    type: Date
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledAt: {
    type: Date
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelReason: {
    type: String
  },
  branch: {
    type: String,
    default: 'Main Store'
  }
}, {
  timestamps: true
});

exchangeSchema.index({ status: 1, createdAt: -1 });
exchangeSchema.index({ sourceType: 1, sourceId: 1 });

const Exchange = mongoose.model('exchange', exchangeSchema);

export default Exchange;
