const ALLOWED_PAYMENT_METHODS = new Set(['cash', 'equity', 'text_forwarded']);

const toCents = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : null;
};

export const validatePosPayments = ({ paymentMethod, total, payments }) => {
  const totalCents = toCents(total);
  if (totalCents === null) {
    return { valid: false, message: 'Sale total must be a valid amount' };
  }

  // Keep legacy single-method callers working when they do not send the
  // optional per-leg payments array. Split payments must always send legs so
  // the server can reconcile each method.
  if (!Array.isArray(payments)) {
    if (paymentMethod === 'split') {
      return { valid: false, message: 'Split payments must include payment legs' };
    }
    return { valid: true };
  }

  if (payments.length === 0) {
    return { valid: false, message: 'At least one payment leg is required' };
  }

  const seenMethods = new Set();
  let paidCents = 0;
  for (const row of payments) {
    if (!row || !ALLOWED_PAYMENT_METHODS.has(row.method)) {
      return { valid: false, message: 'Payment method is invalid' };
    }
    if (seenMethods.has(row.method)) {
      return { valid: false, message: 'Each split payment method can appear only once' };
    }
    const amountCents = toCents(row.amount);
    if (amountCents === null || amountCents === 0) {
      return { valid: false, message: 'Every payment leg must have a positive amount' };
    }
    seenMethods.add(row.method);
    paidCents += amountCents;
  }

  if (paymentMethod === 'split' && seenMethods.size < 2) {
    return { valid: false, message: 'A split payment must include at least two payment methods' };
  }

  if (paymentMethod !== 'split' && (payments.length !== 1 || !seenMethods.has(paymentMethod))) {
    return { valid: false, message: 'Payment legs must match the selected payment method' };
  }

  if (paidCents !== totalCents) {
    return { valid: false, message: 'Payment amounts must exactly match the sale total' };
  }

  return { valid: true };
};
