const MOBILE_CART_SUMMARY_HIDDEN_ROUTES = new Set([
  '/checkout',
  '/dashboard/checkout',
  '/mobile/cart',
]);

export const shouldRenderMobileCartSummary = ({ isAuthenticated, totalQty, pathname }) => (
  Boolean(isAuthenticated)
  && Number(totalQty) > 0
  && !MOBILE_CART_SUMMARY_HIDDEN_ROUTES.has(pathname)
);
