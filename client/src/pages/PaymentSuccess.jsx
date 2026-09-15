import React, { useEffect, useState } from 'react';
import { FaCheckCircle } from 'react-icons/fa';
import { useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { buildApiUrl } from '../common/apiBaseUrl';
import SummaryApi from '../common/SummaryApi';
import { useGlobalContext } from '../provider/GlobalProvider';
import { clearCartItems, fetchCartItems } from '../store/cartProduct';
import Axios from '../utils/Axios';

const PaymentSuccess = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { fetchOrder, clearCartItems: globalClearCart } = useGlobalContext();
  const [cleanupAttempted, setCleanupAttempted] = useState(false);
  
  const queryParams = new URLSearchParams(location.search);
  const sessionId = queryParams.get('session_id');
  
  useEffect(() => {
    // This function will forcibly clear the cart
    const forceCartClear = async () => {
      console.log("Forcing cart clear in PaymentSuccess");
      
      // 1. First try the Redux action
      dispatch(clearCartItems());
      
      // 2. Then try the direct API call
      try {
        const clearResponse = await Axios({
          ...SummaryApi.clearCart,
        });
        console.log("Force cart clear API response:", clearResponse.data);
      } catch (error) {
        console.error("Error during force cart clear:", error);
      }
      
      // 3. Then try the global context method
      if (globalClearCart) {
        await globalClearCart();
      }
      
      // 4. Finally, fetch fresh cart data (should be empty)
      dispatch(fetchCartItems());
      
      // 5. Refresh orders data
      if (fetchOrder) {
        await fetchOrder();
      }
    };
    
    // Clear cart and fetch latest order data
    const handlePaymentSuccess = async () => {
      if (cleanupAttempted) return;
      
      try {
        console.log("Payment success page - clearing cart");
        setCleanupAttempted(true);
        
        // Run the force clear
        await forceCartClear();
        
        // If we have a session ID, notify the server about it
        if (sessionId) {
          try {
            const sessionResponse = await Axios({
              url: buildApiUrl(`/api/order/details?session_id=${sessionId}`),
              method: 'GET'
            });
            console.log("Session details response:", sessionResponse.data);
          } catch (sessionError) {
            console.error("Error fetching session details:", sessionError);
          }
        }
        
        // Mark that cleanup was done
        localStorage.setItem('cartCleanupDone', 'true');
      } catch (error) {
        console.error("Error handling payment success:", error);
      }
    };
    
    handlePaymentSuccess();
    
    // Set up an interval to repeatedly try clearing the cart
    const interval = setInterval(forceCartClear, 2000);
    
    // Return cleanup function
    return () => {
      clearInterval(interval);
      forceCartClear(); // One final attempt on unmount
    };
  }, [dispatch, fetchOrder, globalClearCart, sessionId, cleanupAttempted]);
  
  const goToOrders = () => {
    // Clear cart one more time before navigating
    dispatch(clearCartItems());
    navigate('/orders');
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-ivory dark:bg-dm-surface px-4 py-8">
      <div className="bg-white dark:bg-dm-card p-6 sm:p-8 rounded-card shadow-card border border-brown-100 dark:border-dm-border max-w-md w-full text-center">
        <FaCheckCircle className="text-plum-600 dark:text-plum-300 text-6xl mx-auto mb-6" />
        <h1 className="text-2xl font-bold mb-3 text-charcoal dark:text-white">Payment Successful!</h1>
        <p className="text-sm text-brown-500 dark:text-white/60 mb-6">
          Your order has been placed successfully. Thank you for your purchase!
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={goToOrders}
            className="w-full py-3 px-4 rounded-pill text-sm font-semibold text-white bg-plum-700 hover:bg-plum-600 transition-colors press"
          >
            View My Orders
          </button>
          <button
            onClick={() => {
              // Final cart clear when navigating away
              dispatch(clearCartItems());
              if (globalClearCart) globalClearCart();
              navigate('/');
            }}
            className="w-full py-3 px-4 rounded-pill text-sm font-semibold border border-brown-200 dark:border-dm-border text-charcoal dark:text-white/80 bg-white dark:bg-dm-card hover:bg-plum-50 dark:hover:bg-plum-900/20 transition-colors press"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
