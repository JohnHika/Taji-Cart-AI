import React, { useState } from 'react';
import { FaSearch, FaBox, FaEnvelope } from 'react-icons/fa';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';

function GuestOrderTracking() {
  const [orderId, setOrderId] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleTrackOrder = async (e) => {
    e.preventDefault();

    if (!orderId || !email) {
      toast.error('Please enter both Order ID and Email');
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const response = await Axios({
        ...SummaryApi.trackGuestOrder,
        params: { orderId, email }
      });

      if (response.data.success) {
        setOrderData(response.data.data);
        toast.success('Order found!');
      }
    } catch (error) {
      console.error('Order tracking error:', error);
      toast.error(error.response?.data?.message || 'Order not found. Please check your Order ID and Email.');
      setOrderData(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      dispatched: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      out_for_delivery: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
    };
    return colors[status] || 'bg-brown-100 text-brown-700 dark:bg-brown-900/30 dark:text-brown-300';
  };

  const getStatusIcon = (status, index, total) => {
    const icons = {
      pending: '📦',
      processing: '⚙️',
      dispatched: '🚚',
      out_for_delivery: '🛵',
      delivered: '✅',
      cancelled: '❌'
    };
    return icons[status] || '📍';
  };

  return (
    <div className="min-h-screen bg-ivory dark:bg-dm-surface py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gold-100 dark:bg-gold-900/30 mb-4">
            <FaBox className="text-2xl text-gold-600" />
          </div>
          <h1 className="text-3xl font-bold text-charcoal dark:text-white mb-2">
            Track Your Order
          </h1>
          <p className="text-brown-500">
            Enter your Order ID and email to track your guest order
          </p>
        </div>

        {/* Search Form */}
        <div className="bg-white dark:bg-dm-card rounded-xl p-6 shadow-lg border border-brown-100 dark:border-dm-border mb-8">
          <form onSubmit={handleTrackOrder} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brown-600 dark:text-brown-300 mb-2">
                Order ID *
              </label>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value.toUpperCase())}
                placeholder="ORD-1234567890-ABC"
                className="w-full px-4 py-3 rounded-lg border border-brown-200 dark:border-brown-700 bg-white dark:bg-dm-surface text-charcoal dark:text-white focus:ring-2 focus:ring-gold-500 focus:border-transparent"
              />
              <p className="text-xs text-brown-500 mt-1">
                Find this in your order confirmation email
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-brown-600 dark:text-brown-300 mb-2">
                Email Address *
              </label>
              <div className="relative">
                <FaEnvelope className="absolute left-4 top-1/2 transform -translate-y-1/2 text-brown-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full pl-12 pr-4 py-3 rounded-lg border border-brown-200 dark:border-brown-700 bg-white dark:bg-dm-surface text-charcoal dark:text-white focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-brown-500 mt-1">
                Must match the email used for the order
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !orderId || !email}
              className={`w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-lg transition-colors ${
                loading || !orderId || !email
                  ? 'bg-brown-300 cursor-not-allowed'
                  : 'bg-gold-500 hover:bg-gold-400 text-charcoal'
              }`}
            >
              <FaSearch />
              {loading ? 'Searching...' : 'Track Order'}
            </button>
          </form>
        </div>

        {/* Order Details */}
        {orderData && (
          <div className="space-y-6">
            {/* Order Status Header */}
            <div className="bg-white dark:bg-dm-card rounded-xl p-6 shadow-lg border border-brown-100 dark:border-dm-border">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-charcoal dark:text-white">
                    Order {orderData.orderId}
                  </h2>
                  <p className="text-sm text-brown-500">
                    Placed on {new Date(orderData.statusHistory[0]?.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-4 py-2 rounded-full font-semibold text-sm ${getStatusColor(orderData.status)}`}>
                  {orderData.status.replace(/_/g, ' ').toUpperCase()}
                </span>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-brown-50 dark:bg-dm-surface rounded-lg p-4">
                  <p className="text-xs text-brown-500 mb-1">Total Amount</p>
                  <p className="text-lg font-bold text-gold-600">
                    KSh {orderData.totalAmt?.toLocaleString()}
                  </p>
                </div>
                <div className="bg-brown-50 dark:bg-dm-surface rounded-lg p-4">
                  <p className="text-xs text-brown-500 mb-1">Estimated Delivery</p>
                  <p className="text-sm font-semibold text-charcoal dark:text-white">
                    {new Date(orderData.estimatedDelivery).toLocaleDateString()}
                  </p>
                </div>
                <div className="bg-brown-50 dark:bg-dm-surface rounded-lg p-4">
                  <p className="text-xs text-brown-500 mb-1">Items</p>
                  <p className="text-sm font-semibold text-charcoal dark:text-white">
                    {orderData.items?.length || 0} products
                  </p>
                </div>
              </div>
            </div>

            {/* Status Timeline */}
            <div className="bg-white dark:bg-dm-card rounded-xl p-6 shadow-lg border border-brown-100 dark:border-dm-border">
              <h3 className="text-lg font-bold text-charcoal dark:text-white mb-6">Order Progress</h3>

              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-brown-200 dark:bg-brown-700" />

                <div className="space-y-6">
                  {orderData.statusHistory?.map((status, index) => (
                    <div key={index} className="relative flex items-start gap-4 pl-12">
                      <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center text-lg ${
                        getStatusColor(status.status)
                      }`}>
                        {getStatusIcon(status.status, index, orderData.statusHistory.length)}
                      </div>

                      <div className="flex-1">
                        <h4 className="font-semibold text-charcoal dark:text-white">
                          {status.status.replace(/_/g, ' ').toUpperCase()}
                        </h4>
                        <p className="text-sm text-brown-500">
                          {new Date(status.timestamp).toLocaleString()}
                        </p>
                        {status.note && (
                          <p className="text-sm text-brown-600 dark:text-brown-300 mt-1">
                            {status.note}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white dark:bg-dm-card rounded-xl p-6 shadow-lg border border-brown-100 dark:border-dm-border">
              <h3 className="text-lg font-bold text-charcoal dark:text-white mb-4">Order Items</h3>

              <div className="space-y-3">
                {orderData.items?.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-brown-50 dark:bg-dm-surface rounded-lg">
                    <div>
                      <p className="font-semibold text-charcoal dark:text-white">{item.name}</p>
                      <p className="text-sm text-brown-500">Quantity: {item.quantity}</p>
                    </div>
                    <p className="font-bold text-gold-600">
                      KSh {(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Info */}
            <div className="bg-white dark:bg-dm-card rounded-xl p-6 shadow-lg border border-brown-100 dark:border-dm-border">
              <h3 className="text-lg font-bold text-charcoal dark:text-white mb-4">Shipping Information</h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-brown-500">Name:</span>
                  <span className="text-charcoal dark:text-white font-medium">{orderData.shipping?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brown-500">Address:</span>
                  <span className="text-charcoal dark:text-white font-medium">{orderData.shipping?.address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brown-500">Phone:</span>
                  <span className="text-charcoal dark:text-white font-medium">{orderData.shipping?.phone}</span>
                </div>
              </div>
            </div>

            {/* Support CTA */}
            <div className="bg-gradient-to-r from-gold-100 to-gold-50 dark:from-gold-900/20 dark:to-gold-900/10 rounded-xl p-6 text-center">
              <h3 className="text-lg font-bold text-charcoal dark:text-white mb-2">
                Need Help?
              </h3>
              <p className="text-brown-500 mb-4">
                Contact our support team for any questions about your order
              </p>
              <a
                href="mailto:support@nawirihair.com"
                className="inline-block bg-gold-500 hover:bg-gold-400 text-charcoal font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                Contact Support
              </a>
            </div>
          </div>
        )}

        {/* No Results Message */}
        {hasSearched && !orderData && !loading && (
          <div className="bg-white dark:bg-dm-card rounded-xl p-8 shadow-lg border border-brown-100 dark:border-dm-border text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-charcoal dark:text-white mb-2">
              Order Not Found
            </h3>
            <p className="text-brown-500 mb-4">
              We couldn't find an order with those details. Please check:
            </p>
            <ul className="text-sm text-brown-600 dark:text-brown-300 space-y-2 mb-6">
              <li>• The Order ID is correct (check your confirmation email)</li>
              <li>• You're using the same email address for the order</li>
              <li>• The order was placed successfully</li>
            </ul>
            <a
              href="mailto:support@nawirihair.com"
              className="inline-block bg-gold-500 hover:bg-gold-400 text-charcoal font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Contact Support
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default GuestOrderTracking;
