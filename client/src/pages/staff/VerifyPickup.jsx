import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FaArrowLeft, FaBoxOpen, FaCheck, FaExclamationTriangle, FaQrcode, FaSpinner } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import SummaryApi from '../../common/SummaryApi';
import Axios from '../../utils/Axios';

const VerifyPickup = () => {
  console.log("VerifyPickup component rendering");
  const [pickupCode, setPickupCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Extract code from query params if available
  useEffect(() => {
    console.log("VerifyPickup useEffect - checking for code in URL");
    const params = new URLSearchParams(location.search);
    const codeParam = params.get('code');
    if (codeParam) {
      console.log(`Found code parameter in URL: ${codeParam}`);
      setPickupCode(codeParam);
      handleVerifyPickup(null, codeParam);
    }
  }, [location]);

  const handleVerifyPickup = async (e, codeOverride = null) => {
    if (e) e.preventDefault();
    
    const codeToVerify = codeOverride || pickupCode;
    
    if (!codeToVerify.trim()) {
      toast.error('Please enter a pickup code');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await Axios({
        ...SummaryApi.verifyPickup,
        data: { pickupCode: codeToVerify.trim() }
      });

      if (response.data.success) {
        toast.success('Pickup code verified successfully');
        setOrderDetails(response.data.data);
        setVerifying(true);
      } else {
        toast.error(response.data.message || 'Failed to verify pickup code');
        setError(response.data.message || 'Invalid pickup code');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Error verifying pickup';
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCompletePickup = async () => {
    if (!orderDetails || !orderDetails._id) {
      toast.error('Order details not available');
      return;
    }

    try {
      setLoading(true);
      
      console.log(`Attempting to complete pickup for order: ${orderDetails._id}`);
      
      const response = await Axios({
        ...SummaryApi.completePickup,
        data: { 
          orderId: orderDetails._id,
          pickupCode: orderDetails.pickupVerificationCode
        }
      });

      if (response.data.success) {
        console.log("Pickup completion response:", response.data);
        toast.success('Order marked as picked up successfully');
        
        // Navigate to success page with order details
        navigate('/dashboard/staff/verification-success', {
          state: { 
            orderDetails,
            completionData: response.data.data
          }
        });
      } else {
        console.log("Pickup completion failed:", response.data);
        toast.error(response.data.message || 'Failed to complete pickup');
      }
    } catch (error) {
      console.error('Error completing pickup:', error);
      let errorMessage = 'Error connecting to server';
      
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `KSh ${parseFloat(amount).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Verify Order Pickup</h1>
        <button 
          onClick={() => navigate('/dashboard/staff/pending-pickups')}
          className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg flex items-center text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          <FaArrowLeft className="mr-2" /> Back to Dashboard
        </button>
      </div>

      {!verifying ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 max-w-lg mx-auto">
          <div className="mb-4 text-center">
            <FaQrcode className="text-5xl mx-auto mb-3 text-primary-100" />
            <h2 className="text-xl font-semibold dark:text-white">Verify Pickup Code</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Enter the customer's pickup code to verify their order
            </p>
          </div>

          <form onSubmit={handleVerifyPickup} className="mt-6">
            <div className="mb-4">
              <label htmlFor="pickupCode" className="block text-gray-700 dark:text-gray-300 mb-2">
                Pickup Code
              </label>
              <input
                type="text"
                id="pickupCode"
                placeholder="Enter pickup code (e.g. ABC123)"
                value={pickupCode}
                onChange={(e) => setPickupCode(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                autoComplete="off"
                required
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
                <div className="flex items-center">
                  <FaExclamationTriangle className="text-red-500 mr-2" />
                  <p>{error}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !pickupCode.trim()}
              className={`w-full p-3 rounded-lg font-medium flex items-center justify-center ${
                loading || !pickupCode.trim()
                  ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                  : 'bg-primary-100 hover:bg-primary-200 text-white'
              }`}
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin mr-2" /> Verifying...
                </>
              ) : (
                <>
                  <FaQrcode className="mr-2" /> Verify Pickup Code
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 max-w-2xl mx-auto">
          <div className="mb-6 text-center">
            <div className="inline-block p-3 bg-green-100 dark:bg-green-900/30 rounded-full mb-3">
              <FaBoxOpen className="text-4xl text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-semibold dark:text-white">Order Verified</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              The pickup code has been verified. Review the order details below.
            </p>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-6">
            <h3 className="font-medium text-lg mb-3 dark:text-white">Order Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600 dark:text-gray-400">Order ID:</p>
                <p className="font-medium dark:text-white">{orderDetails._id}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Order Number:</p>
                <p className="font-medium dark:text-white">{orderDetails.orderId || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Customer:</p>
                <p className="font-medium dark:text-white">{orderDetails.userId?.name || 'Unknown Customer'}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Date Ordered:</p>
                <p className="font-medium dark:text-white">{formatDate(orderDetails.createdAt)}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Total Amount:</p>
                <p className="font-medium dark:text-white">{formatCurrency(orderDetails.totalAmt || 0)}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Status:</p>
                <p className="font-medium dark:text-white capitalize">{orderDetails.status || 'Pending'}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Pickup Location:</p>
                <p className="font-medium dark:text-white">{orderDetails.pickup_location || 'Main Store'}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Verification Code:</p>
                <p className="font-medium font-mono dark:text-white">{orderDetails.pickupVerificationCode}</p>
              </div>
            </div>
          </div>

          {orderDetails.items && orderDetails.items.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-6">
              <h3 className="font-medium text-lg mb-3 dark:text-white">Items</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-1 text-gray-600 dark:text-gray-400">Item</th>
                      <th className="text-center py-2 px-1 text-gray-600 dark:text-gray-400">Quantity</th>
                      <th className="text-right py-2 px-1 text-gray-600 dark:text-gray-400">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderDetails.items.map((item, index) => (
                      <tr key={index} className="border-b border-gray-200 dark:border-gray-700">
                        <td className="py-2 px-1 dark:text-white">{item.product_details?.name || 'Unknown Product'}</td>
                        <td className="py-2 px-1 text-center dark:text-white">{item.quantity || 1}</td>
                        <td className="py-2 px-1 text-right dark:text-white">{formatCurrency(item.price || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-3 justify-end">
            <button
              onClick={() => setVerifying(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Enter Another Code
            </button>
            <button
              onClick={handleCompletePickup}
              disabled={loading}
              className={`px-4 py-2 rounded-lg font-medium flex items-center justify-center ${
                loading ? 'bg-green-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin mr-2" /> Processing...
                </>
              ) : (
                <>
                  <FaCheck className="mr-2" /> Complete Pickup
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerifyPickup;
