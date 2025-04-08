import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const MpesaPaymentStatus = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Set a timeout to check payment status or redirect after a few seconds
    const timer = setTimeout(() => {
      navigate('/orders');
    }, 10000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <div className="text-green-600 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2">Payment Processing</h2>
        <p className="text-gray-600 mb-6">
          We've sent an M-Pesa payment request to your phone. Please check your phone and enter your PIN to complete the payment.
        </p>
        <p className="text-sm text-gray-500 mb-4">
          You will be redirected to your orders page shortly.
        </p>
        <button
          onClick={() => navigate('/orders')}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
        >
          View My Orders
        </button>
      </div>
    </div>
  );
};

export default MpesaPaymentStatus;