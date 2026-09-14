export const MAX_TRANSFER_QUANTITY = 100000;

const hasValue = (value) => value !== null
  && value !== undefined
  && !(typeof value === 'string' && value.trim() === '');

export const isValidTransferQuantity = (value, { allowZero = false } = {}) => {
  if (!hasValue(value)) return false;
  if (typeof value === 'string' && !/^(0|[1-9]\d*)$/.test(value)) return false;
  if (typeof value !== 'string' && typeof value !== 'number') return false;
  const quantity = Number(value);
  const minimum = allowZero ? 0 : 1;
  return Number.isSafeInteger(quantity) && quantity >= minimum && quantity <= MAX_TRANSFER_QUANTITY;
};

export const transferLineVariance = (dispatchedQuantity, receivedQuantity) => {
  const dispatched = Number(dispatchedQuantity);
  const received = Number(receivedQuantity);
  if (!Number.isFinite(dispatched) || !Number.isFinite(received)) return null;
  return received - dispatched;
};

export const getTransferLineState = (dispatchedQuantity, receivedQuantity) => {
  if (receivedQuantity === null || receivedQuantity === undefined) return 'pending';
  const variance = transferLineVariance(dispatchedQuantity, receivedQuantity);
  if (variance === null) return 'pending';
  if (variance === 0) return 'matched';
  return variance < 0 ? 'short' : 'over';
};

export const calculateTransferStatus = (lines = [], { finalize = false } = {}) => {
  if (!lines.length) return 'dispatched';
  const states = lines.map((line) => getTransferLineState(line.dispatchedQuantity, line.receivedQuantity));
  if (states.some((state) => state === 'over') || (finalize && states.some((state) => state === 'short'))) return 'disputed';
  if (states.every((state) => state === 'matched')) return 'confirmed';
  if (states.some((state) => state !== 'pending')) return 'partially_received';
  return 'dispatched';
};
