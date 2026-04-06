import mongoose from 'mongoose';

const saleItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'product',
    required: true
  },
  sku: {
    type: String,
    default: ''
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  total: {
    type: Number,
    required: true
  }
});

const saleSchema = new mongoose.Schema({
  saleNumber: {
    type: String,
    required: true,
    unique: true
  },
  items: [saleItemSchema],
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  customerName: {
    type: String,
    default: ''
  },
  customerPhone: {
    type: String,
    default: ''
  },
  subtotal: {
    type: Number,
    required: true
  },
  discount: {
    type: Number,
    default: 0
  },
  tax: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'mobile', 'split'],
    required: true
  },
  payments: [{
    method: { type: String, enum: ['cash', 'card', 'mobile'], required: true },
    amount: { type: Number, required: true },
    phone: { type: String },
    checkoutRequestId: { type: String }
  }],
  amountTendered: {
    type: Number,
    required: true
  },
  change: {
    type: Number,
    default: 0
  },
  cashier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  cashierName: {
    type: String,
    required: true
  },
  branch: {
    type: String,
    default: 'Main Store'
  },
  saleDate: {
    type: Date,
    default: Date.now
  },
  isVoided: {
    type: Boolean,
    default: false
  },
  voidReason: {
    type: String
  },
  voidedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  voidedAt: {
    type: Date
  },
  notes: {
    type: String
  },
  loyaltyPointsEarned: {
    type: Number,
    default: 0
  },
  loyaltyPointsUsed: {
    type: Number,
    default: 0
  },
  auditTrail: [
    {
      action: { type: String, required: true },
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      byName: { type: String },
      at: { type: Date, default: Date.now },
      meta: { type: Object }
    }
  ]
}, {
  timestamps: true
});

// Indexes for better query performance
saleSchema.index({ saleDate: -1 });
saleSchema.index({ cashier: 1, saleDate: -1 });
saleSchema.index({ customer: 1, saleDate: -1 });
saleSchema.index({ branch: 1, saleDate: -1 });

// Virtual for calculating total items
saleSchema.virtual('totalItems').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Pre-save middleware to calculate totals
saleSchema.pre('save', function(next) {
  // Calculate subtotal from items
  this.subtotal = this.items.reduce((sum, item) => sum + item.total, 0);
  
  // Calculate final total after discount plus tax
  const taxVal = typeof this.tax === 'number' ? this.tax : 0;
  this.total = Math.max(0, (this.subtotal - (this.discount || 0)) + taxVal);
  
  // Calculate change for cash payments; preserve provided values for split
  if (this.paymentMethod === 'cash') {
    this.change = Math.max(0, (this.amountTendered || 0) - this.total);
  } else if (this.paymentMethod === 'split') {
    // For split, trust the computed amountTendered and change from the client logic
    this.amountTendered = this.amountTendered || this.total;
    this.change = this.change || Math.max(0, (this.amountTendered || 0) - this.total);
  } else {
    this.change = 0;
    this.amountTendered = this.total;
  }
  
  next();
});

// Static method to get sales summary for a date range
saleSchema.statics.getSummary = async function(startDate, endDate, cashier = null) {
  const filter = {
    saleDate: {
      $gte: startDate,
      $lte: endDate
    },
    isVoided: { $ne: true }
  };
  
  if (cashier) {
    filter.cashier = cashier;
  }
  
  const summary = await this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalSales: { $sum: '$total' },
        totalTransactions: { $sum: 1 },
        averageTransaction: { $avg: '$total' },
        totalItems: { $sum: { $sum: '$items.quantity' } },
        totalDiscount: { $sum: '$discount' },
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
  
  return summary[0] || {
    totalSales: 0,
    totalTransactions: 0,
    averageTransaction: 0,
    totalItems: 0,
    totalDiscount: 0,
    cashSales: 0,
    cardSales: 0,
    mobileSales: 0
  };
};

// Static method to get top selling products
saleSchema.statics.getTopProducts = async function(startDate, endDate, limit = 10) {
  return await this.aggregate([
    {
      $match: {
        saleDate: {
          $gte: startDate,
          $lte: endDate
        },
        isVoided: { $ne: true }
      }
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        productName: { $first: '$items.name' },
        totalQuantity: { $sum: '$items.quantity' },
        totalRevenue: { $sum: '$items.total' },
        averagePrice: { $avg: '$items.price' }
      }
    },
    { $sort: { totalQuantity: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'productDetails'
      }
    }
  ]);
};

// Method to void this sale
saleSchema.methods.voidSale = async function(reason, voidedBy) {
  this.isVoided = true;
  this.voidReason = reason;
  this.voidedBy = voidedBy;
  this.voidedAt = new Date();
  
  await this.save();
  
  // Restore product stock
  const Product = mongoose.model('product');
  for (const item of this.items) {
    await Product.findByIdAndUpdate(
      item.product,
      { $inc: { stock: item.quantity } }
    );
  }
  
  return this;
};

// Method to generate receipt data
saleSchema.methods.getReceiptData = function() {
  return {
    saleNumber: this.saleNumber,
    saleDate: this.saleDate,
    cashierName: this.cashierName,
    branch: this.branch,
    items: this.items,
    subtotal: this.subtotal,
    discount: this.discount,
    tax: this.tax || 0,
    total: this.total,
    paymentMethod: this.paymentMethod,
    payments: this.payments || [],
    amountTendered: this.amountTendered,
    change: this.change,
    customer: this.customer,
    customerName: this.customerName,
    customerPhone: this.customerPhone,
    notes: this.notes || ''
  };
};

const Sale = mongoose.model('sale', saleSchema);

export default Sale;
