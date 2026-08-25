import WholesalePricingSettingsModel from '../models/wholesalePricingSettings.model.js';

const WHOLESALE_SETTINGS_KEY = 'wholesalePricing';

// "more than 50 items" — a strict threshold, so 51+ qualifies, not 50.
export const WHOLESALE_QUANTITY_THRESHOLD = 50;

export const getWholesalePricingSettings = async () =>
  WholesalePricingSettingsModel.findOneAndUpdate(
    { key: WHOLESALE_SETTINGS_KEY },
    { $setOnInsert: { stackDiscounts: false } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

// The threshold is cart-wide: it's the total quantity across every line in
// the order/sale, not any single product's quantity on its own.
export const isWholesaleEligible = (totalQuantity) =>
  Number(totalQuantity || 0) > WHOLESALE_QUANTITY_THRESHOLD;

// Computes the effective unit price for one line item once the order as a
// whole has crossed the wholesale quantity threshold. `pricewithDiscountFn`
// is injected so each caller can use its own local copy of that calculation
// (order.controller.js and jenga.controller.js each keep their own).
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
