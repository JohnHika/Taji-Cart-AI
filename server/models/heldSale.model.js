import mongoose from 'mongoose';

// A snapshot of an in-progress Sales Counter transaction that a cashier has
// parked to serve other customers, and will resume later exactly as left —
// cart, customer details, fulfillment/delivery choice, and whatever payment
// info was already entered. No stock is reserved and nothing here counts
// toward sales reporting; it only becomes a real Sale once resumed and
// charged through the normal POST /api/pos/sale flow.
const heldSaleSchema = new mongoose.Schema({
  label: {
    // Short display name for the held-sales list, e.g. the customer's name
    // or "Held sale #3" — purely for the cashier's own reference.
    type: String,
    default: ''
  },
  cart: [{
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'product', required: true },
    name: { type: String, required: true },
    sku: { type: String, default: '' },
    price: { type: Number, required: true },
    image: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 1 }
  }],
  customerName: { type: String, default: '' },
  customerPhone: { type: String, default: '' },
  saleNote: { type: String, default: '' },
  fulfillmentType: {
    type: String,
    enum: ['in_store', 'pickup', 'delivery'],
    default: 'in_store'
  },
  deliveryDetails: {
    mode: { type: String, default: 'standard' },
    zoneId: { type: String, default: '' },
    saccoOperatorId: { type: String, default: '' },
    saccoDestinationTown: { type: String, default: '' }
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'equity', 'split'],
    default: 'cash'
  },
  amountTendered: { type: String, default: '' },
  splitCashAmount: { type: String, default: '' },
  equityProofUrl: { type: String, default: '' },
  equityApproved: { type: Boolean, default: false },
  branch: { type: String, default: 'Main Store' },
  heldBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  heldByName: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

heldSaleSchema.index({ branch: 1, createdAt: -1 });

const HeldSale = mongoose.model('heldSale', heldSaleSchema);

export default HeldSale;
