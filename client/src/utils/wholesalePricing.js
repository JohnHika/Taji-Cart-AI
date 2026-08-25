// "more than 50 items" — a strict threshold, so 51+ qualifies, not 50.
// Mirrors server/utils/wholesalePricing.js — kept in sync manually since
// client and server are separate npm workspaces with no shared package.
export const WHOLESALE_QUANTITY_THRESHOLD = 50;

// The threshold is cart-wide: it's the total quantity across every line in
// the cart, not any single product's quantity on its own.
export const isWholesaleEligible = (totalQuantity) =>
  Number(totalQuantity || 0) > WHOLESALE_QUANTITY_THRESHOLD;

// Computes the effective unit price for one line item once the cart as a
// whole has crossed the wholesale quantity threshold. `pricewithDiscountFn`
// is injected so callers can use whichever discount-chain function they
// already have in scope (e.g. pricewithDiscount from PriceWithDiscount.js).
export const getEffectiveUnitPrice = ({
  price,
  discount = 0,
  wholesalePrice,
  royalDiscount = 0,
  wholesaleEligible,
  stackDiscounts,
  pricewithDiscountFn,
}) => {
  const hasWholesalePrice = wholesalePrice !== undefined && wholesalePrice !== null && Number(wholesalePrice) > 0;

  if (wholesaleEligible && hasWholesalePrice) {
    return stackDiscounts
      ? pricewithDiscountFn(wholesalePrice, discount, royalDiscount)
      : Number(wholesalePrice);
  }

  return pricewithDiscountFn(price, discount, royalDiscount);
};
