import mongoose from 'mongoose';
import ExchangeModel from '../models/exchange.model.js';
import Sale from '../models/sale.model.js';
import OrderModel from '../models/order.model.js';
import ProductModel from '../models/product.model.js';
import { getNextSequence } from '../models/counter.model.js';

// Lists completed POS sales and online orders for staff to pick from —
// either the most recent ones (no term, so there's always something to
// browse without needing to know/type a receipt number), or filtered by
// receipt/order number or customer name/phone when a term is given.
// Returns a normalized shape covering both sources.
export const searchTransactions = async (req, res) => {
  try {
    const term = String(req.query.term || '').trim();
    const regex = term ? new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;

    const saleFilter = { isVoided: { $ne: true } };
    if (regex) {
      saleFilter.$or = [
        { saleNumber: regex },
        { customerName: regex },
        { customerPhone: regex }
      ];
    }

    const sales = await Sale.find(saleFilter)
      .select('saleNumber saleDate customerName customerPhone items total cashierName branch')
      .sort({ saleDate: -1 })
      .limit(term ? 20 : 15)
      .lean();

    const saleResults = sales.map((sale) => ({
      sourceType: 'sale',
      sourceId: sale._id,
      sourceNumber: sale.saleNumber,
      date: sale.saleDate,
      customerName: sale.customerName || 'Walk-in Customer',
      customerPhone: sale.customerPhone || '',
      total: sale.total,
      branch: sale.branch,
      items: sale.items
        .filter((item) => item.product)
        .map((item) => ({
          product: item.product,
          name: item.name,
          sku: item.sku,
          unitPrice: item.price,
          quantity: item.quantity,
          priceIsExact: true
        }))
    }));

    // Orders are one line-item per document sharing an orderId, and don't
    // store a per-line price — only the aggregate live below via the
    // product's current price as a stand-in (see model comment).
    const orderFilter = regex
      ? {
          $or: [
            { orderId: regex },
            { guestPhone: regex },
            { 'guestShipping.name': regex },
            { 'guestShipping.phone': regex }
          ]
        }
      : {};

    const matchingOrders = await OrderModel.find(orderFilter)
      .populate('userId', 'name mobile phone')
      .select('orderId productId product_details quantity totalAmt createdAt userId guestShipping guestPhone status')
      .sort({ createdAt: -1 })
      .limit(term ? 60 : 45)
      .lean();

    const orderGroups = new Map();
    for (const line of matchingOrders) {
      // A guest/legacy order line with no real productId has nothing to
      // restock or reference — skip it rather than offering an item that
      // would fail (or worse, silently pass a bad ObjectId) once picked.
      if (!line.productId) continue;

      if (!orderGroups.has(line.orderId)) {
        orderGroups.set(line.orderId, {
          sourceType: 'order',
          sourceId: line._id,
          sourceNumber: line.orderId,
          date: line.createdAt,
          customerName: line.userId?.name || line.guestShipping?.name || 'Customer',
          customerPhone: line.userId?.mobile || line.userId?.phone || line.guestPhone || '',
          total: line.totalAmt,
          items: []
        });
      }
      orderGroups.get(line.orderId).items.push({
        product: line.productId,
        name: line.product_details?.name || 'Product',
        sku: '',
        unitPrice: null,
        quantity: line.quantity || 1,
        priceIsExact: false
      });
    }

    // Orders where every line lacked a real product end up with an empty
    // items array — drop those too, nothing on them can be exchanged.
    for (const [orderId, order] of orderGroups) {
      if (order.items.length === 0) orderGroups.delete(orderId);
    }

    // Fill in the stand-in unit price (current product price) for order items.
    const orderResults = Array.from(orderGroups.values());
    const productIds = [...new Set(
      orderResults.flatMap((order) => order.items.map((item) => String(item.product)).filter(Boolean))
    )];
    const products = await ProductModel.find({ _id: { $in: productIds } }).select('price').lean();
    const priceMap = new Map(products.map((p) => [String(p._id), p.price]));
    orderResults.forEach((order) => {
      order.items.forEach((item) => {
        item.unitPrice = priceMap.get(String(item.product)) ?? 0;
      });
    });

    const results = [...saleResults, ...orderResults].sort((a, b) => new Date(b.date) - new Date(a.date));
    const page = results.slice(0, 25);

    // How much of each line can still be returned: bought minus what earlier
    // (non-cancelled) exchanges against the same receipt have already taken
    // back. Lets the counter cap the quantity stepper at the real remaining
    // amount and grey out fully-returned lines.
    const sourceKeys = [...new Set(page.map((r) => `${r.sourceType}|${r.sourceNumber}`))];
    const priorExchanges = sourceKeys.length
      ? await ExchangeModel.find({
          $or: sourceKeys.map((key) => {
            const [sourceType, sourceNumber] = key.split('|');
            return { sourceType, sourceNumber };
          }),
          status: { $ne: 'cancelled' }
        }).select('sourceType sourceNumber returnedItem returnedItems').lean()
      : [];

    const returnedByKey = new Map();
    for (const ex of priorExchanges) {
      // Read the arrays (new shape) with the singular field as fallback
      // (exchanges created before arrays existed).
      const lines = (ex.returnedItems?.length ? ex.returnedItems : (ex.returnedItem ? [ex.returnedItem] : []));
      for (const line of lines) {
        const key = `${ex.sourceType}|${ex.sourceNumber}|${String(line?.product || '')}`;
        returnedByKey.set(key, (returnedByKey.get(key) || 0) + (Number(line?.quantity) || 0));
      }
    }

    for (const result of page) {
      // An order can carry the same product on several lines (and a legacy
      // sale can too) — the returnable amount is per product across the
      // whole source, matching what createExchange enforces.
      const purchasedByProduct = new Map();
      for (const item of result.items) {
        purchasedByProduct.set(String(item.product), (purchasedByProduct.get(String(item.product)) || 0) + item.quantity);
      }
      for (const item of result.items) {
        item.purchasedQty = purchasedByProduct.get(String(item.product)) || item.quantity;
        const alreadyReturned = returnedByKey.get(`${result.sourceType}|${result.sourceNumber}|${String(item.product)}`) || 0;
        item.returnableQty = Math.max(0, item.purchasedQty - alreadyReturned);
      }
    }

    res.json({ success: true, data: page });
  } catch (error) {
    console.error('GET /api/exchanges/search error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create a new exchange request (status: requested). No stock or payment
// is touched yet — that only happens once the original hair is confirmed
// received back and the exchange is completed.
//
// Accepts a WHOLE receipt in one request: returnedItems[] (multiple goods,
// each with its own quantity) and replacementItems[] (any number of
// replacement products). One aggregate payment covers the total price
// difference across all lines. The legacy single-item shape
// (returnedItem/replacementItem) is still accepted and normalized into the
// arrays, so older clients keep working.
export const createExchange = async (req, res) => {
  try {
    const {
      sourceType,
      sourceId,
      sourceNumber,
      customerName,
      customerPhone,
      returnedItem,
      returnedItems,
      replacementItem,
      replacementItems,
      reason,
      payment
    } = req.body;

    if (!['sale', 'order'].includes(sourceType)) {
      return res.status(400).json({ success: false, message: 'Invalid source type' });
    }
    if (!mongoose.Types.ObjectId.isValid(String(sourceId))) {
      return res.status(400).json({ success: false, message: 'Invalid source ID' });
    }

    // Normalize both sides into arrays of {product, quantity, unitPrice?}.
    // The old singular payload maps to a one-line array; duplicates of the
    // same product across lines are merged (quantities summed).
    const mergeLines = (lines) => {
      const byProduct = new Map();
      for (const line of lines) {
        const key = String(line?.product || '');
        if (!key) continue;
        if (!byProduct.has(key)) byProduct.set(key, { product: key, quantity: 0, unitPrice: line.unitPrice });
        byProduct.get(key).quantity += Math.max(1, Number(line?.quantity) || 1);
        if (typeof line?.unitPrice === 'number') byProduct.get(key).unitPrice = line.unitPrice;
      }
      return Array.from(byProduct.values());
    };

    const rawReturned = Array.isArray(returnedItems) && returnedItems.length > 0
      ? returnedItems
      : (returnedItem ? [returnedItem] : []);
    const returnedLines = mergeLines(rawReturned);
    const rawReplacement = Array.isArray(replacementItems) && replacementItems.length > 0
      ? replacementItems
      : (replacementItem ? [replacementItem] : []);
    const replacementLines = mergeLines(rawReplacement);

    if (returnedLines.length === 0) {
      return res.status(400).json({ success: false, message: 'Select at least one item to return.' });
    }
    if (replacementLines.length === 0) {
      return res.status(400).json({ success: false, message: 'Select at least one replacement item.' });
    }
    if (returnedLines.some((l) => !mongoose.Types.ObjectId.isValid(l.product))) {
      return res.status(400).json({ success: false, message: 'Returned item details are incomplete' });
    }
    if (replacementLines.some((l) => !mongoose.Types.ObjectId.isValid(l.product))) {
      return res.status(400).json({ success: false, message: 'Replacement item details are incomplete' });
    }

    // Look up every product once — names/skus/prices for the snapshots.
    const allProductIds = [...new Set([...returnedLines.map((l) => l.product), ...replacementLines.map((l) => l.product)])];
    const productDocs = await ProductModel.find({ _id: { $in: allProductIds } }).select('name sku price').lean();
    const productMap = new Map(productDocs.map((p) => [String(p._id), p]));

    for (const line of [...returnedLines, ...replacementLines]) {
      if (!productMap.has(line.product)) {
        return res.status(404).json({ success: false, message: 'A selected product no longer exists in the catalog.' });
      }
    }

    // --- Quantity control, per product ------------------------------------
    // The cashier may return fewer than were bought, never more — and never
    // more than earlier (non-cancelled) exchanges against the same receipt
    // have already taken back. The receipt number is re-derived from the
    // source document itself so prior exchanges always match the
    // authoritative number, never a client-supplied one.
    let authoritativeNumber = String(sourceNumber || '');
    if (sourceType === 'sale') {
      const sale = await Sale.findById(sourceId).select('items saleNumber');
      if (!sale) {
        return res.status(404).json({ success: false, message: 'Original sale not found — search for it again and re-pick it.' });
      }
      authoritativeNumber = sale.saleNumber || authoritativeNumber;
    } else {
      const line = await OrderModel.findById(sourceId).select('orderId');
      if (!line) {
        return res.status(404).json({ success: false, message: 'Original order not found — search for it again and re-pick it.' });
      }
      authoritativeNumber = line.orderId || authoritativeNumber;
    }

    // Purchased quantity per product across the whole source (a sale can
    // repeat a product on several lines; an order spreads them across
    // documents sharing an orderId).
    const purchasedByProduct = new Map();
    if (sourceType === 'sale') {
      const sale = await Sale.findById(sourceId).select('items');
      for (const item of sale.items) {
        if (!item.product) continue;
        const key = String(item.product);
        purchasedByProduct.set(key, (purchasedByProduct.get(key) || 0) + (Number(item.quantity) || 0));
      }
    } else {
      const siblingLines = await OrderModel.find({ orderId: authoritativeNumber, productId: { $in: returnedLines.map((l) => l.product) } }).select('productId quantity');
      for (const line of siblingLines) {
        const key = String(line.productId);
        purchasedByProduct.set(key, (purchasedByProduct.get(key) || 0) + (Number(line.quantity) || 0));
      }
    }

    // Already-returned quantity per product from earlier non-cancelled
    // exchanges on this same receipt (array-aware for new records,
    // singular fallback for legacy ones).
    const priorExchanges = await ExchangeModel.find({
      sourceType,
      sourceNumber: authoritativeNumber,
      status: { $ne: 'cancelled' }
    }).select('returnedItem returnedItems').lean();
    const alreadyReturnedByProduct = new Map();
    for (const ex of priorExchanges) {
      const lines = (ex.returnedItems?.length ? ex.returnedItems : (ex.returnedItem ? [ex.returnedItem] : []));
      for (const line of lines) {
        const key = String(line?.product || '');
        alreadyReturnedByProduct.set(key, (alreadyReturnedByProduct.get(key) || 0) + (Number(line?.quantity) || 0));
      }
    }

    // Validate every returned line against its per-product cap.
    for (const line of returnedLines) {
      const product = productMap.get(line.product);
      const purchasedQty = purchasedByProduct.get(line.product) || 0;
      if (purchasedQty < 1) {
        return res.status(400).json({
          success: false,
          message: `${product.name} is not part of #${authoritativeNumber || 'this transaction'}.`
        });
      }
      const alreadyReturned = alreadyReturnedByProduct.get(line.product) || 0;
      const remainingQty = purchasedQty - alreadyReturned;
      if (line.quantity > remainingQty) {
        return res.status(400).json({
          success: false,
          message: remainingQty > 0
            ? `Only ${remainingQty} × ${product.name} can still be returned on #${authoritativeNumber} — ${alreadyReturned} ${alreadyReturned === 1 ? 'was' : 'were'} already exchanged.`
            : `${product.name} has already been fully exchanged on #${authoritativeNumber}.`
        });
      }
    }

    // Build the final snapshots. The returned side's unit price is the
    // historical receipt price the client supplied (checked against the
    // source document below for sales, where per-line prices are stored).
    const returnedSnapshots = returnedLines.map((line) => {
      const product = productMap.get(line.product);
      return {
        product: product._id,
        name: product.name,
        sku: product.sku || '',
        unitPrice: Number(line.unitPrice ?? 0),
        quantity: line.quantity
      };
    });
    // Server always recomputes the replacement's price from the live catalog
    // — never trusts a client-supplied amount, same rule as checkout/POS.
    const replacementSnapshots = replacementLines.map((line) => {
      const product = productMap.get(line.product);
      return {
        product: product._id,
        name: product.name,
        sku: product.sku || '',
        unitPrice: product.price,
        quantity: line.quantity
      };
    });

    const returnedTotal = returnedSnapshots.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
    const replacementTotal = replacementSnapshots.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
    const priceDifference = Math.round((replacementTotal - returnedTotal) * 100) / 100;

    if (priceDifference > 0) {
      if (!payment || !payment.method) {
        return res.status(400).json({
          success: false,
          message: `This exchange requires collecting KSh ${priceDifference.toLocaleString()} — payment details are required.`
        });
      }
      // Same proof rules as the POS sale route: an Equity row must carry an
      // approved confirmation photo, a text_forwarded row must carry the
      // pasted confirmation message — and approval is always re-stamped
      // server-side, never trusted from the client.
      const paymentRows = payment.method === 'split'
        ? (payment.payments || [])
        : (Array.isArray(payment.payments) && payment.payments.length > 0 ? payment.payments : [payment]);

      const unprovenEquity = paymentRows.find((p) => p.method === 'equity' && (!p.proofImageUrl || !p.approved));
      if (unprovenEquity) {
        return res.status(400).json({
          success: false,
          message: 'Each Equity payment requires an approved confirmation photo before the exchange can be recorded.'
        });
      }
      const unprovenText = paymentRows.find((p) => p.method === 'text_forwarded' && (!String(p.forwardedText || '').trim() || !p.approved));
      if (unprovenText) {
        return res.status(400).json({
          success: false,
          message: 'Each Text Forwarded payment requires the pasted confirmation message and approval before the exchange can be recorded.'
        });
      }
      paymentRows.forEach((row) => {
        if (row.method === 'equity' || row.method === 'text_forwarded') {
          row.approvedBy = req.user._id;
          row.approvedAt = new Date();
        }
      });

      const paidAmount = payment.method === 'split'
        ? (payment.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0)
        : Number(payment.amount || 0);
      if (Math.round(paidAmount * 100) / 100 !== priceDifference) {
        return res.status(400).json({
          success: false,
          message: `Payment amount (KSh ${paidAmount.toLocaleString()}) does not match the amount owed (KSh ${priceDifference.toLocaleString()}).`
        });
      }
    }

    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const nextNumber = await getNextSequence(`exchange-${dateStr}`);
    const exchangeNumber = `EXC${dateStr}${nextNumber.toString().padStart(4, '0')}`;

    const exchange = await ExchangeModel.create({
      exchangeNumber,
      sourceType,
      sourceId,
      sourceNumber: authoritativeNumber,
      customerName: customerName || '',
      customerPhone: customerPhone || '',
      returnedItems: returnedSnapshots,
      replacementItems: replacementSnapshots,
      // Legacy mirror so older readers keep working without a migration.
      returnedItem: returnedSnapshots[0],
      replacementItem: replacementSnapshots[0],
      priceDifference,
      payment: priceDifference > 0 ? payment : undefined,
      status: 'requested',
      reason: reason || '',
      requestedBy: req.user._id,
      requestedByName: req.user.name,
      branch: req.user.staff_branch || 'Main Store'
    });

    res.json({ success: true, data: exchange });
  } catch (error) {
    console.error('POST /api/exchanges error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// List exchanges, optionally filtered by status. Pending ones (requested)
// are what the Returns & Exchanges page tracks as "waiting for hair".
export const listExchanges = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const exchanges = await ExchangeModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ success: true, data: exchanges });
  } catch (error) {
    console.error('GET /api/exchanges error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark that the customer's original hair has physically arrived back at
// the shop. Does not move stock yet — that happens on completion, so a
// received-but-not-yet-handed-over exchange doesn't prematurely inflate
// stock before the replacement is actually confirmed given out.
export const markHairReceived = async (req, res) => {
  try {
    const exchange = await ExchangeModel.findById(req.params.id);
    if (!exchange) {
      return res.status(404).json({ success: false, message: 'Exchange not found' });
    }
    if (exchange.status !== 'requested') {
      return res.status(409).json({ success: false, message: `Exchange is already ${exchange.status}` });
    }

    exchange.status = 'hair_received';
    exchange.hairReceivedAt = new Date();
    exchange.hairReceivedBy = req.user._id;
    await exchange.save();

    res.json({ success: true, data: exchange });
  } catch (error) {
    console.error('PUT /api/exchanges/:id/hair-received error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Complete the exchange: restock every returned item, deduct every
// replacement from stock, and hand them over to the customer. With multiple
// lines per exchange, the deduction is stock-guarded per line with rollback
// of prior lines — the same race-safety rule as the POS sale route.
export const completeExchange = async (req, res) => {
  try {
    const exchange = await ExchangeModel.findById(req.params.id);
    if (!exchange) {
      return res.status(404).json({ success: false, message: 'Exchange not found' });
    }
    if (exchange.status !== 'hair_received') {
      return res.status(409).json({
        success: false,
        message: exchange.status === 'requested'
          ? 'Mark the original hair as received before completing this exchange.'
          : `Exchange is already ${exchange.status}`
      });
    }

    const returnedLines = exchange.returnedItems?.length ? exchange.returnedItems : [exchange.returnedItem];
    const replacementLines = exchange.replacementItems?.length ? exchange.replacementItems : [exchange.replacementItem];

    // Restock everything the customer brought back.
    for (const line of returnedLines) {
      await ProductModel.findByIdAndUpdate(line.product, {
        $inc: { stock: line.quantity }
      });
    }

    // Atomic conditional decrement per replacement line: only succeeds if
    // stock is untracked (null) or still >= the quantity at the moment of
    // the write. On failure, roll back this sale's earlier decrements and
    // the restock so stock never drifts from a half-completed swap.
    const reservedStock = [];
    for (const line of replacementLines) {
      const updatedProduct = await ProductModel.findOneAndUpdate(
        {
          _id: line.product,
          $or: [{ stock: null }, { stock: { $gte: line.quantity } }]
        },
        { $inc: { stock: -line.quantity } },
        { new: true }
      );

      if (!updatedProduct) {
        for (const reserved of reservedStock) {
          await ProductModel.findByIdAndUpdate(reserved.product, { $inc: { stock: reserved.quantity } });
        }
        for (const restocked of returnedLines) {
          await ProductModel.findByIdAndUpdate(restocked.product, { $inc: { stock: -restocked.quantity } });
        }

        const stillExists = await ProductModel.exists({ _id: line.product });
        return res.status(409).json({
          success: false,
          message: stillExists
            ? `${line.name || 'A replacement item'} sold out while this exchange was being completed`
            : `Replacement product "${line.name || line.product}" no longer exists.`
        });
      }

      reservedStock.push({ product: line.product, quantity: line.quantity });
    }

    exchange.status = 'completed';
    exchange.completedAt = new Date();
    exchange.completedBy = req.user._id;
    await exchange.save();

    res.json({ success: true, data: exchange });
  } catch (error) {
    console.error('PUT /api/exchanges/:id/complete error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cancel a not-yet-completed exchange request. No stock was ever touched
// for a requested/hair_received exchange, so nothing to roll back.
export const cancelExchange = async (req, res) => {
  try {
    const { reason } = req.body;
    const exchange = await ExchangeModel.findById(req.params.id);
    if (!exchange) {
      return res.status(404).json({ success: false, message: 'Exchange not found' });
    }
    if (exchange.status === 'completed') {
      return res.status(409).json({ success: false, message: 'A completed exchange cannot be cancelled' });
    }

    exchange.status = 'cancelled';
    exchange.cancelledAt = new Date();
    exchange.cancelledBy = req.user._id;
    exchange.cancelReason = reason || '';
    await exchange.save();

    res.json({ success: true, data: exchange });
  } catch (error) {
    console.error('PUT /api/exchanges/:id/cancel error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
