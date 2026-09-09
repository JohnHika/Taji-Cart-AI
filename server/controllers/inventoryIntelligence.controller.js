import AdminActionLogModel from '../models/adminActionLog.model.js';
import InventoryMovementModel from '../models/inventoryMovement.model.js';
import InventoryPolicyModel from '../models/inventoryPolicy.model.js';
import ProductModel from '../models/product.model.js';
import {
  DEFAULT_SERVICE_LEVEL,
  SERVICE_LEVEL_Z_SCORES,
  buildAbcClassification,
  buildAllSupplierScorecards,
  buildDeadStockReport,
  buildReplenishmentQueue,
  buildSalesTrend,
  calculateSalesVelocity,
} from '../utils/inventoryIntelligence.js';

const resolveServiceLevelParam = (value) => {
  const level = Number(value);
  return Object.hasOwn(SERVICE_LEVEL_Z_SCORES, level) ? level : DEFAULT_SERVICE_LEVEL;
};

// GET /api/admin/inventory-intelligence/replenishment-queue?serviceLevel=0.95
export const getReplenishmentQueue = async (request, response) => {
  try {
    const serviceLevel = resolveServiceLevelParam(request.query.serviceLevel);
    const queue = await buildReplenishmentQueue({ serviceLevel });
    return response.json({ success: true, data: queue });
  } catch (error) {
    console.error('Failed to build the replenishment queue:', error);
    return response.status(500).json({ success: false, message: 'Could not compute the replenishment queue.' });
  }
};

// GET /api/admin/inventory-intelligence/dead-stock
export const getDeadStockReport = async (request, response) => {
  try {
    const report = await buildDeadStockReport();
    return response.json({ success: true, data: report });
  } catch (error) {
    console.error('Failed to build the dead stock report:', error);
    return response.status(500).json({ success: false, message: 'Could not compute the dead stock report.' });
  }
};

// GET /api/admin/inventory-intelligence/abc-classification
export const getAbcClassification = async (request, response) => {
  try {
    const classification = await buildAbcClassification();
    return response.json({ success: true, data: classification });
  } catch (error) {
    console.error('Failed to build the ABC classification:', error);
    return response.status(500).json({ success: false, message: 'Could not compute the ABC classification.' });
  }
};

// GET /api/admin/inventory-intelligence/sales-trend?days=30
export const getSalesTrend = async (request, response) => {
  try {
    const days = Math.min(Math.max(Number(request.query.days) || 30, 7), 90);
    const trend = await buildSalesTrend(days);
    return response.json({ success: true, data: trend });
  } catch (error) {
    console.error('Failed to build the sales trend:', error);
    return response.status(500).json({ success: false, message: 'Could not compute the sales trend.' });
  }
};

// GET /api/admin/inventory-intelligence/supplier-scorecards
export const getSupplierScorecards = async (request, response) => {
  try {
    const scorecards = await buildAllSupplierScorecards();
    return response.json({ success: true, data: scorecards });
  } catch (error) {
    console.error('Failed to build supplier scorecards:', error);
    return response.status(500).json({ success: false, message: 'Could not compute supplier scorecards.' });
  }
};

// GET /api/admin/inventory-intelligence/velocity/:productId
export const getProductVelocity = async (request, response) => {
  try {
    const { productId } = request.params;
    const product = await ProductModel.findById(productId).select('name sku stock warehouseStock').lean();
    if (!product) return response.status(404).json({ success: false, message: 'Product not found.' });
    const velocityByProduct = await calculateSalesVelocity([productId]);
    const velocityPerDay = velocityByProduct.get(String(productId)) || 0;
    return response.json({
      success: true,
      data: { product, velocityPerDay: Number(velocityPerDay.toFixed(2)) },
    });
  } catch (error) {
    console.error('Failed to compute product velocity:', error);
    return response.status(500).json({ success: false, message: 'Could not compute sales velocity.' });
  }
};

