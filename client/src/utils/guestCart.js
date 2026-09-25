// Guest Cart Utilities - Handle cart for non-logged-in users
//
// Stored in localStorage. It used to live in a cookie, but cookies cap out at
// ~4KB and full product snapshots silently stopped saving after 6-8 items, so
// each line now keeps only the fields the cart, checkout and merge read.
import Cookies from 'js-cookie';
import SummaryApi from '../common/SummaryApi';
import Axios from './Axios';

const GUEST_CART_KEY = 'nawiri_guest_cart';
const LEGACY_GUEST_CART_COOKIE = 'nawiri_guest_cart';
const CART_EXPIRY_DAYS = 7;
const CART_EXPIRY_MS = CART_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

const VARIANT_FIELDS = ['color', 'length', 'density', 'laceSpecification'];

// Same line identity the cart button and the server use: product + SKU, or
// product + selected variant when there's no SKU.
const buildLineKey = (item = {}) => {
  const productId = item.productId?._id || item.productId || '';
  const sku = typeof item.sku === 'string' ? item.sku.trim() : '';
  if (sku) return `${productId}|sku:${sku}`;
  const variant = VARIANT_FIELDS.map((field) => item.selectedVariant?.[field] || '').join('|');
  return `${productId}|variant:${variant}`;
};

// Guest line ids look like "guest-..."; older callers pass the product id.
const matchesLine = (item, id) => item._id === id || item.productId?._id === id;

const toStockLimit = (stock) => {
  const parsed = Number(stock);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : null;
};

/**
 * Reduce a cart line to what's worth persisting.
 * @param {Object} item - Cart line (full product snapshot or already slim)
 * @returns {Object} Slim cart line
 */
