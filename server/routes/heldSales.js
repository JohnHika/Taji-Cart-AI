import express from 'express';
import HeldSale from '../models/heldSale.model.js';
import Product from '../models/product.model.js';
import auth from '../middleware/auth.js';
import Staff from '../middleware/Staff.js';
import { requireStaffPermission } from '../middleware/requireStaffPermission.js';

const router = express.Router();

// ─── Stock reservation ──────────────────────────────────────────────────────
// Hold RESERVES stock ($inc: -qty) so two counters can't sell the same unit.
// Resume UN-RESERVES ($inc: +qty) — completing the sale decrements again normally.
// Delete RESTORES the reserved stock.

const validateAndNormalizeItems = async (rawItems) => {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { error: { status: 400, message: 'At least one item is required to hold a sale' } };
  }

  const normalizedItems = [];
  for (const rawItem of rawItems) {
    const productId = String(rawItem.product || rawItem._id || '').trim();
    const quantity = Math.max(1, Number(rawItem.quantity || 1));
    const price = Number(rawItem.price || 0);

    if (!productId) {
      return { error: { status: 400, message: 'Each held item must include a product id' } };
    }
    if (!price || price <= 0) {
      return { error: { status: 400, message: `${rawItem.name || 'Product'} must have a price before it can be held` } };
    }

    normalizedItems.push({
      product: productId,
      sku: rawItem.sku || '',
      name: rawItem.name || '',
      price,
      quantity,
      discountPct: Math.min(100, Math.max(0, Number(rawItem.discountPct || 0)))
    });
  }

  const productIds = normalizedItems.map(item => item.product);
  const products = await Product.find({ _id: { $in: productIds } }).select('_id name sku price stock');
  const productMap = new Map(products.map(p => [String(p._id), p]));

  for (const item of normalizedItems) {
    const product = productMap.get(String(item.product));
    if (!product) {
      return { error: { status: 404, message: `Product not found for item ${item.name || item.product}` } };
    }

    // Same policy as completing a sale: hard-block only when stock is a known positive
    // number and the request exceeds it. Zero/null stock = allow (reconcile later).
    if (product.stock != null && product.stock > 0 && product.stock < item.quantity) {
      return { error: { status: 409, message: `${product.name} only has ${product.stock} item(s) left in stock` } };
    }

    item.name = item.name || product.name;
    item.sku = item.sku || product.sku || '';
    item.price = item.price || product.price;
  }

  return { normalizedItems };
};

const applyStockDelta = async (items, sign) => {
  const applied = [];
  for (const item of items) {
    const updated = await Product.findByIdAndUpdate(
      item.product,
      { $inc: { stock: sign * item.quantity } },
      { new: true }
    );
    if (!updated) {
      // Product vanished mid-batch: roll back everything applied so far
      for (const prev of applied) {
        await Product.findByIdAndUpdate(prev.product, { $inc: { stock: -sign * prev.quantity } });
      }
      return false;
    }
    applied.push({ product: item.product, quantity: item.quantity });
  }
  return true;
};

