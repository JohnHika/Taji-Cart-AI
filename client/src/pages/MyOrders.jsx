import React, { useEffect, useState } from 'react'
import { FaBox, FaCalendarAlt, FaMapMarkerAlt, FaMoneyBillWave, FaQrcode, FaShoppingBag, FaSpinner, FaStore, FaTruck } from 'react-icons/fa'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import NoData from '../components/NoData'
import { setOrder } from '../store/orderSlice'
import Axios from '../utils/Axios'

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  processing: 'bg-plum-100 text-plum-800 border-plum-200',
  shipped: 'bg-plum-100 text-plum-800 border-plum-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  default: 'bg-brown-50 text-charcoal border-brown-100'
}

const OrderStatusBadge = ({ status }) => {
  const statusClass = statusColors[status?.toLowerCase()] || statusColors.default
  return (
    <span className={`${statusClass} text-xs font-medium px-2.5 py-0.5 rounded-full border`}>
      {status || 'Processing'}
    </span>
  )
}

const MyOrders = () => {
  const orders = useSelector(state => state.orders.order)
  const user = useSelector(state => state.user)
  const dispatch = useDispatch()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Only fetch orders if user is authenticated
    if (user._id) {
      fetchUserOrders()
    }
  }, [user._id])

  const fetchUserOrders = async () => {
    try {
      setLoading(true)
      
      const response = await Axios({
        url: '/api/order/order-list',
        method: 'GET'
      })

      if (response.data.success) {
        dispatch(setOrder(response.data.data))
        console.log('Orders fetched successfully:', response.data.data)
      } else {
        toast.error(response.data.message || 'Failed to fetch orders')
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
      if (error.response?.status === 401) {
        toast.error('Authentication expired. Please log in again.')
      } else {
        toast.error('Failed to load your orders. Please try again later.')
      }
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  return (
    <div className="min-h-screen bg-ivory dark:bg-dm-surface transition-colors">
      <div className="container mx-auto px-4 py-6 sm:py-8">
      <div className="bg-white dark:bg-dm-card border border-brown-100 dark:border-dm-border rounded-card shadow-hover p-5 mb-6 flex flex-wrap justify-between items-center gap-3">
        <h1 className="text-xl font-bold text-charcoal dark:text-white">My Orders</h1>
        <button 
          onClick={fetchUserOrders} 
          className="text-sm bg-plum-700 hover:bg-plum-600 text-white px-4 py-2 rounded-pill transition-colors font-medium"
        >
          Refresh Orders
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <FaSpinner className="animate-spin text-plum-600 dark:text-plum-300 text-4xl mx-auto mb-4" />
            <p className="text-brown-500 dark:text-white/50">Loading your orders...</p>
          </div>
        </div>
      ) : !orders || !orders[0] ? (
        <div className="px-2 sm:px-0">
          <NoData message="You don't have any orders yet" />
          <div className="text-center mt-4">
            <Link 
              to="/" 
              className="inline-block bg-gold-500 hover:bg-gold-400 text-charcoal font-semibold px-6 py-2 rounded-pill transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        </div>
      ) : (
        <div className="pb-4">
          <div className="grid gap-6">
            {orders.map((order, index) => (
              <div 
                key={order._id + index + "order"} 
                className="bg-white dark:bg-dm-card rounded-card border border-brown-100 dark:border-dm-border shadow-hover overflow-hidden transition-all hover:shadow-lg"
              >
                {/* Order header */}
                <div className="p-4 border-b border-brown-100 dark:border-dm-border bg-plum-50/40 dark:bg-plum-900/20 flex flex-col sm:flex-row justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <FaBox className="text-plum-600 dark:text-plum-300 shrink-0" />
                      <span className="font-medium text-charcoal dark:text-white truncate">Order #{order?.orderId}</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                        order.fulfillment_type === 'delivery'
                          ? 'bg-plum-100 text-plum-800 dark:bg-plum-900 dark:text-plum-200'
                          : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                      }`}>
                        {order.fulfillment_type === 'delivery'
                          ? <><FaTruck className="mr-1" size={10} /> Delivery</>
                          : <><FaStore className="mr-1" size={10} /> Pickup</>
                        }
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-brown-600 dark:text-white/50">
                      <FaCalendarAlt className="shrink-0" />
                      <span>Placed on {formatDate(order?.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <OrderStatusBadge status={order?.status} />
                    {order.status !== 'delivered' && order.status !== 'cancelled' && (
                      <Link
                        to={`/order-tracking/${order._id}`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-plum-700 hover:bg-plum-600 text-white rounded-pill text-xs sm:text-sm transition-colors font-medium"
                        aria-label={`Track order ${order.orderId || order._id}`}
                      >
                        <FaTruck /> Track Order
                      </Link>
                    )}
                  </div>
                </div>

                {/* Order content */}
                <div className="p-4">
                  {/* Product information — always row on mobile (image + text side by side) */}
                  <div className="flex gap-3 mb-4 pb-4 border-b border-brown-100 dark:border-dm-border">
                    <div className="shrink-0">
                      <img
                        src={order.product_details.image[0]}
                        className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-brown-100 dark:border-dm-border"
                        alt={order.product_details.name}
                      />
                    </div>
                    <div className="flex-grow min-w-0">
                      <h3 className="font-medium text-sm sm:text-base text-charcoal dark:text-white mb-1 line-clamp-2">{order.product_details.name}</h3>
                      <p className="text-xs text-brown-600 dark:text-white/55 mb-1 line-clamp-2 hidden sm:block">
                        {order.product_details.description
                          ? order.product_details.description.substring(0, 100) + '...'
                          : 'No description available'}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-brown-600 dark:text-white/50">Qty: <span className="text-charcoal dark:text-white/80 font-medium">{order.quantity || 1}</span></span>
                        <span className="text-sm font-semibold text-charcoal dark:text-white">
                          KSh {order.product_details.price?.toLocaleString() || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Order details and payment info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                    <div className="bg-plum-50/50 dark:bg-plum-900/15 p-3 rounded-card border border-brown-100/80 dark:border-dm-border">
                      <div className="flex items-center gap-2 mb-2 text-charcoal dark:text-white/85 font-medium">
                        <FaMoneyBillWave className="text-green-600" />
                        <span>Payment Information</span>
                      </div>
                      <div className="text-brown-600 dark:text-white/55 space-y-1">
                        <div className="flex justify-between">
                          <span>Method:</span>
                          <span className="text-charcoal dark:text-white/80">{order.paymentMethod || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <span className={`${order.isPaid ? 'text-green-600' : 'text-yellow-600'}`}>
                            {order.isPaid ? 'Paid' : 'Pending'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Amount:</span>
                          <span className="text-charcoal dark:text-white/90 font-medium">
                            KSh {order.totalAmount?.toLocaleString() || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-plum-50/50 dark:bg-plum-900/15 p-3 rounded-card border border-brown-100/80 dark:border-dm-border">
                      <div className="flex items-center gap-2 mb-2 text-charcoal dark:text-white/85 font-medium">
                        <FaShoppingBag className="text-plum-600" />
                        <span>Order Details</span>
                      </div>
                      <div className="text-brown-600 dark:text-white/55 space-y-1">
                        <div className="flex justify-between">
                          <span>Order Date:</span>
                          <span className="text-charcoal dark:text-white/80">{formatDate(order.createdAt)}</span>
                        </div>
                        {order.shippingDate && (
                          <div className="flex justify-between">
                            <span>Shipping Date:</span>
                            <span className="text-charcoal dark:text-white/80">{formatDate(order.shippingDate)}</span>
                          </div>
                        )}
                        {order.deliveryDate && (
                          <div className="flex justify-between">
                            <span>Delivery Date:</span>
                            <span className="text-charcoal dark:text-white/80">{formatDate(order.deliveryDate)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-plum-50/50 dark:bg-plum-900/15 p-3 rounded-card border border-brown-100/80 dark:border-dm-border">
                      <div className="flex items-center gap-2 mb-2 text-charcoal dark:text-white/85 font-medium">
                        {order.fulfillment_type === 'delivery' ? (
                          <><FaMapMarkerAlt className="text-red-600" /><span>Delivery Information</span></>
                        ) : (
                          <><FaStore className="text-purple-600" /><span>Pickup Information</span></>
                        )}
                      </div>
                      <div className="text-brown-600 dark:text-white/55 space-y-1">
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <span className="capitalize text-charcoal dark:text-white/80">{order.status || 'Processing'}</span>
                        </div>
                        
                        {order.fulfillment_type === 'delivery' && order.deliveryAddress && (
                          <div className="text-charcoal dark:text-white/80 mt-1 leading-snug">
                            {order.deliveryAddress}
                          </div>
                        )}
                        
                        {order.fulfillment_type === 'pickup' && order.pickup_location && (
                          <div className="text-charcoal dark:text-white/80 mt-1 leading-snug">
                            Pickup Location: {order.pickup_location}
                          </div>
                        )}
                        
                        {order.fulfillment_type === 'pickup' && order.pickupVerificationCode && (
                          <div className="mt-2 p-2 bg-brown-50 dark:bg-dm-card-2 rounded-card border border-brown-100 dark:border-dm-border">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Verification Code:</span>
                              <span className="font-mono font-bold text-plum-700 dark:text-plum-300">
                                <FaQrcode className="inline mr-1" />
                                {order.pickupVerificationCode}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

export default MyOrders
