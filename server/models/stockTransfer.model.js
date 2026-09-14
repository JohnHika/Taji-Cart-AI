import mongoose from 'mongoose';

const stockTransferLineSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'product', required: true },
  productName: { type: String, required: true, trim: true },
  sku: { type: String, default: '', trim: true },
  dispatchedQuantity: { type: Number, required: true, min: 1 },
  receivedQuantity: { type: Number, default: null, min: 0 },
  variance: { type: Number, default: null },
  receiptNote: { type: String, default: '', maxlength: 500, trim: true },
}, { _id: false });

const stockTransferSchema = new mongoose.Schema({
  number: { type: String, required: true, unique: true, trim: true },
  idempotencyKey: { type: String, required: true, trim: true, maxlength: 100 },
  requestFingerprint: { type: String, required: true, select: false, maxlength: 10000 },
  sourceLocation: { type: String, required: true, default: 'warehouse', enum: ['warehouse'] },
  destinationLocation: { type: String, required: true, default: 'shop', enum: ['shop'] },
  destinationBranch: { type: String, required: true, default: 'Main Store', trim: true, maxlength: 100 },
  status: {
    type: String,
    enum: ['dispatched', 'partially_received', 'confirmed', 'disputed', 'resolved', 'cancelled'],
    default: 'dispatched',
    index: true,
  },
  lines: {
    type: [stockTransferLineSchema],
    validate: [(lines) => lines.length > 0 && lines.length <= 100, 'A transfer needs between 1 and 100 products.'],
  },
  notes: { type: String, default: '', maxlength: 500, trim: true },
  releasedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  releasedAt: { type: Date, default: Date.now },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  receivedAt: { type: Date, default: null },
  receiptNote: { type: String, default: '', maxlength: 500, trim: true },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  resolvedAt: { type: Date, default: null },
  resolutionAction: { type: String, enum: ['reconcile_variance', 'mark_loss', 'cancel', null], default: null },
  resolutionNote: { type: String, default: '', maxlength: 500, trim: true },
}, { timestamps: true });

stockTransferSchema.index({ idempotencyKey: 1 }, { unique: true });
stockTransferSchema.index({ destinationBranch: 1, status: 1, createdAt: -1 });
stockTransferSchema.index({ releasedBy: 1, createdAt: -1 });

export default mongoose.model('StockTransfer', stockTransferSchema);
