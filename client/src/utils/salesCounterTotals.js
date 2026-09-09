export const calculateSalesCounterTotals = (cart, amountTendered) => {
  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
    0,
  );
  const tax = 0;
  const total = subtotal;
  const tendered = Number(amountTendered) || 0;

  return {
    subtotal,
    tax,
    total,
    change: Math.max(0, tendered - total),
  };
};
