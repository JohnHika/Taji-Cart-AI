import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import SummaryApi from '../common/SummaryApi';
import Axios from '../utils/Axios';

const EquityPayment = ({
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
  pickup_instructions = ''
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const submitLockRef = useRef(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitLockRef.current || loading) {
      return;
    }

    // Basic validation
    if (!phoneNumber.match(/^(?:254|\+254|0)?(7\d{8}|1\d{8})$/)) {
      toast.error("Please enter a valid Kenyan phone number");
      return;
    }

    submitLockRef.current = true;
    setLoading(true);

    try {
      const response = await Axios({
        ...SummaryApi.equityPayment,
        data: {
          phoneNumber,
          amount: totalAmount,
          userId: localStorage.getItem('userId'),
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
        },
        requestLockKey: `payment:equity:${phoneNumber}:${totalAmount}:${addressId || pickup_location || 'pickup'}`
      });

      if (response.data.success) {
        toast.success('Payment request sent! Check your phone to complete payment.');
        onSuccess && onSuccess(response.data);
      } else {
        onError && onError(response.data.message);
      }
    } catch (error) {
      console.error('Equity payment error:', error);
      onError && onError(error.response?.data?.message || 'Payment failed');
    } finally {
      setLoading(false);
      submitLockRef.current = false;
    }
  };

  return (
    <div className="equity-payment-form">
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
          🏦 Equity Bank EazzyPay
        </p>
        <p className="text-xs text-blue-600 dark:text-blue-400">
          Pay directly from your Equity Bank account. You'll receive a payment request on your phone.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-charcoal">
            Phone Number
          </label>
          <input
            type="text"
            id="phoneNumber"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="e.g., 254712345678"
            className="w-full px-3 py-2 border border-brown-200 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required
          />
          <p className="text-xs text-brown-400">Format: 254XXXXXXXXX (include country code)</p>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : `Pay KES ${totalAmount.toFixed(2)}`}
        </button>
      </form>
    </div>
  );
};

export default EquityPayment;
