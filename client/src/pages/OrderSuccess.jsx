import React, { useEffect } from 'react';
import { FaArrowRight, FaCheckCircle, FaMapMarkerAlt, FaQrcode, FaStore, FaTruck } from 'react-icons/fa';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const OrderSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { orderData, fulfillmentType, pickupLocation, verificationCode } = location.state || {};
  
  useEffect(() => {
    if (!orderData) {
      // Redirect if no order data (direct access to page)
      navigate('/');
    }
    
    // Scroll to top
    window.scrollTo(0, 0);
  }, [orderData, navigate]);
  
  if (!orderData) {
    return null; // Don't render anything while redirecting
  }
  
  const order = orderData.data[0];
  
  // Map pickup location ID to human-readable name
  const getPickupLocationName = (locationId) => {
    const locations = {
      'main-store': 'Main Store - 123 Main Street, Nairobi',
      'westlands-branch': 'Westlands Branch - 456 Westlands Avenue, Nairobi',
      'mombasa-store': 'Mombasa Store - 789 Beach Road, Mombasa'
    };
    return locations[locationId] || locationId;
  };
  
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          {/* Header */}
          <div className="p-6 sm:p-8 bg-primary-50 dark:bg-primary-900/30 border-b border-primary-100 dark:border-primary-800">
            <div className="flex items-center justify-center mb-4">
              <FaCheckCircle className="text-primary-100 text-5xl" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 dark:text-white">
              Order Placed Successfully!
            </h1>
            <p className="mt-2 text-center text-gray-600 dark:text-gray-300">
              Thank you for your order. Your order ID is <span className="font-semibold">{order.orderId}</span>
            </p>
          </div>
          
          {/* Order Details */}
          <div className="p-6 sm:p-8">
            {/* Fulfillment Info */}
            <div className="mb-8 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center mb-3">
                {fulfillmentType === 'delivery' ? (
                  <>
                    <FaTruck className="text-primary-100 mr-2" />
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">Delivery Information</h2>
                  </>
                ) : (
                  <>
                    <FaStore className="text-primary-100 mr-2" />
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">Pickup Information</h2>
                  </>
                )}
              </div>
              
              {fulfillmentType === 'delivery' ? (
                <p className="text-gray-600 dark:text-gray-300">
                  Your order will be delivered to your selected address.
                  You'll receive updates about your delivery status.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start">
                    <FaMapMarkerAlt className="text-gray-400 mt-1 mr-2" />
                    <div>
                      <p className="font-medium dark:text-white">Pickup Location:</p>
                      <p className="text-gray-600 dark:text-gray-300">{getPickupLocationName(pickupLocation)}</p>
                    </div>
                  </div>
                  
                  {verificationCode && (
                    <div className="bg-gray-50 dark:bg-gray-750 p-3 rounded border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center">
                        <FaQrcode className="text-gray-400 mr-2" />
                        <p className="font-medium dark:text-white">Verification Code:</p>
                      </div>
                      <div className="flex justify-center mt-2">
                        <div className="bg-white dark:bg-gray-700 px-4 py-2 rounded border border-gray-200 dark:border-gray-600 text-xl font-mono font-bold tracking-wider text-primary-100">
                          {verificationCode}
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                        Show this code when you pick up your order
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Order Summary */}
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Order Summary</h2>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-6">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {/* Product details would go here */}
                {/* This is a simplified example; you'd loop through products */}
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-750 p-4">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Total:</span>
                  <span className="font-bold text-gray-900 dark:text-white">KSh {order.totalAmt?.toLocaleString()}</span>
                </div>
              </div>
            </div>
            
            {/* Navigation buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <Link to="/my-orders" className="inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-100 w-full">
                <span>View My Orders</span>
                <FaArrowRight className="ml-2" />
              </Link>
              
              <Link to="/" className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-650 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 w-full">
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
