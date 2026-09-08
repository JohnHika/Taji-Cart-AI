import mongoose from 'mongoose';

const stockCountLineSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  sku: { type: String },
  expectedQuantity: { type: Number, required: true },
  countedQuantity: { type: Number },
  variance: { type: Number },
}, { _id: false });

const stockCountSchema = new mongoose.Schema({
  number: { type: String, required: true, unique: true },
  location: { type: String, enum: ['shop', 'warehouse'], required: true },
  status: { type: String, enum: ['draft', 'in_progress', 'finalized'], default: 'draft' },
  lines: { type: [stockCountLineSchema], validate: [(lines) => lines.length > 0, 'A count needs at least one product.'] },
  startedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  finalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  finalizedAt: { type: Date },
}, { timestamps: true });

stockCountSchema.index({ status: 1, location: 1, createdAt: -1 });

export default mongoose.model('StockCount', stockCountSchema);