// POST /api/admin/inventory-intelligence/policy/:productId
export const saveInventoryPolicy = async (request, response) => {
  try {
    const { productId } = request.params;
    const product = await ProductModel.findById(productId).select('_id').lean();
    if (!product) return response.status(404).json({ success: false, message: 'Product not found.' });

    const { manualReorderPoint, manualSafetyStock, preferredSupplier, reorderQuantity, notes } = request.body || {};
    const update = {
      setBy: request.userId,
      ...(manualReorderPoint !== undefined ? { manualReorderPoint: manualReorderPoint === null ? undefined : Number(manualReorderPoint) } : {}),
      ...(manualSafetyStock !== undefined ? { manualSafetyStock: manualSafetyStock === null ? undefined : Number(manualSafetyStock) } : {}),
      ...(preferredSupplier !== undefined ? { preferredSupplier: preferredSupplier || undefined } : {}),
      ...(reorderQuantity !== undefined ? { reorderQuantity: reorderQuantity === null ? undefined : Number(reorderQuantity) } : {}),
      ...(notes !== undefined ? { notes } : {}),
    };
    const policy = await InventoryPolicyModel.findOneAndUpdate(
      { product: productId },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return response.json({ success: true, data: policy });
  } catch (error) {
    console.error('Failed to save the inventory policy override:', error);
    return response.status(500).json({ success: false, message: 'Could not save the reorder override.' });
  }
};

const AUDIT_TRAIL_LIMIT_DEFAULT = 40;
const AUDIT_TRAIL_LIMIT_MAX = 200;

// GET /api/admin/inventory-intelligence/audit-trail
// A merged, paginated view over InventoryMovement (stock changes) and
// AdminActionLog (every other admin/AI write) -- the first browsing UI
// either of these collections gets; both are otherwise write-only today.
export const getAuditTrail = async (request, response) => {
  try {
    const limit = Math.min(Math.max(Number(request.query.limit) || AUDIT_TRAIL_LIMIT_DEFAULT, 1), AUDIT_TRAIL_LIMIT_MAX);
    const { productId, actorType, since } = request.query;
    const dateFilter = since ? { createdAt: { $gte: new Date(since) } } : {};

    const movementFilter = { ...dateFilter, ...(productId ? { product: productId } : {}) };
    const actionFilter = { ...dateFilter, ...(actorType ? { actorType } : {}) };

    const [movements, actions] = await Promise.all([
      InventoryMovementModel.find(movementFilter).sort({ createdAt: -1 }).limit(limit)
        .populate('product', 'name sku').populate('actorId', 'name').lean(),
      AdminActionLogModel.find(actionFilter).sort({ createdAt: -1 }).limit(limit)
        .populate('actorId', 'name').lean(),
    ]);

    const entries = [
      ...movements.map((movement) => ({
        kind: 'movement',
        id: String(movement._id),
        createdAt: movement.createdAt,
        actor: movement.actorId?.name || (movement.actorId ? 'Staff' : 'System'),
        summary: `${movement.type.replaceAll('_', ' ')} — ${movement.product?.name || 'Unknown product'}`,
        detail: movement.shopDelta ? `${movement.shopDelta > 0 ? '+' : ''}${movement.shopDelta} shop floor` : `${movement.warehouseDelta > 0 ? '+' : ''}${movement.warehouseDelta} backroom`,
        reason: movement.reason || '',
      })),
      ...actions.map((action) => ({
        kind: 'action',
        id: String(action._id),
        createdAt: action.createdAt,
        actor: action.actorType === 'ai' ? 'Ask Nawiri' : (action.actorId?.name || 'Admin'),
        summary: action.action.replaceAll('_', ' '),
        detail: action.target?.model ? `${action.target.model} ${action.target.id || ''}`.trim() : '',
        reason: action.reason || '',
      })),
    ].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)).slice(0, limit);

    return response.json({ success: true, data: entries });
  } catch (error) {
    console.error('Failed to load the audit trail:', error);
    return response.status(500).json({ success: false, message: 'Could not load the audit trail.' });
  }
};
