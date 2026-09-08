import mongoose from 'mongoose';

// Suppliers are intentionally separate from products: one supplier can supply
// many variants and a product can retain its cost snapshot on every purchase
// order even if a supplier changes its price later.
const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true, maxlength: 160 },
  contactName: { type: String, trim: true, maxlength: 120 },
  phone: { type: String, trim: true, maxlength: 40 },
  email: { type: String, trim: true, lowercase: true, maxlength: 160 },
  notes: { type: String, trim: true, maxlength: 1000 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

supplierSchema.index({ active: 1, name: 1 });

export default mongoose.model('Supplier', supplierSchema);
