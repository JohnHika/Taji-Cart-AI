import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FaChartBar,
  FaCheckCircle,
  FaExclamationTriangle,
  FaFileInvoiceDollar,
  FaInfoCircle,
  FaMapMarkerAlt,
  FaMotorcycle,
  FaPaperPlane,
  FaSearch,
  FaSpinner,
  FaStore,
  FaThLarge,
  FaThList,
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
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [dispatchingOrder, setDispatchingOrder] = useState(false);
  
  // Fetch available drivers when the order is in shipped status
  useEffect(() => {
    if (order && order.status === 'shipped') {
      fetchAvailableDrivers();
    }
  }, [order]);
  
  const fetchAvailableDrivers = async () => {
    try {
      setLoadingDrivers(true);
      const response = await Axios({
        url: '/api/delivery/available-drivers',
        method: 'GET'
      });
      
      if (response.data.success) {
        setAvailableDrivers(response.data.data || []);
      } else {
        toast.error('Failed to load available drivers');
      }
    } catch (error) {
      console.error('Error fetching available drivers:', error);
      toast.error('Failed to load available drivers');
    } finally {
      setLoadingDrivers(false);
    }
  };
  
  const handleDispatchOrder = async () => {
    try {
      setDispatchingOrder(true);
      const response = await Axios({
        url: `/api/delivery/dispatch/${order._id}`,
        method: 'POST',
        data: selectedDriver ? { driverId: selectedDriver } : {}
      });
      
      if (response.data.success) {
        toast.success('Order dispatched successfully');
        onStatusChange(order._id, 'driver_assigned');
      } else {
        toast.error(response.data.message || 'Failed to dispatch order');
      }
    } catch (error) {
      console.error('Error dispatching order:', error);
      toast.error('Failed to dispatch order');
    } finally {
      setDispatchingOrder(false);
    }
  };
  
  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    onStatusChange(order._id, newStatus);
  };

  if (!order) return null;

  // Determine if order is ready for dispatch (shipped status)
  const isReadyForDispatch = order.status === 'shipped';
  
  // Determine if order is in delivery process
  const isInDeliveryProcess = ['driver_assigned', 'out_for_delivery', 'nearby'].includes(order.status);

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
          
          {/* Dispatch Order Section - Only show for orders ready for dispatch */}
          {isReadyForDispatch && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h3 className="font-medium mb-3 text-blue-900 dark:text-blue-300 flex items-center">
                <FaPaperPlane className="mr-2" /> Dispatch Order
              </h3>
              <div className="space-y-3">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  This order is ready to be dispatched. Assign a delivery driver or dispatch automatically.
                </p>
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex-grow min-w-[200px]">
                    <label className="block text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
                      Select Driver (Optional)
                    </label>
                    {loadingDrivers ? (
                      <div className="flex items-center text-blue-800 dark:text-blue-300">
                        <FaSpinner className="animate-spin mr-2" /> Loading available drivers...
                      </div>
                    ) : (
                      <select
                        className="w-full border border-blue-300 dark:border-blue-700 rounded-md p-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                        value={selectedDriver}
                        onChange={(e) => setSelectedDriver(e.target.value)}
                      >
                        <option value="">Auto-assign driver</option>
                        {availableDrivers.map(driver => (
                          <option key={driver._id} value={driver._id}>
                            {driver.name} {driver.isOnline ? '(Online)' : '(Offline)'}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <button
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center disabled:opacity-50"
                    onClick={handleDispatchOrder}
                    disabled={dispatchingOrder}
                  >
                    {dispatchingOrder ? <FaSpinner className="animate-spin mr-2" /> : <FaTruck className="mr-2" />}
                    {dispatchingOrder ? 'Dispatching...' : 'Dispatch Order'} 
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Order Status and Payment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border dark:border-gray-700 p-4 rounded-lg">
              <h3 className="font-medium mb-3 flex items-center">
                <FaChartBar className="mr-2 text-gray-600 dark:text-gray-400" /> Order Status History
              </h3>
              {order.statusHistory && order.statusHistory.length > 0 ? (
                <ul className="space-y-2">
                  {[...order.statusHistory].reverse().map((status, idx) => (
                    <li key={idx} className="flex items-start">
                      <div className="mt-1">
                        <span className={`w-3 h-3 rounded-full inline-block ${
                          status.status === 'delivered' ? 'bg-green-500' :
                          status.status === 'cancelled' ? 'bg-red-500' :
                          status.status === 'shipped' || status.status === 'shipping' ? 'bg-blue-500' :
                          status.status === 'out_for_delivery' || status.status === 'driver_assigned' ? 'bg-indigo-500' :
                          'bg-yellow-500'
                        }`}></span>
                      </div>
                      <div className="ml-3">
                        <p className="font-medium">
                          {status.status.charAt(0).toUpperCase() + status.status.slice(1).replace('_', ' ')}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {typeof format === 'function'
                            ? format(new Date(status.timestamp), 'PPP p')
                            : formatDate(status.timestamp)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                  <span className="w-3 h-3 rounded-full inline-block bg-yellow-500"></span>
                  <p className="font-medium">{order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}</p>
                  <p className="text-sm">
                    {typeof format === 'function'
                      ? format(new Date(order.createdAt), 'PPP p')
                      : formatDate(order.createdAt)}
                  </p>
                </div>
              )}
            </div>
            
            <div className="border dark:border-gray-700 p-4 rounded-lg">
              <h3 className="font-medium mb-3 flex items-center">
                <FaFileInvoiceDollar className="mr-2 text-gray-600 dark:text-gray-400" /> Payment Details
              </h3>
              <div className="space-y-2">
                <p>
                  <span className="text-gray-600 dark:text-gray-400">Payment Method:</span>{" "}
                  <span className="font-medium dark:text-white">
                    {order.paymentMethod || (order.payment_status === 'paid' ? 'Online Payment' : 'Cash on Delivery')}
                  </span>
                </p>
                <p>
                  <span className="text-gray-600 dark:text-gray-400">Payment Status:</span>{" "}
                  <span className={`font-medium ${
                    order.paymentStatus === 'paid' || order.payment_status === 'paid' 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {(order.paymentStatus || order.payment_status || 'pending').toUpperCase()}
                  </span>
                </p>
                {order.paymentDetails && order.paymentDetails.transactionId && (
                  <p>
                    <span className="text-gray-600 dark:text-gray-400">Transaction ID:</span>{" "}
                    <span className="font-medium dark:text-white">{order.paymentDetails.transactionId}</span>
                  </p>
                )}
                {order.paymentDetails && order.paymentDetails.paymentDate ? (
                  <p>
                    <span className="text-gray-600 dark:text-gray-400">Payment Date:</span>{" "}
                    <span className="font-medium dark:text-white">
                      {typeof format === 'function'
                        ? format(new Date(order.paymentDetails.paymentDate), 'PPP')
                        : formatDate(order.paymentDetails.paymentDate)}
                    </span>
                  </p>
                ) : order.paymentStatus === 'paid' || order.payment_status === 'paid' ? (
                  <p>
                    <span className="text-gray-600 dark:text-gray-400">Payment Date:</span>{" "}
                    <span className="font-medium dark:text-white">
                      {typeof format === 'function'
                        ? format(new Date(order.updatedAt || order.createdAt), 'PPP')
                        : formatDate(order.updatedAt || order.createdAt)}
                    </span>
                  </p>
                ) : null}
                <p>
                  <span className="text-gray-600 dark:text-gray-400">Total Amount:</span>{" "}
                  <span className="font-medium dark:text-white">
                    KSh {Number(order.totalAmt || order.totalPrice || 0).toLocaleString()}
                  </span>
                </p>
              </div>
            </div>
          </div>
          
          {/* Delivery Tracking Section - Enhanced with driver info */}
          {isInDeliveryProcess && (
            <div className="border dark:border-gray-700 p-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
              <h3 className="font-medium mb-3 flex items-center text-indigo-900 dark:text-indigo-300">
                <FaMapMarkerAlt className="mr-2" /> Delivery Tracking
              </h3>
              
              {order.deliveryDetails ? (
                <div className="space-y-4">
                  {/* Driver Information */}
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-md border border-indigo-200 dark:border-indigo-800">
                    <h4 className="font-medium flex items-center mb-2">
                      <FaUserAlt className="mr-2 text-indigo-600 dark:text-indigo-400" /> Driver Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <p><span className="text-gray-600 dark:text-gray-400">Name:</span> {order.deliveryDetails.driver?.name || 'Not assigned yet'}</p>
                      <p><span className="text-gray-600 dark:text-gray-400">Phone:</span> {order.deliveryDetails.driver?.phone || 'N/A'}</p>
                      <p><span className="text-gray-600 dark:text-gray-400">Vehicle:</span> {order.deliveryDetails.driver?.vehicleType || 'N/A'}</p>
                      <p><span className="text-gray-600 dark:text-gray-400">License:</span> {order.deliveryDetails.driver?.licenseNumber || 'N/A'}</p>
                    </div>
                  </div>
                  
                  {/* Location Information */}
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-md border border-indigo-200 dark:border-indigo-800">
                    <h4 className="font-medium flex items-center mb-2">
                      <FaMotorcycle className="mr-2 text-indigo-600 dark:text-indigo-400" /> Delivery Status
                    </h4>
                    <div className="space-y-2">
                      <p>
                        <span className="text-gray-600 dark:text-gray-400">Current Status:</span> 
                        <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-800 dark:text-indigo-200">
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}
                        </span>
                      </p>
                      
                      {order.deliveryDetails.estimatedDeliveryTime && (
                        <p>
                          <span className="text-gray-600 dark:text-gray-400">Estimated Delivery:</span> 
                          {typeof format === 'function'
                            ? format(new Date(order.deliveryDetails.estimatedDeliveryTime), 'PPP p')
                            : formatDate(order.deliveryDetails.estimatedDeliveryTime)}
                        </p>
                      )}
                      
                      {order.deliveryDetails.currentLocation && (
                        <div>
                          <p className="text-gray-600 dark:text-gray-400 mb-1">Current Location:</p>
                          <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-md">
                            {order.deliveryDetails.currentLocation.address || 
                             `${order.deliveryDetails.currentLocation.coordinates[1]}, ${order.deliveryDetails.currentLocation.coordinates[0]}`}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Driver Notes */}
                  {order.deliveryDetails.notes && (
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-md border border-indigo-200 dark:border-indigo-800">
                      <h4 className="font-medium flex items-center mb-2">
                        <FaInfoCircle className="mr-2 text-indigo-600 dark:text-indigo-400" /> Delivery Notes
                      </h4>
                      <p className="text-gray-700 dark:text-gray-300">{order.deliveryDetails.notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">No delivery details available yet</p>
              )}
            </div>
          )}
          
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
                <h4 className="text-sm font-medium mb-2 dark:text-white flex items-center">
                  <FaMapMarkerAlt className="mr-2 text-gray-600 dark:text-gray-400" /> 
                  {order.fulfillment_type === 'pickup' ? 'Pickup Location' : 'Shipping Address'}
                </h4>
                <div className="text-sm dark:text-gray-300 bg-white dark:bg-gray-750 p-3 rounded-md">
                  {order.fulfillment_type === 'pickup' ? (
                    <div>
                      <p className="font-medium">{order.pickup_location}</p>
                      {order.pickup_instructions && (
                        <div className="mt-2 text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
                          <span className="font-medium">Instructions:</span> {order.pickup_instructions}
                        </div>
                      )}
                    </div>
                  ) : order.shippingAddress ? (
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
                  ) : order.deliveryAddress ? (
                    <p>{order.deliveryAddress}</p>
                  ) : (
                    <p className="italic text-gray-500 dark:text-gray-400">
                      {order.status === 'cancelled' ? 'Order was cancelled' : 'Address to be confirmed'}
                    </p>
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
  
  // Calculate fulfillment type statistics with pending vs completed breakdown
  // Delivery orders (not yet delivered)
  const pendingDeliveryOrders = orders.filter(order => 
    (order.fulfillment_type === 'delivery' || order.deliveryMethod === 'delivery') &&
    order.status !== 'delivered' && 
    order.status !== 'cancelled'
  ).length;
  
  // Delivery orders that have been delivered
  const completedDeliveryOrders = orders.filter(order => 
    (order.fulfillment_type === 'delivery' || order.deliveryMethod === 'delivery') &&
    order.status === 'delivered'
  ).length;
  
  // Pickup orders (not yet picked up)
  const pendingPickupOrders = orders.filter(order => 
    (order.fulfillment_type === 'pickup' || order.deliveryMethod === 'store-pickup') &&
    order.status !== 'delivered' &&
    order.status !== 'picked_up' &&
    order.status !== 'cancelled'
  ).length;
  
  // Pickup orders that have been picked up
  const completedPickupOrders = orders.filter(order => 
    (order.fulfillment_type === 'pickup' || order.deliveryMethod === 'store-pickup') &&
    (order.status === 'delivered' || order.status === 'picked_up')
  ).length;
  
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
    { label: 'Pending Delivery', value: pendingDeliveryOrders, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300', icon: 'truck' },
    { label: 'Delivered Orders', value: completedDeliveryOrders, color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300', icon: 'truck-check' },
    { label: 'Pending Pickup', value: pendingPickupOrders, color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300', icon: 'store' },
    { label: 'Completed Pickup', value: completedPickupOrders, color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300', icon: 'store-check' },
  ];
  
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-4 dark:text-white flex items-center">
        <FaChartBar className="mr-2" /> Order Statistics
      </h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {statItems.map((item, index) => (
          <div key={index} className={`${item.color} rounded-lg p-4 shadow-sm`}>
            <div className="flex justify-between items-center mb-1">
              <div className="text-3xl font-bold">{item.value}</div>
              {item.icon === 'truck' && <FaTruck className="text-blue-600 dark:text-blue-400" size={20} />}
              {item.icon === 'truck-check' && (
                <div className="relative">
                  <FaTruck className="text-green-600 dark:text-green-400" size={20} />
                  <FaCheckCircle className="text-green-500 absolute -top-2 -right-2" size={12} />
                </div>
              )}
              {item.icon === 'store' && <FaStore className="text-purple-600 dark:text-purple-400" size={20} />}
              {item.icon === 'store-check' && (
                <div className="relative">
                  <FaStore className="text-green-600 dark:text-green-400" size={20} />
                  <FaCheckCircle className="text-green-500 absolute -top-2 -right-2" size={12} />
                </div>
              )}
            </div>
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
  
  // Add new state for view mode
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  
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
      
      // Then filter by fulfillment type if not "all"
      const fulfillmentMatch = 
        fulfillmentFilter === 'all' ? true :
        fulfillmentFilter === 'pickup' ? 
          (order.fulfillment_type === 'pickup' || order.deliveryMethod === 'store-pickup') :
        (order.fulfillment_type === 'delivery' || order.deliveryMethod === 'delivery');
      
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
      
      return statusMatch && searchMatch && fulfillmentMatch;
    });
  };
  
  // Get filtered orders and apply pagination
  const filteredOrders = getFilteredOrders();
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, ordersPerPage);
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
  
  const renderStatusBadge = (status) => {
    const statusColor = getStatusColor(status);
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
        {status ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ') : 'Unknown'}
      </span>
    );
  };

  // Helper function to determine fulfillment type (pickup or delivery)
  const getFulfillmentType = (order) => {
    if (order.fulfillment_type === 'pickup' || order.deliveryMethod === 'store-pickup') {
      return 'Pickup';
    } else {
      return 'Delivery';
    }
  };
  
  // Helper function to get style for fulfillment badges
  const getFulfillmentBadgeStyle = (type) => {
    if (type === 'Pickup') {
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
    } else {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    }
  };
  
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">Order Management</h1>
      
      {/* Statistics */}
      {showStatistics && (
        <>
          <OrderStatistics orders={orders} />
          <div className="mb-6 flex justify-end">
            <button 
              onClick={() => setShowStatistics(false)}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center text-sm"
            >
              <FaTimes className="mr-1" /> Hide Statistics
            </button>
          </div>
        </>
      )}
      
      {!showStatistics && (
        <div className="mb-6">
          <button 
            onClick={() => setShowStatistics(true)}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center"
          >
            <FaChartBar className="mr-1" /> Show Statistics
          </button>
        </div>
      )}
      
      {/* Order Filters, Search and View Toggle */}
      <div className="mb-6 flex flex-col gap-4">
        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            className={`px-3 py-1.5 text-sm font-medium rounded-full 
              ${activeTab === 'all' ? 
                'bg-blue-600 text-white' : 
                'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'}`}
            onClick={() => setActiveTab('all')}
          >
            All Orders
          </button>
          <button
            className={`px-3 py-1.5 text-sm font-medium rounded-full 
              ${activeTab === 'pending' ? 
                'bg-yellow-500 text-white' : 
                'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending
          </button>
          <button
            className={`px-3 py-1.5 text-sm font-medium rounded-full 
              ${activeTab === 'processing' ? 
                'bg-blue-500 text-white' : 
                'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'}`}
            onClick={() => setActiveTab('processing')}
          >
            Processing
          </button>
          <button
            className={`px-3 py-1.5 text-sm font-medium rounded-full 
              ${activeTab === 'shipped' ? 
                'bg-indigo-500 text-white' : 
                'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'}`}
            onClick={() => setActiveTab('shipped')}
          >
            Shipped
          </button>
          <button
            className={`px-3 py-1.5 text-sm font-medium rounded-full 
              ${activeTab === 'in-transit' ? 
                'bg-purple-500 text-white' : 
                'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'}`}
            onClick={() => setActiveTab('in-transit')}
          >
            In Transit
          </button>
          <button
            className={`px-3 py-1.5 text-sm font-medium rounded-full 
              ${activeTab === 'delivered' ? 
                'bg-green-500 text-white' : 
                'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'}`}
            onClick={() => setActiveTab('delivered')}
          >
            Delivered
          </button>
          <button
            className={`px-3 py-1.5 text-sm font-medium rounded-full 
              ${activeTab === 'cancelled' ? 
                'bg-red-500 text-white' : 
                'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'}`}
            onClick={() => setActiveTab('cancelled')}
          >
            Cancelled
          </button>
        </div>
        
        {/* Search and Controls Row */}
        <div className="flex flex-wrap items-center gap-2 justify-between">
          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md ${
                viewMode === 'table' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white'
              }`}
              aria-label="Table view"
            >
              <FaThList />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md ${
                viewMode === 'grid' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white'
              }`}
              aria-label="Grid view"
            >
              <FaThLarge />
            </button>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Fulfillment Filter Dropdown */}
            <div className="relative">
              <select
                className="border border-gray-300 dark:border-gray-600 rounded-md p-2 pr-8 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                value={fulfillmentFilter}
                onChange={(e) => setFulfillmentFilter(e.target.value)}
              >
                <option value="all">All Fulfillment</option>
                <option value="delivery">Delivery Only</option>
                <option value="pickup">Pickup Only</option>
              </select>
            </div>
            
            {/* Search Box */}
            <div className="relative flex items-center">
              <FaSearch className="absolute left-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search orders..."
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <button
              onClick={fetchAllOrders}
              className="ml-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center"
            >
              <FaSpinner className={`mr-1 ${loading ? 'animate-spin' : 'hidden'}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>
      
      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                      <FaSpinner className="animate-spin inline mr-2" /> Loading orders...
                    </td>
                  </tr>
                ) : currentOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                      No orders found
                    </td>
                  </tr>
                ) : (
                  currentOrders.map(order => (
                    <tr key={order._id} className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onClick={() => setSelectedOrder(order)}>
                      {/* Order ID column with type badge */}
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <span className={`w-2 h-2 rounded-full mr-2 ${
                            getFulfillmentType(order) === 'Pickup' ? 'bg-purple-500' : 'bg-blue-500'
                          }`}></span>
                          <div>
                            <div className="text-sm font-medium dark:text-white">{order.orderId || order._id?.substring(order._id.length - 8)}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {getFulfillmentType(order)}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      {/* Customer column */}
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium dark:text-white truncate max-w-[150px]">
                          {order.userId?.name || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                          {order.userId?.email || 'No email'}
                        </div>
                      </td>
                      
                      {/* Date column - simplified */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm dark:text-white">
                          {format(new Date(order.createdAt), 'dd MMM yyyy')}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {format(new Date(order.createdAt), 'HH:mm')}
                        </div>
                      </td>
                      
                      {/* Status column with badge */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {renderStatusBadge(order.status)}
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {(order.payment_status || order.paymentStatus || 'pending').toUpperCase()}
                        </div>
                      </td>
                      
                      {/* Amount column - clean and simple */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="text-sm font-medium dark:text-white">
                          KSh {Number(order.totalAmt || order.totalPrice || 0).toLocaleString()}
                        </div>
                      </td>
                      
                      {/* Action column */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <button 
                          className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800/60"
                          onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? (
            <div className="col-span-full flex justify-center py-8">
              <FaSpinner className="animate-spin text-2xl text-blue-600" />
              <span className="ml-2 text-gray-600 dark:text-gray-300">Loading orders...</span>
            </div>
          ) : currentOrders.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
              No orders found
            </div>
          ) : (
            currentOrders.map(order => (
              <div 
                key={order._id} 
                className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedOrder(order)}
              >
                {/* Card Header with Status */}
                <div className={`px-4 py-2 ${
                  order.status === 'delivered' ? 'bg-green-100 dark:bg-green-900/30' :
                  order.status === 'cancelled' ? 'bg-red-100 dark:bg-red-900/30' :
                  order.status === 'shipped' ? 'bg-indigo-100 dark:bg-indigo-900/30' :
                  order.status === 'driver_assigned' || order.status === 'out_for_delivery' || order.status === 'nearby' ? 
                    'bg-purple-100 dark:bg-purple-900/30' :
                  order.status === 'processing' ? 'bg-blue-100 dark:bg-blue-900/30' :
                  'bg-yellow-100 dark:bg-yellow-900/30'
                }`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <span className={`w-2 h-2 rounded-full mr-2 ${
                        getFulfillmentType(order) === 'Pickup' ? 'bg-purple-500' : 'bg-blue-500'
                      }`}></span>
                      <span className="text-sm font-medium dark:text-white">
                        {getFulfillmentType(order)}
                      </span>
                    </div>
                    {renderStatusBadge(order.status)}
                  </div>
                </div>
                
                {/* Card Body */}
                <div className="p-4">
                  {/* Order ID and Date */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="text-base font-medium dark:text-white">#{order.orderId || order._id?.substring(order._id.length - 8)}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {format(new Date(order.createdAt), 'dd MMM yyyy')}
                      </div>
                    </div>
                    <div className="text-base font-semibold text-green-600 dark:text-green-400">
                      KSh {Number(order.totalAmt || order.totalPrice || 0).toLocaleString()}
                    </div>
                  </div>
                  
                  {/* Customer Info - With truncation for long names/emails */}
                  <div className="mb-3">
                    <div className="text-sm font-medium dark:text-white truncate" title={order.userId?.name || 'N/A'}>
                      {order.userId?.name || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate" title={order.userId?.email || 'No email'}>
                      {order.userId?.email || 'No email'}
                    </div>
                  </div>
                  
                  {/* Payment Status */}
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-3">
                    <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
                      order.payment_status === 'paid' || order.paymentStatus === 'paid' ? 
                      'bg-green-500' : 'bg-yellow-500'
                    }`}></span>
                    Payment: {(order.payment_status || order.paymentStatus || 'pending').toUpperCase()}
                  </div>
                </div>
                
                {/* Card Footer */}
                <div className="border-t dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-750 flex justify-end">
                  <button 
                    className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800/60 text-sm"
                    onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      
      {/* Pagination */}
      {filteredOrders.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing {indexOfFirstOrder + 1}-{Math.min(indexOfLastOrder, filteredOrders.length)} of {filteredOrders.length} orders
          </div>
          <div className="flex space-x-2">
            <button
              className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 disabled:opacity-50"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Previous
            </button>
            {[...Array(Math.min(5, totalPages)).keys()].map(index => {
              // Show pagination numbers centered around current page
              let pageNumber;
              if (totalPages <= 5) {
                pageNumber = index + 1;
              } else if (currentPage <= 3) {
                pageNumber = index + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNumber = totalPages - 4 + index;
              } else {
                pageNumber = currentPage - 2 + index;
              }
              
              if (pageNumber <= totalPages) {
                return (
                  <button
                    key={pageNumber}
                    className={`px-3 py-1 rounded ${
                      pageNumber === currentPage ? 
                        'bg-blue-600 text-white' : 
                        'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                    }`}
                    onClick={() => setCurrentPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                );
              } else {
                return null;
              }
            })}
            <button
              className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 disabled:opacity-50"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
      
      {/* Order Detail Modal */}
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