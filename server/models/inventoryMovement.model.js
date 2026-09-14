import mongoose from 'mongoose';

// Product.stock and Product.warehouseStock remain the fast, current balances.
// This immutable ledger is the explanation for every non-sale change.
const inventoryMovementSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'product', required: true, index: true },
  type: {
    type: String,
    enum: ['warehouse_receipt', 'purchase_receipt', 'warehouse_to_shop', 'transfer_dispatch', 'transfer_receipt', 'transfer_loss', 'transfer_overage', 'stocktake_adjustment'],
    required: true,
  },
  actorType: { type: String, enum: ['admin', 'staff', 'ai', 'system'], default: 'system' },
  warehouseDelta: { type: Number, default: 0 },
  inTransitDelta: { type: Number, default: 0 },
  shopDelta: { type: Number, default: 0 },
  reference: { model: String, id: mongoose.Schema.Types.ObjectId, number: String },
  reason: { type: String, maxlength: 500 },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

inventoryMovementSchema.index({ product: 1, createdAt: -1 });
inventoryMovementSchema.index({ type: 1, createdAt: -1 });
inventoryMovementSchema.index({ actorType: 1, createdAt: -1 });

export default mongoose.model('InventoryMovement', inventoryMovementSchema);
