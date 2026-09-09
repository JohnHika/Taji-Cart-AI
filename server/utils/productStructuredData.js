const toFiniteNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const getDiscountedPrice = (price, discount) => {
  const basePrice = toFiniteNumber(price);
  if (basePrice === null || basePrice <= 0) return null;

  const rawDiscount = toFiniteNumber(discount) ?? 0;
  const safeDiscount = Math.min(100, Math.max(0, rawDiscount));
  const discountedPrice = basePrice - Math.round((basePrice * safeDiscount) / 100);

  return discountedPrice > 0 ? Number(discountedPrice.toFixed(2)) : null;
};

const getAggregateRating = (ratings = []) => {
  const validRatings = (Array.isArray(ratings) ? ratings : [])
    .map((entry) => toFiniteNumber(entry?.rating))
    .filter((rating) => rating !== null && rating >= 1 && rating <= 5);

  if (!validRatings.length) return null;

  const average = validRatings.reduce((total, rating) => total + rating, 0) / validRatings.length;
  return {
    '@type': 'AggregateRating',
    ratingValue: average.toFixed(1),
    reviewCount: validRatings.length,
    bestRating: 5,
    worstRating: 1,
  };
};

export const buildProductStructuredData = ({ product = {}, canonicalUrl, description }) => {
  const image = (Array.isArray(product.image) ? product.image : []).filter(Boolean);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: String(product.name || ''),
    ...(image.length ? { image } : {}),
    description: String(description || ''),
    ...(product.sku ? { sku: String(product.sku) } : {}),
    brand: { '@type': 'Brand', name: 'Nawiri Hair' },
  };

  const discountedPrice = getDiscountedPrice(product.price, product.discount);
  if (discountedPrice !== null) {
    schema.offers = {
      '@type': 'Offer',
      url: canonicalUrl,
      priceCurrency: 'KES',
      price: discountedPrice,
      availability: Number(product.stock) > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: 'Nawiri Hair' },
    };
  }

  const aggregateRating = getAggregateRating(product.ratings);
  if (aggregateRating) {
    schema.aggregateRating = aggregateRating;
  }

  return schema;
};
