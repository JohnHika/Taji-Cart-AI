export const MAX_TRANSFER_QUANTITY = 100000;

export const isValidStockTransferQuantity = (value, { allowZero = false } = {}) => {
  if (typeof value === 'string' && !/^(0|[1-9]\d*)$/.test(value)) return false;
  if (typeof value !== 'string' && typeof value !== 'number') return false;
  const quantity = Number(value);
  const minimum = allowZero ? 0 : 1;
  return Number.isSafeInteger(quantity) && quantity >= minimum && quantity <= MAX_TRANSFER_QUANTITY;
};

export const createStockTransferIdempotencyKey = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `stock-transfer-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
};
