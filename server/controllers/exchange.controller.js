import mongoose from 'mongoose';
import ExchangeModel from '../models/exchange.model.js';
import Sale from '../models/sale.model.js';
import OrderModel from '../models/order.model.js';
import ProductModel from '../models/product.model.js';
import { getNextSequence } from '../models/counter.model.js';

// Search completed POS sales and online orders by receipt/order number or
// customer name/phone, so staff can find the original transaction to start
// an exchange against. Returns a normalized shape covering both sources.
export const searchTransactions = async (req, res) => {
  try {
    const term = String(req.query.term || '').trim();
    if (!term) {
      return res.json({ success: true, data: [] });
    }

    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const sales = await Sale.find({
      isVoided: { $ne: true },
      $or: [
        { saleNumber: regex },
        { customerName: regex },
        { customerPhone: regex }
      ]
    })
      .select('saleNumber saleDate customerName customerPhone items total cashierName branch')
      .sort({ saleDate: -1 })
      .limit(20)
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
      items: sale.items.map((item) => ({
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
    const matchingOrders = await OrderModel.find({
      $or: [
        { orderId: regex },
        { guestPhone: regex },
        { 'guestShipping.name': regex },
        { 'guestShipping.phone': regex }
      ]
    })
      .populate('userId', 'name mobile phone')
      .select('orderId productId product_details quantity totalAmt createdAt userId guestShipping guestPhone status')
      .sort({ createdAt: -1 })
      .limit(60)
      .lean();

    const orderGroups = new Map();
    for (const line of matchingOrders) {
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

    res.json({ success: true, data: results.slice(0, 25) });
  } catch (error) {
    console.error('GET /api/exchanges/search error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create a new exchange request (status: requested). No stock or payment
// is touched yet — that only happens once the original hair is confirmed
// received back and the exchange is completed.
export const createExchange = async (req, res) => {
  try {
    const {
      sourceType,
      sourceId,
      sourceNumber,
      customerName,
      customerPhone,
      returnedItem,
      replacementItem,
      reason,
      payment
    } = req.body;

    if (!['sale', 'order'].includes(sourceType)) {
      return res.status(400).json({ success: false, message: 'Invalid source type' });
    }
    if (!mongoose.Types.ObjectId.isValid(String(sourceId))) {
      return res.status(400).json({ success: false, message: 'Invalid source ID' });
    }
    if (!returnedItem?.product || !returnedItem?.quantity || typeof returnedItem?.unitPrice !== 'number') {
      return res.status(400).json({ success: false, message: 'Returned item details are incomplete' });
    }
    if (!replacementItem?.product || !replacementItem?.quantity) {
      return res.status(400).json({ success: false, message: 'Replacement item details are incomplete' });
    }

    const replacementProduct = await ProductModel.findById(replacementItem.product).select('name sku price');
    if (!replacementProduct) {
      return res.status(404).json({ success: false, message: 'Replacement product not found' });
    }

    const returnedProduct = await ProductModel.findById(returnedItem.product).select('name sku');
    if (!returnedProduct) {
      return res.status(404).json({ success: false, message: 'Returned product not found' });
    }

    const returnedQty = Math.max(1, Number(returnedItem.quantity));
    const replacementQty = Math.max(1, Number(replacementItem.quantity));
    const returnedTotal = Number(returnedItem.unitPrice) * returnedQty;
    // Server always recomputes the replacement's price from the live catalog
    // — never trusts a client-supplied amount, same rule as checkout/POS.
    const replacementUnitPrice = replacementProduct.price;
    const replacementTotal = replacementUnitPrice * replacementQty;
    const priceDifference = Math.round((replacementTotal - returnedTotal) * 100) / 100;

    if (priceDifference > 0) {
      if (!payment || !payment.method) {
        return res.status(400).json({
          success: false,
          message: `This exchange requires collecting KSh ${priceDifference.toLocaleString()} — payment details are required.`
        });
      }
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
      sourceNumber,
      customerName: customerName || '',
      customerPhone: customerPhone || '',
      returnedItem: {
        product: returnedProduct._id,
        name: returnedProduct.name,
        sku: returnedProduct.sku || '',
        unitPrice: Number(returnedItem.unitPrice),
        quantity: returnedQty
      },
      replacementItem: {
        product: replacementProduct._id,
        name: replacementProduct.name,
        sku: replacementProduct.sku || '',
        unitPrice: replacementUnitPrice,
        quantity: replacementQty
      },
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

// Complete the exchange: restock the returned item, deduct the
// replacement from stock, and hand it over to the customer.
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

    await ProductModel.findByIdAndUpdate(exchange.returnedItem.product, {
      $inc: { stock: exchange.returnedItem.quantity }
    });
    await ProductModel.findByIdAndUpdate(exchange.replacementItem.product, {
      $inc: { stock: -exchange.replacementItem.quantity }
    });

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
