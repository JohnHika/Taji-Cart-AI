import React from 'react';
import { FaArrowLeft, FaCheckCircle, FaPrint } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';

const VerificationSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get order details from location state
  const { orderDetails, completionData } = location.state || {};

  if (!orderDetails) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="bg-yellow-100 dark:bg-yellow-900/30 p-6 rounded-lg mb-6">
          <h2 className="text-lg font-medium text-yellow-800 dark:text-yellow-300">
            No order details found. Please verify an order first.
          </h2>
        </div>
        <button
          onClick={() => navigate('/dashboard/staff/verify-pickup')}
          className="bg-primary-100 hover:bg-primary-200 text-white px-6 py-2 rounded-lg inline-flex items-center"
        >
          <FaArrowLeft className="mr-2" /> Go to Verification
        </button>
      </div>
    );
  }

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

  const formatCurrency = (amount) => {
    return `KSh ${parseFloat(amount).toFixed(2)}`;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container mx-auto px-4 py-8 print:py-0">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <h1 className="text-2xl font-bold dark:text-white">Verification Completed</h1>
        <div className="flex space-x-2">
          <button 
            onClick={() => navigate('/dashboard/staff/pending-pickups')}
            className="bg-brown-100 dark:bg-dm-card-2 px-4 py-2 rounded-lg flex items-center text-charcoal dark:text-white/70 hover:bg-brown-200 dark:hover:bg-dm-border"
          >
            <FaArrowLeft className="mr-2" /> Back to Pending Pickups
          </button>
          <button 
            onClick={handlePrint}
            className="bg-plum-700 hover:bg-plum-600 px-4 py-2 rounded-lg flex items-center text-white"
          >
            <FaPrint className="mr-2" /> Print Receipt
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-dm-card rounded-lg shadow-md p-6 print:shadow-none print:p-1 max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className="inline-block p-3 bg-green-100 dark:bg-green-900/30 rounded-full mb-3 print:hidden">
            <FaCheckCircle className="text-4xl text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-semibold dark:text-white print:text-black">Order Pickup Complete</h2>
          <p className="text-brown-500 dark:text-white/40 print:text-charcoal mt-1">
            Customer pickup verified and completed
          </p>
        </div>

        <div className="border-t border-brown-100 dark:border-dm-border print:border-brown-200 pt-4 mb-6">
          <h3 className="font-medium text-lg mb-3 dark:text-white print:text-black">Receipt Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-brown-500 dark:text-white/40 print:text-charcoal">Order Number:</p>
              <p className="font-medium dark:text-white print:text-black">{orderDetails.orderId || 'N/A'}</p>
            </div>
            <div>
              <p className="text-brown-500 dark:text-white/40 print:text-charcoal">Customer:</p>
              <p className="font-medium dark:text-white print:text-black">{orderDetails.userId?.name || 'Unknown Customer'}</p>
            </div>
            <div>
              <p className="text-brown-500 dark:text-white/40 print:text-charcoal">Date Ordered:</p>
              <p className="font-medium dark:text-white print:text-black">{formatDate(orderDetails.createdAt)}</p>
            </div>
            <div>
              <p className="text-brown-500 dark:text-white/40 print:text-charcoal">Pickup Date:</p>
              <p className="font-medium dark:text-white print:text-black">{formatDate(completionData?.verifiedAt || new Date())}</p>
            </div>
            <div>
              <p className="text-brown-500 dark:text-white/40 print:text-charcoal">Total Amount:</p>
              <p className="font-medium dark:text-white print:text-black">{formatCurrency(orderDetails.totalAmt || 0)}</p>
            </div>
            <div>
              <p className="text-brown-500 dark:text-white/40 print:text-charcoal">Verified By:</p>
              <p className="font-medium dark:text-white print:text-black">{completionData?.verifiedBy || 'Staff Member'}</p>
            </div>
            <div>
              <p className="text-brown-500 dark:text-white/40 print:text-charcoal">Location:</p>
              <p className="font-medium dark:text-white print:text-black">{orderDetails.pickup_location || 'Main Store'}</p>
            </div>
            <div>
              <p className="text-brown-500 dark:text-white/40 print:text-charcoal">Verification Code:</p>
              <p className="font-medium font-mono dark:text-white print:text-black">{orderDetails.pickupVerificationCode}</p>
            </div>
          </div>
        </div>

        {orderDetails.items && orderDetails.items.length > 0 && (
          <div className="border-t border-brown-100 dark:border-dm-border print:border-brown-200 pt-4 mb-6">
            <h3 className="font-medium text-lg mb-3 dark:text-white print:text-black">Items</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-brown-100 dark:border-dm-border print:border-brown-200">
                    <th className="text-left py-2 px-1 text-brown-500 dark:text-white/40 print:text-charcoal">Item</th>
                    <th className="text-center py-2 px-1 text-brown-500 dark:text-white/40 print:text-charcoal">Quantity</th>
                    <th className="text-right py-2 px-1 text-brown-500 dark:text-white/40 print:text-charcoal">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {orderDetails.items.map((item, index) => (
                    <tr key={index} className="border-b border-brown-100 dark:border-dm-border print:border-brown-200">
                      <td className="py-2 px-1 dark:text-white print:text-black">{item.product_details?.name || 'Unknown Product'}</td>
                      <td className="py-2 px-1 text-center dark:text-white print:text-black">{item.quantity || 1}</td>
                      <td className="py-2 px-1 text-right dark:text-white print:text-black">{formatCurrency(item.price || 0)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-brown-200 dark:border-dm-border print:border-brown-300">
                    <td colSpan="2" className="py-2 px-1 text-right font-medium dark:text-white print:text-black">Total:</td>
                    <td className="py-2 px-1 text-right font-medium dark:text-white print:text-black">{formatCurrency(orderDetails.totalAmt || 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="text-center print:mt-8 print:border-t print:border-brown-200 print:pt-4">
          <p className="text-brown-500 dark:text-white/40 print:text-charcoal text-sm">
            Thank you for shopping with us!
          </p>
          <p className="text-brown-400 dark:text-brown-400 print:text-brown-500 text-xs mt-1">
            This receipt was generated at {formatDate(new Date())}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerificationSuccess;
