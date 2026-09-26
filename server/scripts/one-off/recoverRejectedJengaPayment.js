/**
 * Confirms a Jenga payment whose success callback the server rejected, and
 * creates its order through the normal path (finalizePaidOrder: stock, PAID
 * order, cart, loyalty, notification, email).
 *
 * Until the amount check accepted Jenga's M-Pesa charge (hosted checkout
 * reports e.g. 707 paid for a 700 order), every hosted-checkout success IPN
 * was rejected as an "amount mismatch" and the payment stayed pending — or
 * was voided by voidUnpaidJengaOrders.js. Only run this after checking the
 * customer's M-Pesa receipt (or the Jenga statement) for the payment.
 *
 * If the checkout was voided, its archived order rows are put back as they
 * were (same _id, status and dispatch history), so an order that had already
 * been dispatched is not re-queued as a new one.
 *
 * Usage:
 *   node scripts/one-off/recoverRejectedJengaPayment.js <orderReference> <amountPaid> [mpesaReceipt]           # dry run
 *   node scripts/one-off/recoverRejectedJengaPayment.js <orderReference> <amountPaid> [mpesaReceipt] --apply   # make changes
 */
import dotenv from 'dotenv';
dotenv.config({ path: new URL('../../.env', import.meta.url) });
import mongoose from 'mongoose';

const apply = process.argv.includes('--apply');
const [orderReference, amountPaidArg, mpesaReceipt = ''] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const amountPaid = Number(amountPaidArg);
if (!orderReference || !Number.isFinite(amountPaid)) {
  console.error('Usage: node scripts/one-off/recoverRejectedJengaPayment.js <orderReference> <amountPaid> [mpesaReceipt] [--apply]');
  process.exit(1);
}

// Loaded after dotenv: config/jenga.js reads env vars at import time.
const { default: JengaPayment } = await import('../../models/jengaPayment.model.js');
const { default: OrderModel } = await import('../../models/order.model.js');
const { default: ProductModel } = await import('../../models/product.model.js');
const { default: UserModel } = await import('../../models/user.model.js');
const { default: CartProductModel } = await import('../../models/cartproduct.model.js');
const { finalizePaidOrder } = await import('../../controllers/jenga.controller.js');
const { amountCovers } = await import('../../utils/jengaValidation.js');

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
const exit = async (code) => {
  await mongoose.disconnect();
  process.exit(code);
};

const payment = await JengaPayment.findOne({ orderReference });
if (!payment) {
  console.error(`No Jenga payment with reference ${orderReference}`);
  await exit(1);
}
if (payment.finalizedAt) {
  console.error(`${orderReference} is already finalized (order ${payment.orderId}) — nothing to do.`);
  await exit(1);
}
if (!amountCovers(amountPaid, payment.amount)) {
  console.error(`KES ${amountPaid} paid does not cover the KES ${payment.amount} due on ${orderReference}.`);
  await exit(1);
}

const existingRows = await OrderModel.find({ orderId: payment.orderId }).lean();
const archivedRows = existingRows.length === 0 ? (payment.archivedOrders || []) : [];
const pendingRows = existingRows.length === 0 && archivedRows.length === 0 ? (payment.pendingOrder || []) : [];
const lines = [...existingRows, ...archivedRows, ...pendingRows];
const user = payment.userId ? await UserModel.findById(payment.userId).select('name email mobile').lean() : null;
const cartCount = payment.userId ? await CartProductModel.countDocuments({ userId: payment.userId }) : 0;

console.log(`${apply ? 'APPLY' : 'DRY RUN'} — ${orderReference} (${payment.channel}), order ${payment.orderId}`);
console.log(`  status: ${payment.status}${payment.resultDesc ? ` — ${payment.resultDesc}` : ''}`);
console.log(`  due KES ${payment.amount}, paid KES ${amountPaid}${mpesaReceipt ? `, M-Pesa ${mpesaReceipt}` : ''}`);
console.log(`  customer: ${user ? `${user.name} <${user.email}> ${user.mobile || ''}` : payment.phoneNumber || 'guest'}`);
console.log(`  order rows: ${existingRows.length} existing, ${archivedRows.length} to restore from archive, ${pendingRows.length} to create`);
for (const line of lines) {
  const product = await ProductModel.findById(line.productId).select('stock').lean();
  console.log(
    `    ${line.product_details?.name} x${line.quantity}  KES ${line.totalAmt}  ${line.fulfillment_type}` +
    `  row status=${line.status || 'new'}  stock now=${product?.stock ?? 'n/a'}`
  );
}
console.log(`  cart items that will be cleared: ${cartCount}`);

if (!apply) await exit(0);

if (archivedRows.length > 0) {
  await OrderModel.collection.insertMany(archivedRows);
}
const paid = await JengaPayment.findOneAndUpdate(
  { _id: payment._id, status: { $in: ['pending', 'failed', 'cancelled', 'expired'] }, finalizedAt: { $exists: false } },
  {
    $set: {
      status: 'paid',
      verifiedAt: new Date(),
      resultDesc: `Confirmed by hand from ${mpesaReceipt ? `M-Pesa receipt ${mpesaReceipt}` : 'the payment record'} (KES ${amountPaid} paid); Jenga's success callback had been rejected.`,
    },
  },
  { new: true }
);
if (!paid) {
  console.error('Payment changed while running — not updated.');
  await exit(1);
}
await finalizePaidOrder(paid);

const after = await JengaPayment.findById(payment._id).lean();
const orders = await OrderModel.find({ orderId: payment.orderId }).select('status payment_status paymentId totalAmt').lean();
console.log(`  finalized: ${Boolean(after.finalizedAt)}  stockShortfall: ${Boolean(after.stockShortfall)}`);
for (const order of orders) {
  console.log(`    order row ${order._id}: status=${order.status} payment=${order.payment_status} KES ${order.totalAmt}`);
}
// The confirmation email is sent without being awaited — give it time.
await new Promise((resolve) => setTimeout(resolve, 8000));
await exit(0);
