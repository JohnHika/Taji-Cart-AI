// Guest Cart Utilities - Handle cart for non-logged-in users
import Cookies from 'js-cookie';

const GUEST_CART_COOKIE = 'nawiri_guest_cart';
const CART_EXPIRY_DAYS = 7;

/**
 * Get guest cart from cookie
 * @returns {Array} Cart items array
 */
export const getGuestCart = () => {
  try {
    const cartJson = Cookies.get(GUEST_CART_COOKIE);
    if (!cartJson) return [];
    return JSON.parse(cartJson);
  } catch (error) {
    console.error('Error reading guest cart:', error);
    return [];
  }
};

/**
 * Save guest cart to cookie
 * @param {Array} items - Cart items to save
 */
export const saveGuestCart = (items) => {
  try {
    Cookies.set(GUEST_CART_COOKIE, JSON.stringify(items), {
      expires: CART_EXPIRY_DAYS,
      secure: import.meta.env.PROD,
      sameSite: 'lax'
    });
  } catch (error) {
    console.error('Error saving guest cart:', error);
  }
};

/**
 * Add item to guest cart
 * @param {Object} item - Product item to add
 * @returns {Array} Updated cart
 */
export const addToGuestCart = (item) => {
  const cart = getGuestCart();

  // Check if item already exists in cart
  const existingIndex = cart.findIndex(
    cartItem => cartItem.productId?._id === item.productId?._id
  );

  if (existingIndex !== -1) {
    // Update quantity if item exists
    cart[existingIndex].quantity += item.quantity || 1;
  } else {
    // Add new item
    cart.push(item);
  }

  saveGuestCart(cart);
  return cart;
};

/**
 * Remove item from guest cart
 * @param {String} productId - Product ID to remove
 * @returns {Array} Updated cart
 */
export const removeFromGuestCart = (productId) => {
  const cart = getGuestCart();
  const updatedCart = cart.filter(
    item => item.productId?._id !== productId
  );
  saveGuestCart(updatedCart);
  return updatedCart;
};

/**
 * Update item quantity in guest cart
 * @param {String} productId - Product ID
 * @param {Number} quantity - New quantity
 * @returns {Array} Updated cart
 */
export const updateGuestCartQuantity = (productId, quantity) => {
  const cart = getGuestCart();
  const updatedCart = cart.map(item => {
    if (item.productId?._id === productId) {
      return { ...item, quantity: Math.max(0, quantity) };
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
  Cookies.remove(GUEST_CART_COOKIE);
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
 * Get guest cart total price
 * @returns {Number} Total price
 */
export const getGuestCartTotal = () => {
  const cart = getGuestCart();
  return cart.reduce((total, item) => {
    const price = item.productId?.price || item.price || 0;
    return total + (price * (item.quantity || 0));
  }, 0);
};

/**
 * Merge guest cart with user cart on login/register
 * @param {Function} addToCartApi - API function to add items to cart
 * @returns {Promise<Object>} Merge result with count of merged items
 */
export const mergeGuestCartWithUser = async (addToCartApi) => {
  const guestCart = getGuestCart();

  if (guestCart.length === 0) {
    return { success: true, message: 'No guest cart to merge', mergedCount: 0 };
  }

  try {
    let mergedCount = 0;
    let errors = [];

    // Add each guest cart item to user's cart
    for (const item of guestCart) {
      try {
        await addToCartApi({
          productId: item.productId?._id || item.productId,
          quantity: item.quantity || 1
        });
        mergedCount++;
      } catch (itemError) {
        console.error('Failed to merge item:', item.productId?.name, itemError);
        errors.push(item.productId?.name || 'Unknown item');
      }
    }

    // Clear guest cart after merge
    clearGuestCart();

    return {
      success: true,
      message: `Merged ${mergedCount} item${mergedCount !== 1 ? 's' : ''} from your guest cart`,
      mergedCount,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error('Error merging guest cart:', error);
    throw error;
  }
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
