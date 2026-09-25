/**
 * Removes order rows left behind by Jenga checkouts that were never paid.
 *
 * Before orders were deferred until payment (finalizePaidOrder in
 * controllers/jenga.controller.js), every Jenga checkout attempt created
 * PENDING order rows up front. Abandoned attempts then showed up in My Orders
 * and the staff dispatch queue as if they were real orders.
 *
 * An order is voided only when ALL of these hold:
 *  - its rows have payment_status 'PENDING'
 *  - its JengaPayment is still 'pending', was never finalized, and never
 *    received a callback/IPN from Jenga
 *  - the checkout is older than MIN_AGE_HOURS (Jenga's hosted checkout
 *    session lasts 15 minutes)
 *
 * The removed rows are copied into JengaPayment.archivedOrders (and the
 * payment marked 'expired') before deletion, so a payment Jenga later shows as
 * successful can still be restored.
 *
 * Usage:
 *   node scripts/one-off/voidUnpaidJengaOrders.js           # dry run
 *   node scripts/one-off/voidUnpaidJengaOrders.js --apply   # make changes
 */
import dotenv from 'dotenv';
dotenv.config({ path: new URL('../../.env', import.meta.url) });
import mongoose from 'mongoose';

const MIN_AGE_HOURS = 1;
const apply = process.argv.includes('--apply');

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
const db = mongoose.connection.db;
const orders = db.collection('orders');
const payments = db.collection('jenga_payments');

const cutoff = new Date(Date.now() - MIN_AGE_HOURS * 60 * 60 * 1000);
const pendingOrderIds = await orders.distinct('orderId', { payment_status: 'PENDING' });
const candidates = await payments.find({
  orderId: { $in: pendingOrderIds },
  status: 'pending',
  finalizedAt: { $exists: false },
  rawCallback: { $exists: false },
  createdAt: { $lt: cutoff },
}).sort({ createdAt: 1 }).toArray();

console.log(`${apply ? 'APPLY' : 'DRY RUN'} — ${candidates.length} unpaid Jenga checkout(s) to void`);

let removedRows = 0;
for (const payment of candidates) {
  const rows = await orders.find({ orderId: payment.orderId, payment_status: 'PENDING' }).toArray();
  console.log(
    `  ${payment.createdAt.toISOString().slice(0, 16)}  ${payment.orderReference}  ${payment.orderId}` +
    `  KES ${payment.amount}  rows=${rows.length}  order status=${rows.map((r) => r.status).join(',')}`
  );
  if (!apply || rows.length === 0) continue;

  await payments.updateOne(
    { _id: payment._id, status: 'pending' },
    {
      $set: {
        status: 'expired',
        resultDesc: 'Checkout never completed: no payment confirmation received from Jenga. Unpaid order removed.',
        archivedOrders: rows,
        updatedAt: new Date(),
      },
    }
  );
  const { deletedCount } = await orders.deleteMany({
    _id: { $in: rows.map((r) => r._id) },
    payment_status: 'PENDING',
  });
  removedRows += deletedCount;
}

if (apply) console.log(`Removed ${removedRows} order row(s); originals kept in jenga_payments.archivedOrders.`);
await mongoose.disconnect();
process.exit(0);
