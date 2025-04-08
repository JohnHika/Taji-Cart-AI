// Create formatter once
const keshFormatter = new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES'
});

export const DisplayPriceInShillings = (price) => {
  if (price === undefined || price === null || isNaN(price)) {
    return 'KES 0.00';
  }
  return keshFormatter.format(price);
};
