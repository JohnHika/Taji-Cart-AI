import mongoose from 'mongoose';
import { getNextSequence } from '../models/counter.model.js';

export const getOrderIdentifierQuery = (identifier) => {
  const value = String(identifier || '').trim();

  if (!value) {
    return null;
  }

  return mongoose.Types.ObjectId.isValid(value)
    ? { _id: value }
    : { orderId: value };
};

// Human-friendly, date-stamped order numbers in the same style as POS sale
// numbers (YYYYMMDD + per-day sequence): ORD-20260926-0042. Replaces the old
// `ORD-<ObjectId>` identifiers, which customers and support could never read
// or type aloud. Only NEW orders get this format — existing orders keep their
// ORD-<ObjectId> ids and stay searchable/trackable exactly as before.
//
// The counter key is per-day, so the sequence restarts at 1 each morning while
// the date in the id keeps every id globally unique. $inc is atomic, so two
// checkouts confirmed in the same second can never be handed the same number
// (same guarantee as the sale-number flow in routes/pos.js). The "ORD-" prefix
// also keeps getOrderIdentifierQuery pointing every new id at the orderId
// field rather than a raw document _id.
export const nextOrderId = async () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const nextNumber = await getNextSequence(`order-${dateStr}`);
  return `ORD-${dateStr}-${nextNumber.toString().padStart(4, '0')}`;
};
