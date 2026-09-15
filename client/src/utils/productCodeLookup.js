export const normalizeProductCode = (value) => String(value ?? '').trim();

export const productMatchesScannedCode = (product, scannedCode) => {
  const normalizedCode = normalizeProductCode(scannedCode).toLocaleLowerCase();
  if (!normalizedCode || !product) return false;

  return [product.barcode, product.qrCode, product.sku]
    .filter(Boolean)
    .some((code) => normalizeProductCode(code).toLocaleLowerCase() === normalizedCode);
};

export const findProductByScannedCode = (products, scannedCode) =>
  (products || []).find((product) => productMatchesScannedCode(product, scannedCode)) || null;
