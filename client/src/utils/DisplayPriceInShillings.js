// Create formatter once
const keshFormatter = new Intl.NumberFormat('en-KE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export const DisplayPriceInShillings = (price) => {
  if (price === undefined || price === null || isNaN(price)) {
    return 'KES 0.00';
  }
  return `KSh ${keshFormatter.format(price)}`;
};
