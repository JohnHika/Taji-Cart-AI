import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
    FaCalendarAlt,
    FaChartBar,
    FaCheckCircle,
    FaExclamationTriangle,
    FaFileInvoiceDollar,
    FaInfoCircle,
    FaMapMarkerAlt,
    FaSearch,
    FaShoppingBag,
    FaSpinner,
    FaTimes,
    FaTruck,
    FaUserAlt
} from 'react-icons/fa';
import Axios from '../../utils/Axios';

// Simple date formatter function as fallback if date-fns is not available
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString();
};

// Try to import date-fns, but provide fallback if not available
let format;
try {
  const dateFns = require('date-fns');
  format = dateFns.format;
} catch (error) {
  console.warn('date-fns not available, using fallback formatter');
  format = formatDate;
}

const OrderDetailModal = ({ order, onClose, onStatusChange }) => {
  if (!order) return null;
  
  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    onStatusChange(order._id, newStatus);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
          <h2 className="text-xl font-bold dark:text-white">
            Order Details: {order.orderId || order._id.substring(order._id.length - 8)}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
          >
            <FaTimes size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Order Status Banner */}
          <div className={`p-3 rounded-md mb-4 flex items-center justify-between ${
            order.status === 'delivered' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
            order.status === 'cancelled' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
            order.status === 'shipping' || order.status === 'shipped' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
            order.status === 'out_for_delivery' || order.status === 'driver_assigned' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300' :
            'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
          }`}>
            <div className="flex items-center">
              {order.status === 'delivered' ? <FaCheckCircle className="mr-2" /> :
               order.status === 'cancelled' ? <FaExclamationTriangle className="mr-2" /> :
               order.status === 'shipping' || order.status === 'shipped' ? <FaTruck className="mr-2" /> :
               order.status === 'out_for_delivery' || order.status === 'driver_assigned' ? <FaMapMarkerAlt className="mr-2" /> :
               <FaInfoCircle className="mr-2" />
              }
              <div>
                <p className="font-medium">Status: {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}</p>
                {order.statusHistory && order.statusHistory.length > 0 && (
                  <p className="text-sm mt-1">Last updated: {
                    typeof format === 'function'
                      ? format(new Date(order.statusHistory[order.statusHistory.length - 1].timestamp), 'PPP p')
                      : formatDate(order.statusHistory[order.statusHistory.length - 1].timestamp)
                  }</p>
                )}
              </div>
            </div>
            
            {order.status !== 'delivered' && order.status !== 'cancelled' && (
              <select
                className="border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={order.status}
                onChange={handleStatusChange}
              >
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="driver_assigned">Driver Assigned</option>
                <option value="out_for_delivery">Out For Delivery</option>
                <option value="nearby">Nearby</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            )}
          </div>
          
          {/* Order Status and Payment */}
          <div className="flex flex-wrap justify-between gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg flex-1 min-w-[250px]">
              <h3 className="font-medium mb-3 dark:text-white">Order Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Order ID:</span>
                  <span className="font-medium dark:text-white">{order.orderId || order._id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Date Ordered:</span>
                  <span className="dark:text-white">{order.createdAt && (
                    typeof format === 'function' ? 
                      format(new Date(order.createdAt), 'PPP p') : 
                      formatDate(order.createdAt)
                  )}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Last Updated:</span>
                  <span className="dark:text-white">{order.updatedAt && (
                    typeof format === 'function' ? 
                      format(new Date(order.updatedAt), 'PPP p') : 
                      formatDate(order.updatedAt)
                  )}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg flex-1 min-w-[250px]">
              <h3 className="font-medium mb-3 dark:text-white">Payment Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Payment Status:</span>
                  <span className="font-medium dark:text-white">{order.payment_status || 'Not Available'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Payment Method:</span>
                  <span className="dark:text-white">{order.paymentMethod || 'Not Available'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Payment ID:</span>
                  <span className="dark:text-white">{order.paymentId || 'Not Available'}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Customer Information */}
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="font-medium mb-3 dark:text-white">Customer Information</h3>
            <div className="flex flex-wrap gap-6">
              <div className="flex-1 min-w-[250px]">
                <div className="text-sm space-y-2">
                  <div>
                    <span className="text-gray-600 dark:text-gray-300">Name:</span>
                    <span className="ml-2 font-medium dark:text-white">{order.userId?.name || 'Not Available'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-300">Email:</span>
                    <span className="ml-2 dark:text-white">{order.userId?.email || 'Not Available'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-300">Phone:</span>
                    <span className="ml-2 dark:text-white">{order.userId?.mobile || order.delivery_address?.phoneNumber || 'Not Available'}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 min-w-[250px]">
                <h4 className="text-sm font-medium mb-1 dark:text-white">Shipping Address</h4>
                <div className="text-sm dark:text-gray-300">
                  {order.shippingAddress ? (
                    <div>
                      <p>{order.shippingAddress.address}</p>
                      <p>
                        {[
                          order.shippingAddress.city,
                          order.shippingAddress.state,
                          order.shippingAddress.zipCode
                        ].filter(Boolean).join(', ')}
                      </p>
                      <p>{order.shippingAddress.country}</p>
                    </div>
                  ) : order.delivery_address ? (
                    <div>
                      <p>{order.delivery_address.address}</p>
                      <p>
                        {[
                          order.delivery_address.city,
                          order.delivery_address.state,
                          order.delivery_address.zipCode
                        ].filter(Boolean).join(', ')}
                      </p>
                      <p>{order.delivery_address.country}</p>
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">No shipping address available</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Tracking Information - Only show if applicable */}
          {(order.deliveryPersonnel || order.currentLocation || 
            order.status === 'driver_assigned' || 
            order.status === 'out_for_delivery' || 
            order.status === 'nearby') && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg">
              <h3 className="font-medium mb-3 text-indigo-900 dark:text-indigo-300">Delivery Tracking</h3>
              <div className="flex flex-wrap gap-6">
                {order.deliveryPersonnel && (
                  <div className="flex-1 min-w-[250px]">
                    <h4 className="text-sm font-medium mb-1 text-indigo-800 dark:text-indigo-300">Delivery Personnel</h4>
                    <div className="text-sm text-indigo-700 dark:text-indigo-300 space-y-1">
                      <div>
                        <span>Name: </span>
                        <span className="font-medium">{order.deliveryPersonnel.name || 'Not Assigned'}</span>
                      </div>
                      {order.deliveryPersonnel.phoneNumber && (
                        <div>
                          <span>Phone: </span>
                          <span>{order.deliveryPersonnel.phoneNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {order.estimatedDeliveryTime && (
                  <div className="flex-1 min-w-[250px]">
                    <h4 className="text-sm font-medium mb-1 text-indigo-800 dark:text-indigo-300">Estimated Delivery</h4>
                    <div className="text-sm text-indigo-700 dark:text-indigo-300">
                      {typeof format === 'function' 
                        ? format(new Date(order.estimatedDeliveryTime), 'PPP p')
                        : formatDate(order.estimatedDeliveryTime)
                      }
                    </div>
                  </div>
                )}

                {order.currentLocation && (
                  <div className="flex-1 min-w-[250px]">
                    <h4 className="text-sm font-medium mb-1 text-indigo-800 dark:text-indigo-300">Current Location</h4>
                    <div className="text-sm text-indigo-700 dark:text-indigo-300">
                      <div>
                        <span>Last updated: </span>
                        <span>
                          {order.currentLocation.lastUpdated && (
                            typeof format === 'function'
                              ? format(new Date(order.currentLocation.lastUpdated), 'PPP p')
                              : formatDate(order.currentLocation.lastUpdated)
                          )}
                        </span>
                      </div>
                      <button className="mt-1 text-indigo-600 dark:text-indigo-400 hover:underline">
                        View on map
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Order Items */}
          <div>
            <h3 className="font-medium mb-3 dark:text-white">Order Items</h3>
            <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quantity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-700 divide-y divide-gray-200 dark:divide-gray-600">
                  {order.product_details ? (
                    <tr>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          {order.product_details.image && (
                            <img 
                              src={order.product_details.image[0]} 
                              alt={order.product_details.name} 
                              className="h-12 w-12 object-cover rounded mr-3"
                            />
                          )}
                          <div>
                            <div className="font-medium dark:text-white">{order.product_details.name || 'Product'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap dark:text-gray-300">
                        KSh {Number(order.totalAmt / (order.quantity || 1)).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap dark:text-gray-300">
                        {order.quantity || 1}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium dark:text-white">
                        KSh {Number(order.totalAmt).toLocaleString()}
                      </td>
                    </tr>
                  ) : order.products && order.products.length > 0 ? (
                    order.products.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            {item.product?.image && (
                              <img 
                                src={item.product.image} 
                                alt={item.product?.title} 
                                className="h-12 w-12 object-cover rounded mr-3"
                              />
                            )}
                            <div>
                              <div className="font-medium dark:text-white">{item.product?.title || 'Product'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap dark:text-gray-300">
                          KSh {Number(item.price / item.quantity).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap dark:text-gray-300">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-medium dark:text-white">
                          KSh {Number(item.price).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">
                        No product details available
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <td colSpan="3" className="px-4 py-2 text-right text-sm dark:text-gray-300">Subtotal:</td>
                    <td className="px-4 py-2 font-medium dark:text-white">
                      KSh {Number(order.subTotalAmt || order.subTotal || 0).toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan="3" className="px-4 py-2 text-right text-sm dark:text-gray-300">Shipping:</td>
                    <td className="px-4 py-2 font-medium dark:text-white">
                      KSh {Number(order.shippingPrice || 0).toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan="3" className="px-4 py-2 text-right font-medium dark:text-white">Total:</td>
                    <td className="px-4 py-2 font-bold dark:text-white">
                      KSh {Number(order.totalAmt || order.totalPrice || 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          
          {/* Status History */}
          {order.statusHistory && order.statusHistory.length > 0 && (
            <div>
              <h3 className="font-medium mb-3 dark:text-white">Status History</h3>
              <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Timestamp</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Note</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-700 divide-y divide-gray-200 dark:divide-gray-600">
                    {order.statusHistory.map((status, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 dark:text-white">
                          {status.status.charAt(0).toUpperCase() + status.status.slice(1).replace('_', ' ')}
                        </td>
                        <td className="px-4 py-3 dark:text-gray-300">
                          {typeof format === 'function'
                            ? format(new Date(status.timestamp), 'PPP p')
                            : formatDate(status.timestamp)
                          }
                        </td>
                        <td className="px-4 py-3 dark:text-gray-300">{status.note || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        
        <div className="border-t dark:border-gray-700 p-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Statistics component for the dashboard
const OrderStatistics = ({ orders }) => {
  // Calculate order statistics
  const total = orders.length;
  const pending = orders.filter(order => order.status === 'pending').length;
  const processing = orders.filter(order => order.status === 'processing').length;
  const shipped = orders.filter(order => order.status === 'shipped').length;
  const inTransit = orders.filter(order => 
    order.status === 'driver_assigned' || 
    order.status === 'out_for_delivery' || 
    order.status === 'nearby'
  ).length;
  const delivered = orders.filter(order => order.status === 'delivered').length;
  const cancelled = orders.filter(order => order.status === 'cancelled').length;
  
  // Calculate total revenue
  const totalRevenue = orders.reduce((sum, order) => {
    const amount = Number(order.totalAmt || order.totalPrice || 0);
    return sum + (order.status !== 'cancelled' ? amount : 0);
  }, 0);
  
  const statItems = [
    { label: 'Total Orders', value: total, color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white' },
    { label: 'Pending', value: pending, color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' },
    { label: 'Processing', value: processing, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' },
    { label: 'Shipped', value: shipped, color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300' },
    { label: 'In Transit', value: inTransit, color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' },
    { label: 'Delivered', value: delivered, color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' },
    { label: 'Cancelled', value: cancelled, color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' },
  ];
  
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-4 dark:text-white flex items-center">
        <FaChartBar className="mr-2" /> Order Statistics
      </h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {statItems.map((item, index) => (
          <div key={index} className={`${item.color} rounded-lg p-4 shadow-sm`}>
            <div className="text-3xl font-bold">{item.value}</div>
            <div className="text-sm">{item.label}</div>
          </div>
        ))}
        <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 rounded-lg p-4 shadow-sm">
          <div className="text-3xl font-bold">KSh {totalRevenue.toLocaleString()}</div>
          <div className="text-sm">Total Revenue</div>
        </div>
      </div>
    </div>
  );
};

const AllOrdersAdmin = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [showStatistics, setShowStatistics] = useState(true);
  
  // Add pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage, setOrdersPerPage] = useState(10);
  
  // Add new state for fulfillment filtering
  const [fulfillmentFilter, setFulfillmentFilter] = useState('all');
  
  useEffect(() => {
    fetchAllOrders();
  }, []);
  
  const fetchAllOrders = async () => {
    try {
      setLoading(true);
      const response = await Axios({
        url: '/api/order/admin/all',
        method: 'GET'
      });
      
      if (response.data.success) {
        setOrders(response.data.data || []);
      } else {
        toast.error('Failed to load orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };
  
  const updateOrderStatus = async (orderId, status) => {
    try {
      const response = await Axios({
        url: `/api/order/status/${orderId}`,
        method: 'PUT',
        data: { status }
      });
      
      if (response.data.success) {
        toast.success('Order status updated successfully');
        
        // Update orders in state
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order._id === orderId ? { ...order, status } : order
          )
        );
        
        // If viewing a specific order, update it too
        if (selectedOrder && selectedOrder._id === orderId) {
          setSelectedOrder({ ...selectedOrder, status });
        }
      } else {
        toast.error(response.data.message || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };
  
  const getStatusColor = (status) => {
    if (!status) {
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'; // Default color for unknown status
    }
    
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'shipped':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
      case 'driver_assigned':
      case 'out_for_delivery':
      case 'nearby':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };
  
  // Filter orders based on tab and search term
  const getFilteredOrders = () => {
    return orders.filter(order => {
      // First filter by tab/status
      const statusMatch = 
        activeTab === 'all' ? true :
        activeTab === 'in-transit' ? 
          ['driver_assigned', 'out_for_delivery', 'nearby'].includes(order.status) :
        order.status === activeTab;
      
      // Then filter by search term if provided
      const searchMatch = 
        !searchTerm ? true : (
        // Check all relevant fields for matches, including userId name and email
        (order.userId?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (order.userId?.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (order.orderId?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (order._id?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (order.payment_status?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (order.paymentMethod?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      );
      
      return statusMatch && searchMatch;
    });
  };
  
  const filteredOrders = getFilteredOrders();
  
  // Add pagination calculation
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
  
  // Add pagination control functions
  const goToPage = (pageNumber) => {
    setCurrentPage(Math.max(1, Math.min(pageNumber, totalPages)));
  };
  
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  // Format status text for display
  const formatStatus = (status) => {
    if (!status) return 'Unknown'; // Handle undefined/null status values
    return status.charAt(0).toUpperCase() + 
           status.slice(1).replace(/_/g, ' ');
  };

  // Tab configuration
  const tabs = [
    { id: 'all', label: 'All Orders', icon: <FaShoppingBag className="mr-1" /> },
    { id: 'pending', label: 'Pending', icon: <FaExclamationTriangle className="mr-1" /> },
    { id: 'processing', label: 'Processing', icon: <FaSpinner className="mr-1" /> },
    { id: 'shipped', label: 'Shipped', icon: <FaTruck className="mr-1" /> },
    { id: 'in-transit', label: 'In Transit', icon: <FaMapMarkerAlt className="mr-1" /> },
    { id: 'delivered', label: 'Delivered', icon: <FaCheckCircle className="mr-1" /> },
    { id: 'cancelled', label: 'Cancelled', icon: <FaTimes className="mr-1" /> }
  ];

  // Now create the Pagination component
  const Pagination = () => {
    if (totalPages <= 1) return null;
    
    // Calculate page numbers to show
    let pageNumbers = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      // If few pages, show all
      pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      // Always include first page, last page, current page, and pages around current
      const leftBound = Math.max(1, currentPage - 1);
      const rightBound = Math.min(totalPages, currentPage + 1);
      
      // Add page numbers with ellipsis
      if (leftBound > 1) {
        pageNumbers.push(1);
        if (leftBound > 2) pageNumbers.push('...');
      }
      
      // Add page numbers around current page
      for (let i = leftBound; i <= rightBound; i++) {
        pageNumbers.push(i);
      }
      
      // Add last page with ellipsis
      if (rightBound < totalPages) {
        if (rightBound < totalPages - 1) pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }
    
    return (
      <div className="flex items-center justify-between py-4">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={prevPage}
            disabled={currentPage === 1}
            className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md
              ${currentPage === 1 
                ? 'text-gray-400 bg-gray-100 dark:text-gray-500 dark:bg-gray-800 cursor-not-allowed' 
                : 'text-gray-700 bg-white hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'}`}
          >
            Previous
          </button>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={nextPage}
            disabled={currentPage === totalPages}
            className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md
              ${currentPage === totalPages 
                ? 'text-gray-400 bg-gray-100 dark:text-gray-500 dark:bg-gray-800 cursor-not-allowed' 
                : 'text-gray-700 bg-white hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'}`}
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Showing <span className="font-medium">{indexOfFirstOrder + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(indexOfLastOrder, filteredOrders.length)}
              </span>{' '}
              of <span className="font-medium">{filteredOrders.length}</span> results
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={prevPage}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-2 py-2 rounded-l-md border text-sm font-medium
                  ${currentPage === 1 
                    ? 'text-gray-400 bg-gray-100 dark:text-gray-500 dark:bg-gray-800 dark:border-gray-700 cursor-not-allowed' 
                    : 'text-gray-500 bg-white hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600'}`}
              >
                <span className="sr-only">Previous</span>
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              
              {pageNumbers.map((page, index) => (
                page === '...' ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="relative inline-flex items-center px-4 py-2 border text-sm font-medium text-gray-700 bg-white dark:text-gray-300 dark:bg-gray-700 dark:border-gray-600"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium
                      ${currentPage === page 
                        ? 'z-10 bg-primary-200 border-primary-200 text-white dark:bg-primary-300 dark:border-primary-300 dark:text-gray-900' 
                        : 'bg-white text-gray-500 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'}`}
                  >
                    {page}
                  </button>
                )
              ))}
              
              <button
                onClick={nextPage}
                disabled={currentPage === totalPages}
                className={`relative inline-flex items-center px-2 py-2 rounded-r-md border text-sm font-medium
                  ${currentPage === totalPages 
                    ? 'text-gray-400 bg-gray-100 dark:text-gray-500 dark:bg-gray-800 dark:border-gray-700 cursor-not-allowed' 
                    : 'text-gray-500 bg-white hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600'}`}
              >
                <span className="sr-only">Next</span>
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4 dark:bg-gray-900">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Order Management Dashboard</h1>
        <button 
          onClick={() => setShowStatistics(!showStatistics)}
          className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-sm hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center"
        >
          <FaChartBar className="mr-1" />
          {showStatistics ? 'Hide Statistics' : 'Show Statistics'}
        </button>
      </div>
      
      {/* Statistics Section */}
      {showStatistics && <OrderStatistics orders={orders} />}
      
      {/* Tabs Navigation */}
      <div className="flex flex-wrap border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-2 px-4 text-sm font-medium flex items-center whitespace-nowrap ${
              activeTab === tab.id
              ? 'text-primary-200 dark:text-primary-300 border-b-2 border-primary-200 dark:border-primary-300'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.icon}
            {tab.label}
            <span className="ml-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full px-2 py-0.5">
              {tab.id === 'all' 
               ? orders.length 
               : tab.id === 'in-transit'
                 ? orders.filter(o => ['driver_assigned', 'out_for_delivery', 'nearby'].includes(o.status)).length
                 : orders.filter(o => o.status === tab.id).length
              }
            </span>
          </button>
        ))}
      </div>
      
      {/* Search and Filters Row */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Search by name, email, order ID, payment method..."
            className="pl-10 pr-4 py-2 border dark:border-gray-600 rounded-lg w-full dark:bg-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          
          {searchTerm && (
            <button
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400"
              onClick={() => setSearchTerm('')}
            >
              <FaTimes />
            </button>
          )}
        </div>
        
        <div className="flex-shrink-0 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <label htmlFor="perPage" className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
              Show:
            </label>
            <select
              id="perPage"
              className="border text-sm rounded-lg dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              value={ordersPerPage}
              onChange={(e) => {
                setOrdersPerPage(Number(e.target.value));
                setCurrentPage(1); // Reset to first page when changing items per page
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Orders Table */}
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <FaSpinner className="animate-spin text-primary-300 text-3xl" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <FaShoppingBag className="mx-auto text-gray-400 dark:text-gray-600 text-4xl mb-2" />
          <p className="text-gray-500 dark:text-gray-400">No orders found</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {searchTerm ? 'Try adjusting your search' : 'There are no orders in this category yet'}
          </p>
        </div>
      ) : (
        <>
          <div className="w-full overflow-x-auto lg:overflow-visible">
            <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm table-auto">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="text-left py-3 px-2 md:px-4 uppercase font-semibold text-xs md:text-sm dark:text-gray-300 whitespace-nowrap">ID</th>
                  <th className="text-left py-3 px-2 md:px-4 uppercase font-semibold text-xs md:text-sm dark:text-gray-300">Customer</th>
                  <th className="text-left py-3 px-2 md:px-4 uppercase font-semibold text-xs md:text-sm dark:text-gray-300 hidden md:table-cell">Date</th>
                  <th className="text-left py-3 px-2 md:px-4 uppercase font-semibold text-xs md:text-sm dark:text-gray-300 hidden md:table-cell">Payment</th>
                  <th className="text-left py-3 px-2 md:px-4 uppercase font-semibold text-xs md:text-sm dark:text-gray-300">Amount</th>
                  <th className="text-left py-3 px-2 md:px-4 uppercase font-semibold text-xs md:text-sm dark:text-gray-300">Status</th>
                  <th className="text-left py-3 px-2 md:px-4 uppercase font-semibold text-xs md:text-sm dark:text-gray-300">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {currentOrders.map(order => (
                  <tr 
                    key={order._id} 
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
                  >
                    <td className="py-3 px-2 md:px-4 dark:text-white whitespace-nowrap text-xs md:text-sm group-hover:text-gray-900 dark:group-hover:text-white">
                      <div className="flex items-center gap-1">
                        <FaFileInvoiceDollar className="text-primary-200 dark:text-primary-300" />
                        <span className="truncate max-w-[60px] md:max-w-[100px]">{order.orderId || order._id.substring(order._id.length - 8)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 md:px-4 text-xs md:text-sm">
                      <div className="flex items-center gap-1">
                        <FaUserAlt className="text-gray-500 dark:text-gray-400" />
                        <div>
                          <div className="font-medium dark:text-white truncate max-w-[80px] md:max-w-[150px]">
                            {order.userId?.name || 'Unknown User'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[80px] md:max-w-[150px]">
                            {order.userId?.email || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 md:px-4 dark:text-gray-300 hidden md:table-cell text-xs md:text-sm">
                      <div className="flex items-center gap-1">
                        <FaCalendarAlt className="text-gray-500 dark:text-gray-400" />
                        <span>
                          {order.createdAt && (
                            typeof format === 'function' ? 
                              format(new Date(order.createdAt), 'P') : 
                              formatDate(order.createdAt).split(',')[0]
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-2 md:px-4 hidden md:table-cell text-xs md:text-sm">
                      <div className="flex flex-col">
                        <span className={`text-sm dark:text-gray-300 ${
                          order.payment_status === 'paid' ? 'text-green-600 dark:text-green-400' :
                          order.payment_status === 'pending' ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-gray-600 dark:text-gray-400'
                        }`}>
                          {order.payment_status || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-2 md:px-4 font-medium dark:text-white text-xs md:text-sm whitespace-nowrap">
                      KSh {Number(order.totalAmt || order.totalPrice || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-2 md:px-4 text-xs md:text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {formatStatus(order.status)}
                      </span>
                    </td>
                    <td className="py-3 px-2 md:px-4 text-xs md:text-sm">
                      <div className="flex flex-col md:flex-row gap-2">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="px-2 py-1 bg-primary-200 dark:bg-primary-300 text-white dark:text-gray-900 rounded-lg text-xs hover:bg-primary-100 dark:hover:bg-primary-200"
                        >
                          Details
                        </button>
                        {order.status !== 'delivered' && order.status !== 'cancelled' && (
                          <select
                            className="border dark:border-gray-600 p-1 rounded text-xs dark:bg-gray-700 dark:text-gray-300 w-full md:w-auto"
                            value={order.status || ''}
                            onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                          >
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="driver_assigned">Driver</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Add the Pagination component */}
          <Pagination />
        </>
      )}
      
      {selectedOrder && (
        <OrderDetailModal 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)}
          onStatusChange={updateOrderStatus} 
        />
      )}
    </div>
  );
};

export default AllOrdersAdmin;