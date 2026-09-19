import mongoose from 'mongoose';

const heldSaleItemSchema = new mongoose.Schema({
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
    default: ''
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
  discountPct: {
    type: Number,
    default: 0
  }
});

const heldSaleSchema = new mongoose.Schema({
  heldBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  heldByName: {
    type: String,
    default: ''
  },
  branch: {
    type: String,
    default: 'Main Store'
  },
  items: [heldSaleItemSchema],
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
  discount: {
    type: Number,
    default: 0
  },
  discountMode: {
    type: String,
    enum: ['percent', 'amount'],
    default: 'percent'
  },
  discountAmountValue: {
    type: Number,
    default: 0
  },
  applyTax: {
    type: Boolean,
    default: false
  },
  loyaltyDiscountPct: {
    type: Number,
    default: 0
  },
  orderNote: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['held', 'resumed'],
    default: 'held'
  },
  resumedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resumedByName: {
    type: String,
    default: ''
  },
  resumedAt: {
    type: Date
  },
  heldAt: {
    type: Date,
    default: Date.now
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

heldSaleSchema.index({ status: 1, heldAt: -1 });
heldSaleSchema.index({ heldBy: 1, status: 1 });
heldSaleSchema.index({ branch: 1, status: 1 });

// Virtuals for drawer display
heldSaleSchema.virtual('itemCount').get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

heldSaleSchema.virtual('grossTotal').get(function () {
  return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
});

heldSaleSchema.set('toJSON', { virtuals: true });
heldSaleSchema.set('toObject', { virtuals: true });

const HeldSale = mongoose.model('heldsale', heldSaleSchema);

export default HeldSale;