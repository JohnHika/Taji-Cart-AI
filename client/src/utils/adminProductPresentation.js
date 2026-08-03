export const getAdminProductPage = (products = [], requestedPage = 1, productsPerPage = 12) => {
  const totalItems = products.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / productsPerPage));
  const currentPage = Math.min(Math.max(1, Number(requestedPage) || 1), totalPages);
  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * productsPerPage;
  const endIndex = Math.min(startIndex + productsPerPage, totalItems);

  return {
    currentPage,
    totalItems,
    totalPages,
    startItem: totalItems === 0 ? 0 : startIndex + 1,
    endItem: endIndex,
    items: products.slice(startIndex, endIndex),
  };
};
