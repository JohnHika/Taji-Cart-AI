import express from 'express';
import Sale from '../models/sale.model.js';
import User from '../models/user.model.js';
import Product from '../models/product.model.js';
import EndOfDay from '../models/endOfDay.model.js';
import auth from '../middleware/auth.js';
import Staff from '../middleware/Staff.js';
import { requireStaffPermission } from '../middleware/requireStaffPermission.js';
import { hasStaffPermission } from '../utils/staffPermissions.js';
import { sendCsv } from '../utils/csv.js';
import axios from 'axios';
import { getAuthToken, MPESA_STK_URL } from '../config/mpesa.js';
import MpesaPayment from '../models/mpesaPayment.model.js';
import SaccoOperatorModel from '../models/saccooperator.model.js';
import { resolveBikeDeliveryZone, resolveDeliveryCharge } from '../utils/deliveryFee.js';

const router = express.Router();

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get('/products/lookup', auth, Staff, requireStaffPermission('pos.open_counter'), async (req, res) => {
  try {
    const rawCode = String(req.query.code || '').trim();

    if (!rawCode) {
      return res.status(400).json({ success: false, message: 'Barcode, QR code, or SKU is required' });
    }

    const exactCodeMatch = await Product.findOne({
      $or: [
        { barcode: { $regex: `^${escapeRegex(rawCode)}$`, $options: 'i' } },
        { qrCode: { $regex: `^${escapeRegex(rawCode)}$`, $options: 'i' } },
        { sku: { $regex: `^${escapeRegex(rawCode)}$`, $options: 'i' } }
      ]
    });

    if (exactCodeMatch) {
      return res.json({ success: true, data: exactCodeMatch });
    }

    const exactName = await Product.findOne({
      name: { $regex: `^${escapeRegex(rawCode)}$`, $options: 'i' }
    });

    if (exactName) {
      return res.json({ success: true, data: exactName });
    }

    const partialName = await Product.findOne({
      name: { $regex: escapeRegex(rawCode), $options: 'i' }
    });

    if (partialName) {
      return res.json({ success: true, data: partialName });
    }

    return res.status(404).json({
      success: false,
      message: 'No product matches that barcode, QR code, or SKU'
    });
  } catch (error) {
    console.error('Product lookup error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─── M-Pesa STK Push (POS split-payment) ────────────────────────────────────
router.post('/mpesa/stk-push', auth, Staff, requireStaffPermission('pos.open_counter'), async (req, res) => {
  try {
    const { phoneNumber, amount } = req.body;
    if (!phoneNumber || !amount) {
      return res.status(400).json({ success: false, message: 'Phone number and amount are required' });
    }

    const formattedPhone = phoneNumber.replace(/^(\+?254|0)/, '254');

    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    const timestamp =
      `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
      `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

    const password = Buffer.from(
      `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString('base64');

    const token = await getAuthToken();

    // Determine callback base URL robustly
    const hostHeader    = req.headers['x-forwarded-host'] || req.headers.host;
    const protoHeader   = req.headers['x-forwarded-proto'] || 'https';
    const fallbackBase  = hostHeader ? `${protoHeader}://${hostHeader}` : '';
    const baseURL       = process.env.BACKEND_URL || process.env.RENDER_EXTERNAL_URL || fallbackBase;

    const mpesaResponse = await axios.post(
      MPESA_STK_URL,
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.ceil(amount),
        PartyA: formattedPhone,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: formattedPhone,
        CallBackURL: `${baseURL}/api/mpesa/callback`,
        AccountReference: `NAWIRI-${Date.now()}`,
        TransactionDesc: 'NAWIRI POS payment',
      },
      {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        timeout: 15000,
      }
    );

    const { MerchantRequestID, CheckoutRequestID } = mpesaResponse.data;

    await MpesaPayment.create({
      merchantRequestId: MerchantRequestID,
      checkoutRequestId: CheckoutRequestID,
      phoneNumber: formattedPhone,
      amount: Math.ceil(amount),
      status: 'pending',
    });

    return res.status(200).json({ success: true, message: 'STK push sent', data: mpesaResponse.data });
  } catch (error) {
    const errMsg =
      error?.response?.data?.errorMessage ||
      error?.response?.data?.ResponseDescription ||
      error?.message ||
      'Failed to send STK push';
    console.error('M-Pesa STK Push Error:', error?.response?.data || error.message);
    return res.status(500).json({ success: false, message: errMsg });
  }
});

// Get all sales for staff
router.get('/sales', auth, Staff, requireStaffPermission(['pos.view_own_sales', 'pos.view_all_sales']), async (req, res) => {
  try {
    const { startDate, endDate, cashier } = req.query;
    const page = Math.max(1, parseInt(req.query.page || 1, 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || 20, 10)));
    const includeItemsParam = req.query.includeItems;
    const includeItems = (typeof includeItemsParam === 'string')
      ? ['1', 'true', 'yes', 'on'].includes(includeItemsParam.toLowerCase())
      : Boolean(includeItemsParam);
    
    let filter = {};
    
    // Filter by date range
    if (startDate || endDate) {
      filter.saleDate = {};
      if (startDate) filter.saleDate.$gte = new Date(startDate);
      if (endDate) filter.saleDate.$lte = new Date(endDate);
    }
    
    // Filter by cashier
    if (cashier) {
      filter.cashier = cashier;
    }
    
    // Staff who only hold pos.view_own_sales (not pos.view_all_sales) are
    // scoped to their own sales regardless of the isAdmin/role check below.
    const userRole = (req.user && req.user.role) || req.userRole || 'user';
    const isAdmin = (req.user && req.user.isAdmin === true) || req.isAdmin === true || userRole === 'admin';
    const canViewAll = isAdmin || hasStaffPermission(req.user, 'pos.view_all_sales');
    if (!canViewAll && req.user && req.user._id) {
      filter.cashier = req.user._id;
    }
    
    const query = Sale.find(filter)
      .populate('customer', 'name email')
      .populate('cashier', 'name')
      .sort({ saleDate: -1 })
      .limit(limit)
      .skip((page - 1) * limit);
    if (!includeItems) {
      query.select('saleNumber saleDate customer customerName total paymentMethod cashier cashierName branch isVoided');
    }
    const sales = await query;
    
    const total = await Sale.countDocuments(filter);
    
    res.json({
      success: true,
      data: sales,
      pagination: {
        total,
        page: page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('GET /api/pos/sales error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// CSV export of sales for staff (gated by sales.export)
router.get('/sales/export', auth, Staff, requireStaffPermission('sales.export'), async (req, res) => {
  try {
    const { startDate, endDate, cashier } = req.query;

    let filter = {};
    if (startDate || endDate) {
      filter.saleDate = {};
      if (startDate) filter.saleDate.$gte = new Date(startDate);
      if (endDate) filter.saleDate.$lte = new Date(endDate);
    }
    if (cashier) {
      filter.cashier = cashier;
    }

    const userRole = (req.user && req.user.role) || req.userRole || 'user';
    const isAdmin = (req.user && req.user.isAdmin === true) || req.isAdmin === true || userRole === 'admin';
    const canViewAll = isAdmin || hasStaffPermission(req.user, 'pos.view_all_sales');
    if (!canViewAll && req.user && req.user._id) {
      filter.cashier = req.user._id;
    }

    const sales = await Sale.find(filter)
      .populate('customer', 'name email')
      .populate('cashier', 'name')
      .sort({ saleDate: -1 })
      .limit(5000)
      .select('saleNumber saleDate customer customerName total paymentMethod cashier cashierName branch isVoided fulfillment_type');

    const headers = ['Sale #', 'Date', 'Customer', 'Cashier', 'Branch', 'Fulfillment', 'Payment', 'Total', 'Voided'];
    const rows = sales.map((sale) => [
      sale.saleNumber,
      sale.saleDate instanceof Date ? sale.saleDate.toISOString() : sale.saleDate,
      sale.customer?.name || sale.customerName || 'Walk-in',
      sale.cashier?.name || sale.cashierName || '',
      sale.branch || '',
      sale.fulfillment_type || '',
      sale.paymentMethod || '',
      sale.total,
      sale.isVoided ? 'Yes' : 'No'
    ]);

    return sendCsv(res, 'sales.csv', headers, rows);
  } catch (error) {
    console.error('GET /api/pos/sales/export error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get all sales for admin (no Staff middleware)
router.get('/admin/sales', auth, async (req, res) => {
  try {
    if (!req.user?.isAdmin && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { startDate, endDate, cashier } = req.query;
    const page = Math.max(1, parseInt(req.query.page || 1, 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || 50, 10)));
    const includeItemsParam = req.query.includeItems;
    const includeItems = (typeof includeItemsParam === 'string')
      ? ['1', 'true', 'yes', 'on'].includes(includeItemsParam.toLowerCase())
      : Boolean(includeItemsParam);

    const filter = {};
    if (startDate || endDate) {
      filter.saleDate = {};
      if (startDate) filter.saleDate.$gte = new Date(startDate);
      if (endDate) filter.saleDate.$lte = new Date(endDate);
    }
    if (cashier) filter.cashier = cashier;

    const query = Sale.find(filter)
      .populate('customer', 'name email')
      .populate('cashier', 'name')
      .sort({ saleDate: -1 })
      .limit(limit)
      .skip((page - 1) * limit);
    if (!includeItems) {
      query.select('saleNumber saleDate customer customerName customerPhone total paymentMethod cashier cashierName branch isVoided');
    }
    const sales = await query;
    const total = await Sale.countDocuments(filter);

    return res.json({
      success: true,
      data: sales,
      pagination: { total, page, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('GET /api/pos/admin/sales error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Create a new sale
router.post('/sale', auth, Staff, requireStaffPermission('pos.open_counter'), async (req, res) => {
  try {
    const {
      items,
      customer,
      subtotal,
      discount,
      tax,
      total,
      paymentMethod,
      amountTendered,
      change,
      customerName,
      customerPhone,
      payments,
      note,
      fulfillment_type,
      delivery_mode,
      deliveryZoneId,
      saccoOperatorId,
      saccoDestinationTown
    } = req.body;

    // Validate required fields
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items are required'
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Payment method is required'
      });
    }

    // Delivery charge is always resolved server-side — the counter's on-screen
    // total is a preview only, same trust rule as online checkout.
    let deliveryZone = null;
    let saccoOperator = null;
    let deliveryCharge = 0;
    const normalizedDeliveryMode = ['standard', 'bike', 'sacco'].includes(delivery_mode) ? delivery_mode : '';

    if (fulfillment_type === 'delivery') {
      if (normalizedDeliveryMode === 'bike') {
        const zoneResult = await resolveBikeDeliveryZone(deliveryZoneId);
        if (!zoneResult.zone) {
          return res.status(400).json({ success: false, message: zoneResult.error });
        }
        deliveryZone = zoneResult.zone;
        deliveryCharge = resolveDeliveryCharge({ fulfillmentType: 'delivery', deliveryZone });
      } else if (normalizedDeliveryMode === 'sacco') {
        if (!saccoOperatorId || !saccoDestinationTown) {
          return res.status(400).json({ success: false, message: 'Select a SACCO/coach operator and destination town.' });
        }
        saccoOperator = await SaccoOperatorModel.findOne({ _id: saccoOperatorId, isActive: true });
        if (!saccoOperator) {
          return res.status(400).json({ success: false, message: 'Selected operator is no longer available. Please pick another.' });
        }
        deliveryCharge = resolveDeliveryCharge({ fulfillmentType: 'sacco_pickup' });
      } else {
        deliveryCharge = resolveDeliveryCharge({ fulfillmentType: 'delivery', deliveryZone: null });
      }
    }

    // Any Equity payment row must carry proof (an uploaded SMS screenshot URL)
    // and be explicitly approved by the cashier before the sale can be recorded.
    // approvedBy/approvedAt are set server-side (never trusted from the client).
    const equityRows = Array.isArray(payments) ? payments.filter(p => p.method === 'equity') : [];
    const unprovenEquityRow = equityRows.find(p => !p.proofImageUrl || !p.approved);
    if (unprovenEquityRow) {
      return res.status(400).json({
        success: false,
        message: 'Each Equity payment requires an approved proof image before the sale can be completed'
      });
    }
    equityRows.forEach((row) => {
      row.approvedBy = req.user._id;
      row.approvedAt = new Date();
    });

    const normalizedItemsMap = new Map();
    for (const rawItem of items) {
      const productId = String(rawItem.product || rawItem.productId || '').trim();
      const quantity = Math.max(1, Number(rawItem.quantity || 1));
      const unitPrice = Number(rawItem.price || 0);
      const itemTotal = Number(rawItem.total || unitPrice * quantity);

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: 'Each sale item must include a product id'
        });
      }

      if (!normalizedItemsMap.has(productId)) {
        normalizedItemsMap.set(productId, {
          product: productId,
          sku: rawItem.sku || '',
          name: rawItem.name || '',
          price: unitPrice,
          quantity,
          total: itemTotal
        });
      } else {
        const existing = normalizedItemsMap.get(productId);
        existing.quantity += quantity;
        existing.total += itemTotal;
        if (!existing.sku && rawItem.sku) existing.sku = rawItem.sku;
        if (!existing.name && rawItem.name) existing.name = rawItem.name;
        if (!existing.price && unitPrice) existing.price = unitPrice;
      }
    }

    const normalizedItems = Array.from(normalizedItemsMap.values());
    const productIds = normalizedItems.map(item => item.product);
    const products = await Product.find({ _id: { $in: productIds } }).select('_id name sku price stock');
    const productMap = new Map(products.map(product => [String(product._id), product]));

    for (const item of normalizedItems) {
      const product = productMap.get(String(item.product));

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found for item ${item.name || item.product}`
        });
      }

      // POS allows negative inventory: only hard-block when stock is a known positive number
      // AND quantity requested exceeds it. Zero or null stock = allow (reconcile later).
      if (product.stock != null && product.stock > 0 && product.stock < item.quantity) {
        return res.status(409).json({
          success: false,
          message: `${product.name} only has ${product.stock} item(s) left in stock`
        });
      }

      item.name = item.name || product.name;
      item.sku = item.sku || product.sku || '';
      item.price = item.price || product.price;
      item.total = Number(item.total || item.price * item.quantity);
    }
    
    // Generate sale number
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const lastSale = await Sale.findOne({
      saleNumber: { $regex: `^${dateStr}` }
    }).sort({ saleNumber: -1 });
    
    let nextNumber = 1;
    if (lastSale) {
      const lastNumber = parseInt(lastSale.saleNumber.slice(-4));
      nextNumber = lastNumber + 1;
    }
    
    const saleNumber = `${dateStr}${nextNumber.toString().padStart(4, '0')}`;
    
    // Create sale record
    const reservedStock = [];
    for (const item of normalizedItems) {
      // Update stock without minimum constraint so it can go negative (POS negative inventory).
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: item.product },
        { $inc: { stock: -item.quantity } },
        { new: true }
      );

      if (!updatedProduct) {
        // Product doesn't exist at all — rollback any prior decrements
        for (const reserved of reservedStock) {
          await Product.findByIdAndUpdate(reserved.product, { $inc: { stock: reserved.quantity } });
        }

        return res.status(404).json({
          success: false,
          message: `Product "${item.name || item.product}" not found. Please rescan and try again.`
        });
      }

      reservedStock.push({ product: item.product, quantity: item.quantity });
    }

    const sale = new Sale({
      saleNumber,
      items: normalizedItems,
      customer: customer || null,
      customerName: customerName || '',
      customerPhone: customerPhone || '',
      fulfillment_type: ['in_store', 'pickup', 'delivery'].includes(fulfillment_type) ? fulfillment_type : 'in_store',
      delivery_mode: normalizedDeliveryMode,
      delivery_zone: deliveryZone ? deliveryZone._id : undefined,
      delivery_zone_name: deliveryZone ? deliveryZone.name : '',
      delivery_zone_fare: deliveryZone ? deliveryZone.fare : undefined,
      sacco_operator: saccoOperator ? saccoOperator._id : undefined,
      sacco_operator_name: saccoOperator ? saccoOperator.name : '',
      sacco_destination_town: saccoOperator ? saccoDestinationTown : '',
      deliveryCharge,
  subtotal,
  discount: discount || 0,
  tax: typeof tax === 'number' ? tax : 0,
      total,
      paymentMethod,
      payments: Array.isArray(payments) ? payments : undefined,
      amountTendered: amountTendered || total,
      change: change || 0,
      cashier: req.user._id,
      cashierName: req.user.name,
      saleDate: new Date(),
      notes: note || '',
      branch: req.user.staff_branch || 'Main Store'
    });
    
    // Add audit trail entry
    sale.auditTrail = sale.auditTrail || [];
    sale.auditTrail.push({
      action: 'create',
      by: req.user._id,
      byName: req.user.name,
      meta: {
        paymentMethod,
        payments: Array.isArray(payments) ? payments : [],
        customerName: customerName || '',
        customerPhone: customerPhone || ''
      }
    });

    try {
      await sale.save();
    } catch (saveError) {
      for (const reserved of reservedStock) {
        await Product.findByIdAndUpdate(reserved.product, { $inc: { stock: reserved.quantity } });
      }
      throw saveError;
    }
    
    res.status(201).json({
      success: true,
      message: 'Sale completed successfully',
      saleNumber: sale.saleNumber,
      data: sale
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get sale by ID
router.get('/sale/:id', auth, Staff, requireStaffPermission('receipt.reprint'), async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('cashier', 'name');
    
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }
    
    // If user is staff (not admin), only allow viewing their own sales
    if (req.user.role === 'staff' && !req.user.isAdmin && sale.cashier._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    res.json({
      success: true,
      data: sale
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Admin: Get sale by ID
router.get('/admin/sale/:id', auth, async (req, res) => {
  try {
    if (!req.user?.isAdmin && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    const sale = await Sale.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('cashier', 'name');
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }
    return res.json({ success: true, data: sale });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Get daily sales summary
router.get('/summary/daily', auth, Staff, requireStaffPermission('pos.view_analytics'), async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    
    // Set to start and end of day
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    let filter = {
      saleDate: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    };
    
    // If user is staff (not admin), only show their sales
    if (req.user.role === 'staff' && !req.user.isAdmin) {
      filter.cashier = req.user._id;
    }
    
    const salesData = await Sale.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$total' },
          totalTransactions: { $sum: 1 },
          averageTransaction: { $avg: '$total' },
          totalItems: { $sum: { $sum: '$items.quantity' } },
          cashSales: {
            $sum: {
              $cond: [{ $eq: ['$paymentMethod', 'cash'] }, '$total', 0]
            }
          },
          equitySales: {
            $sum: {
              $cond: [{ $eq: ['$paymentMethod', 'equity'] }, '$total', 0]
            }
          },
          splitSales: {
            $sum: {
              $cond: [{ $eq: ['$paymentMethod', 'split'] }, '$total', 0]
            }
          }
        }
      }
    ]);

    const summary = salesData[0] || {
      totalSales: 0,
      totalTransactions: 0,
      averageTransaction: 0,
      totalItems: 0,
      cashSales: 0,
      equitySales: 0,
      splitSales: 0
    };
    
    // Get top selling products for the day
    const topProducts = await Sale.aggregate([
      { $match: filter },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          productName: { $first: '$items.name' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.total' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 }
    ]);
    
    res.json({
      success: true,
      data: {
        summary,
        topProducts,
        date: targetDate.toISOString().split('T')[0]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Void/Cancel a sale (admin only)
router.put('/sale/:id/void', auth, async (req, res) => {
  try {
    // Only admin can void sales
    if (!req.user.isAdmin && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can void sales'
      });
    }
    
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Void reason is required'
      });
    }
    
    const sale = await Sale.findById(req.params.id);
    
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }
    
    if (sale.isVoided) {
      return res.status(400).json({
        success: false,
        message: 'Sale is already voided'
      });
    }
    
    // Update sale as voided
    sale.isVoided = true;
    sale.voidReason = reason;
    sale.voidedBy = req.user._id;
    sale.voidedAt = new Date();
    sale.auditTrail = sale.auditTrail || [];
    sale.auditTrail.push({
      action: 'void',
      by: req.user._id,
      byName: req.user.name,
      meta: { reason }
    });
    await sale.save();
    
    // Restore product stock
    for (const item of sale.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: item.quantity } }
      );
    }
    
    res.json({
      success: true,
      message: 'Sale voided successfully',
      data: sale
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get sales analytics
router.get('/analytics', auth, Staff, requireStaffPermission('pos.view_analytics'), async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    let dateFilter = {};
    const now = new Date();
    
    switch (period) {
      case '24h':
        dateFilter = {
          $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000)
        };
        break;
      case '7d':
        dateFilter = {
          $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        };
        break;
      case '30d':
        dateFilter = {
          $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        };
        break;
      case '90d':
        dateFilter = {
          $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        };
        break;
    }
    
    let filter = { saleDate: dateFilter };
    
    // If user is staff (not admin), only show their sales
    if (req.user.role === 'staff' && !req.user.isAdmin) {
      filter.cashier = req.user._id;
    }
    
    // Sales over time
    const salesOverTime = await Sale.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$saleDate'
            }
          },
          totalSales: { $sum: '$total' },
          transactionCount: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    // Payment method breakdown
    const paymentBreakdown = await Sale.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$paymentMethod',
          total: { $sum: '$total' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Hourly sales pattern
    const hourlySales = await Sale.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $hour: '$saleDate' },
          totalSales: { $sum: '$total' },
          transactionCount: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    res.json({
      success: true,
      data: {
        salesOverTime,
        paymentBreakdown,
        hourlySales,
        period
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Admin endpoint for comprehensive POS sales statistics
router.get('/admin/statistics', auth, async (req, res) => {
  try {
    // Check if user is admin (using consistent pattern)
    if (!req.user.isAdmin && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { startDate, endDate } = req.query;
    
    // Build date filter
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.saleDate = {};
      if (startDate) dateFilter.saleDate.$gte = new Date(startDate);
      if (endDate) dateFilter.saleDate.$lte = new Date(endDate);
    }

    // Get comprehensive sales statistics
    const [
      totalSales,
      salesStats,
      paymentMethodStats,
      cashierStats,
      dailyRevenue,
      topSellingItems
    ] = await Promise.all([
      // Total sales count
      Sale.countDocuments({ ...dateFilter, isVoided: { $ne: true } }),
      
      // Overall sales statistics
      Sale.aggregate([
        { $match: { ...dateFilter, isVoided: { $ne: true } } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$total' },
            totalDiscount: { $sum: '$discount' },
            totalTax: { $sum: '$tax' },
            averageOrderValue: { $avg: '$total' },
            totalItemsSold: { $sum: { $sum: '$items.quantity' } }
          }
        }
      ]),
      
      // Payment method breakdown
      Sale.aggregate([
        { $match: { ...dateFilter, isVoided: { $ne: true } } },
        {
          $group: {
            _id: '$paymentMethod',
            count: { $sum: 1 },
            totalAmount: { $sum: '$total' }
          }
        }
      ]),
      
      // Cashier performance
      Sale.aggregate([
        { $match: { ...dateFilter, isVoided: { $ne: true } } },
        {
          $group: {
            _id: '$cashier',
            cashierName: { $first: '$cashierName' },
            salesCount: { $sum: 1 },
            totalRevenue: { $sum: '$total' },
            averageOrderValue: { $avg: '$total' }
          }
        },
        { $sort: { totalRevenue: -1 } }
      ]),
      
      // Daily revenue breakdown
      Sale.aggregate([
        { $match: { ...dateFilter, isVoided: { $ne: true } } },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$saleDate' }
            },
            dailyRevenue: { $sum: '$total' },
            salesCount: { $sum: 1 },
            averageOrderValue: { $avg: '$total' }
          }
        },
        { $sort: { '_id': 1 } }
      ]),
      
      // Top selling items
      Sale.aggregate([
        { $match: { ...dateFilter, isVoided: { $ne: true } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            productName: { $first: '$items.name' },
            quantitySold: { $sum: '$items.quantity' },
            totalRevenue: { $sum: '$items.total' },
            averagePrice: { $avg: '$items.price' }
          }
        },
        { $sort: { quantitySold: -1 } },
        { $limit: 10 }
      ])
    ]);

    // Get voided sales count
    const voidedSalesCount = await Sale.countDocuments({ 
      ...dateFilter, 
      isVoided: true 
    });

    const stats = salesStats[0] || {
      totalRevenue: 0,
      totalDiscount: 0,
      totalTax: 0,
      averageOrderValue: 0,
      totalItemsSold: 0
    };

    res.json({
      success: true,
      data: {
        summary: {
          totalSales,
          voidedSales: voidedSalesCount,
          totalRevenue: stats.totalRevenue,
          totalDiscount: stats.totalDiscount,
          totalTax: stats.totalTax,
          averageOrderValue: stats.averageOrderValue,
          totalItemsSold: stats.totalItemsSold
        },
        paymentMethods: paymentMethodStats,
        cashierPerformance: cashierStats,
        dailyRevenue,
        topSellingItems,
        dateRange: {
          startDate: startDate || null,
          endDate: endDate || null
        }
      }
    });
  } catch (error) {
    console.error('POS Admin Statistics Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ─── End of Day ──────────────────────────────────────────────────────────────

const dateStringToDayBounds = (dateStr) => {
  const startOfDay = new Date(`${dateStr}T00:00:00.000`);
  const endOfDay = new Date(`${dateStr}T23:59:59.999`);
  return { startOfDay, endOfDay };
};

// Get the EOD record for a date (branch defaults to the current user's branch).
// Returns null (not 404) when the day hasn't been closed yet, so the client
// can distinguish "not closed" from a real error.
router.get('/eod/:date', auth, Staff, requireStaffPermission('pos.open_counter'), async (req, res) => {
  try {
    const branch = req.user.staff_branch || 'Main Store';
    const eod = await EndOfDay.findOne({ date: req.params.date, branch, isReset: false })
      .populate('closedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: eod || null });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Close out a calendar day: aggregate the day's sales into an hourly
// breakdown + payment-method totals, and persist it as the EOD record.
// One active close per (date, branch) — a second attempt is rejected (409)
// unless the prior close was reset by an admin first.
router.post('/eod/close', auth, Staff, requireStaffPermission('pos.open_counter'), async (req, res) => {
  try {
    const { date } = req.body;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, message: 'A date in YYYY-MM-DD format is required' });
    }

    const branch = req.user.staff_branch || 'Main Store';

    const existing = await EndOfDay.findOne({ date, branch, isReset: false });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `${date} has already been closed for ${branch}. An admin must reset it before it can be closed again.`
      });
    }

    const { startOfDay, endOfDay } = dateStringToDayBounds(date);
    const filter = {
      branch,
      saleDate: { $gte: startOfDay, $lte: endOfDay },
      isVoided: { $ne: true }
    };

    // Actual cash received per sale: for a plain 'cash' sale that's the sale
    // total; for a 'split' sale it's just the cash row(s) inside `payments`
    // (the till only physically receives that portion). This is what a
    // cash-drawer reconciliation needs, not just sales tagged paymentMethod=cash.
    const cashReceivedExpr = {
      $cond: [
        { $eq: ['$paymentMethod', 'cash'] },
        '$total',
        {
          $cond: [
            { $eq: ['$paymentMethod', 'split'] },
            {
              $reduce: {
                input: { $filter: { input: { $ifNull: ['$payments', []] }, cond: { $eq: ['$$this.method', 'cash'] } } },
                initialValue: 0,
                in: { $add: ['$$value', '$$this.amount'] }
              }
            },
            0
          ]
        }
      ]
    };

    const [totals] = await Sale.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$total' },
          cashSales: { $sum: cashReceivedExpr },
          equitySales: { $sum: { $cond: [{ $eq: ['$paymentMethod', 'equity'] }, '$total', 0] } },
          splitSales: { $sum: { $cond: [{ $eq: ['$paymentMethod', 'split'] }, '$total', 0] } },
          transactionCount: { $sum: 1 }
        }
      }
    ]);

    const hourlyBreakdown = await Sale.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $hour: '$saleDate' },
          total: { $sum: '$total' },
          cashTotal: { $sum: cashReceivedExpr },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } },
      { $project: { _id: 0, hour: '$_id', total: 1, cashTotal: 1, count: 1 } }
    ]);

    const cashierBreakdown = await Sale.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$cashier',
          cashierName: { $first: '$cashierName' },
          saleCount: { $sum: 1 },
          total: { $sum: '$total' }
        }
      },
      { $sort: { total: -1 } },
      { $project: { _id: 0, cashier: '$_id', cashierName: 1, saleCount: 1, total: 1 } }
    ]);

    // Full per-sale snapshot, frozen at close time, for the detailed report —
    // includes each Equity/Split payment's proof image so it can be embedded
    // as a thumbnail next to the transaction row.
    const sales = await Sale.find(filter).sort({ saleDate: 1 }).lean();
    const transactions = sales.map((sale) => ({
      saleNumber: sale.saleNumber,
      saleDate: sale.saleDate,
      cashierName: sale.cashierName || '',
      itemsSummary: (sale.items || [])
        .map((item) => `${item.quantity}x ${item.name}`)
        .join(', '),
      paymentMethod: sale.paymentMethod,
      total: sale.total,
      proofImageUrls: (sale.payments || [])
        .map((payment) => payment.proofImageUrl)
        .filter(Boolean)
    }));

    const PROOF_RETENTION_DAYS = 3.5;
    const proofDeletionDueAt = new Date(Date.now() + PROOF_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    const eod = await EndOfDay.create({
      date,
      branch,
      closedBy: req.user._id,
      closedByName: req.user.name,
      summary: {
        totalSales: totals?.totalSales || 0,
        cashSales: totals?.cashSales || 0,
        equitySales: totals?.equitySales || 0,
        splitSales: totals?.splitSales || 0,
        transactionCount: totals?.transactionCount || 0,
        hourlyBreakdown,
        cashierBreakdown,
        transactions
      },
      proofDeletionDueAt
    });

    res.status(201).json({ success: true, data: eod });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This day has already been closed. An admin must reset it before it can be closed again.'
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin-only: reset a closed EOD so it can be redone. The original record is
// kept (isReset: true) for audit history rather than deleted.
router.put('/eod/:date/reset', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only administrators can reset an end-of-day close' });
    }

    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ success: false, message: 'A reset reason is required' });
    }

    const branch = req.user.staff_branch || 'Main Store';
    const eod = await EndOfDay.findOne({ date: req.params.date, branch, isReset: false });
    if (!eod) {
      return res.status(404).json({ success: false, message: 'No active end-of-day close found for that date' });
    }

    eod.isReset = true;
    eod.resetBy = req.user._id;
    eod.resetByName = req.user.name;
    eod.resetAt = new Date();
    eod.resetReason = reason;
    await eod.save();

    res.json({ success: true, message: 'End-of-day close reset', data: eod });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
