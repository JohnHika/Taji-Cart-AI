const PAYMENT_METHOD_ORDER = ['cash', 'equity', 'text_forwarded'];

export const shouldShowEquityProof = (paymentMethod) =>
  paymentMethod === 'equity' || paymentMethod === 'split';

const toCents = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) : 0;
};

export const buildSplitPaymentRows = ({ cashAmount, equityAmount, textForwardedAmount }) => {
  const rawAmounts = {
    cash: cashAmount,
    equity: equityAmount,
    text_forwarded: textForwardedAmount,
  };

  return PAYMENT_METHOD_ORDER
    .map((method) => ({ method, amountCents: toCents(rawAmounts[method]) }))
    .filter((row) => row.amountCents > 0)
    .map(({ method, amountCents }) => ({ method, amount: amountCents / 100 }));
};

export const getSplitPaymentSummary = ({ total, cashAmount, equityAmount, textForwardedAmount }) => {
  const totalCents = toCents(total);
  const rows = buildSplitPaymentRows({ cashAmount, equityAmount, textForwardedAmount });
  const paidCents = rows.reduce((sum, row) => sum + Math.round(row.amount * 100), 0);
  const remainingCents = totalCents - paidCents;

  return {
    paid: paidCents / 100,
    remaining: remainingCents / 100,
    isBalanced: remainingCents === 0,
    methodCount: rows.length,
  };
};
