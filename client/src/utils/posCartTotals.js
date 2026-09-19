export const POS_TAX_RATE = 0.16; // 16%

// Loyalty discount rate for a customer's card: card rate if set, else tier-based fallback.
export const getLoyaltyDiscountRate = (loyaltyCard) => {
  if (!loyaltyCard) return 0;

  if (loyaltyCard.discountRate) return loyaltyCard.discountRate;

  const tierDiscounts = {
    Bronze: 2,
    Silver: 5,
    Gold: 8,
    Platinum: 12
  };

  return tierDiscounts[loyaltyCard.tier] || 0;
};

// Single source of truth for POS cart math (used by the live cart and held-sale snapshots).
// Order: subtotal → per-line discounts → order discount (percent or fixed amount) → loyalty % → tax.
export const calculatePosCartTotals = ({
  cart = [],
  discount = 0,
  discountMode = 'percent',
  discountAmount = 0,
  applyTax = false,
  loyaltyDiscountPct = 0
}) => {
  const lineTotals = cart.map(item => {
    const lineSub = item.price * item.quantity;
    const lineDiscountPct = item.discountPct ? Math.min(100, Math.max(0, item.discountPct)) : 0;
    const lineDiscount = lineSub * (lineDiscountPct / 100);
    return { lineSub, lineDiscount };
  });

  const subtotal = lineTotals.reduce((s, l) => s + l.lineSub, 0);
  const perLineDiscount = lineTotals.reduce((s, l) => s + l.lineDiscount, 0);
  const orderDiscount = discountMode === 'percent'
    ? subtotal * (discount / 100)
    : Math.min(subtotal, Math.max(0, Number(discountAmount) || 0));
  const loyaltyAmount = subtotal * (Math.max(0, Number(loyaltyDiscountPct) || 0) / 100);
  const preTaxTotal = Math.max(0, subtotal - (perLineDiscount + orderDiscount + loyaltyAmount));
  const tax = applyTax ? preTaxTotal * POS_TAX_RATE : 0;
  const total = Math.max(0, preTaxTotal + tax);

  return {
    subtotal,
    discountAmount: perLineDiscount + orderDiscount + loyaltyAmount,
    tax,
    total,
    itemCount: cart.reduce((sum, item) => sum + item.quantity, 0)
  };
};