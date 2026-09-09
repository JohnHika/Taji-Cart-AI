import mongoose from 'mongoose';

export const getOrderIdentifierQuery = (identifier) => {
  const value = String(identifier || '').trim();

  if (!value) {
    return null;
  }

  return mongoose.Types.ObjectId.isValid(value)
    ? { _id: value }
    : { orderId: value };
};
