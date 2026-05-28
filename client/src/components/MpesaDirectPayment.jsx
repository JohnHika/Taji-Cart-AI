import React, { useRef, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FaMobileAlt, FaCheckCircle, FaClock, FaShieldAlt } from 'react-icons/fa';
import SummaryApi from '../common/SummaryApi';
import Axios from '../utils/Axios';

const MpesaDirectPayment = ({
  cartItems,
  totalAmount,
  addressId,
  onSuccess,
  onError,
  communityRewardId,
  communityDiscountAmount,
  fulfillment_type = 'delivery',
  delivery_mode = 'standard',
  customerLocation = null,
  pickup_location = '',
  pickup_instructions = '',
  guestEmail,
  guestPhone,
  guestShipping
}) => {
  const [phoneNumber, setPhoneNumber] = useState(guestPhone || '');
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('idle'); // idle, pending, success, failed
  const [uniqueCode, setUniqueCode] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [checkoutRequestId, setCheckoutRequestId] = useState(null);
  const submitLockRef = useRef(false);

  // Poll for payment status
  useEffect(() => {
    let pollingInterval = null;

    if (paymentStatus === 'pending' && checkoutRequestId) {
      pollingInterval = setInterval(async () => {
        try {
          const response = await Axios({
            ...SummaryApi.checkMpesaDirectStatus,
            url: SummaryApi.checkMpesaDirectStatus.url.replace(':checkoutRequestId', checkoutRequestId)
          });

          if (response.data.status === 'paid') {
            setPaymentStatus('success');
            clearInterval(pollingInterval);
            toast.success('✅ Payment confirmed! Your order has been placed.');
            onSuccess && onSuccess({
              transactionId: checkoutRequestId,
              orderId,
              uniqueCode,
              paymentMethod: 'mpesa-direct'
            });
          } else if (response.data.status === 'failed') {
            setPaymentStatus('failed');
            clearInterval(pollingInterval);
            toast.error('Payment failed. Please try again.');
            onError && onError('Payment failed');
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 3000); // Check every 3 seconds
    }

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [paymentStatus, checkoutRequestId, orderId, uniqueCode, onSuccess, onError]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitLockRef.current || loading || paymentStatus === 'pending') {
      return;
    }

    // Validation
    if (!phoneNumber.match(/^(?:254|\+254|0)?(7\d{8}|1\d{8})$/)) {
      toast.error("Please enter a valid Kenyan phone number");
      return;
    }

    submitLockRef.current = true;
    setLoading(true);
    setPaymentStatus('pending');

    try {
      const userId = localStorage.getItem('userId');
      const isGuest = !userId || userId === 'guest';

      // Prepare request data
      const requestData = {
        userId: userId || 'guest',
        addressId,
        list_items: cartItems,
        subTotalAmt: totalAmount,
        totalAmt: totalAmount,
        communityRewardId,
        communityDiscountAmount,
        fulfillment_type,
        delivery_mode,
        customerLocation,
        pickup_location,
        pickup_instructions
      };

      // Add guest-specific fields
      if (isGuest) {
        requestData.guestEmail = guestEmail;
        requestData.guestPhone = phoneNumber || guestPhone;
        requestData.guestShipping = guestShipping;
      }

      requestData.phoneNumber = phoneNumber;

      // Initiate M-Pesa payment
      const response = await Axios({
        ...SummaryApi.mpesaDirectPayment,
        data: requestData,
        requestLockKey: `payment:mpesa-direct:${phoneNumber}:${totalAmount}`
      });

      if (response.data.success) {
        setUniqueCode(response.data.orderReference);
        setOrderId(response.data.orderId);
        setCheckoutRequestId(response.data.transactionId);

        toast.success('📱 STK Push sent! Check your phone and enter M-Pesa PIN.');
      } else {
        setPaymentStatus('failed');
        onError && onError(response.data.message);
      }
    } catch (error) {
      console.error('M-Pesa payment error:', error);
      setPaymentStatus('failed');
      onError && onError(error.response?.data?.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
      submitLockRef.current = false;
    }
  };

  return (
    <div className="mpesa-direct-payment">
      {/* Security Notice */}
      <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <div className="flex items-start gap-2">
          <FaShieldAlt className="text-green-600 mt-1" />
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-300">
              🔒 Secure M-Pesa Payment
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              You'll receive an M-Pesa prompt on your phone. Your payment is protected by Safaricom's encryption.
            </p>
          </div>
        </div>
      </div>

      {/* Payment Form */}
      {paymentStatus === 'idle' || paymentStatus === 'failed' ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-charcoal">
              M-Pesa Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g., 0712345678"
              className="w-full px-3 py-2 border border-brown-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
              disabled={loading}
            />
            <p className="text-xs text-brown-400">
              Enter the M-Pesa registered number to receive the payment prompt
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Sending Payment Request...
              </>
            ) : (
              <>
                <FaMobileAlt />
                Pay KES {totalAmount.toFixed(2)} via M-Pesa
              </>
            )}
          </button>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              🔒 Secured by M-Pesa Daraja API • 0.55% transaction fee
            </p>
          </div>
        </form>
      ) : (
        /* Waiting for Payment */
        <div className="space-y-4">
          {/* Unique Order Code Display */}
          {uniqueCode && (
            <div className="bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-300 dark:border-purple-700 rounded-lg p-4 text-center">
              <p className="text-sm font-medium text-purple-800 dark:text-purple-300 mb-2">
                🔐 Your Unique Order Code
              </p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 tracking-wider">
                {uniqueCode}
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                This code matches your payment with your order
              </p>
            </div>
          )}

          {/* Payment Status */}
          <div className={`p-4 rounded-lg border-2 ${
            paymentStatus === 'pending'
              ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
              : 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
          }`}>
            {paymentStatus === 'pending' ? (
              <div className="text-center">
                <FaClock className="text-4xl text-yellow-600 mx-auto mb-3" />
                <p className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
                  Waiting for Payment...
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  Please check your phone and enter your M-Pesa PIN to complete the payment.
                </p>
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Automatically confirming payment...
                </div>
              </div>
            ) : (
              <div className="text-center">
                <FaCheckCircle className="text-4xl text-green-600 mx-auto mb-3" />
                <p className="font-semibold text-green-800 dark:text-green-300 mb-2">
                  Payment Confirmed!
                </p>
                <p className="text-sm text-green-700 dark:text-green-400">
                  Order ID: <strong>{orderId}</strong>
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                  📱 You'll receive an SMS confirmation shortly
                </p>
              </div>
            )}
          </div>

          {/* What Happens Next */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2 text-sm">
              What happens next?
            </h4>
            <ol className="space-y-2 text-xs text-blue-700 dark:text-blue-400">
              <li className="flex items-start gap-2">
                <span className="font-bold">1.</span>
                <span>Enter your M-Pesa PIN on your phone</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">2.</span>
                <span>Payment is confirmed automatically</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">3.</span>
                <span>You receive SMS with order details</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">4.</span>
                <span>We contact you for delivery arrangements</span>
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* Important Notes */}
      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          <strong>Important:</strong> Keep your unique order code (<code>{uniqueCode || 'XXXX-XXXX'}</code>) safe.
          You'll receive it via SMS and can use it to track your order or contact support.
        </p>
      </div>
    </div>
  );
};

export default MpesaDirectPayment;
