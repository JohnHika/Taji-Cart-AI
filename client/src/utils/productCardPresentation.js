const LOW_STOCK_THRESHOLD = 3;

export const getStockPresentation = (stock) => {
  const quantity = Number(stock);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { label: 'Out of stock', tone: 'unavailable' };
  }

  if (quantity <= LOW_STOCK_THRESHOLD) {
    return { label: `Only ${quantity} left`, tone: 'low' };
  }

  return { label: 'In stock', tone: 'available' };
};

export const getRatingSummary = (product = {}) => {
  const ratings = Array.isArray(product.ratings) ? product.ratings : [];
  const count = ratings.length;
  const storedAverage = Number(product.averageRating);
  const calculatedAverage = count
    ? ratings.reduce((sum, entry) => sum + (Number(entry?.rating) || 0), 0) / count
    : 0;
  const average = storedAverage > 0 ? storedAverage : calculatedAverage;

  if (!average || !count) {
    return null;
  }

  return {
    average: average.toFixed(1),
    count,
    label: `${count} ${count === 1 ? 'rating' : 'ratings'}`,
  };
};
