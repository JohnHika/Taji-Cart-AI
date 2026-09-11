import ProductModel from '../models/product.model.js';

/**
 * Atomically reserve (decrement) stock for a batch of product rows while
 * guaranteeing that NO product ever goes below zero — the same race-safe
 * conditional-decrement pattern used by server/routes/pos.js and
 * server/controllers/exchange.controller.js, but batch-shaped so online
 * checkouts can reserve several line items at once.
 *
 * Each row is `{ id, quantity, label }`. A reservation only commits when a
 * product's stock is untracked (null) or still >= the requested quantity at
 * the exact moment of the write, closing the race where two concurrent sales
 * both pass a read-only check and both decrement the last unit.
 *
 * All-or-nothing: if ANY row cannot be fully reserved, every earlier row in
 * the same batch is rolled back so stock never drifts from a half-completed
 * reservation, and a falsy `ok` result is returned with the offending row.
 *
 * The low-stock product set on success is exposed via `lowStock` (products
 * whose remaining stock is < 5) so callers can raise alerts once.
 */
export const reserveStockGuarded = async (rows = []) => {
  const reserved = [];
  for (const row of rows) {
    const qty = Number(row.quantity);
    if (!row.id || !Number.isFinite(qty) || qty <= 0) {
      // Roll back everything already reserved, then reject with the bad row.
      for (const r of reserved) {
        await ProductModel.findByIdAndUpdate(r.id, { $inc: { stock: r.quantity } });
      }
      return { ok: false, status: 400, row, reason: 'invalid_quantity' };
    }

    const updated = await ProductModel.findOneAndUpdate(
      {
        _id: row.id,
        $or: [{ stock: null }, { stock: { $gte: qty } }],
      },
      { $inc: { stock: -qty } },
      { new: true }
    );

    if (!updated) {
      // Roll back everything already reserved, then reject with the offending row.
      for (const r of reserved) {
        await ProductModel.findByIdAndUpdate(r.id, { $inc: { stock: r.quantity } });
      }
      const product = await ProductModel.findById(row.id)
        .select('name sku stock')
        .lean();
      if (!product) {
        return { ok: false, status: 404, row, reason: 'product_not_found' };
      }
      // The product exists but its remaining stock is below the requested qty.
      return {
        ok: false,
        status: 409,
        row,
        product,
        reason: 'insufficient_stock',
        remaining: product.stock,
      };
    }

    reserved.push({ id: row.id, quantity: qty, product: updated });
  }

  return {
    ok: true,
    reserved,
    lowStock: reserved.filter((r) => r.product.stock != null && r.product.stock < 5),
  };
};

export default reserveStockGuarded;
