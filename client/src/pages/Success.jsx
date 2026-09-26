import React, { useEffect, useState, useRef } from 'react';
import { FaBox, FaCheck, FaCreditCard, FaCrown, FaDownload, FaInfoCircle, FaMobileAlt, FaMoneyBillWave, FaPrint, FaReceipt, FaSpinner, FaStore, FaTruck } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import SummaryApi from '../common/SummaryApi';
import Axios from '../utils/Axios';
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings';
import { describePayment } from '../utils/paymentStatus';


function Success() {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState(null);
  const [error, setError] = useState(null);
  const user = useSelector(state => state.user);
  const receiptRef = useRef(null);

  // Function to print receipt
  const printReceipt = () => {
    const content = receiptRef.current;
    if (!content) return;

    const originalContents = document.body.innerHTML;
    const printContents = `
      <style>
        @media print {
          body {
            font-family: Arial, sans-serif;
            color: #000;
            background-color: #fff;
          }
          .receipt-container {
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
          }
          .receipt-header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }
          .receipt-logo {
            font-size: 24px;
            font-weight: bold;
          }
          .receipt-title {
            font-size: 18px;
            margin: 10px 0;
          }
          .receipt-section {
            margin: 15px 0;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
          }
          .receipt-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
          }
          .receipt-footer {
            margin-top: 30px;
            text-align: center;
            padding-top: 10px;
            border-top: 1px solid #ddd;
          }
          .verification-code {
            font-family: monospace;
            font-size: 16px;
            font-weight: bold;
            padding: 10px;
            background-color: #f0f0f0;
            border-radius: 4px;
            margin: 10px 0;
          }
          .pickup-info {
            padding: 10px;
            background-color: #f9f9f9;
            border-radius: 4px;
            margin: 10px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
          }
          table th, table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          table th {
            background-color: #f2f2f2;
          }
        }
      </style>
      <div class="receipt-container">
        <div class="receipt-header">
          <div class="receipt-logo">Nawiri Hair</div>
          <div class="receipt-title">PAYMENT RECEIPT</div>
          <div>Order #${orderDetails.orderId || (orderDetails._id && orderDetails._id.substring(orderDetails._id.length - 8))}</div>
          <div>Date: ${formatDate(orderDetails.createdAt)}</div>
        </div>
        
        <div class="receipt-section">
          <strong>Customer Information:</strong>
          <div>Name: ${user.name || 'Customer'}</div>
          <div>Email: ${user.email || 'N/A'}</div>
          <div>Phone: ${user.mobile || 'N/A'}</div>
        </div>
        
        ${orderDetails.fulfillment_type === 'pickup' ? `
          <div class="receipt-section pickup-info">
            <strong>Pickup Information:</strong>
            <div>Location: ${orderDetails.pickup_location || 'Store Location'}</div>
            <div>Status: ${orderDetails.status || 'Ready for pickup'}</div>
            ${orderDetails.pickupInstructions ? `<div>Instructions: ${orderDetails.pickupInstructions}</div>` : ''}
            <div class="verification-code">Verification Code: ${orderDetails.pickupVerificationCode || 'N/A'}</div>
            <div><strong>Important:</strong> Present this code when picking up your order</div>
          </div>
        ` : `
          <div class="receipt-section">
            <strong>Delivery Information:</strong>
            <div>Address: ${orderDetails.delivery_address ? 
              (orderDetails.delivery_address.address_line || orderDetails.delivery_address.address) + 
              (orderDetails.delivery_address.city ? `, ${orderDetails.delivery_address.city}` : '') : 
              (orderDetails.deliveryAddress || 'Your registered address')}
            </div>
            <div>Status: ${orderDetails.status || 'Pending'}</div>
          </div>
        `}
        
        <div class="receipt-section">
          <strong>Order Items:</strong>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
              </tr>
            </thead>
            <tbody>
              ${orderDetails.items && orderDetails.items.length > 0 ? 
                orderDetails.items.map(item => `
                  <tr>
                    <td>${item.product_details?.name || 'Product'}</td>
                    <td>${item.quantity || 1}</td>
                  </tr>
                `).join('') : 
                `<tr>
                  <td colspan="2">Order details will be available in your order history</td>
                </tr>`
              }
            </tbody>
          </table>
        </div>
        
        <div class="receipt-section">
          <strong>Payment Summary:</strong>
          <div class="receipt-row">
            <span>Subtotal:</span>
            <span>${DisplayPriceInShillings(orderDetails.subTotalAmt || orderDetails.totalAmt || 0).replace('KES', '')}</span>
          </div>
          ${orderDetails.pointsUsed > 0 ? `
            <div class="receipt-row">
              <span>Points Applied:</span>
              <span>- KES ${orderDetails.pointsUsed.toLocaleString()}</span>
            </div>
          ` : ''}
          ${orderDetails.royalDiscount > 0 ? `
            <div class="receipt-row">
              <span>Royal ${orderDetails.royalCardTier || ''} Discount:</span>
              <span>${orderDetails.royalDiscount}% off</span>
            </div>
          ` : ''}
          ${orderDetails.communityDiscountAmount > 0 ? `
            <div class="receipt-row">
              <span>Community Discount:</span>
              <span>${orderDetails.communityDiscountAmount}% off</span>
            </div>
          ` : ''}
          <div class="receipt-row">
            <span>Delivery Fee:</span>
            <span>${orderDetails.deliveryFee ? DisplayPriceInShillings(orderDetails.deliveryFee).replace('KES', '') : 'Free'}</span>
          </div>
          <div class="receipt-row" style="font-weight: bold; border-top: 1px solid #ddd; padding-top: 10px; margin-top: 10px;">
            <span>Total:</span>
            <span>${DisplayPriceInShillings(orderDetails.totalAmt || 0).replace('KES', '')}</span>
          </div>
          <div style="margin-top: 10px;">
            <div>Payment Method: ${describePayment(orderDetails).method}</div>
            <div>Payment Status: ${describePayment(orderDetails).label}</div>
          </div>
        </div>
        
        <div class="receipt-footer">
          <p>Thank you for shopping with Nawiri Hair!</p>
          <p>For questions or support, please contact our customer service.</p>
        </div>
      </div>
    `;
    
    document.body.innerHTML = printContents;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload(); // Reload the page to restore components
  };

  useEffect(() => {
    // Look the order up in the customer's own order list. The page is
    // reached with state identifying the order (cash: receipt ids; M-Pesa:
    // orderId from the payment status). Nothing is ever made up here — if
    // the order can't be loaded the page says so and points to My Orders.
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await Axios({ ...SummaryApi.getOrderItems });
        const orders = response.data?.success ? (response.data.data || []) : [];

        const receipt = location.state?.receipt;
        const wantedIds = [
          location.state?.orderId,
          ...(Array.isArray(receipt) ? receipt : [receipt]),
        ].filter(Boolean);

        let targetOrder = wantedIds.length > 0
          ? orders.find((order) => wantedIds.some((id) => (
            order.orderId === id || order.invoice_receipt === id || order._id === id
          )))
          : null;

        // Opened without a specific order (e.g. a page refresh): show the
        // customer's most recent order.
        if (!targetOrder && wantedIds.length === 0 && orders.length > 0) {
          targetOrder = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        }

        if (targetOrder) {
          setOrderDetails(targetOrder);
        } else {
          setError("We couldn't load this order's details yet. It will appear in My Orders.");
        }
      } catch (error) {
        console.error("Error in order fetch process:", error);
        setError("We couldn't load this order's details right now. It will appear in My Orders.");
      } finally {
        setLoading(false);
      }
    };

    // Stale "last order" snapshots were cached here previously and could
    // show on a shared device — drop them.
    try { localStorage.removeItem('lastOrder'); } catch { /* storage unavailable */ }

    if (user?._id) {
      fetchOrderDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key, user?._id]);


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
      return <FaCreditCard className="text-plum-600 dark:text-plum-300" />;
    } else if (methodLower.includes('cash') || methodLower.startsWith('pay ')) {
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
      <div className='min-h-[80vh] py-8 flex items-center justify-center bg-ivory dark:bg-dm-surface'>
        <div className='w-full max-w-md bg-white dark:bg-dm-card p-6 rounded-card border border-brown-100 dark:border-dm-border shadow-card mx-auto'>
          <div className='flex flex-col items-center mb-6'>
            <div className='w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4'>
              <FaCheck className="text-green-600 dark:text-green-400" size={32} />
            </div>
            <h2 className='text-xl font-semibold text-charcoal dark:text-white'>Order Processed Successfully</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-[80vh] py-8 flex items-center justify-center bg-ivory dark:bg-dm-surface'>
      <div className='w-full max-w-md bg-white dark:bg-dm-card p-6 rounded-card border border-brown-100 dark:border-dm-border shadow-card mx-auto'>
        <div className='flex flex-col items-center mb-6'>
          <div className='w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4'>
            {loading ? (
              <FaSpinner className='text-green-600 dark:text-green-400 text-2xl animate-spin' />
            ) : (
              <FaCheck className='text-green-600 dark:text-green-400 text-2xl' />
            )}
          </div>
          <h1 className='text-2xl font-bold text-charcoal dark:text-white mb-2'>
            {orderDetails && !describePayment(orderDetails).paid ? 'Order Placed!' : 'Payment Successful!'}
          </h1>
          <p className='text-brown-500 dark:text-white/55 text-center'>
            {orderDetails && !describePayment(orderDetails).paid
              ? `Thank you for your order! ${describePayment(orderDetails).hint}`
              : 'Thank you for your order! Your payment has been received.'}
          </p>
        </div>

        {loading ? (
          <div className='flex flex-col items-center py-8'>
            <FaSpinner className='text-plum-600 text-2xl animate-spin mb-4' />
            <p className='text-brown-400 dark:text-white/45'>Loading order details...</p>
          </div>
        ) : error ? (
          <div className='bg-green-50 dark:bg-green-900/20 p-4 rounded-lg mb-6 text-center'>
            <FaCheck className='text-green-600 dark:text-green-400 text-3xl mx-auto mb-2' />
            <h3 className='font-semibold text-lg text-green-700 dark:text-green-400 mb-2'>
              Order Placed Successfully!
            </h3>
            <p className='text-brown-400 dark:text-white/45 text-sm'>
              Your payment was successful and your order has been placed.
              <br /><br />
              You can view your complete order details in the "My Orders" section.
            </p>
          </div>
        ) : orderDetails ? (
          <div className='border dark:border-dm-border rounded-lg overflow-hidden mb-6' ref={receiptRef}>
            <div className='bg-blush-50 dark:bg-dm-card-2 p-4 border-b dark:border-dm-border'>
              <div className='flex justify-between items-center'>
                <h3 className='text-lg font-semibold text-charcoal dark:text-white flex items-center'>
                  <FaReceipt className='mr-2 text-green-600 dark:text-green-400' />
                  Receipt
                </h3>
                <span className='text-sm text-brown-400 dark:text-white/40'>
                  Order #{orderDetails.orderId || (orderDetails._id && orderDetails._id.substring(orderDetails._id.length - 8))}
                </span>
              </div>
            </div>
            
            <div className='p-4'>
              {/* Payment Method Section */}
              <div className='mb-4 p-3 bg-blush-50 dark:bg-dm-card-2 rounded-lg'>
                <div className='flex items-center'>
                  {getPaymentIcon(describePayment(orderDetails).method)}
                  <div className='ml-2'>
                    <p className='font-medium text-charcoal dark:text-white'>
                      {describePayment(orderDetails).method}
                    </p>
                    <p className='text-sm text-brown-400 dark:text-white/45'>
                      Status: <span className='text-green-600 dark:text-green-400 font-medium'>
                        {describePayment(orderDetails).label}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Fulfillment Method */}
              <div className='mb-4 p-3 bg-plum-50 dark:bg-plum-900/25 rounded-lg'>
                <div className='flex items-center'>
                  {orderDetails.fulfillment_type === 'pickup' ? (
                    <>
                      <FaStore className='text-purple-600 dark:text-purple-400 mr-2' />
                      <div>
                        <p className='font-medium text-charcoal dark:text-white'>Pickup Order</p>
                        {orderDetails.pickup_location && (
                          <p className='text-sm text-brown-500 dark:text-white/55'>
                            Location: {orderDetails.pickup_location}
                          </p>
                        )}
                        {orderDetails.pickupVerificationCode && (
                          <p className='text-sm font-mono font-bold text-purple-700 dark:text-purple-400 mt-1'>
                            Verification Code: {orderDetails.pickupVerificationCode}
                          </p>
                        )}
                        {orderDetails.pickupInstructions && (
                          <p className='text-sm text-brown-500 dark:text-white/55 mt-1 italic'>
                            Instructions: {orderDetails.pickupInstructions}
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <FaTruck className='text-plum-600 dark:text-plum-300 mr-2' />
                      <div>
                        <p className='font-medium text-charcoal dark:text-white'>Delivery Order</p>
                        {orderDetails.delivery_address && typeof orderDetails.delivery_address === 'object' ? (
                          <p className='text-sm text-brown-500 dark:text-white/55'>
                            To: {orderDetails.delivery_address.address_line || orderDetails.delivery_address.address}, 
                            {orderDetails.delivery_address.city && ` ${orderDetails.delivery_address.city}`}
                          </p>
                        ) : orderDetails.deliveryAddress ? (
                          <p className='text-sm text-brown-500 dark:text-white/55'>
                            To: {orderDetails.deliveryAddress}
                          </p>
                        ) : (
                          <p className='text-sm text-brown-500 dark:text-white/55'>
                            Your order will be delivered to your address.
                          </p>
                        )}
                        <p className='text-sm text-brown-500 dark:text-white/55'>
                          Status: <span className='font-medium'>{orderDetails.status || 'Pending'}</span>
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {/* Order items */}
              <div className='mb-4'>
                <h4 className='font-medium text-charcoal dark:text-white mb-2 flex items-center'>
                  <FaBox className='mr-2 text-brown-400 dark:text-white/45' />
                  Order Items
                </h4>
                
                <div className='border dark:border-dm-border rounded-lg overflow-hidden'>
                  {orderDetails.items && orderDetails.items.length > 0 ? (
                    <>
                      {orderDetails.items.map((item, index) => (
                        <div key={index} className='flex justify-between p-3 border-b dark:border-dm-border last:border-b-0'>
                          <div className='flex items-center'>
                            {item.product_details?.image?.[0] && (
                              <img
                                src={item.product_details.image[0]}
                                alt={item.product_details.name || 'Product'}
                                className='w-10 h-10 object-cover rounded mr-3'
                              />
                            )}
                            <div>
                              <p className='font-medium text-charcoal dark:text-white'>
                                {item.product_details?.name || 'Product'}
                              </p>
                              <p className='text-sm text-brown-400 dark:text-white/45'>
                                Qty: {item.quantity || 1}
                              </p>
                            </div>
                          </div>
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
                          <p className='font-medium text-charcoal dark:text-white'>
                            {orderDetails.product_details.name}
                          </p>
                          <p className='text-sm text-brown-400 dark:text-white/45'>
                            Qty: {orderDetails.quantity || 1}
                          </p>
                        </div>
                      </div>
                      <p className='font-medium text-charcoal dark:text-white'>
                        {DisplayPriceInShillings(orderDetails.totalAmt || 0)}
                      </p>
                    </div>
                  ) : (
                    <div className='p-3 text-center text-brown-400 dark:text-white/45'>
                      Order details will be available in your order history
                    </div>
                  )}
                </div>
              </div>
              
              {/* Order summary */}
              <div className='border-t dark:border-dm-border pt-4'>
                <div className='flex justify-between mb-2'>
                  <span className='text-brown-400 dark:text-white/45'>Subtotal:</span>
                  <span className='text-charcoal dark:text-white'>
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
                  <span className='text-brown-400 dark:text-white/45'>Delivery Fee:</span>
                  <span className='text-charcoal dark:text-white'>
                    {orderDetails.deliveryFee ? DisplayPriceInShillings(orderDetails.deliveryFee) : 'Free'}
                  </span>
                </div>
                
                {/* Final total */}
                <div className='flex justify-between font-bold border-t dark:border-dm-border pt-2 mt-2'>
                  <span className='text-charcoal dark:text-white'>Total:</span>
                  <span className='text-charcoal dark:text-white'>
                    {DisplayPriceInShillings(orderDetails.totalAmt || 0)}
                  </span>
                </div>
                
                <div className='mt-3 text-sm text-brown-400 dark:text-white/45'>
                  <p>Order Date: {formatDate(orderDetails.createdAt)}</p>
                  <p className='flex items-center'>
                    Payment Method: {getPaymentIcon(describePayment(orderDetails).method)}
                    <span className='ml-1'>{describePayment(orderDetails).method}</span>
                  </p>
                  <p>Payment Status: <span className='text-green-600 dark:text-green-400'>{describePayment(orderDetails).label}</span></p>
                </div>
                
                {/* Tracking info */}
                <div className='mt-4 p-3 bg-plum-50 dark:bg-plum-900/25 rounded flex items-start text-sm'>
                  <FaInfoCircle className='text-plum-500 dark:text-plum-300 mt-0.5 mr-2 flex-shrink-0' />
                  <p className='text-plum-800 dark:text-plum-200'>
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
            <p className='text-brown-400 dark:text-white/45 text-sm'>
              Your order has been placed and will be processed shortly.
              <br /><br />
              View all your orders in the "My Orders" section.
            </p>
          </div>
        )}

        <div className='flex flex-col space-y-3'>
          {/* Add Print Receipt button for pickup orders */}
          {orderDetails && orderDetails.fulfillment_type === 'pickup' && (
            <button 
              onClick={printReceipt}
              className='w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded transition-colors flex items-center justify-center'
            >
              <FaPrint className="mr-2" /> Print Pickup Receipt
            </button>
          )}
          
          <button 
            onClick={handleViewOrders}
            className="w-full py-2.5 px-4 bg-gold-500 hover:bg-gold-400 text-charcoal font-semibold rounded-pill transition-colors press"
          >
            View My Orders
          </button>
          
          <Link 
            to="/"
            className="w-full py-2.5 px-4 border border-brown-200 dark:border-dm-border text-charcoal dark:text-white font-medium rounded-pill text-center hover:bg-plum-50 dark:hover:bg-plum-900/30 transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Success;