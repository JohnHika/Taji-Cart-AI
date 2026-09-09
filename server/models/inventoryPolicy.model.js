import mongoose from 'mongoose';

// Optional per-product override for the computed reorder point. Absence of
// a row for a product means "use the computed default" -- an owner never
// has to configure this before the replenishment queue is useful, only
// where they want to pin a number the computed default gets wrong.
const inventoryPolicySchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'product',
    required: true,
    unique: true,
  },
  manualReorderPoint: { type: Number, min: 0 },
  manualSafetyStock: { type: Number, min: 0 },
  preferredSupplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  reorderQuantity: { type: Number, min: 1 },
  notes: { type: String, trim: true, maxlength: 500 },
  setBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const InventoryPolicyModel = mongoose.model('InventoryPolicy', inventoryPolicySchema);

export default InventoryPolicyModel;
