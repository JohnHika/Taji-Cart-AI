import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { mergeGuestCartWithUser, hasGuestCart } from '../utils/guestCart';
import { fetchCartItems } from '../store/cartProduct';
import { hasStoredAccessToken } from '../utils/authStorage';

/**
 * Move the guest cart into the signed-in user's cart and refresh the Redux
 * cart. Await this right after login/register has stored the session tokens.
 * Safe to call more than once: concurrent calls share one merge, and once the
 * guest cart has been merged it's a no-op.
 * @param {Function} [dispatch] - Redux dispatch, used to refresh the cart
 * @returns {Promise<Object>} Merge result ({ success, mergedCount, errors })
 */
export const mergeGuestCartAfterLogin = async (dispatch) => {
  if (!hasGuestCart() || !hasStoredAccessToken()) {
    return { success: true, message: 'No guest cart to merge', mergedCount: 0 };
  }

  const loadingToast = toast.loading('Adding your cart items to your account...');

  try {
    const result = await mergeGuestCartWithUser();
    toast.dismiss(loadingToast);

    if (result.mergedCount > 0) {
      toast.success(result.message);
    }

    if (result.errors && result.errors.length > 0) {
      toast.error(
        result.pendingCount > 0
          ? `${result.errors.length} item(s) couldn't be added yet — they're kept for next time`
          : `${result.errors.length} item(s) are no longer available and were removed`
      );
    }

    return result;
  } catch (error) {
    toast.dismiss(loadingToast);
    console.error('Guest cart merge error:', error);
    return { success: false, mergedCount: 0 };
  } finally {
    if (dispatch) dispatch(fetchCartItems());
  }
};

/**
 * Merges the guest cart whenever this page has a signed-in user (e.g. the
 * page mounts with a session already hydrated). Login flows should still
 * await mergeGuestCartAfterLogin themselves: they navigate away as soon as
 * login succeeds, often before this effect gets a chance to run.
 * @returns {Function} Call to merge now
 */
export const useGuestCartMerge = () => {
  const dispatch = useDispatch();
  const userId = useSelector((state) => state.user?._id);

  const mergeNow = useCallback(() => mergeGuestCartAfterLogin(dispatch), [dispatch]);

  useEffect(() => {
    if (userId && hasGuestCart()) {
      mergeNow();
    }
  }, [userId, mergeNow]);

  return mergeNow;
};

export default useGuestCartMerge;
