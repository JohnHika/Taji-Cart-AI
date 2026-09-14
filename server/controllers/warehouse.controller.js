import ProductModel from '../models/product.model.js';
import AdminActionLogModel from '../models/adminActionLog.model.js';
import InventoryMovementModel from '../models/inventoryMovement.model.js';
import { createStockTransferRecord, idempotencyKeyFromRequest } from './stockTransfer.controller.js';
import { isValidTransferQuantity } from '../utils/stockTransfer.js';

const asInt = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? Math.trunc(num) : NaN;
};

// Pure predicate, exported so it can be unit-tested without a database.
export const isValidDispatchQuantity = (value) => isValidTransferQuantity(value);

const logAction = ({ actorType, actorId, action, target, before, after, reason }) =>
    AdminActionLogModel.create({ actorType, actorId, action, target, before, after, reason }).catch((error) => {
        // Auditing must never block the actual operation — the write already
        // succeeded (or failed) before this is called; only the trail is at risk.
        console.error('Failed to write AdminActionLog entry:', error);
    });

// GET /api/admin/warehouse/inventory — backroom stock alongside live shop
// stock, so an admin can see both tiers of a product side by side.
export const getWarehouseInventory = async (request, response) => {
    try {
        const search = String(request.query.search || '').trim();
        const filter = search
            ? { $or: [{ name: { $regex: search, $options: 'i' } }, { sku: { $regex: search, $options: 'i' } }] }
            : {};
        const page = Math.max(1, asInt(request.query.page) || 1);
        const limit = Math.min(100, Math.max(1, asInt(request.query.limit) || 50));

        const [products, total] = await Promise.all([
            ProductModel.find(filter)
                .select('name sku barcode stock warehouseStock inTransitStock costPrice price publish')
                .sort({ warehouseStock: -1, name: 1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            ProductModel.countDocuments(filter),
        ]);

        return response.json({ success: true, data: { products, total, page, limit } });
    } catch (error) {
        console.error('Failed to load warehouse inventory:', error);
        return response.status(500).json({ success: false, message: 'Unable to load warehouse inventory.' });
    }
};

// POST /api/admin/warehouse/receive — add newly received stock into the
// backroom tier. Does not touch live shop stock.
export const receiveWarehouseStock = async (request, response) => {
    const productId = String(request.body?.productId || '').trim();
    const quantity = isValidTransferQuantity(request.body?.quantity) ? Number(request.body.quantity) : NaN;
    const reason = String(request.body?.reason || '').trim().slice(0, 500);

    if (!productId || !Number.isFinite(quantity) || quantity <= 0) {
        return response.status(400).json({ success: false, message: 'Provide a product and a positive quantity to receive.' });
    }

    try {
        const before = await ProductModel.findById(productId).select('name warehouseStock').lean();
        if (!before) {
            return response.status(404).json({ success: false, message: 'Product not found.' });
        }

        const updated = await ProductModel.findByIdAndUpdate(
            productId,
            { $inc: { warehouseStock: quantity } },
            { new: true },
        ).select('name warehouseStock stock');

        await logAction({
            actorType: 'admin',
            actorId: request.userId,
            action: 'receive_warehouse_stock',
            target: { model: 'Product', id: productId },
            before: { warehouseStock: before.warehouseStock },
            after: { warehouseStock: updated.warehouseStock },
            reason,
        });
        await InventoryMovementModel.create({ product: productId, type: 'warehouse_receipt', actorType: 'admin', warehouseDelta: quantity, reason, actorId: request.userId });

        return response.json({ success: true, data: updated });
    } catch (error) {
        console.error('Failed to receive warehouse stock:', error);
        return response.status(500).json({ success: false, message: 'Unable to receive warehouse stock.' });
    }
};

// The old helper name remains exported for internal callers, but it now creates
// an in-transit transfer rather than adding stock directly to the shop floor.
export const dispatchWarehouseStockToShop = async ({ productId, quantity, actorId, reason, destinationBranch, idempotencyKey }) => {
    try {
        const transfer = await createStockTransferRecord({
            lines: [{ productId, quantity }],
            destinationBranch,
            notes: reason,
            actorId,
            idempotencyKey,
        });
        return { ok: true, transfer };
    } catch (error) {
        return {
            ok: false,
            status: error.status || 500,
            message: error.message || 'Stock transfer could not be released.',
        };
    }
};

// POST /api/admin/warehouse/dispatch — compatibility endpoint for the former
// one-product dispatch action. It now returns a pending transfer receipt.
export const dispatchToShop = async (request, response) => {
    try {
        const result = await dispatchWarehouseStockToShop({
            productId: String(request.body?.productId || '').trim(),
            quantity: request.body?.quantity,
            actorId: request.userId,
            destinationBranch: request.body?.destinationBranch,
            reason: String(request.body?.reason || '').trim().slice(0, 500),
            idempotencyKey: idempotencyKeyFromRequest(request),
        });

        if (!result.ok) {
            return response.status(result.status).json({ success: false, message: result.message });
        }
        return response.json({ success: true, data: result.transfer });
    } catch (error) {
        return response.status(error.status || 500).json({ success: false, message: error.message || 'Stock transfer could not be released.' });
    }
};
