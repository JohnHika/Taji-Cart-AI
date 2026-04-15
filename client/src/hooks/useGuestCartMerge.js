import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { mergeGuestCartWithUser, hasGuestCart, getGuestCartMessage } from '../utils/guestCart';
import { fetchCartItems } from '../redux/slice/cartSlice';
import SummaryApi from '../common/SummaryApi';
import Axios from '../utils/Axios';

/**
 * Hook to automatically merge guest cart with user cart on login/register
 * Call this hook in Login, Register, and any auth callback pages
 */
export const useGuestCartMerge = () => {
  const dispatch = useDispatch();
  const location = useLocation();

  useEffect(() => {
    // Check if we just logged in (tokens exist) and have a guest cart
    const checkAndMergeCart = async () => {
      const accessToken = sessionStorage.getItem('accesstoken');

      if (!accessToken || !hasGuestCart()) {
        return;
      }

      try {
        // Show loading toast
        const loadingToast = toast.loading('Merging your cart...');

        // Merge guest cart with user cart
        const result = await mergeGuestCartWithUser(async (itemData) => {
          const response = await Axios({
            ...SummaryApi.addToCart,
            data: itemData
          });
          return response.data;
        });

        // Dismiss loading toast
        toast.dismiss(loadingToast);

        if (result.success) {
          // Show success message
          toast.success(result.message);

          // Refresh cart in Redux
          dispatch(fetchCartItems());

          // Show item details if available
          if (result.mergedCount > 0) {
            console.log(`Merged ${result.mergedCount} items from guest cart`);
          }

          // Show errors if any
          if (result.errors && result.errors.length > 0) {
            toast.error(`${result.errors.length} item(s) could not be merged`);
          }
        }
      } catch (error) {
        console.error('Guest cart merge error:', error);
        // Don't show error to user - this is a nice-to-have feature
      }
    };

    // Run merge check after a short delay to ensure auth state is settled
    const timer = setTimeout(checkAndMergeCart, 500);
    return () => clearTimeout(timer);
  }, [location, dispatch]);
};

export default useGuestCartMerge;
