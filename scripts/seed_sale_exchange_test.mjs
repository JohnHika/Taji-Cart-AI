// Seeds one product, one completed sale, and one completed exchange against
// it, for testing the sale->exchange join in GET /api/pos/sale/:id.
// Usage: node scripts/seed_sale_exchange_test.mjs <mongodb-uri>
import mongoose from 'mongoose';

const uri = process.argv[2];
if (!uri || !/localhost|127\.0\.0\.1/.test(uri)) {
  console.error('SAFETY: refusing — pass an explicit localhost MongoDB URI as argv[2]');
  process.exit(1);
}

await mongoose.connect(uri);

const Product = mongoose.model('product', new mongoose.Schema({}, { strict: false }), 'products');
const Sale = mongoose.model('sale', new mongoose.Schema({}, { strict: false }), 'sales');
const Exchange = mongoose.model('exchange', new mongoose.Schema({}, { strict: false }), 'exchanges');
const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');

const admin = await User.findOne({ email: 'ff-test-admin@nawiri.test' });
if (!admin) {
  console.error('Run seed_ff_test_admin.mjs against this DB first.');
  process.exit(1);
}

const p1 = await Product.create({ name: 'SOFT AFRO BULK - #27', sku: 'SAB27', price: 700, stock: 50 });
const p2 = await Product.create({ name: 'AFRO TWIST - #27', sku: 'AT27', price: 600, stock: 50 });

const sale = await Sale.create({
  saleNumber: 'TEST-0008',
  saleDate: new Date(),
  cashier: admin._id,
  cashierName: admin.name,
  customerName: 'Walk-in Customer',
  items: [{ product: p1._id, name: p1.name, sku: p1.sku, quantity: 3, unitPrice: 700, total: 2100 }],
  subtotal: 2100,
  total: 2100,
  paymentMethod: 'cash',
  isVoided: false,
});

await Exchange.create({
  exchangeNumber: 'EXC-TEST-0001',
  sourceType: 'sale',
  sourceId: sale._id,
  sourceNumber: sale.saleNumber,
  customerName: 'Walk-in Customer',
  returnedItems: [{ product: p1._id, name: p1.name, sku: p1.sku, unitPrice: 700, quantity: 3 }],
  replacementItems: [{ product: p2._id, name: p2.name, sku: p2.sku, unitPrice: 600, quantity: 4 }],
  returnedItem: { product: p1._id, name: p1.name, sku: p1.sku, unitPrice: 700, quantity: 3 },
  replacementItem: { product: p2._id, name: p2.name, sku: p2.sku, unitPrice: 600, quantity: 4 },
  priceDifference: 300,
  payment: { method: 'cash', amount: 300 },
  status: 'completed',
  requestedBy: admin._id,
  requestedByName: admin.name,
});

console.log('sale _id:', sale._id.toString());
console.log('sale.saleNumber:', sale.saleNumber);
await mongoose.disconnect();