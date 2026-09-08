import ProductModel from '../models/product.model.js';
import AdminActionLogModel from '../models/adminActionLog.model.js';

const asInt = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? Math.trunc(num) : NaN;
};

// Pure predicate, exported so it can be unit-tested without a database.
export const isValidDispatchQuantity = (value) => {
    const qty = asInt(value);
    return Number.isFinite(qty) && qty > 0;
};

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
                .select('name sku barcode stock warehouseStock costPrice price publish')
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
    const quantity = asInt(request.body?.quantity);
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

        return response.json({ success: true, data: updated });
    } catch (error) {
        console.error('Failed to receive warehouse stock:', error);
        return response.status(500).json({ success: false, message: 'Unable to receive warehouse stock.' });
    }
};

// The one race-safe stock-mutation pattern in this codebase, otherwise only
// used by server/routes/pos.js and exchange.controller.js: an atomic
// conditional decrement that only succeeds if enough stock is still present
// at write time, closing the race two concurrent dispatches could otherwise
// hit. Exported so the AI-tool executor (adminAi.controller.js) can reuse the
// exact same guarantee instead of re-implementing it.
export const dispatchWarehouseStockToShop = async ({ productId, quantity, actorType, actorId, reason }) => {
    const qty = asInt(quantity);
    if (!productId || !isValidDispatchQuantity(qty)) {
        return { ok: false, status: 400, message: 'Provide a product and a positive quantity to dispatch.' };
    }

    const updated = await ProductModel.findOneAndUpdate(
        { _id: productId, warehouseStock: { $gte: qty } },
        { $inc: { warehouseStock: -qty, stock: qty } },
        { new: true },
    ).select('name sku warehouseStock stock');

    if (!updated) {
        const current = await ProductModel.findById(productId).select('name warehouseStock').lean();
        if (!current) return { ok: false, status: 404, message: 'Product not found.' };
        return {
            ok: false,
            status: 409,
            message: `Only ${current.warehouseStock} unit(s) of ${current.name} are in the warehouse.`,
        };
    }

    await logAction({
        actorType,
        actorId,
        action: 'dispatch_stock_to_shop',
        target: { model: 'Product', id: productId },
        before: { warehouseStock: updated.warehouseStock + qty, stock: updated.stock - qty },
        after: { warehouseStock: updated.warehouseStock, stock: updated.stock },
        reason,
    });

    return { ok: true, product: updated };
};

// POST /api/admin/warehouse/dispatch — admin-initiated dispatch.
export const dispatchToShop = async (request, response) => {
    const result = await dispatchWarehouseStockToShop({
        productId: String(request.body?.productId || '').trim(),
        quantity: request.body?.quantity,
        actorType: 'admin',
        actorId: request.userId,
        reason: String(request.body?.reason || '').trim().slice(0, 500),
    });

    if (!result.ok) {
        return response.status(result.status).json({ success: false, message: result.message });
    }
    return response.json({ success: true, data: result.product });
};
