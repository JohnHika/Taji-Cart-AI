const placeholderImagePattern = /product-photo-pending|via\.placeholder/i;

export const hasUsableProductImage = (image) => {
  const primaryImage = Array.isArray(image) ? image[0] : null;
  return typeof primaryImage === 'string' && primaryImage.trim().length > 0 && !placeholderImagePattern.test(primaryImage);
};

export const hasPositiveProductPrice = (price) => Number.isFinite(Number(price)) && Number(price) > 0;

export const getIncompleteProductReasons = (product = {}) => {
  const reasons = [];

  if (!hasUsableProductImage(product.image)) {
    reasons.push('Add at least one product image');
  }

  if (!hasPositiveProductPrice(product.price)) {
    reasons.push('Set a price above KSh 0');
  }

  return reasons;
};

export const isCustomerReadyProduct = (product = {}) => getIncompleteProductReasons(product).length === 0;

export const buildCustomerProductFilter = (hideIncompleteProducts = true) => {
  const publishedFilter = { publish: true };

  if (!hideIncompleteProducts) {
    return publishedFilter;
  }

  return {
    ...publishedFilter,
    price: { $gt: 0 },
    'image.0': {
      $exists: true,
      $nin: ['', null],
      $not: placeholderImagePattern,
    },
  };
};

export const buildIncompleteProductFilter = () => ({
  $or: [
    { 'image.0': { $exists: false } },
    { 'image.0': { $in: ['', null] } },
    { 'image.0': { $regex: placeholderImagePattern } },
    { price: { $exists: false } },
    { price: null },
    { price: { $lte: 0 } },
  ],
});
