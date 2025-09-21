import express from 'express';
import Sale from '../models/sale.model.js';
import User from '../models/user.model.js';
import Product from '../models/product.model.js';
import auth from '../middleware/auth.js';
import Staff from '../middleware/Staff.js';
import axios from 'axios';
import { getAuthToken, MPESA_STK_URL } from '../config/mpesa.js';
import MpesaPayment from '../models/mpesaPayment.model.js';

const router = express.Router();
// Initiate M-Pesa STK Push for NAWIRI
router.post('/mpesa/stk-push', auth, Staff, async (req, res) => {
  try {
    const { phoneNumber, amount } = req.body;
    if (!phoneNumber || !amount) {
      return res.status(400).json({ success: false, message: 'Phone number and amount are required' });
    }

    const formattedPhone = phoneNumber.replace(/^(\+?254|0)/, '254');
    const timestamp = (() => {
      const d = new Date();
      const pad = (n) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    })();

    const password = Buffer.from(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`).toString('base64');
    const token = await getAuthToken();

    const hostHeader = req.headers['x-forwarded-host'] || req.headers.host;
    const protocolHeader = (req.headers['x-forwarded-proto'] || 'https');
    const fallbackBase = hostHeader ? `${protocolHeader}://${hostHeader}` : '';
    const baseURL = process.env.BACKEND_URL || process.env.RENDER_EXTERNAL_URL || fallbackBase;

    const requestData = {
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
      TransactionDesc: 'NAWIRI payment'
    };

    const mpesaResponse = await axios.post(MPESA_STK_URL, requestData, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });

    // Persist minimal payment record for NAWIRI polling
    const { MerchantRequestID, CheckoutRequestID, ResponseCode, ResponseDescription } = mpesaResponse.data;
    await MpesaPayment.create({
      merchantRequestId: MerchantRequestID,
      checkoutRequestId: CheckoutRequestID,
      phoneNumber: formattedPhone,
      amount: Math.ceil(amount),
      status: 'pending'
    });

    return res.status(200).json({ success: true, message: 'STK push sent', data: mpesaResponse.data });
  } catch (error) {
    console.error('NAWIRI STK Push Error:', error?.response?.data || error.message || error);
    return res.status(500).json({ success: false, message: error?.response?.data?.errorMessage || error.message || 'Failed to send STK push' });
  }
});

// Get all sales for staff
router.get('/sales', auth, Staff, async (req, res) => {
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
    
    // If user is staff (not admin), only show their sales
    const userRole = (req.user && req.user.role) || req.userRole || 'user';
    const isAdmin = (req.user && req.user.isAdmin === true) || req.isAdmin === true || userRole === 'admin';
    if (userRole === 'staff' && !isAdmin && req.user && req.user._id) {
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
router.post('/sale', auth, Staff, async (req, res) => {
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
      note
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
    const sale = new Sale({
      saleNumber,
      items,
      customer: customer || null,
      customerName: customerName || '',
      customerPhone: customerPhone || '',
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

    await sale.save();
    
    // Update product stock
    for (const item of items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: -item.quantity } }
      );
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
router.get('/sale/:id', auth, Staff, async (req, res) => {
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
router.get('/summary/daily', auth, Staff, async (req, res) => {
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
          cardSales: {
            $sum: {
              $cond: [{ $eq: ['$paymentMethod', 'card'] }, '$total', 0]
            }
          },
          mobileSales: {
            $sum: {
              $cond: [{ $eq: ['$paymentMethod', 'mobile'] }, '$total', 0]
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
      cardSales: 0,
      mobileSales: 0
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
router.get('/analytics', auth, Staff, async (req, res) => {
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

export default router;