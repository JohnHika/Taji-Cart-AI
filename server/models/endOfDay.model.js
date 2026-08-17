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
    transactionCount: { type: Number, default: 0 },
    hourlyBreakdown: [{
      hour: { type: Number, required: true }, // 0-23
      total: { type: Number, default: 0 },
      cashTotal: { type: Number, default: 0 },
      count: { type: Number, default: 0 }
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

const EndOfDay = mongoose.model('endOfDay', endOfDaySchema);

export default EndOfDay;
