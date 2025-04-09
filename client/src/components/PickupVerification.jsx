import axios from 'axios';
import React, { useState } from 'react';
import { FaCheck, FaQrcode, FaSearch, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';

const PickupVerification = ({ onSuccess, onError }) => {
  const [orderId, setOrderId] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [orderDetails, setOrderDetails] = useState(null);
  
  const handleFetchOrder = async () => {
    if (!orderId) {
      setError('Please enter an order ID');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(`/api/order/track/${orderId}`);
      
      if (response.data.success) {
        const order = response.data.data;
        
        if (order.fulfillment_type !== 'pickup') {
          setError('This is not a pickup order');
          setOrderDetails(null);
          return;
        }
        
        if (order.status === 'picked_up') {
          setError('This order has already been picked up');
          setOrderDetails(null);
          return;
        }
        
        setOrderDetails(order);
      } else {
        setError('Order not found');
        setOrderDetails(null);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Error fetching order');
      setOrderDetails(null);
    } finally {
      setLoading(false);
    }
  };
  
  const handleVerifyPickup = async () => {
    if (!orderId || !verificationCode) {
      setError('Please enter both order ID and verification code');
      return;
    }
    
    setVerifying(true);
    setError('');
    
    try {
      const response = await axios.post('/api/order/verify-pickup', {
        orderId,
        verificationCode
      });
      
      if (response.data.success) {
        toast.success('Order verified and marked as picked up');
        setOrderDetails(null);
        setOrderId('');
        setVerificationCode('');
        
        if (onSuccess) {
          onSuccess(response.data.data);
        }
      } else {
        setError(response.data.message || 'Verification failed');
        if (onError) {
          onError(response.data.message || 'Verification failed');
        }
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Error verifying pickup';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setVerifying(false);
    }
  };
  
  const handleCancel = () => {
    setOrderDetails(null);
    setVerificationCode('');
    setError('');
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
        <FaQrcode className="mr-2 text-primary-100" />
        Pickup Verification
      </h2>
      
      <div className="space-y-4">
        {!orderDetails ? (
          <>
            <div>
              <label htmlFor="order-id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Order ID
              </label>
              <div className="flex">
                <input
                  type="text"
                  id="order-id"
                  placeholder="Enter Order ID"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-l-md border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-primary-100 focus:border-primary-100 sm:text-sm dark:bg-gray-800 dark:text-white"
                />
                <button
                  onClick={handleFetchOrder}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-r-md shadow-sm text-sm font-medium text-white bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-100 disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <FaSearch className="mr-1" />
                      Find Order
                    </span>
                  )}
                </button>
              </div>
            </div>
            
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="bg-gray-50 dark:bg-gray-750 p-4 rounded-md">
              <div className="flex justify-between mb-2">
                <span className="text-gray-500 dark:text-gray-400">Order ID:</span>
                <span className="font-medium dark:text-white">{orderDetails.orderId}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-500 dark:text-gray-400">Status:</span>
                <span className="font-medium capitalize dark:text-white">{orderDetails.status}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-500 dark:text-gray-400">Customer:</span>
                <span className="font-medium dark:text-white">{orderDetails.userId?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-500 dark:text-gray-400">Pickup Location:</span>
                <span className="font-medium dark:text-white">{orderDetails.pickup_location || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Total Amount:</span>
                <span className="font-medium dark:text-white">KSh {orderDetails.totalAmt?.toLocaleString() || 'N/A'}</span>
              </div>
            </div>
            
            <div>
              <label htmlFor="verification-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Verification Code
              </label>
              <input
                type="text"
                id="verification-code"
                placeholder="Enter verification code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                className="block w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-primary-100 focus:border-primary-100 sm:text-sm dark:bg-gray-800 dark:text-white"
              />
            </div>
            
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}
            
            <div className="flex space-x-3">
              <button
                onClick={handleVerifyPickup}
                disabled={verifying || !verificationCode}
                className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {verifying ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying
                  </span>
                ) : (
                  <span className="flex items-center">
                    <FaCheck className="mr-1" />
                    Verify Pickup
                  </span>
                )}
              </button>
              
              <button
                onClick={handleCancel}
                className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-650 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                <FaTimes className="mr-1" />
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PickupVerification;
