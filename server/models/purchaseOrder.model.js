import mongoose from 'mongoose';

const purchaseOrderLineSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'product', required: true },
  productName: { type: String, required: true },
  sku: { type: String },
  orderedQuantity: { type: Number, required: true, min: 1 },
  receivedQuantity: { type: Number, default: 0, min: 0 },
  unitCost: { type: Number, required: true, min: 0 },
}, { _id: false });

// The purchase order records the supplier commitment. Receiving is tracked per
// line so a partial delivery never inflates available stock.
const purchaseOrderSchema = new mongoose.Schema({
  number: { type: String, required: true, unique: true, trim: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  status: {
    type: String,
    enum: ['draft', 'ordered', 'partially_received', 'received', 'cancelled'],
    default: 'draft',
  },
  expectedDate: { type: Date },
  notes: { type: String, trim: true, maxlength: 1000 },
  lines: { type: [purchaseOrderLineSchema], validate: [(lines) => lines.length > 0, 'Add at least one product.'] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderedAt: { type: Date },
  receivedAt: { type: Date },
}, { timestamps: true });

purchaseOrderSchema.index({ status: 1, expectedDate: 1 });
purchaseOrderSchema.index({ supplier: 1, createdAt: -1 });

export default mongoose.model('PurchaseOrder', purchaseOrderSchema);
