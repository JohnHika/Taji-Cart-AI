import assert from 'node:assert/strict';
import test, { after, before, beforeEach } from 'node:test';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import AdminActionLogModel from '../models/adminActionLog.model.js';
import InventoryMovementModel from '../models/inventoryMovement.model.js';
import ProductModel from '../models/product.model.js';
import StockTransferModel from '../models/stockTransfer.model.js';
import '../models/user.model.js';
import {
  createStockTransferRecord,
  getPendingStockTransfers,
  idempotencyKeyFromRequest,
  receiveStockTransfer,
  resolveStockTransfer,
} from './stockTransfer.controller.js';

let mongo;
const adminId = new mongoose.Types.ObjectId();
const staffId = new mongoose.Types.ObjectId();

const makeProduct = (overrides = {}) => ProductModel.create({
  handle: 'test-hair',
  name: 'Test Hair',
  sku: `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  costPrice: 1000,
  price: 1500,
  stock: 5,
  warehouseStock: 20,
  ...overrides,
});

const responseRecorder = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.body = payload; return this; },
});

before(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
});

beforeEach(async () => {
  await Promise.all([
    ProductModel.deleteMany({}),
    StockTransferModel.deleteMany({}),
    InventoryMovementModel.deleteMany({}),
    AdminActionLogModel.deleteMany({}),
  ]);
});

after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

test('pending transfer queue is isolated to the staff member branch', async () => {
  const product = await makeProduct();
  await createStockTransferRecord({
    lines: [{ productId: String(product._id), quantity: 2 }],
    destinationBranch: 'Main Store',
    actorId: adminId,
    idempotencyKey: 'pending-branch',
  });
  const response = responseRecorder();
  await getPendingStockTransfers({
    query: { limit: 50 },
    user: { staff_branch: 'West Store' },
    isAdmin: false,
  }, response);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body.data, []);

  const unassignedResponse = responseRecorder();
  await getPendingStockTransfers({ query: { limit: 50 }, user: {}, isAdmin: false }, unassignedResponse);
  assert.equal(unassignedResponse.statusCode, 200);
  assert.deepEqual(unassignedResponse.body.data, []);

  await assert.rejects(
    () => createStockTransferRecord({
      lines: [{ productId: String(product._id), quantity: 1 }],
      destinationBranch: 'x'.repeat(101),
      actorId: adminId,
      idempotencyKey: 'overlong-branch',
    }),
    (error) => error.status === 400,
  );
});

test('idempotency header and body mismatches fail before release processing', () => {
  assert.throws(
    () => idempotencyKeyFromRequest({ get: () => 'header-key', body: { idempotencyKey: 'body-key' } }),
    (error) => error.status === 400,
  );
  assert.throws(
    () => idempotencyKeyFromRequest({ get: () => 'header-key', body: { idempotencyKey: ' header-key' } }),
    (error) => error.status === 400,
  );
});

test('release idempotency replays the original transfer without applying stock twice', async () => {
  const product = await makeProduct({ warehouseStock: 10 });
  const payload = {
    lines: [{ productId: String(product._id), quantity: 3 }],
    destinationBranch: 'Main Store',
    actorId: adminId,
    idempotencyKey: 'release-replay',
  };
  const first = await createStockTransferRecord(payload);
  const replay = await createStockTransferRecord(payload);
  assert.equal(String(replay._id), String(first._id));

  const balances = await ProductModel.findById(product._id).lean();
  assert.equal(balances.warehouseStock, 7);
  assert.equal(balances.inTransitStock, 3);
  assert.equal(await StockTransferModel.countDocuments({ idempotencyKey: 'release-replay' }), 1);
  assert.equal(await InventoryMovementModel.countDocuments({ type: 'transfer_dispatch' }), 1);

  await assert.rejects(
    () => createStockTransferRecord({ ...payload, lines: [{ productId: String(product._id), quantity: 4 }] }),
    (error) => error.status === 409,
  );

  await assert.rejects(
    () => createStockTransferRecord({ ...payload, actorId: staffId }),
    (error) => error.status === 409,
  );

  const concurrentProduct = await makeProduct({ warehouseStock: 10 });
  const concurrentPayload = { ...payload, lines: [{ productId: String(concurrentProduct._id), quantity: 2 }], idempotencyKey: 'release-concurrent' };
  const concurrent = await Promise.all([
    createStockTransferRecord(concurrentPayload),
    createStockTransferRecord(concurrentPayload),
  ]);
  assert.equal(String(concurrent[0]._id), String(concurrent[1]._id));
  const concurrentBalances = await ProductModel.findById(concurrentProduct._id).lean();
  assert.equal(concurrentBalances.warehouseStock, 8);
  assert.equal(concurrentBalances.inTransitStock, 2);

  const firstProduct = await makeProduct({ warehouseStock: 5 });
  const secondProduct = await makeProduct({ warehouseStock: 6 });
  const multiLine = {
    lines: [{ productId: String(firstProduct._id), quantity: 1 }, { productId: String(secondProduct._id), quantity: 2 }],
    destinationBranch: 'Main Store',
    actorId: adminId,
    idempotencyKey: 'release-multiline',
  };
  const firstMulti = await createStockTransferRecord(multiLine);
  const replayMulti = await createStockTransferRecord({ ...multiLine, lines: multiLine.lines.slice().reverse().map((line) => ({ ...line, productId: line.productId.toUpperCase() })) });
  assert.equal(String(replayMulti._id), String(firstMulti._id));
});

test('a first finalized discrepancy requires a receipt note', async () => {
  const product = await makeProduct();
  const transfer = await createStockTransferRecord({
    lines: [{ productId: String(product._id), quantity: 2 }],
    actorId: adminId,
    idempotencyKey: 'note-required',
  });
  for (const malformedFinalize of ['false', null, 0]) {
    const malformedResponse = responseRecorder();
    await receiveStockTransfer({
      params: { id: String(transfer._id) },
      userId: staffId,
      user: { staff_branch: 'Main Store' },
      isAdmin: false,
      body: { finalize: malformedFinalize, lines: [{ productId: String(product._id), receivedQuantity: 1 }] },
    }, malformedResponse);
    assert.equal(malformedResponse.statusCode, 400);
  }

  const response = responseRecorder();
  await receiveStockTransfer({
    params: { id: String(transfer._id) },
    userId: staffId,
    user: { staff_branch: 'Main Store' },
    isAdmin: false,
    body: { finalize: true, lines: [{ productId: String(product._id), receivedQuantity: 1 }] },
  }, response);
  assert.equal(response.statusCode, 400);
  assert.equal((await StockTransferModel.findById(transfer._id).lean()).status, 'dispatched');
});

test('stock transfer lifecycle keeps unreconciled units in transit and resolves a shortage without adding it to shop stock', async () => {
  const product = await makeProduct();
  const transfer = await createStockTransferRecord({
    lines: [{ productId: String(product._id), quantity: 8 }],
    destinationBranch: 'Main Store',
    notes: 'Morning restock',
    actorId: adminId,
    idempotencyKey: 'shortage-lifecycle',
  });

  let balances = await ProductModel.findById(product._id).lean();
  assert.equal(balances.warehouseStock, 12);
  assert.equal(balances.inTransitStock, 8);
  assert.equal(balances.stock, 5);
  assert.equal(transfer.status, 'dispatched');

  const partialResponse = responseRecorder();
  await receiveStockTransfer({
    params: { id: String(transfer._id) },
    userId: staffId,
    user: { staff_branch: 'Main Store' },
    isAdmin: false,
    body: {
      finalize: false,
      lines: [{ productId: String(product._id), receivedQuantity: 4, receiptNote: 'First carton counted at the receiving desk.' }],
    },
  }, partialResponse);
  assert.equal(partialResponse.statusCode, 200);
  assert.equal(partialResponse.body.data.status, 'partially_received');

  balances = await ProductModel.findById(product._id).lean();
  assert.equal(balances.inTransitStock, 4);
  assert.equal(balances.stock, 9);

  const disputedResponse = responseRecorder();
  await receiveStockTransfer({
    params: { id: String(transfer._id) },
    userId: staffId,
    user: { staff_branch: 'Main Store' },
    isAdmin: false,
    body: {
      finalize: true,
      lines: [{ productId: String(product._id), receivedQuantity: 7 }],
    },
  }, disputedResponse);
  assert.equal(disputedResponse.statusCode, 200);
  assert.equal(disputedResponse.body.data.status, 'disputed');
  assert.equal(disputedResponse.body.data.lines[0].variance, -1);

  balances = await ProductModel.findById(product._id).lean();
  assert.equal(balances.inTransitStock, 1);
  assert.equal(balances.stock, 12);

  const savedDispute = await StockTransferModel.findById(transfer._id).lean();
  assert.equal(savedDispute.status, 'disputed');
  assert.equal(savedDispute.receivedBy.toString(), staffId.toString());
  assert.equal(savedDispute.lines[0].receivedQuantity, 7);
  assert.equal(savedDispute.lines[0].variance, -1);
  assert.equal(savedDispute.receiptNote, '');
  assert.match(savedDispute.lines[0].receiptNote, /First carton counted/);
  assert.match((await AdminActionLogModel.findOne({ action: 'confirm_stock_transfer_receipt' }).lean()).reason, /First carton counted/);

  const resolvedResponse = responseRecorder();
  await resolveStockTransfer({
    params: { id: String(transfer._id) },
    userId: adminId,
    user: { role: 'admin' },
    isAdmin: true,
    body: { action: 'reconcile_variance', resolutionNote: 'Checked packing list; shortage written off as loss.' },
  }, resolvedResponse);
  assert.equal(resolvedResponse.statusCode, 200);
  assert.equal(resolvedResponse.body.data.status, 'resolved');

  balances = await ProductModel.findById(product._id).lean();
  assert.equal(balances.warehouseStock, 12);
  assert.equal(balances.inTransitStock, 0);
  assert.equal(balances.stock, 12);

  const movementTypes = (await InventoryMovementModel.find({}).sort({ createdAt: 1 }).distinct('type')).sort();
  assert.deepEqual(movementTypes, ['transfer_dispatch', 'transfer_loss', 'transfer_receipt']);
});

test('over-receipt is disputed without inflating stock until admin reconciles the excess', async () => {
  const product = await makeProduct({ stock: 5, warehouseStock: 10 });
  const transfer = await createStockTransferRecord({
    lines: [{ productId: String(product._id), quantity: 3 }],
    actorId: adminId,
    idempotencyKey: 'overage-lifecycle',
  });
  const receiptResponse = responseRecorder();
  await receiveStockTransfer({
    params: { id: String(transfer._id) },
    userId: staffId,
    user: { staff_branch: 'Main Store' },
    isAdmin: false,
    body: {
      finalize: true,
      receiptNote: 'One extra unit was included in the carton; please verify it.',
      lines: [{ productId: String(product._id), receivedQuantity: 4 }],
    },
  }, receiptResponse);

  assert.equal(receiptResponse.statusCode, 200);
  assert.equal(receiptResponse.body.data.status, 'disputed');
  assert.equal(receiptResponse.body.data.lines[0].variance, 1);
  let balances = await ProductModel.findById(product._id).lean();
  assert.equal(balances.warehouseStock, 7);
  assert.equal(balances.inTransitStock, 0);
  assert.equal(balances.stock, 8);

  const resolvedResponse = responseRecorder();
  const longResolutionNote = 'x'.repeat(500);
  await resolveStockTransfer({
    params: { id: String(transfer._id) },
    userId: adminId,
    user: { role: 'admin' },
    isAdmin: true,
    body: { action: 'reconcile_variance', resolutionNote: longResolutionNote },
  }, resolvedResponse);
  assert.equal(resolvedResponse.statusCode, 200);
  assert.equal(resolvedResponse.body.data.status, 'resolved');
  balances = await ProductModel.findById(product._id).lean();
  assert.equal(balances.stock, 9);
  assert.equal(balances.inTransitStock, 0);
  const overageMovement = await InventoryMovementModel.findOne({ type: 'transfer_overage', actorType: 'admin' }).lean();
  assert.ok(overageMovement.reason.length <= 500);
  assert.equal(await InventoryMovementModel.countDocuments({ type: 'transfer_overage', actorType: 'admin' }), 1);
});

test('admin receipt activity is attributed as admin in the audit records', async () => {
  const product = await makeProduct({ stock: 1, warehouseStock: 4 });
  const transfer = await createStockTransferRecord({
    lines: [{ productId: String(product._id), quantity: 2 }],
    actorId: adminId,
    idempotencyKey: 'admin-receipt',
  });
  const response = responseRecorder();
  await receiveStockTransfer({
    params: { id: String(transfer._id) },
    userId: adminId,
    user: { role: 'admin' },
    isAdmin: true,
    body: { finalize: true, lines: [{ productId: String(product._id), receivedQuantity: 2 }] },
  }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.data.status, 'confirmed');
  assert.equal((await InventoryMovementModel.findOne({ type: 'transfer_receipt' }).lean()).actorType, 'admin');
  assert.equal((await AdminActionLogModel.findOne({ action: 'confirm_stock_transfer_receipt' }).lean()).actorType, 'admin');
});

test('exact receipt confirms the transfer and is idempotently closed', async () => {
  const product = await makeProduct({ stock: 2, warehouseStock: 6 });
  const transfer = await createStockTransferRecord({
    lines: [{ productId: String(product._id), quantity: 3 }],
    actorId: adminId,
    idempotencyKey: 'exact-receipt',
  });
  const receiptResponse = responseRecorder();
  await receiveStockTransfer({
    params: { id: String(transfer._id) },
    userId: staffId,
    user: { staff_branch: 'Main Store' },
    isAdmin: false,
    body: {
      finalize: true,
      lines: [{ productId: String(product._id), receivedQuantity: 3 }],
    },
  }, receiptResponse);

  assert.equal(receiptResponse.statusCode, 200);
  assert.equal(receiptResponse.body.data.status, 'confirmed');
  const balances = await ProductModel.findById(product._id).lean();
  assert.equal(balances.warehouseStock, 3);
  assert.equal(balances.inTransitStock, 0);
  assert.equal(balances.stock, 5);

  const receiptMovement = await InventoryMovementModel.findOne({ type: 'transfer_receipt' }).lean();
  assert.equal(receiptMovement.actorType, 'staff');

  const duplicateResponse = responseRecorder();
  await receiveStockTransfer({
    params: { id: String(transfer._id) },
    userId: staffId,
    user: { staff_branch: 'Main Store' },
    isAdmin: false,
    body: {
      finalize: true,
      lines: [{ productId: String(product._id), receivedQuantity: 3 }],
    },
  }, duplicateResponse);
  assert.equal(duplicateResponse.statusCode, 404);
});
