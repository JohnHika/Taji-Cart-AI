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
  processing: 'bg-blue-100 text-blue-800 border-blue-200',
  shipped: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  default: 'bg-gray-100 text-gray-800 border-gray-200'
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className='bg-white dark:bg-gray-800 shadow-md p-5 mb-6 flex justify-between items-center'>
        <h1 className="text-xl font-bold dark:text-gray-100">My Orders</h1>
        <button 
          onClick={fetchUserOrders} 
          className="text-sm bg-primary-100 hover:bg-primary-200 text-white px-4 py-2 rounded-md transition-colors"
        >
          Refresh Orders
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <FaSpinner className="animate-spin text-primary-300 text-4xl mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading your orders...</p>
          </div>
        </div>
      ) : !orders || !orders[0] ? (
        <div className="px-6">
          <NoData message="You don't have any orders yet" />
          <div className="text-center mt-4">
            <Link 
              to="/" 
              className="inline-block bg-primary-100 hover:bg-primary-200 text-white px-6 py-2 rounded-md transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        </div>
      ) : (
        <div className="px-4 md:px-6 pb-8">
          <div className="grid gap-6">
            {orders.map((order, index) => (
              <div 
                key={order._id + index + "order"} 
                className='bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-all hover:shadow-lg'
              >
                {/* Order header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex flex-col md:flex-row justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <FaBox className="text-primary-100" />
                      <span className="font-medium dark:text-gray-200">Order #{order?.orderId}</span>
                      
                      {/* Fulfillment type badge */}
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.fulfillment_type === 'delivery' 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                      }`}>
                        {order.fulfillment_type === 'delivery' 
                          ? <><FaTruck className="mr-1" size={10} /> Delivery</>
                          : <><FaStore className="mr-1" size={10} /> Pickup</>
                        }
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <FaCalendarAlt />
                      <span>Placed on {formatDate(order?.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <OrderStatusBadge status={order?.status} />
                    {order.status !== 'delivered' && order.status !== 'cancelled' && (
                      <Link 
                        to={`/order-tracking/${order._id}`} 
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 hover:bg-primary-200 text-white rounded-md text-sm transition-colors"
                        aria-label={`Track order ${order.orderId || order._id}`}
                      >
                        <FaTruck /> Track Order
                      </Link>
                    )}
                  </div>
                </div>
                
                {/* Order content */}
                <div className="p-4">
                  {/* Product information */}
                  <div className="flex flex-col md:flex-row gap-4 mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex-shrink-0">
                      <img
                        src={order.product_details.image[0]} 
                        className="w-20 h-20 object-cover rounded"
                        alt={order.product_details.name}
                      />
                    </div>
                    <div className="flex-grow">
                      <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-1">{order.product_details.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {order.product_details.description ? 
                          order.product_details.description.substring(0, 100) + '...' : 
                          'No description available'}
                      </p>
                      <div className="flex items-center gap-1 text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Quantity:</span>
                        <span className="dark:text-gray-300">{order.quantity || 1}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                        KSh {order.product_details.price?.toLocaleString() || 'N/A'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Order details and payment info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-gray-50 dark:bg-gray-750 p-3 rounded-md">
                      <div className="flex items-center gap-2 mb-2 text-gray-700 dark:text-gray-300 font-medium">
                        <FaMoneyBillWave className="text-green-600" />
                        <span>Payment Information</span>
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 space-y-1">
                        <div className="flex justify-between">
                          <span>Method:</span>
                          <span className="dark:text-gray-300">{order.paymentMethod || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <span className={`${order.isPaid ? 'text-green-600' : 'text-yellow-600'}`}>
                            {order.isPaid ? 'Paid' : 'Pending'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Amount:</span>
                          <span className="dark:text-gray-300 font-medium">
                            KSh {order.totalAmount?.toLocaleString() || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-750 p-3 rounded-md">
                      <div className="flex items-center gap-2 mb-2 text-gray-700 dark:text-gray-300 font-medium">
                        <FaShoppingBag className="text-blue-600" />
                        <span>Order Details</span>
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 space-y-1">
                        <div className="flex justify-between">
                          <span>Order Date:</span>
                          <span className="dark:text-gray-300">{formatDate(order.createdAt)}</span>
                        </div>
                        {order.shippingDate && (
                          <div className="flex justify-between">
                            <span>Shipping Date:</span>
                            <span className="dark:text-gray-300">{formatDate(order.shippingDate)}</span>
                          </div>
                        )}
                        {order.deliveryDate && (
                          <div className="flex justify-between">
                            <span>Delivery Date:</span>
                            <span className="dark:text-gray-300">{formatDate(order.deliveryDate)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-750 p-3 rounded-md">
                      <div className="flex items-center gap-2 mb-2 text-gray-700 dark:text-gray-300 font-medium">
                        {order.fulfillment_type === 'delivery' ? (
                          <><FaMapMarkerAlt className="text-red-600" /><span>Delivery Information</span></>
                        ) : (
                          <><FaStore className="text-purple-600" /><span>Pickup Information</span></>
                        )}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 space-y-1">
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <span className="capitalize dark:text-gray-300">{order.status || 'Processing'}</span>
                        </div>
                        
                        {order.fulfillment_type === 'delivery' && order.deliveryAddress && (
                          <div className="dark:text-gray-300 mt-1 leading-snug">
                            {order.deliveryAddress}
                          </div>
                        )}
                        
                        {order.fulfillment_type === 'pickup' && order.pickup_location && (
                          <div className="dark:text-gray-300 mt-1 leading-snug">
                            Pickup Location: {order.pickup_location}
                          </div>
                        )}
                        
                        {order.fulfillment_type === 'pickup' && order.pickupVerificationCode && (
                          <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Verification Code:</span>
                              <span className="font-mono font-bold text-primary-100">
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
  )
}

export default MyOrders
