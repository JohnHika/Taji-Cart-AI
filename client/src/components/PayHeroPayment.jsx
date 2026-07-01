import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FaMobileAlt, FaMoneyBillWave, FaCreditCard } from 'react-icons/fa';
import SummaryApi from '../common/SummaryApi';
import Axios from '../utils/Axios';

const PayHeroPayment = ({
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
  guestShipping,
  customerInfo
}) => {
  const [paymentMethod, setPaymentMethod] = useState('online'); // 'online' or 'cod'
  const [phoneNumber, setPhoneNumber] = useState(guestPhone || '');
  const [loading, setLoading] = useState(false);
  const submitLockRef = useRef(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitLockRef.current || loading) {
      return;
    }

    // Validation
    if (paymentMethod === 'online' && !phoneNumber.match(/^(?:254|\+254|0)?(7\d{8}|1\d{8})$/)) {
      toast.error("Please enter a valid Kenyan phone number for M-Pesa payment");
      return;
    }

    submitLockRef.current = true;
    setLoading(true);

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
        pickup_instructions,
        customerName: customerInfo?.name || guestShipping?.name || 'Customer'
      };

      // Add guest-specific fields
      if (isGuest) {
        requestData.guestEmail = guestEmail;
        requestData.guestPhone = phoneNumber || guestPhone;
        requestData.guestShipping = guestShipping;
      }

      let response;

      if (paymentMethod === 'online') {
        // Online payment via PayHero M-Pesa STK Push
        requestData.phoneNumber = phoneNumber;
        response = await Axios({
          ...SummaryApi.payheroPayment,
          data: requestData,
          requestLockKey: `payment:payhero:${phoneNumber}:${totalAmount}:${addressId || pickup_location || 'pickup'}`
        });
      } else {
        // Cash on Delivery
        requestData.phoneNumber = phoneNumber || guestPhone;
        response = await Axios({
          ...SummaryApi.payheroCOD,
          data: requestData,
          requestLockKey: `payment:cod:${Date.now()}`
        });
      }

      if (response.data.success) {
        if (paymentMethod === 'online') {
          toast.success('✅ M-Pesa payment request sent! Check your phone and enter your PIN to complete payment.');
        } else {
          toast.success('✅ Order placed successfully! You will pay on delivery.');
        }
        onSuccess && onSuccess({
          ...response.data,
          paymentMethod: paymentMethod === 'online' ? 'payhero' : 'cod'
        });
      } else {
        onError && onError(response.data.message);
      }
    } catch (error) {
      console.error('PayHero payment error:', error);
      onError && onError(error.response?.data?.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
      submitLockRef.current = false;
    }
  };

  return (
    <div className="payhero-payment-form">
      {/* Payment Method Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-charcoal mb-3">Select Payment Method</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Online Payment Option */}
          <button
            type="button"
            onClick={() => setPaymentMethod('online')}
            className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-all ${
              paymentMethod === 'online'
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                : 'border-gray-200 hover:border-green-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <FaMobileAlt className="text-2xl text-green-600" />
              <FaCreditCard className="text-xl text-green-600" />
            </div>
            <span className="font-medium text-charcoal">Pay Online</span>
            <span className="text-xs text-gray-500">M-Pesa, Card, Bank</span>
          </button>

          {/* Cash on Delivery Option */}
          <button
            type="button"
            onClick={() => setPaymentMethod('cod')}
            className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-all ${
              paymentMethod === 'cod'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            <FaMoneyBillWave className="text-2xl text-blue-600" />
            <span className="font-medium text-charcoal">Pay on Delivery</span>
            <span className="text-xs text-gray-500">Cash when you receive</span>
          </button>
        </div>
      </div>

      {/* Online Payment Form */}
      {paymentMethod === 'online' && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-2">
            <FaMobileAlt className="text-green-600" />
            <h4 className="font-medium text-green-800 dark:text-green-300">M-Pesa Online Payment</h4>
          </div>
          <p className="text-sm text-green-700 dark:text-green-400 mb-3">
            You will receive an M-Pesa STK push on your phone. Enter your PIN to complete payment instantly.
          </p>
          <ul className="text-xs text-green-600 dark:text-green-400 space-y-1 mb-3">
            <li>✓ Instant confirmation</li>
            <li>✓ Secure payment</li>
            <li>✓ No additional fees</li>
          </ul>
        </div>
      )}

      {/* Cash on Delivery Info */}
      {paymentMethod === 'cod' && (
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <FaMoneyBillWave className="text-blue-600" />
            <h4 className="font-medium text-blue-800 dark:text-blue-300">Cash on Delivery</h4>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-400 mb-3">
            Pay with cash when your order is delivered to your doorstep.
          </p>
          <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1 mb-3">
            <li>✓ Pay only when you receive</li>
            <li>✓ Inspect before payment</li>
            <li>✓ Available for all locations</li>
          </ul>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-2">
            <p className="text-xs text-yellow-700 dark:text-yellow-400">
              ⚠️ Please have the exact amount ready: <strong>KES {totalAmount.toFixed(2)}</strong>
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Phone Number Input - Required for both methods */}
        <div className="space-y-2">
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-charcoal">
            Phone Number {paymentMethod === 'online' && <span className="text-red-500">*</span>}
          </label>
          <input
            type="tel"
            id="phoneNumber"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="e.g., 0712345678"
            className="w-full px-3 py-2 border border-brown-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            required
          />
          <p className="text-xs text-brown-400">
            {paymentMethod === 'online'
              ? 'Enter the M-Pesa registered number to receive the payment prompt'
              : 'We will contact you on this number for delivery confirmation'}
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 px-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
            paymentMethod === 'online'
              ? 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
              : 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Processing...
            </span>
          ) : paymentMethod === 'online' ? (
            `Pay KES ${totalAmount.toFixed(2)} via M-Pesa`
          ) : (
            `Place Order - Pay KES ${totalAmount.toFixed(2)} on Delivery`
          )}
        </button>

        {/* Security Note */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            {paymentMethod === 'online'
              ? '🔒 Secured by PayHero Kenya • M-Pesa STK Push'
              : '💰 Cash payment collected upon delivery'}
          </p>
        </div>
      </form>
    </div>
  );
};

export default PayHeroPayment;