// ─── Hold (park) the current sale ───────────────────────────────────────────
router.post('/', auth, Staff, requireStaffPermission('pos.open_counter'), async (req, res) => {
  try {
    const {
      items,
      customer,
      customerName,
      customerPhone,
      discount,
      discountMode,
      discountAmountValue,
      applyTax,
      loyaltyDiscountPct,
      orderNote
    } = req.body;

    const { error, normalizedItems } = await validateAndNormalizeItems(items);
    if (error) {
      return res.status(error.status).json({ success: false, message: error.message });
    }

    // Reserve stock before persisting; roll back if the save fails.
    const reserved = await applyStockDelta(normalizedItems, -1);
    if (!reserved) {
      return res.status(404).json({ success: false, message: 'Product no longer exists. Please rescan and try again.' });
    }

    const held = new HeldSale({
      heldBy: req.user._id,
      heldByName: req.user.name || '',
      branch: req.user.staff_branch || 'Main Store',
      items: normalizedItems,
      customer: customer || null,
      customerName: (customerName || '').trim(),
      customerPhone: (customerPhone || '').trim(),
      discount: Math.max(0, Number(discount || 0)),
      discountMode: discountMode === 'amount' ? 'amount' : 'percent',
      discountAmountValue: Math.max(0, Number(discountAmountValue || 0)),
      applyTax: Boolean(applyTax),
      loyaltyDiscountPct: Math.max(0, Number(loyaltyDiscountPct || 0)),
      orderNote: (orderNote || '').trim(),
      status: 'held',
      auditTrail: [{
        action: 'hold',
        by: req.user._id,
        byName: req.user.name,
        meta: {
          itemCount: normalizedItems.reduce((s, i) => s + i.quantity, 0),
          stockReserved: true,
          customerName: (customerName || '').trim()
        }
      }]
    });

    try {
      await held.save();
    } catch (saveError) {
      await applyStockDelta(normalizedItems, +1); // un-reserve
      throw saveError;
    }

    return res.status(201).json({ success: true, message: 'Sale held — stock reserved', data: held });
  } catch (error) {
    console.error('POST /api/pos/held error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─── List held sales ────────────────────────────────────────────────────────
router.get('/', auth, Staff, requireStaffPermission('pos.open_counter'), async (req, res) => {
  try {
    const statusParam = (req.query.status || 'held').toLowerCase();
    const filter = {};
    if (statusParam !== 'all') {
      filter.status = statusParam === 'resumed' ? 'resumed' : 'held';
    }
    if (req.query.branch) {
      filter.branch = req.query.branch;
    }

    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit || 20, 10)));

    const heldSales = await HeldSale.find(filter)
      .sort({ heldAt: -1 })
      .limit(limit)
      .populate('customer', 'name email mobile')
      .populate('heldBy', 'name');

    return res.json({ success: true, data: heldSales });
  } catch (error) {
    console.error('GET /api/pos/held error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Get one held sale ──────────────────────────────────────────────────────
router.get('/:id', auth, Staff, requireStaffPermission('pos.open_counter'), async (req, res) => {
  try {
    const held = await HeldSale.findById(req.params.id)
      .populate('customer', 'name email mobile loyaltyCard');

    if (!held) {
      return res.status(404).json({ success: false, message: 'Held sale not found' });
    }

    return res.json({ success: true, data: held });
  } catch (error) {
    console.error('GET /api/pos/held/:id error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Resume a held sale ─────────────────────────────────────────────────────
// Marks the sale resumed and UN-RESERVES stock (completing the sale decrements again).
router.post('/:id/resume', auth, Staff, requireStaffPermission('pos.open_counter'), async (req, res) => {
  try {
    // Populate customer (UI expects an object with name/loyaltyCard) and product stock for the qty guard.
    const held = await HeldSale.findById(req.params.id)
      .populate('customer', 'name email mobile loyaltyCard')
      .populate('items.product', 'name stock price');

    if (!held) {
      return res.status(404).json({ success: false, message: 'Held sale not found' });
    }
    if (held.status !== 'held') {
      return res.status(409).json({ success: false, message: `Held sale already ${held.status} by ${held.resumedByName || 'another user'}` });
    }

    held.status = 'resumed';
    held.resumedBy = req.user._id;
    held.resumedByName = req.user.name || '';
    held.resumedAt = new Date();
    held.auditTrail.push({
      action: 'resume',
      by: req.user._id,
      byName: req.user.name,
      meta: {
        itemCount: held.items.reduce((s, i) => s + i.quantity, 0),
        stockUnreserved: true
      }
    });

    try {
      await held.save();
    } catch (saveError) {
      throw saveError;
    }

    // Un-reserve AFTER the status flip succeeded. Use raw subdocs (not the populated
    // product objects) so we $inc by the original quantities.
    const rawItems = held.items.map(item => ({ product: item.product?._id || item.product, quantity: item.quantity }));
    const unreserved = await applyStockDelta(rawItems, +1);
    if (!unreserved) {
      console.error(`Resume ${held._id}: stock un-reserve partially failed (product missing). Audit trail records the intent.`);
    }

    return res.json({ success: true, message: 'Held sale resumed', data: held });
  } catch (error) {
    console.error('POST /api/pos/held/:id/resume error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Delete a held sale ─────────────────────────────────────────────────────
// RESTORES the reserved stock back to the products, then removes the record.
router.delete('/:id', auth, Staff, requireStaffPermission('pos.open_counter'), async (req, res) => {
  try {
    const held = await HeldSale.findById(req.params.id);

    if (!held) {
      return res.status(404).json({ success: false, message: 'Held sale not found' });
    }

    // Only held (never resumed) sales still hold a reservation.
    if (held.status === 'held') {
      await applyStockDelta(held.items, +1);
    }

    held.auditTrail.push({
      action: 'delete',
      by: req.user._id,
      byName: req.user.name
    });

    await held.deleteOne();

    return res.json({ success: true, message: 'Held sale deleted — reserved stock restored' });
  } catch (error) {
    console.error('DELETE /api/pos/held/:id error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;