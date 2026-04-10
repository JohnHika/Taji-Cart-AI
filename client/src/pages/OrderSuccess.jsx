import React, { useEffect } from 'react';
import { FaArrowRight, FaCheckCircle, FaMapMarkerAlt, FaQrcode, FaStore, FaTruck } from 'react-icons/fa';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { nawiriBrand } from '../config/brand';

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
      'main-store': `Main Store - ${nawiriBrand.location}`,
      'westlands-branch': 'Westlands Branch - 456 Westlands Avenue, Nairobi',
      'mombasa-store': 'Mombasa Store - 789 Beach Road, Mombasa'
    };
    return locations[locationId] || locationId;
  };
  
  return (
    <div className="min-h-screen bg-ivory dark:bg-dm-surface py-8 px-3 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-dm-card shadow-card rounded-card overflow-hidden border border-brown-100 dark:border-dm-border">
          {/* Header */}
          <div className="p-6 sm:p-8 bg-plum-50 dark:bg-plum-900/20 border-b border-plum-100 dark:border-plum-800/40">
            <div className="flex items-center justify-center mb-4">
              <FaCheckCircle className="text-plum-600 dark:text-plum-300 text-5xl" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-center text-charcoal dark:text-white">
              Order Placed Successfully!
            </h1>
            <p className="mt-2 text-center text-sm text-brown-500 dark:text-white/60">
              Thank you for your order. Your order ID is <span className="font-semibold text-charcoal dark:text-white">{order.orderId}</span>
            </p>
          </div>

          {/* Order Details */}
          <div className="p-5 sm:p-8 space-y-6">
            {/* Fulfillment Info */}
            <div className="rounded-card border border-brown-100 dark:border-dm-border p-4">
              <div className="flex items-center gap-2 mb-3">
                {fulfillmentType === 'delivery' ? (
                  <>
                    <FaTruck className="text-plum-600 dark:text-plum-300" />
                    <h2 className="text-base font-semibold text-charcoal dark:text-white">Delivery Information</h2>
                  </>
                ) : (
                  <>
                    <FaStore className="text-plum-600 dark:text-plum-300" />
                    <h2 className="text-base font-semibold text-charcoal dark:text-white">Pickup Information</h2>
                  </>
                )}
              </div>

              {fulfillmentType === 'delivery' ? (
                <p className="text-sm text-brown-500 dark:text-white/60">
                  Your order will be delivered to your selected address. You'll receive updates about your delivery status.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <FaMapMarkerAlt className="text-brown-400 dark:text-white/40 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-brown-400 dark:text-white/40 uppercase tracking-wide mb-0.5">Pickup Location</p>
                      <p className="text-sm text-charcoal dark:text-white">{getPickupLocationName(pickupLocation)}</p>
                    </div>
                  </div>

                  {verificationCode && (
                    <div className="bg-plum-50 dark:bg-plum-900/20 p-3 rounded-card border border-plum-100 dark:border-plum-800/40">
                      <div className="flex items-center gap-2 mb-2">
                        <FaQrcode className="text-plum-500 dark:text-plum-300" />
                        <p className="text-sm font-semibold text-charcoal dark:text-white">Verification Code</p>
                      </div>
                      <div className="flex justify-center">
                        <div className="bg-white dark:bg-dm-card-2 px-5 py-2 rounded-lg border border-plum-200 dark:border-plum-700 text-2xl font-mono font-bold tracking-widest text-plum-700 dark:text-plum-200">
                          {verificationCode}
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-brown-400 dark:text-white/40 text-center">
                        Show this code when you pick up your order
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Order total */}
            <div className="rounded-card border border-brown-100 dark:border-dm-border overflow-hidden">
              <div className="bg-plum-50/50 dark:bg-plum-900/10 px-4 py-3 flex justify-between items-center">
                <span className="font-semibold text-sm text-charcoal dark:text-white">Order Total</span>
                <span className="font-bold text-base font-price text-gold-600 dark:text-gold-300">KSh {order.totalAmt?.toLocaleString()}</span>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/dashboard/myorders"
                className="inline-flex justify-center items-center gap-2 px-4 py-3 rounded-pill text-sm font-semibold text-white bg-plum-700 hover:bg-plum-600 transition-colors w-full"
              >
                View My Orders
                <FaArrowRight size={13} />
              </Link>
              <Link
                to="/"
                className="inline-flex justify-center items-center px-4 py-3 rounded-pill text-sm font-semibold border border-brown-200 dark:border-dm-border text-charcoal dark:text-white/80 bg-white dark:bg-dm-card hover:bg-plum-50 dark:hover:bg-plum-900/20 transition-colors w-full"
              >
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
