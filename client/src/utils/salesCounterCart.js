const isTrackedStock = (product) => product?.stock !== null && product?.stock !== undefined;

export const addProductToSalesCounterCart = (cart, product) => {
  const currentCart = Array.isArray(cart) ? cart : [];
  const productName = product?.name || 'This product';
  const price = Number(product?.price || 0);

  if (!Number.isFinite(price) || price <= 0) {
    return { cart: currentCart, added: false, message: `${productName} has no price set.` };
  }

  if (isTrackedStock(product) && Number(product.stock) <= 0) {
    return { cart: currentCart, added: false, message: `${productName} is out of stock.` };
  }

  const existing = currentCart.find((item) => item._id === product._id);
  if (existing && isTrackedStock(product) && existing.quantity + 1 > Number(product.stock)) {
    return { cart: currentCart, added: false, message: `Only ${product.stock} of ${productName} left in stock.` };
  }

  const nextCart = existing
    ? currentCart.map((item) =>
      item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
    )
    : [...currentCart, { ...product, quantity: 1 }];

  return { cart: nextCart, added: true, message: `${productName} added` };
};
