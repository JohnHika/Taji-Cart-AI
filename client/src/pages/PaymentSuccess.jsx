import React, { useEffect, useState } from 'react';
import { FaCheckCircle } from 'react-icons/fa';
import { useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import SummaryApi from '../common/SummaryApi';
import { useGlobalContext } from '../provider/GlobalProvider';
import { clearCartItems, fetchCartItems } from '../redux/slice/cartSlice';
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
              url: `${SummaryApi.baseURL}/api/order/details?session_id=${sessionId}`,
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
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <FaCheckCircle className="text-green-500 text-6xl mx-auto mb-6" />
        <h1 className="text-2xl font-bold mb-4 dark:text-white">Payment Successful!</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Your order has been placed successfully. Thank you for your purchase!
        </p>
        <div className="flex flex-col space-y-3">
          <button 
            onClick={goToOrders}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
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
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded transition-colors"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
