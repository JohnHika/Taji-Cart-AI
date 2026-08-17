import mongoose from 'mongoose';

const endOfDaySchema = new mongoose.Schema({
  date: {
    type: String, // 'YYYY-MM-DD'
    required: true
  },
  branch: {
    type: String,
    default: 'Main Store'
  },
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  closedByName: {
    type: String,
    required: true
  },
  summary: {
    totalSales: { type: Number, default: 0 },
    cashSales: { type: Number, default: 0 },
    equitySales: { type: Number, default: 0 },
    splitSales: { type: Number, default: 0 },
    textForwardedSales: { type: Number, default: 0 },
    transactionCount: { type: Number, default: 0 },
    hourlyBreakdown: [{
      hour: { type: Number, required: true }, // 0-23
      total: { type: Number, default: 0 },
      cashTotal: { type: Number, default: 0 },
      count: { type: Number, default: 0 }
    }],
    // Per-cashier rollup so the report can conclude with "who sold what".
    cashierBreakdown: [{
      cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      cashierName: { type: String, default: '' },
      saleCount: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    }],
    // Point-in-time snapshot of every sale included in this close, frozen at
    // close time (not re-queried later) so the report stays stable even if a
    // sale is later voided or a proof image expires. proofImageUrls carries
    // any Equity payment-proof URLs for that sale, embedded as thumbnails in
    // the PDF.
    transactions: [{
      saleNumber: { type: String, required: true },
      saleDate: { type: Date, required: true },
      cashierName: { type: String, default: '' },
      itemsSummary: { type: String, default: '' },
      paymentMethod: { type: String, default: '' },
      total: { type: Number, default: 0 },
      proofImageUrls: [{ type: String }],
      // Text-forwarded confirmation text (M-Pesa/bank SMS relayed as text
      // rather than a screenshot) — the text equivalent of proofImageUrls.
      forwardedTexts: [{ type: String }]
    }],
    // Every return/exchange requested on this trading day, whatever its
    // current status — so a customer bringing hair back is visible in the
    // report even if it's still "awaiting hair" or gets completed later.
    exchangeCount: { type: Number, default: 0 },
    exchanges: [{
      exchangeNumber: { type: String, required: true },
      requestedAt: { type: Date, required: true },
      sourceNumber: { type: String, default: '' },
      customerName: { type: String, default: '' },
      returnedItemSummary: { type: String, default: '' },
      replacementItemSummary: { type: String, default: '' },
      priceDifference: { type: Number, default: 0 },
      status: { type: String, default: '' },
      requestedByName: { type: String, default: '' }
    }]
  },
  isReset: {
    type: Boolean,
    default: false
  },
  resetBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resetByName: {
    type: String
  },
  resetAt: {
    type: Date
  },
  resetReason: {
    type: String
  },
  // Equity payment-proof images referenced in this close's transaction
  // snapshot are deleted from Cloudinary once this passes (set at close
  // time to closedAt + 3.5 days). Days that are never closed never get this
  // set, so their proofs are never auto-deleted.
  proofDeletionDueAt: {
    type: Date
  },
  proofImagesDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// One active close per branch per calendar date. A reset EOD keeps its
// document (for audit history) rather than being deleted, so the unique
// index only needs to prevent duplicate *active* closes for the same day.
endOfDaySchema.index(
  { date: 1, branch: 1 },
  { unique: true, partialFilterExpression: { isReset: false } }
);

// Lets the cleanup sweep efficiently find due, not-yet-processed closes.
endOfDaySchema.index({ proofDeletionDueAt: 1, proofImagesDeleted: 1 });

const EndOfDay = mongoose.model('endOfDay', endOfDaySchema);

export default EndOfDay;
