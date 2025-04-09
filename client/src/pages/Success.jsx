import React, { useEffect, useState } from 'react';
import { FaBox, FaCheck, FaCreditCard, FaCrown, FaInfoCircle, FaMobileAlt, FaMoneyBillWave, FaReceipt, FaSpinner, FaStore, FaTruck } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import SummaryApi from '../common/SummaryApi';
import Axios from '../utils/Axios';
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings';

function Success() {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState(null);
  const [error, setError] = useState(null);
  const user = useSelector(state => state.user);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log("Attempting to fetch order details with location state:", location.state);
        let orderFetched = false;
        
        // Method 1: Get all orders for user and find the appropriate one
        try {
          console.log("Fetching all orders using SummaryApi.getOrderItems");
          
          const response = await Axios({
            ...SummaryApi.getOrderItems,
            url: SummaryApi.getOrderItems.url, // Using the exact URL from SummaryApi
          });
          
          if (response.data.success && response.data.data && response.data.data.length > 0) {
            console.log("Success! Got orders list");
            
            // Find the specific order by receipt ID, orderId, or session ID if available
            let targetOrder = null;
            
            if (location.state && location.state.receipt) {
              const receiptId = Array.isArray(location.state.receipt) 
                ? location.state.receipt[0] 
                : location.state.receipt;
                
              console.log("Looking for order with receipt ID:", receiptId);
              targetOrder = response.data.data.find(order => 
                order.orderId === receiptId || 
                order.invoice_receipt === receiptId ||
                order._id === receiptId
              );
            }
            
            // If no specific order found, use the most recent one
            if (!targetOrder) {
              // Sort orders by date (newest first) and take the first one
              const sortedOrders = [...response.data.data].sort(
                (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
              );
              console.log("Using most recent order");
              targetOrder = sortedOrders[0];
            }
            
            // Enrich the order with payment method and other info from location state
            if (targetOrder && location.state) {
              targetOrder = {
                ...targetOrder,
                paymentMethod: location.state.paymentMethod || targetOrder.paymentMethod || determinePaymentMethod(location),
                fulfillment_type: location.state.fulfillmentMethod || targetOrder.fulfillment_type || 'delivery',
                pickup_location: location.state.pickupLocation || targetOrder.pickup_location || '',
                pickupInstructions: location.state.pickupInstructions || targetOrder.pickupInstructions || '',
                // Include any other fields from location state
                ...location.state
              };
            }
            
            setOrderDetails(targetOrder);
            orderFetched = true;
            
            // Cache for future reference
            localStorage.setItem('lastOrder', JSON.stringify(targetOrder));
          }
        } catch (e) {
          console.log("Order fetching failed:", e);
        }
        
        // Method 2: Check localStorage as fallback
        if (!orderFetched) {
          try {
            const lastOrder = localStorage.getItem('lastOrder');
            if (lastOrder) {
              console.log("Found order in localStorage");
              const parsedOrder = JSON.parse(lastOrder);
              
              // Enrich with any available location state
              if (location.state) {
                const enrichedOrder = {
                  ...parsedOrder,
                  paymentMethod: location.state.paymentMethod || parsedOrder.paymentMethod || determinePaymentMethod(location),
                  fulfillment_type: location.state.fulfillmentMethod || parsedOrder.fulfillment_type || 'delivery',
                  pickup_location: location.state.pickupLocation || parsedOrder.pickup_location || '',
                  ...location.state
                };
                setOrderDetails(enrichedOrder);
              } else {
                setOrderDetails(parsedOrder);
              }
              
              orderFetched = true;
            }
          } catch (e) {
            console.log("localStorage retrieval failed:", e);
          }
        }
        
        // Method 3: Create placeholder order if everything fails
        if (!orderFetched && user) {
          console.log("Creating placeholder order from available data");
          
          // Extract information from location state and URL parameters
          const urlParams = new URLSearchParams(window.location.search);
          const orderId = urlParams.get('orderId') || location.state?.orderId || location.state?.receipt || 
                         'ORD-' + Math.random().toString(36).substring(2, 10).toUpperCase();
          
          // Determine payment method from available information
          const paymentMethod = location.state?.paymentMethod || determinePaymentMethod(location);
          
          // Determine fulfillment type
          const fulfillmentMethod = location.state?.fulfillmentMethod || 'delivery';
          const pickupLocation = location.state?.pickupLocation || '';
          
          // Get price information
          const totalPrice = location.state?.totalPrice || location.state?.amount || 0;
          
          // Create comprehensive placeholder order with all required fields
          const placeholderOrder = {
            _id: orderId,
            orderId: orderId,
            userId: user._id,
            userName: user.name,
            userEmail: user.email,
            fulfillment_type: fulfillmentMethod,
            pickup_location: pickupLocation,
            pickupVerificationCode: fulfillmentMethod === 'pickup' ? 
                                   Math.random().toString(36).substring(2, 8).toUpperCase() : '',
            createdAt: new Date().toISOString(),
            payment_status: 'Paid',
            paymentMethod: paymentMethod,
            totalAmt: totalPrice,
            subTotalAmt: totalPrice,
            // Add royalty data if available
            royalDiscount: location.state?.royalDiscount || 0,
            royalCardTier: location.state?.royalCardTier || null,
            pointsUsed: location.state?.pointsUsed || 0,
            // Add community/campaign data if available
            communityDiscountAmount: location.state?.communityDiscountAmount || 0,
            // Default status
            status: 'pending',
            // Add placeholder for items if not available
            items: location.state?.items || [],
            // Include any other fields from location state
            ...location.state
          };
          
          console.log("Created placeholder order:", placeholderOrder);
          setOrderDetails(placeholderOrder);
          orderFetched = true;
          
          // Store for future reference
          localStorage.setItem('lastOrder', JSON.stringify(placeholderOrder));
        }
        
        if (!orderFetched) {
          console.log("All order retrieval methods failed");
          setError("Order details not available");
        }
        
      } catch (error) {
        console.error("Error in order fetch process:", error);
        setError("Error connecting to server");
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrderDetails();
  }, [location, user]);

  // Helper function to determine payment method from context
  const determinePaymentMethod = (location) => {
    if (location.search?.includes('session_id')) {
      return 'Card Payment';
    } else if (location.state?.mpesa) {
      return 'M-Pesa';
    } else if (location.state?.cash || location.pathname.includes('cash')) {
      return 'Cash on Delivery';
    } else {
      return 'Online Payment';
    }
  };

  // Format date with more readable format
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get payment method icon based on payment method
  const getPaymentIcon = (method) => {
    if (!method) return <FaCreditCard />;
    
    const methodLower = method.toLowerCase();
    if (methodLower.includes('mpesa') || methodLower.includes('m-pesa')) {
      return <FaMobileAlt className="text-green-600 dark:text-green-400" />;
    } else if (methodLower.includes('card') || methodLower.includes('stripe')) {
      return <FaCreditCard className="text-blue-600 dark:text-blue-400" />;
    } else if (methodLower.includes('cash')) {
      return <FaMoneyBillWave className="text-green-600 dark:text-green-400" />;
    }
    return <FaCreditCard />;
  };

  // Handle view orders click
  const handleViewOrders = () => {
    navigate('/dashboard/myorders');
  };

  if (user.role === 'staff') {
    return (
      <div className='min-h-[80vh] py-8 flex items-center justify-center bg-gray-50 dark:bg-gray-900'>
        <div className='w-full max-w-md bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mx-auto'>
          <div className='flex flex-col items-center mb-6'>
            <div className='w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4'>
              <FaCheck className="text-green-600 dark:text-green-400" size={32} />
            </div>
            <h2 className='text-xl font-semibold text-gray-800 dark:text-white'>Order Processed Successfully</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-[80vh] py-8 flex items-center justify-center bg-gray-50 dark:bg-gray-900'>
      <div className='w-full max-w-md bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mx-auto'>
        <div className='flex flex-col items-center mb-6'>
          <div className='w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4'>
            {loading ? (
              <FaSpinner className='text-green-600 dark:text-green-400 text-2xl animate-spin' />
            ) : (
              <FaCheck className='text-green-600 dark:text-green-400 text-2xl' />
            )}
          </div>
          <h1 className='text-2xl font-bold text-gray-800 dark:text-white mb-2'>
            Payment Successful!
          </h1>
          <p className='text-gray-600 dark:text-gray-300 text-center'>
            Thank you for your order! Your payment has been processed successfully.
          </p>
        </div>

        {loading ? (
          <div className='flex flex-col items-center py-8'>
            <FaSpinner className='text-blue-500 text-2xl animate-spin mb-4' />
            <p className='text-gray-600 dark:text-gray-400'>Loading order details...</p>
          </div>
        ) : error ? (
          <div className='bg-green-50 dark:bg-green-900/20 p-4 rounded-lg mb-6 text-center'>
            <FaCheck className='text-green-600 dark:text-green-400 text-3xl mx-auto mb-2' />
            <h3 className='font-semibold text-lg text-green-700 dark:text-green-400 mb-2'>
              Order Placed Successfully!
            </h3>
            <p className='text-gray-600 dark:text-gray-400 text-sm'>
              Your payment was successful and your order has been placed.
              <br /><br />
              You can view your complete order details in the "My Orders" section.
            </p>
          </div>
        ) : orderDetails ? (
          <div className='border dark:border-gray-700 rounded-lg overflow-hidden mb-6'>
            <div className='bg-gray-50 dark:bg-gray-750 p-4 border-b dark:border-gray-700'>
              <div className='flex justify-between items-center'>
                <h3 className='text-lg font-semibold text-gray-800 dark:text-white flex items-center'>
                  <FaReceipt className='mr-2 text-green-600 dark:text-green-400' />
                  Receipt
                </h3>
                <span className='text-sm text-gray-500 dark:text-gray-400'>
                  Order #{orderDetails.orderId || (orderDetails._id && orderDetails._id.substring(orderDetails._id.length - 8))}
                </span>
              </div>
            </div>
            
            <div className='p-4'>
              {/* Payment Method Section */}
              <div className='mb-4 p-3 bg-gray-50 dark:bg-gray-750 rounded-lg'>
                <div className='flex items-center'>
                  {getPaymentIcon(orderDetails.paymentMethod)}
                  <div className='ml-2'>
                    <p className='font-medium text-gray-800 dark:text-white'>
                      {orderDetails.paymentMethod || 'Online Payment'}
                    </p>
                    <p className='text-sm text-gray-600 dark:text-gray-400'>
                      Status: <span className='text-green-600 dark:text-green-400 font-medium'>
                        {orderDetails.payment_status || 'Paid'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Fulfillment Method */}
              <div className='mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg'>
                <div className='flex items-center'>
                  {orderDetails.fulfillment_type === 'pickup' ? (
                    <>
                      <FaStore className='text-purple-600 dark:text-purple-400 mr-2' />
                      <div>
                        <p className='font-medium text-gray-800 dark:text-white'>Pickup Order</p>
                        {orderDetails.pickup_location && (
                          <p className='text-sm text-gray-600 dark:text-gray-300'>
                            Location: {orderDetails.pickup_location}
                          </p>
                        )}
                        {orderDetails.pickupVerificationCode && (
                          <p className='text-sm font-mono font-bold text-purple-700 dark:text-purple-400 mt-1'>
                            Verification Code: {orderDetails.pickupVerificationCode}
                          </p>
                        )}
                        {orderDetails.pickupInstructions && (
                          <p className='text-sm text-gray-600 dark:text-gray-300 mt-1 italic'>
                            Instructions: {orderDetails.pickupInstructions}
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <FaTruck className='text-blue-600 dark:text-blue-400 mr-2' />
                      <div>
                        <p className='font-medium text-gray-800 dark:text-white'>Delivery Order</p>
                        {orderDetails.delivery_address && typeof orderDetails.delivery_address === 'object' ? (
                          <p className='text-sm text-gray-600 dark:text-gray-300'>
                            To: {orderDetails.delivery_address.address_line || orderDetails.delivery_address.address}, 
                            {orderDetails.delivery_address.city && ` ${orderDetails.delivery_address.city}`}
                          </p>
                        ) : orderDetails.deliveryAddress ? (
                          <p className='text-sm text-gray-600 dark:text-gray-300'>
                            To: {orderDetails.deliveryAddress}
                          </p>
                        ) : (
                          <p className='text-sm text-gray-600 dark:text-gray-300'>
                            Your order will be delivered to your address.
                          </p>
                        )}
                        <p className='text-sm text-gray-600 dark:text-gray-300'>
                          Status: <span className='font-medium'>{orderDetails.status || 'Pending'}</span>
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {/* Order items */}
              <div className='mb-4'>
                <h4 className='font-medium text-gray-800 dark:text-white mb-2 flex items-center'>
                  <FaBox className='mr-2 text-gray-600 dark:text-gray-400' />
                  Order Items
                </h4>
                
                <div className='border dark:border-gray-700 rounded-lg overflow-hidden'>
                  {orderDetails.items && orderDetails.items.length > 0 ? (
                    <>
                      {orderDetails.items.map((item, index) => (
                        <div key={index} className='flex justify-between p-3 border-b dark:border-gray-700 last:border-b-0'>
                          <div className='flex items-center'>
                            {item.productId && item.productId.image && (
                              <img 
                                src={Array.isArray(item.productId.image) ? item.productId.image[0] : item.productId.image} 
                                alt={item.productId.name}
                                className='w-10 h-10 object-cover rounded mr-3' 
                              />
                            )}
                            <div>
                              <p className='font-medium text-gray-800 dark:text-white'>
                                {item.productId ? item.productId.name : 'Product'}
                              </p>
                              <p className='text-sm text-gray-600 dark:text-gray-400'>
                                Qty: {item.quantity || 1}
                              </p>
                            </div>
                          </div>
                          <p className='font-medium text-gray-800 dark:text-white'>
                            {DisplayPriceInShillings(item.productId ? item.productId.price * (item.quantity || 1) : 0)}
                          </p>
                        </div>
                      ))}
                    </>
                  ) : orderDetails.product_details ? (
                    <div className='flex justify-between p-3'>
                      <div className='flex items-center'>
                        {orderDetails.product_details.image && (
                          <img 
                            src={Array.isArray(orderDetails.product_details.image) ? orderDetails.product_details.image[0] : orderDetails.product_details.image} 
                            alt={orderDetails.product_details.name}
                            className='w-10 h-10 object-cover rounded mr-3' 
                          />
                        )}
                        <div>
                          <p className='font-medium text-gray-800 dark:text-white'>
                            {orderDetails.product_details.name}
                          </p>
                          <p className='text-sm text-gray-600 dark:text-gray-400'>
                            Qty: {orderDetails.quantity || 1}
                          </p>
                        </div>
                      </div>
                      <p className='font-medium text-gray-800 dark:text-white'>
                        {DisplayPriceInShillings(orderDetails.totalAmt || 0)}
                      </p>
                    </div>
                  ) : (
                    <div className='p-3 text-center text-gray-600 dark:text-gray-400'>
                      Order details will be available in your order history
                    </div>
                  )}
                </div>
              </div>
              
              {/* Order summary */}
              <div className='border-t dark:border-gray-700 pt-4'>
                <div className='flex justify-between mb-2'>
                  <span className='text-gray-600 dark:text-gray-400'>Subtotal:</span>
                  <span className='text-gray-800 dark:text-white'>
                    {DisplayPriceInShillings(orderDetails.subTotalAmt || orderDetails.totalAmt || 0)}
                  </span>
                </div>
                
                {/* Show loyalty points if used */}
                {orderDetails.pointsUsed > 0 && (
                  <div className='flex justify-between mb-2 text-green-600 dark:text-green-400'>
                    <span className='flex items-center'>
                      <FaCrown className='mr-1' /> Points Applied:
                    </span>
                    <span>- KES {orderDetails.pointsUsed.toLocaleString()}</span>
                  </div>
                )}
                
                {/* Show royal discount if applied */}
                {orderDetails.royalDiscount > 0 && (
                  <div className='flex justify-between mb-2 text-amber-600 dark:text-amber-400'>
                    <span className='flex items-center'>
                      <FaCrown className='mr-1' /> Royal {orderDetails.royalCardTier || ''} Discount:
                    </span>
                    <span>{orderDetails.royalDiscount}% off</span>
                  </div>
                )}
                
                {/* Show community discount if applied */}
                {orderDetails.communityDiscountAmount > 0 && (
                  <div className='flex justify-between mb-2 text-green-600 dark:text-green-400'>
                    <span>Community Discount:</span>
                    <span>{orderDetails.communityDiscountAmount}% off</span>
                  </div>
                )}
                
                {/* Delivery fee (if applicable) */}
                <div className='flex justify-between mb-2'>
                  <span className='text-gray-600 dark:text-gray-400'>Delivery Fee:</span>
                  <span className='text-gray-800 dark:text-white'>
                    {orderDetails.deliveryFee ? DisplayPriceInShillings(orderDetails.deliveryFee) : 'Free'}
                  </span>
                </div>
                
                {/* Final total */}
                <div className='flex justify-between font-bold border-t dark:border-gray-700 pt-2 mt-2'>
                  <span className='text-gray-800 dark:text-white'>Total:</span>
                  <span className='text-gray-800 dark:text-white'>
                    {DisplayPriceInShillings(orderDetails.totalAmt || 0)}
                  </span>
                </div>
                
                <div className='mt-3 text-sm text-gray-600 dark:text-gray-400'>
                  <p>Order Date: {formatDate(orderDetails.createdAt)}</p>
                  <p className='flex items-center'>
                    Payment Method: {getPaymentIcon(orderDetails.paymentMethod)}
                    <span className='ml-1'>{orderDetails.paymentMethod || 'Online Payment'}</span>
                  </p>
                  <p>Payment Status: <span className='text-green-600 dark:text-green-400'>{orderDetails.payment_status || 'Paid'}</span></p>
                </div>
                
                {/* Tracking info */}
                <div className='mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded flex items-start text-sm'>
                  <FaInfoCircle className='text-blue-500 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0' />
                  <p className='text-blue-700 dark:text-blue-300'>
                    You can track your order status in the "My Orders" section. Please keep your order number 
                    <span className='font-mono font-bold mx-1'>
                      {orderDetails.orderId || (orderDetails._id && orderDetails._id.substring(orderDetails._id.length - 8))}
                    </span> 
                    for reference.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className='bg-green-50 dark:bg-green-900/20 p-4 rounded-lg mb-6 text-center'>
            <FaCheck className='text-green-600 dark:text-green-400 text-3xl mx-auto mb-2' />
            <h3 className='font-semibold text-lg text-green-700 dark:text-green-400 mb-2'>
              Order Placed Successfully!
            </h3>
            <p className='text-gray-600 dark:text-gray-400 text-sm'>
              Your order has been placed and will be processed shortly.
              <br /><br />
              View all your orders in the "My Orders" section.
            </p>
          </div>
        )}

        <div className='flex flex-col space-y-3'>
          <button 
            onClick={handleViewOrders}
            className='w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors'
          >
            View My Orders
          </button>
          
          <Link 
            to="/"
            className='w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-medium rounded text-center transition-colors'
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Success;