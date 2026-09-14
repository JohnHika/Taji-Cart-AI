import mongoose from 'mongoose';
import AdminActionLogModel from '../models/adminActionLog.model.js';
import InventoryMovementModel from '../models/inventoryMovement.model.js';
import ProductModel from '../models/product.model.js';
import StockTransferModel from '../models/stockTransfer.model.js';
import { calculateTransferStatus, isValidTransferQuantity, transferLineVariance } from '../utils/stockTransfer.js';

const DEFAULT_BRANCH = 'Main Store';
const TRANSFER_STATUSES = ['dispatched', 'partially_received', 'confirmed', 'disputed', 'resolved', 'cancelled'];
const RECEIVABLE_STATUSES = ['dispatched', 'partially_received'];
const LIST_LIMIT_MAX = 100;

class StockTransferError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const asPositiveInt = (value) => isValidTransferQuantity(value) ? Number(value) : null;

const asNonNegativeInt = (value) => isValidTransferQuantity(value, { allowZero: true }) ? Number(value) : null;

const cleanText = (value, maxLength = 500) => String(value || '').trim().slice(0, maxLength);
const appendNote = (previous, current) => {
  const prior = cleanText(previous);
  const next = cleanText(current);
  if (!next) return prior;
  if (!prior || prior === next) return next;
  return `${prior} | ${next}`.slice(0, 500);
};
const normalizeIdempotencyKey = (value) => typeof value === 'string' ? value.trim() : '';
const branchFor = (user) => {
  if (typeof user?.staff_branch !== 'string') return '';
  const branch = user.staff_branch.trim();
  return branch && branch.length <= 100 ? branch : '';
};
const normalizeDestinationBranch = (value) => {
  if (value === undefined || value === null) return DEFAULT_BRANCH;
  if (typeof value !== 'string') return null;
  const branch = value.trim();
  if (!branch) return DEFAULT_BRANCH;
  return branch.length <= 100 ? branch : null;
};
const isAdmin = (request) => request.isAdmin === true || request.user?.isAdmin === true || request.user?.role === 'admin';
const transferNumber = () => `TR-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

export const idempotencyKeyFromRequest = (request) => {
  const headerValue = request.get?.('Idempotency-Key') ?? request.headers?.['idempotency-key'];
  const bodyValue = request.body?.idempotencyKey;
  if (headerValue !== undefined && bodyValue !== undefined && headerValue !== bodyValue) {
    throw new StockTransferError(400, 'The Idempotency-Key header and body value must match exactly.');
  }
  return normalizeIdempotencyKey(headerValue ?? bodyValue);
};

const sendError = (response, error, fallback) => {
  if (error instanceof StockTransferError) {
    return response.status(error.status).json({ success: false, message: error.message });
  }
  console.error(fallback, error);
  return response.status(500).json({ success: false, message: fallback });
};

const normalizeTransferLines = (rawLines) => {
  if (!Array.isArray(rawLines) || !rawLines.length) {
    throw new StockTransferError(400, 'Add at least one product to the stock transfer.');
  }
  if (rawLines.length > 100) {
    throw new StockTransferError(400, 'A stock transfer can contain at most 100 products.');
  }

  const seen = new Set();
  return rawLines.map((line) => {
    const rawProductId = String(line?.productId || '').trim();
    const productId = rawProductId.toLowerCase();
    const quantity = asPositiveInt(line?.quantity);
    if (!mongoose.Types.ObjectId.isValid(productId) || !quantity) {
      throw new StockTransferError(400, 'Every transfer line needs a valid product and positive whole quantity.');
    }
    if (seen.has(productId)) {
      throw new StockTransferError(400, 'A product can appear only once on a stock transfer.');
    }
    seen.add(productId);
    return { productId, quantity };
  });
};

const normalizeReceiptLines = (rawLines, transfer) => {
  if (!Array.isArray(rawLines) || rawLines.length !== transfer.lines.length) {
    throw new StockTransferError(400, 'Enter a received quantity for every product on this transfer.');
  }

  const supplied = new Map();
  for (const line of rawLines) {
    const productId = String(line?.productId || '').trim().toLowerCase();
    const receivedQuantity = asNonNegativeInt(line?.receivedQuantity);
    if (!mongoose.Types.ObjectId.isValid(productId) || receivedQuantity === null) {
      throw new StockTransferError(400, 'Every received line needs a valid product and whole-number quantity.');
    }
    if (supplied.has(productId)) {
      throw new StockTransferError(400, 'A product can appear only once in a receipt confirmation.');
    }
    supplied.set(productId, { receivedQuantity, receiptNote: cleanText(line?.receiptNote) });
  }

  return transfer.lines.map((line) => {
    const entry = supplied.get(String(line.product));
    if (!entry) throw new StockTransferError(400, `Missing received quantity for ${line.productName}.`);
    const previousQuantity = line.receivedQuantity === null || line.receivedQuantity === undefined
      ? 0
      : Number(line.receivedQuantity);
    if (entry.receivedQuantity < previousQuantity) {
      throw new StockTransferError(409, `${line.productName} was already recorded at ${previousQuantity} unit(s); a receipt cannot reduce it.`);
    }
    // Keep an over-count for reconciliation, but only move the portion
    // that was dispatched into sellable stock. The excess needs admin review.
    const delta = entry.receivedQuantity - previousQuantity;
    const acceptedDelta = Math.max(0, Math.min(delta, line.dispatchedQuantity - previousQuantity));
    return {
      line,
      previousQuantity,
      receivedQuantity: entry.receivedQuantity,
      delta,
      acceptedDelta,
      receiptNote: entry.receiptNote,
    };
  });
};

const populateTransfer = (query) => query
  .populate('releasedBy', 'name email')
  .populate('receivedBy', 'name email')
  .populate('resolvedBy', 'name email');

const branchFilter = (request) => {
  if (isAdmin(request)) return {};
  const branch = branchFor(request.user);
  return branch ? { destinationBranch: branch } : { _id: null };
};

// POST /api/admin/warehouse/transfers — release stock from the warehouse to a
// store. It becomes in-transit stock and is not sellable until the store signs
// for the physical quantity received.
export const createStockTransferRecord = async ({ lines: rawLines, destinationBranch, notes, actorId, idempotencyKey: rawIdempotencyKey }) => {
  const lines = normalizeTransferLines(rawLines);
  const branch = normalizeDestinationBranch(destinationBranch);
  if (!branch) throw new StockTransferError(400, 'Choose a destination branch no longer than 100 characters.');
  const note = cleanText(notes);
  const idempotencyKey = normalizeIdempotencyKey(rawIdempotencyKey);
  if (!idempotencyKey || idempotencyKey.length > 100) {
    throw new StockTransferError(400, 'Provide a valid Idempotency-Key to safely release this stock transfer.');
  }
  const requestFingerprint = JSON.stringify({
    lines: lines.map(({ productId, quantity }) => ({ productId, quantity })).sort((left, right) => left.productId.localeCompare(right.productId)),
    destinationBranch: branch,
    notes: note,
  });

  const existing = await StockTransferModel.findOne({ idempotencyKey }).select('_id releasedBy +requestFingerprint').lean();
  if (existing) {
    if (String(existing.releasedBy) !== String(actorId)) {
      throw new StockTransferError(409, 'This Idempotency-Key is already assigned to another stock release.');
    }
    if (existing.requestFingerprint !== requestFingerprint) {
      throw new StockTransferError(409, 'This Idempotency-Key was already used with a different stock release payload.');
    }
    return populateTransfer(StockTransferModel.findById(existing._id)).lean();
  }

  const session = await mongoose.startSession();
  let transferId;

  try {
    await session.withTransaction(async () => {
      const productIds = lines.map((line) => line.productId);
      const products = await ProductModel.find({ _id: { $in: productIds } })
        .select('name sku warehouseStock')
        .session(session)
        .lean();
      const productsById = new Map(products.map((product) => [String(product._id), product]));

      for (const line of lines) {
        if (!productsById.has(line.productId)) {
          throw new StockTransferError(404, 'One or more products on this transfer no longer exist.');
        }
      }

      const [transfer] = await StockTransferModel.create([{
        number: transferNumber(),
        idempotencyKey,
        requestFingerprint,
        destinationBranch: branch,
        status: 'dispatched',
        lines: lines.map((line) => {
          const product = productsById.get(line.productId);
          return {
            product: product._id,
            productName: product.name,
            sku: product.sku || '',
            dispatchedQuantity: line.quantity,
          };
        }),
        notes: note,
        releasedBy: actorId,
        releasedAt: new Date(),
      }], { session });
      transferId = transfer._id;

      const movements = [];
      for (const line of lines) {
        const updated = await ProductModel.findOneAndUpdate(
          { _id: line.productId, warehouseStock: { $gte: line.quantity } },
          { $inc: { warehouseStock: -line.quantity, inTransitStock: line.quantity } },
          { new: true, session },
        ).select('name warehouseStock inTransitStock').lean();
        if (!updated) {
          const current = productsById.get(line.productId);
          throw new StockTransferError(422, `Only ${Number(current?.warehouseStock || 0)} unit(s) of ${current?.name || 'this product'} are in the warehouse.`);
        }
        movements.push({
          product: line.productId,
          type: 'transfer_dispatch',
          actorType: 'admin',
          warehouseDelta: -line.quantity,
          inTransitDelta: line.quantity,
          reference: { model: 'StockTransfer', id: transfer._id, number: transfer.number },
          reason: `Released to ${branch} on ${transfer.number}`,
          actorId,
        });
      }

      await InventoryMovementModel.insertMany(movements, { session });
      await AdminActionLogModel.create([{
        actorType: 'admin',
        actorId,
        action: 'release_stock_transfer',
        target: { model: 'StockTransfer', id: transfer._id },
        after: { number: transfer.number, destinationBranch: branch, status: transfer.status, lines: transfer.lines.map((line) => ({ product: line.productName, quantity: line.dispatchedQuantity })) },
        reason: note,
      }], { session });
    });
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.idempotencyKey) {
      const concurrent = await StockTransferModel.findOne({ idempotencyKey }).select('_id releasedBy +requestFingerprint').lean();
      if (concurrent && String(concurrent.releasedBy) === String(actorId) && concurrent.requestFingerprint === requestFingerprint) {
        transferId = concurrent._id;
      } else if (concurrent && String(concurrent.releasedBy) !== String(actorId)) {
        throw new StockTransferError(409, 'This Idempotency-Key is already assigned to another stock release.');
      } else if (concurrent) {
        throw new StockTransferError(409, 'This Idempotency-Key was already used with a different stock release payload.');
      } else {
        throw error;
      }
    } else {
      throw error;
    }
  } finally {
    await session.endSession();
  }

  return populateTransfer(StockTransferModel.findById(transferId)).lean();
};

export const createStockTransfer = async (request, response) => {
  try {
    const transfer = await createStockTransferRecord({
      lines: request.body?.lines,
      destinationBranch: request.body?.destinationBranch,
      notes: request.body?.notes,
      actorId: request.userId,
      idempotencyKey: idempotencyKeyFromRequest(request),
    });
    return response.status(201).json({ success: true, data: transfer });
  } catch (error) {
    return sendError(response, error, 'Stock transfer could not be released.');
  }
};

// Compatibility wrapper for the former one-product dispatch endpoint. Existing
// callers still work, but now receive the safer transfer/receipt workflow.
export const dispatchToShop = async (request, response) => {
  try {
    const transfer = await createStockTransferRecord({
      lines: [{ productId: String(request.body?.productId || '').trim(), quantity: request.body?.quantity }],
      destinationBranch: request.body?.destinationBranch,
      notes: request.body?.reason,
      actorId: request.userId,
      idempotencyKey: idempotencyKeyFromRequest(request),
    });
    return response.json({ success: true, data: transfer });
  } catch (error) {
    return sendError(response, error, 'Stock transfer could not be released.');
  }
};

const transferList = async (request, response, statuses, extraFilter = {}) => {
  try {
    const limit = Math.min(LIST_LIMIT_MAX, Math.max(1, Number(request.query.limit) || 50));
    const filter = {
      ...branchFilter(request),
      ...extraFilter,
      ...(statuses !== null ? { status: { $in: statuses } } : {}),
    };
    const query = StockTransferModel.find(filter);
    if (isAdmin(request)) query.select('+idempotencyKey');
    const transfers = await populateTransfer(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return response.json({ success: true, data: transfers });
  } catch (error) {
    return sendError(response, error, 'Stock transfers could not be loaded.');
  }
};

const queryStatuses = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const requested = raw.split(',').map((status) => status.trim()).filter(Boolean);
  return requested.length === raw.split(',').length && requested.every((status) => TRANSFER_STATUSES.includes(status)) ? requested : [];
};

export const getAdminStockTransfers = async (request, response) => {
  const statuses = queryStatuses(request.query.status);
  return transferList(request, response, statuses);
};

export const getPendingStockTransfers = async (request, response) =>
  transferList(request, response, RECEIVABLE_STATUSES);

export const getStockTransferHistory = async (request, response) =>
  transferList(request, response, ['confirmed', 'disputed', 'resolved', 'cancelled']);

// POST /api/staff/stock-transfers/:id/receive — record the physical quantity
// counted by the destination staff member. Receipt quantities are cumulative so
// a partial delivery can be safely confirmed over more than one visit.
export const receiveStockTransfer = async (request, response) => {
  if (typeof request.body?.finalize !== 'boolean') {
    return response.status(400).json({ success: false, message: 'The finalize field must be a boolean.' });
  }
  const finalize = request.body.finalize;
  const receiptNote = cleanText(request.body?.receiptNote);
  const session = await mongoose.startSession();
  let responseTransfer;

  try {
    await session.withTransaction(async () => {
      const filter = { _id: request.params.id, ...branchFilter(request), status: { $in: RECEIVABLE_STATUSES } };
      const transfer = await StockTransferModel.findOne(filter).session(session);
      if (!transfer) throw new StockTransferError(404, 'This stock transfer is not available for your store or has already been closed.');

      const receiptActorType = isAdmin(request) ? 'admin' : 'staff';
      const receivedLines = normalizeReceiptLines(request.body?.lines, transfer);
      const candidateLines = transfer.lines.map((line) => {
        const received = receivedLines.find((item) => item.line.product.toString() === line.product.toString());
        return { dispatchedQuantity: line.dispatchedQuantity, receivedQuantity: received.receivedQuantity };
      });
      const nextStatus = calculateTransferStatus(candidateLines, { finalize });
      const hasVariance = candidateLines.some((line) => transferLineVariance(line.dispatchedQuantity, line.receivedQuantity) !== 0);
      const hasExistingReceiptNote = Boolean(transfer.receiptNote || transfer.lines.some((line) => line.receiptNote));
      if (nextStatus === 'disputed' && !receiptNote && !receivedLines.some((line) => line.receiptNote) && !hasExistingReceiptNote) {
        throw new StockTransferError(400, 'Add a note explaining the quantity difference before submitting this discrepancy.');
      }

      for (const received of receivedLines) {
        if (!received.acceptedDelta) continue;
        const updated = await ProductModel.findOneAndUpdate(
          { _id: received.line.product, inTransitStock: { $gte: received.acceptedDelta } },
          { $inc: { inTransitStock: -received.acceptedDelta, stock: received.acceptedDelta } },
          { new: true, session },
        ).select('name stock inTransitStock').lean();
        if (!updated) throw new StockTransferError(409, `${received.line.productName} no longer has enough units in transit to receive.`);
      }

      const movementRows = receivedLines.filter((line) => line.acceptedDelta > 0).map((line) => ({
        product: line.line.product,
        type: 'transfer_receipt',
        actorType: receiptActorType,
        inTransitDelta: -line.acceptedDelta,
        shopDelta: line.acceptedDelta,
        reference: { model: 'StockTransfer', id: transfer._id, number: transfer.number },
        reason: `Received at ${transfer.destinationBranch} on ${transfer.number}`,
        actorId: request.userId,
      }));
      if (movementRows.length) await InventoryMovementModel.insertMany(movementRows, { session });

      receivedLines.forEach((received) => {
        received.line.receivedQuantity = received.receivedQuantity;
        received.line.variance = transferLineVariance(received.line.dispatchedQuantity, received.receivedQuantity);
        received.line.receiptNote = appendNote(received.line.receiptNote, received.receiptNote);
      });
      transfer.status = nextStatus;
      transfer.receivedBy = request.userId;
      transfer.receivedAt = new Date();
      transfer.receiptNote = appendNote(transfer.receiptNote, receiptNote);
      const accumulatedLineNotes = transfer.lines.map((line) => line.receiptNote).filter(Boolean).join(' | ');
      const receiptAuditNote = appendNote(transfer.receiptNote, accumulatedLineNotes);
      await transfer.save({ session });

      await AdminActionLogModel.create([{
        actorType: receiptActorType,
        actorId: request.userId,
        action: finalize ? 'confirm_stock_transfer_receipt' : 'save_partial_stock_transfer_receipt',
        target: { model: 'StockTransfer', id: transfer._id },
        after: {
          number: transfer.number,
          status: transfer.status,
          hasVariance,
          lines: transfer.lines.map((line) => ({ product: line.productName, dispatched: line.dispatchedQuantity, received: line.receivedQuantity, variance: line.variance })),
        },
        reason: receiptAuditNote,
      }], { session });
      responseTransfer = transfer;
    });

    return response.json({ success: true, data: responseTransfer });
  } catch (error) {
    return sendError(response, error, 'Stock receipt could not be recorded.');
  } finally {
    await session.endSession();
  }
};

// POST /api/admin/warehouse/transfers/:id/resolve — close a disputed variance
// after the admin has reviewed the staff count and note. Missing units are
// resolved out of in-transit; verified overages are explicitly added to shop.
export const resolveStockTransfer = async (request, response) => {
  const action = String(request.body?.action || '').trim();
  const resolutionNote = cleanText(request.body?.resolutionNote);
  if (action !== 'reconcile_variance') return response.status(400).json({ success: false, message: 'Choose the reconcile-variance resolution for a disputed transfer.' });
  if (!resolutionNote) return response.status(400).json({ success: false, message: 'Add a resolution note before closing the discrepancy.' });

  const session = await mongoose.startSession();
  let responseTransfer;
  try {
    await session.withTransaction(async () => {
      const transfer = await StockTransferModel.findOne({ _id: request.params.id, status: 'disputed' }).session(session);
      if (!transfer) throw new StockTransferError(404, 'Only a disputed transfer can be resolved.');

      const adjustmentRows = [];
      for (const line of transfer.lines) {
        const received = line.receivedQuantity === null || line.receivedQuantity === undefined ? 0 : line.receivedQuantity;
        const missing = Math.max(line.dispatchedQuantity - received, 0);
        const excess = Math.max(received - line.dispatchedQuantity, 0);
        if (missing) {
          const updated = await ProductModel.findOneAndUpdate(
            { _id: line.product, inTransitStock: { $gte: missing } },
            { $inc: { inTransitStock: -missing } },
            { new: true, session },
          ).select('name inTransitStock').lean();
          if (!updated) throw new StockTransferError(409, `${line.productName} no longer has enough in-transit stock to resolve.`);
          adjustmentRows.push({
            product: line.product,
            type: 'transfer_loss',
            actorType: 'admin',
            inTransitDelta: -missing,
            reference: { model: 'StockTransfer', id: transfer._id, number: transfer.number },
            reason: cleanText(`Shortage resolved as loss/damage on ${transfer.number}: ${resolutionNote}`, 500),
            actorId: request.userId,
          });
        }
        if (excess) {
          const updated = await ProductModel.findByIdAndUpdate(
            line.product,
            { $inc: { stock: excess } },
            { new: true, session },
          ).select('name stock').lean();
          if (!updated) throw new StockTransferError(404, `${line.productName} no longer exists.`);
          adjustmentRows.push({
            product: line.product,
            type: 'transfer_overage',
            actorType: 'admin',
            shopDelta: excess,
            reference: { model: 'StockTransfer', id: transfer._id, number: transfer.number },
            reason: cleanText(`Overage accepted on ${transfer.number}: ${resolutionNote}`, 500),
            actorId: request.userId,
          });
        }
      }
      if (!adjustmentRows.length) throw new StockTransferError(400, 'This transfer has no quantity variance to resolve.');
      await InventoryMovementModel.insertMany(adjustmentRows, { session });

      transfer.status = 'resolved';
      transfer.resolvedBy = request.userId;
      transfer.resolvedAt = new Date();
      transfer.resolutionAction = action;
      transfer.resolutionNote = resolutionNote;
      await transfer.save({ session });
      await AdminActionLogModel.create([{
        actorType: 'admin',
        actorId: request.userId,
        action: 'resolve_stock_transfer_discrepancy',
        target: { model: 'StockTransfer', id: transfer._id },
        after: { number: transfer.number, status: transfer.status, resolutionAction: action, resolutionNote },
        reason: resolutionNote,
      }], { session });
      responseTransfer = transfer;
    });
    return response.json({ success: true, data: responseTransfer });
  } catch (error) {
    return sendError(response, error, 'Transfer discrepancy could not be resolved.');
  } finally {
    await session.endSession();
  }
};