const toStoredLine = (item) => {
  const product = item?.productId || {};
  const images = Array.isArray(product.image) ? product.image : (product.image ? [product.image] : []);
  const line = {
    _id: item._id || `guest-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    productId: {
      _id: product._id,
      name: product.name,
      price: product.price,
      discount: product.discount || 0,
      image: images.slice(0, 1),
      unit: typeof product.unit === 'string' ? product.unit : undefined,
    },
    quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
  };

  // Needed to price the line the same way the server does (wholesale kicks in
  // cart-wide past the threshold) and to cap quantities at stock.
  if (Number(product.wholesalePrice) > 0) line.productId.wholesalePrice = Number(product.wholesalePrice);
  if (toStockLimit(product.stock) !== null) line.productId.stock = toStockLimit(product.stock);
  if (item.sku) line.sku = item.sku;
  if (item.selectedVariant && Object.values(item.selectedVariant).some(Boolean)) {
    line.selectedVariant = item.selectedVariant;
  }
  return line;
};

const readLegacyCookieCart = () => {
  try {
    const cartJson = Cookies.get(LEGACY_GUEST_CART_COOKIE);
    if (!cartJson) return null;
    const parsed = JSON.parse(cartJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error reading legacy guest cart cookie:', error);
    return [];
  }
};

/**
 * Save guest cart to localStorage
 * @param {Array} items - Cart items to save
 * @returns {Boolean} True when saved
 */
export const saveGuestCart = (items) => {
  try {
    const lines = (Array.isArray(items) ? items : []).filter((item) => item?.productId).map(toStoredLine);
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify({ items: lines, savedAt: Date.now() }));
    return true;
  } catch (error) {
    console.error('Error saving guest cart:', error);
    return false;
  }
};

/**
 * Get guest cart from localStorage (migrating a legacy cookie cart once)
 * @returns {Array} Cart items array
 */
export const getGuestCart = () => {
  try {
    const stored = localStorage.getItem(GUEST_CART_KEY);

    if (!stored) {
      // One-time move of a cart saved by the old cookie store.
      const legacyItems = readLegacyCookieCart();
      if (legacyItems === null) return [];
      const lines = legacyItems.filter((item) => item?.productId).map(toStoredLine);
      if (lines.length === 0 || saveGuestCart(lines)) {
        Cookies.remove(LEGACY_GUEST_CART_COOKIE);
      }
      return lines;
    }

    const parsed = JSON.parse(stored);
    if (!parsed || !Array.isArray(parsed.items)) return [];

    // Same 7-day lifetime the cookie had.
    if (parsed.savedAt && Date.now() - parsed.savedAt > CART_EXPIRY_MS) {
      localStorage.removeItem(GUEST_CART_KEY);
      return [];
    }

    return parsed.items;
  } catch (error) {
    console.error('Error reading guest cart:', error);
    return [];
  }
};

/**
 * Add item to guest cart
 * @param {Object} item - Product item to add
 * @returns {Array} Updated cart
 */
export const addToGuestCart = (item) => {
  const cart = getGuestCart();
  const lineKey = buildLineKey(item);

  // Check if this exact line (product + SKU/variant) already exists in cart
  const existingIndex = cart.findIndex(cartItem => buildLineKey(cartItem) === lineKey);

  if (existingIndex !== -1) {
    // Update quantity if item exists, never past the stock we know about
    const stockLimit = toStockLimit(cart[existingIndex].productId?.stock);
    const nextQty = cart[existingIndex].quantity + (item.quantity || 1);
    cart[existingIndex].quantity = stockLimit ? Math.min(nextQty, stockLimit) : nextQty;
  } else {
    // Add new item
    cart.push(item);
  }

  saveGuestCart(cart);
  return getGuestCart();
};

/**
 * Remove item from guest cart
 * @param {String} lineId - Guest cart line id (or product id)
 * @returns {Array} Updated cart
 */
export const removeFromGuestCart = (lineId) => {
  const cart = getGuestCart();
  const updatedCart = cart.filter(item => !matchesLine(item, lineId));
  saveGuestCart(updatedCart);
  return updatedCart;
};

/**
 * Update item quantity in guest cart, capped at the product's stock
 * @param {String} lineId - Guest cart line id (or product id)
 * @param {Number} quantity - New quantity
 * @returns {Array} Updated cart
 */
export const updateGuestCartQuantity = (lineId, quantity) => {
  const cart = getGuestCart();
  const updatedCart = cart.map(item => {
    if (matchesLine(item, lineId)) {
      const stockLimit = toStockLimit(item.productId?.stock);
      const nextQty = Math.max(0, quantity);
      return { ...item, quantity: stockLimit ? Math.min(nextQty, stockLimit) : nextQty };
    }
    return item;
  }).filter(item => item.quantity > 0);

  saveGuestCart(updatedCart);
  return updatedCart;
};

/**
 * Clear guest cart
 */
export const clearGuestCart = () => {
  try {
    localStorage.removeItem(GUEST_CART_KEY);
  } catch (error) {
    console.error('Error clearing guest cart:', error);
  }
  Cookies.remove(LEGACY_GUEST_CART_COOKIE);
};

/**
 * Get guest cart total items count
 * @returns {Number} Total items in cart
 */
export const getGuestCartCount = () => {
  const cart = getGuestCart();
  return cart.reduce((total, item) => total + (item.quantity || 0), 0);
};

/**
 * Get guest cart total price (list price — checkout applies discounts)
 * @returns {Number} Total price
 */
export const getGuestCartTotal = () => {
  const cart = getGuestCart();
  return cart.reduce((total, item) => {
    const price = item.productId?.price || item.price || 0;
    return total + (price * (item.quantity || 0));
  }, 0);
};

const defaultAddToCartApi = async (itemData) => {
  const response = await Axios({
    ...SummaryApi.addToCart,
    data: itemData
  });
  return response.data;
};

// A failure worth retrying on the next login (network, expired session, rate
// limit, server error) rather than an item the server will never accept.
const isRetryableMergeError = (error) => {
  const status = error?.response?.status;
  return !status || status === 401 || status === 403 || status === 429 || status >= 500;
};

let mergeInFlight = null;

const runGuestCartMerge = async (addToCartApi) => {
  const guestCart = getGuestCart();

  if (guestCart.length === 0) {
    return { success: true, message: 'No guest cart to merge', mergedCount: 0 };
  }

  let mergedCount = 0;
  const errors = [];
  const keepForRetry = [];

  // Add each guest cart item to user's cart — the server adds to an
  // existing line's quantity (capped at stock) rather than rejecting it.
  for (const item of guestCart) {
    const payload = {
      productId: item.productId?._id || item.productId,
      quantity: item.quantity || 1
    };
    if (item.sku) payload.sku = item.sku;
    if (item.selectedVariant) payload.selectedVariant = item.selectedVariant;

    try {
      const result = await addToCartApi(payload);
      if (result && result.success === false) {
        throw new Error(result.message || 'Item was not added');
      }
      mergedCount++;
    } catch (itemError) {
      console.error('Failed to merge item:', item.productId?.name, itemError);
      errors.push(item.productId?.name || 'Unknown item');
      if (isRetryableMergeError(itemError)) keepForRetry.push(item);
    }
  }

  // Only drop what actually made it into the account cart (or was rejected
  // for good, e.g. no longer sold); anything that failed transiently stays.
  if (keepForRetry.length > 0) {
    saveGuestCart(keepForRetry);
  } else {
    clearGuestCart();
  }

  return {
    success: mergedCount > 0 || errors.length === 0,
    message: `Merged ${mergedCount} item${mergedCount !== 1 ? 's' : ''} from your guest cart`,
    mergedCount,
    errors: errors.length > 0 ? errors : undefined,
    pendingCount: keepForRetry.length
  };
};

/**
 * Merge guest cart with user cart on login/register. Call after the session
 * tokens are stored. Concurrent calls share one merge, so it's safe to call
 * from more than one place.
 * @param {Function} [addToCartApi] - Adds one item to the user's cart; defaults to POST /api/cart/create
 * @returns {Promise<Object>} Merge result with count of merged items
 */
export const mergeGuestCartWithUser = (addToCartApi = defaultAddToCartApi) => {
  if (!mergeInFlight) {
    mergeInFlight = runGuestCartMerge(addToCartApi).finally(() => {
      mergeInFlight = null;
    });
  }
  return mergeInFlight;
};

/**
 * Check if there's a guest cart to merge
 * @returns {Boolean} True if guest cart has items
 */
export const hasGuestCart = () => {
  const cart = getGuestCart();
  return cart.length > 0;
};

/**
 * Get guest cart items count for display
 * @returns {String} Formatted message about cart items
 */
export const getGuestCartMessage = () => {
  const cart = getGuestCart();
  const count = cart.reduce((total, item) => total + (item.quantity || 0), 0);

  if (count === 0) return '';
  if (count === 1) return '1 item in your guest cart';
  return `${count} items in your guest cart`;
};
