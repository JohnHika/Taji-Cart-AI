import React, { useState } from 'react';
import toast from 'react-hot-toast';
import SummaryApi from '../common/SummaryApi';
import Axios from '../utils/Axios';

const MpesaPayment = ({ 
  cartItems, 
  totalAmount, 
  addressId, 
  onSuccess, 
  onError, 
  communityRewardId, 
  communityDiscountAmount,
  fulfillment_type = 'delivery',
  pickup_location = '',
  pickup_instructions = ''
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!phoneNumber.match(/^(?:254|\+254|0)?(7\d{8})$/)) {
      toast.error("Please enter a valid Kenyan phone number");
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await Axios({
        ...SummaryApi.mpesaPayment,
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
          pickup_location,
          pickup_instructions
        }
      });
      
      if (response.data.success) {
        onSuccess && onSuccess();
      } else {
        onError && onError(response.data.message);
      }
    } catch (error) {
      console.error('M-Pesa payment error:', error);
      onError && onError(error.response?.data?.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="mpesa-payment-form">
      <p className="mb-4 text-sm text-gray-600">
        Enter your M-Pesa phone number to receive a payment request.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
            Phone Number
          </label>
          <input
            type="text"
            id="phoneNumber"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="e.g., 254712345678"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
            required
          />
          <p className="text-xs text-gray-500">Format: 254XXXXXXXXX (include country code)</p>
        </div>
        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : `Pay KES ${totalAmount.toFixed(2)}`}
        </button>
      </form>
    </div>
  );
};

export default MpesaPayment;