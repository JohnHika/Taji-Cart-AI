import ProductModel from '../models/product.model.js';
import StockCountModel from '../models/stockCount.model.js';
import InventoryMovementModel from '../models/inventoryMovement.model.js';
import AdminActionLogModel from '../models/adminActionLog.model.js';

const countNumber = () => `COUNT-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
const asCount = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
};

export const getStockControlDashboard = async (request, response) => {
  try {
    const [counts, movements] = await Promise.all([
      StockCountModel.find().sort({ createdAt: -1 }).limit(20).lean(),
      InventoryMovementModel.find().populate('product', 'name sku').sort({ createdAt: -1 }).limit(25).lean(),
    ]);
    return response.json({ success: true, data: { counts, movements } });
  } catch (error) {
    console.error('Failed to load stock control dashboard:', error);
    return response.status(500).json({ success: false, message: 'Unable to load stock-control activity.' });
  }
};

export const startStockCount = async (request, response) => {
  const location = request.body?.location === 'warehouse' ? 'warehouse' : 'shop';
  try {
    const existing = await StockCountModel.findOne({ location, status: { $in: ['draft', 'in_progress'] } }).lean();
    if (existing) return response.status(409).json({ success: false, message: `Finish or discard ${existing.number} before starting another ${location} count.` });
    const products = await ProductModel.find().select('name sku stock warehouseStock').sort({ name: 1 }).lean();
    const lines = products.map((product) => ({ product: product._id, productName: product.name, sku: product.sku, expectedQuantity: location === 'warehouse' ? Number(product.warehouseStock || 0) : Number(product.stock || 0) }));
    const count = await StockCountModel.create({ number: countNumber(), location, status: 'in_progress', lines, startedBy: request.userId });
    await AdminActionLogModel.create({ actorType: 'admin', actorId: request.userId, action: 'start_stock_count', target: { model: 'StockCount', id: count._id }, after: { number: count.number, location, lineCount: lines.length } });
    return response.status(201).json({ success: true, data: count });
  } catch (error) {
    console.error('Failed to start stock count:', error);
    return response.status(500).json({ success: false, message: 'Stock count could not be started.' });
  }
};

export const finalizeStockCount = async (request, response) => {
  const submitted = Array.isArray(request.body?.lines) ? request.body.lines : [];
  try {
    const count = await StockCountModel.findOne({ _id: request.params.id, status: 'in_progress' });
    if (!count) return response.status(409).json({ success: false, message: 'Only an in-progress stock count can be finalized.' });
    const submittedByProduct = new Map(submitted.map((line) => [String(line.productId), asCount(line.countedQuantity)]));
    if (submittedByProduct.size !== count.lines.length || [...submittedByProduct.values()].some((value) => value === null)) {
      return response.status(400).json({ success: false, message: 'Enter a whole-number physical count for every product before finalizing.' });
    }
    const deltas = [];
    for (const line of count.lines) {
      const counted = submittedByProduct.get(String(line.product));
      const variance = counted - line.expectedQuantity;
      line.countedQuantity = counted;
      line.variance = variance;
      if (!variance) continue;
      const field = count.location === 'warehouse' ? 'warehouseStock' : 'stock';
      await ProductModel.findByIdAndUpdate(line.product, { $set: { [field]: counted } });
      deltas.push({ product: line.product, productName: line.productName, variance });
    }
    if (deltas.length) await InventoryMovementModel.insertMany(deltas.map((item) => ({ product: item.product, type: 'stocktake_adjustment', warehouseDelta: count.location === 'warehouse' ? item.variance : 0, shopDelta: count.location === 'shop' ? item.variance : 0, reference: { model: 'StockCount', id: count._id, number: count.number }, reason: `Physical ${count.location} count`, actorId: request.userId })));
    count.status = 'finalized';
    count.finalizedBy = request.userId;
    count.finalizedAt = new Date();
    await count.save();
    await AdminActionLogModel.create({ actorType: 'admin', actorId: request.userId, action: 'finalize_stock_count', target: { model: 'StockCount', id: count._id }, after: { number: count.number, location: count.location, variances: deltas } });
    return response.json({ success: true, data: count });
  } catch (error) {
    console.error('Failed to finalize stock count:', error);
    return response.status(500).json({ success: false, message: 'Stock count could not be finalized.' });
  }
};
