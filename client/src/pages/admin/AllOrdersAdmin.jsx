import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FaBoxes,
  FaCalculator,
  FaCashRegister,
  FaChartBar,
  FaCheckCircle,
  FaExclamationTriangle,
  FaFileInvoiceDollar,
  FaInfoCircle,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaMotorcycle,
  FaPaperPlane,
  FaSearch,
  FaShoppingCart,
  FaSpinner,
  FaStore,
  FaThLarge,
  FaThList,
  FaTimes,
  FaTruck,
  FaUserAlt
} from 'react-icons/fa';
import { format } from 'date-fns';
import { buildApiUrl } from '../../common/apiBaseUrl';
import useCriteriaGate from '../../hooks/useCriteriaGate';
import useMobile from '../../hooks/useMobile';
import Axios from '../../utils/Axios';

// Simple date formatter function as fallback if date-fns is not available
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString();
};

const OrderDetailModal = ({ order, onClose, onStatusChange, onDispatchStateSync }) => {
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [dispatchingOrder, setDispatchingOrder] = useState(false);
  const { ensureCriteria, gateModal } = useCriteriaGate();
  
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
    if (!(await ensureCriteria('dispatch_order'))) {
      return;
    }

    try {
      setDispatchingOrder(true);
      const dispatchResponse = await Axios({
        url: '/api/delivery/dispatch',
        method: 'POST',
        data: { orderId: order._id }
      });

      if (!dispatchResponse.data?.success) {
        toast.error(dispatchResponse.data?.message || 'Failed to dispatch order');
        return;
      }

      if (selectedDriver) {
        const assignResponse = await Axios({
          url: '/api/delivery/assign-driver',
          method: 'POST',
          data: {
            orderId: order._id,
            driverId: selectedDriver,
            notes: 'Assigned during dispatch from admin order management',
          },
        });

        if (!assignResponse.data?.success) {
          toast.error(assignResponse.data?.message || 'Order dispatched, but driver assignment failed');
          return;
        }
      }

      if (dispatchResponse.data?.success) {
        const nextStatus = selectedDriver ? 'driver_assigned' : 'dispatched';
        toast.success('Order dispatched successfully');

        if (typeof onDispatchStateSync === 'function') {
          onDispatchStateSync(order._id, { status: nextStatus });
        }
      }
    } catch (error) {
      console.error('Error dispatching order:', error);

      const conflictStatus = error?.response?.data?.currentStatus;
      if (conflictStatus && typeof onDispatchStateSync === 'function') {
        onDispatchStateSync(order._id, { status: conflictStatus });
      }

      toast.error(error?.response?.data?.message || 'Failed to dispatch order');
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
    <div className="fixed inset-0 bg-plum-900/60 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-dm-card rounded-card border border-brown-100 dark:border-dm-border max-w-4xl w-full max-h-[92dvh] overflow-y-auto shadow-xl">
        <div className="flex items-start justify-between gap-3 p-4 sm:p-6 border-b border-brown-100 dark:border-dm-border">
          <h2 className="text-base sm:text-xl font-bold text-charcoal dark:text-white">
            Order: {order.orderId || order._id.substring(order._id.length - 8)}
          </h2>
          <button
            onClick={onClose}
            className="text-brown-400 hover:text-charcoal dark:text-white/50 dark:hover:text-white transition-colors shrink-0"
          >
            <FaTimes size={20} />
          </button>
        </div>
        
        <div className="p-4 sm:p-6 space-y-6">
          {/* Order Status Banner */}
          <div className={`p-3 rounded-md mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${
            order.status === 'delivered' ? 'bg-brown-100 dark:bg-brown-600/20 text-brown-800 dark:text-brown-300' :
            order.status === 'cancelled' ? 'bg-blush-100 dark:bg-blush-500/20 text-blush-600 dark:text-blush-300' :
            order.status === 'shipping' || order.status === 'shipped' ? 'bg-plum-100 dark:bg-plum-900/30 text-plum-800 dark:text-plum-200' :
            order.status === 'out_for_delivery' || order.status === 'driver_assigned' ? 'bg-plum-100 dark:bg-plum-900/30 text-plum-800 dark:text-plum-200' :
            'bg-gold-100 dark:bg-gold-600/20 text-gold-700 dark:text-gold-300'
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
                className="w-full sm:w-auto border border-brown-200 dark:border-dm-border p-2 rounded-lg bg-white dark:bg-dm-card text-charcoal dark:text-white text-sm"
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
            <div className="bg-plum-50 dark:bg-plum-900/20 p-4 rounded-lg">
              <h3 className="font-medium mb-3 text-plum-900 dark:text-plum-200 flex items-center">
                <FaPaperPlane className="mr-2" /> Dispatch Order
              </h3>
              <div className="space-y-3">
                <p className="text-sm text-plum-800 dark:text-plum-200">
                  This order is ready to be dispatched. Assign a delivery driver or dispatch automatically.
                </p>
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex-grow min-w-[200px]">
                    <label className="block text-sm font-medium text-plum-800 dark:text-plum-200 mb-1">
                      Select Driver (Optional)
                    </label>
                    {loadingDrivers ? (
                      <div className="flex items-center text-plum-800 dark:text-plum-200">
                        <FaSpinner className="animate-spin mr-2" /> Loading available drivers...
                      </div>
                    ) : (
                      <select
                        className="w-full border border-plum-300 dark:border-plum-700 rounded-md p-2 bg-white dark:bg-dm-card text-charcoal dark:text-white"
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
                    className="px-4 py-2 bg-plum-700 hover:bg-plum-600 text-white rounded-md flex items-center disabled:opacity-50"
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
            <div className="border border-brown-100 dark:border-dm-border p-4 rounded-lg">
              <h3 className="font-medium mb-3 flex items-center">
                <FaChartBar className="mr-2 text-brown-400 dark:text-white/40" /> Order Status History
              </h3>
              {order.statusHistory && order.statusHistory.length > 0 ? (
                <ul className="space-y-2">
                  {[...order.statusHistory].reverse().map((status, idx) => (
                    <li key={idx} className="flex items-start">
                      <div className="mt-1">
                        <span className={`w-3 h-3 rounded-full inline-block ${
                          status.status === 'delivered' ? 'bg-brown-500' :
                          status.status === 'cancelled' ? 'bg-blush-500' :
                          status.status === 'shipped' || status.status === 'shipping' ? 'bg-plum-500' :
                          status.status === 'out_for_delivery' || status.status === 'driver_assigned' ? 'bg-plum-700' :
                          'bg-gold-500'
                        }`}></span>
                      </div>
                      <div className="ml-3">
                        <p className="font-medium">
                          {status.status.charAt(0).toUpperCase() + status.status.slice(1).replace('_', ' ')}
                        </p>
                        <p className="text-sm text-brown-400 dark:text-white/40">
                          {typeof format === 'function'
                            ? format(new Date(status.timestamp), 'PPP p')
                            : formatDate(status.timestamp)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-center space-x-2 text-brown-500 dark:text-white/55">
                  <span className="w-3 h-3 rounded-full inline-block bg-gold-500"></span>
                  <p className="font-medium">{order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}</p>
                  <p className="text-sm">
                    {typeof format === 'function'
                      ? format(new Date(order.createdAt), 'PPP p')
                      : formatDate(order.createdAt)}
                  </p>
                </div>
              )}
            </div>
            
            <div className="border border-brown-100 dark:border-dm-border p-4 rounded-lg">
              <h3 className="font-medium mb-3 flex items-center">
                <FaFileInvoiceDollar className="mr-2 text-brown-400 dark:text-white/40" /> Payment Details
              </h3>
              <div className="space-y-2">
                <p>
                  <span className="text-brown-500 dark:text-white/55">Payment Method:</span>{" "}
                  <span className="font-medium dark:text-white">
                    {order.paymentMethod || (order.payment_status === 'paid' ? 'Online Payment' : 'Cash on Delivery')}
                  </span>
                </p>
                <p>
                  <span className="text-brown-500 dark:text-white/55">Payment Status:</span>{" "}
                  <span className={`font-medium ${
                    order.paymentStatus === 'paid' || order.payment_status === 'paid' 
                    ? 'text-brown-700 dark:text-brown-300' 
                    : 'text-gold-600 dark:text-gold-400'
                  }`}>
                    {(order.paymentStatus || order.payment_status || 'pending').toUpperCase()}
                  </span>
                </p>
                {order.paymentDetails && order.paymentDetails.transactionId && (
                  <p>
                    <span className="text-brown-500 dark:text-white/55">Transaction ID:</span>{" "}
                    <span className="font-medium dark:text-white">{order.paymentDetails.transactionId}</span>
                  </p>
                )}
                {order.paymentDetails && order.paymentDetails.paymentDate ? (
                  <p>
                    <span className="text-brown-500 dark:text-white/55">Payment Date:</span>{" "}
                    <span className="font-medium dark:text-white">
                      {typeof format === 'function'
                        ? format(new Date(order.paymentDetails.paymentDate), 'PPP')
                        : formatDate(order.paymentDetails.paymentDate)}
                    </span>
                  </p>
                ) : order.paymentStatus === 'paid' || order.payment_status === 'paid' ? (
                  <p>
                    <span className="text-brown-500 dark:text-white/55">Payment Date:</span>{" "}
                    <span className="font-medium dark:text-white">
                      {typeof format === 'function'
                        ? format(new Date(order.updatedAt || order.createdAt), 'PPP')
                        : formatDate(order.updatedAt || order.createdAt)}
                    </span>
                  </p>
                ) : null}
                <p>
                  <span className="text-brown-500 dark:text-white/55">Total Amount:</span>{" "}
                  <span className="font-medium dark:text-white">
                    KSh {Number(order.totalAmt || order.totalPrice || 0).toLocaleString()}
                  </span>
                </p>
              </div>
            </div>
          </div>
          
          {/* Delivery Tracking Section - Enhanced with driver info */}
          {isInDeliveryProcess && (
            <div className="border border-plum-200 dark:border-plum-800/40 p-4 rounded-lg bg-plum-50 dark:bg-plum-900/20">
              <h3 className="font-medium mb-3 flex items-center text-plum-900 dark:text-plum-200">
                <FaMapMarkerAlt className="mr-2" /> Delivery Tracking
              </h3>
              
              {order.deliveryDetails ? (
                <div className="space-y-4">
                  {/* Driver Information */}
                  <div className="bg-white dark:bg-dm-card-2 p-3 rounded-md border border-plum-200 dark:border-plum-800">
                    <h4 className="font-medium flex items-center mb-2">
                      <FaUserAlt className="mr-2 text-plum-600 dark:text-plum-300" /> Driver Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <p><span className="text-brown-500 dark:text-white/55">Name:</span> {order.deliveryDetails.driver?.name || 'Not assigned yet'}</p>
                      <p><span className="text-brown-500 dark:text-white/55">Phone:</span> {order.deliveryDetails.driver?.phone || 'N/A'}</p>
                      <p><span className="text-brown-500 dark:text-white/55">Vehicle:</span> {order.deliveryDetails.driver?.vehicleType || 'N/A'}</p>
                      <p><span className="text-brown-500 dark:text-white/55">License:</span> {order.deliveryDetails.driver?.licenseNumber || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Location Information */}
                  <div className="bg-white dark:bg-dm-card-2 p-3 rounded-md border border-plum-200 dark:border-plum-800">
                    <h4 className="font-medium flex items-center mb-2">
                      <FaMotorcycle className="mr-2 text-plum-600 dark:text-plum-300" /> Delivery Status
                    </h4>
                    <div className="space-y-2">
                      <p>
                        <span className="text-brown-500 dark:text-white/55">Current Status:</span> 
                        <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-plum-100 text-plum-800 dark:bg-plum-800 dark:text-plum-200">
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}
                        </span>
                      </p>
                      
                      {order.deliveryDetails.estimatedDeliveryTime && (
                        <p>
                          <span className="text-brown-500 dark:text-white/55">Estimated Delivery:</span> 
                          {typeof format === 'function'
                            ? format(new Date(order.deliveryDetails.estimatedDeliveryTime), 'PPP p')
                            : formatDate(order.deliveryDetails.estimatedDeliveryTime)}
                        </p>
                      )}
                      
                      {order.deliveryDetails.currentLocation && (
                        <div>
                          <p className="text-brown-500 dark:text-white/55 mb-1">Current Location:</p>
                          <div className="bg-plum-50 dark:bg-plum-900/30 p-2 rounded-md">
                            {order.deliveryDetails.currentLocation.address || 
                             `${order.deliveryDetails.currentLocation.coordinates[1]}, ${order.deliveryDetails.currentLocation.coordinates[0]}`}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Driver Notes */}
                  {order.deliveryDetails.notes && (
                    <div className="bg-white dark:bg-dm-card-2 p-3 rounded-md border border-plum-200 dark:border-plum-800">
                      <h4 className="font-medium flex items-center mb-2">
                        <FaInfoCircle className="mr-2 text-plum-600 dark:text-plum-300" /> Delivery Notes
                      </h4>
                      <p className="text-charcoal dark:text-white/80">{order.deliveryDetails.notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-brown-400 dark:text-white/40">No delivery details available yet</p>
              )}
            </div>
          )}
          
          {/* Customer Information */}
          <div className="bg-ivory dark:bg-dm-card-2 p-4 rounded-lg">
            <h3 className="font-medium mb-3 dark:text-white">Customer Information</h3>
            <div className="flex flex-wrap gap-6">
              <div className="flex-1 min-w-[250px]">
                <div className="text-sm space-y-2">
                  <div>
                    <span className="text-brown-500 dark:text-white/55">Name:</span>
                    <span className="ml-2 font-medium dark:text-white">{order.userId?.name || 'Not Available'}</span>
                  </div>
                  <div>
                    <span className="text-brown-500 dark:text-white/55">Email:</span>
                    <span className="ml-2 dark:text-white">{order.userId?.email || 'Not Available'}</span>
                  </div>
                  <div>
                    <span className="text-brown-500 dark:text-white/55">Phone:</span>
                    <span className="ml-2 dark:text-white">{order.userId?.mobile || order.delivery_address?.phoneNumber || 'Not Available'}</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-w-[250px]">
                <h4 className="text-sm font-medium mb-2 dark:text-white flex items-center">
                  <FaMapMarkerAlt className="mr-2 text-brown-400 dark:text-white/40" /> 
                  {order.fulfillment_type === 'pickup' ? 'Pickup Location' : 'Shipping Address'}
                </h4>
                <div className="text-sm dark:text-white/70 bg-white dark:bg-dm-card p-3 rounded-md">
                  {order.fulfillment_type === 'pickup' ? (
                    <div>
                      <p className="font-medium">{order.pickup_location}</p>
                      {order.pickup_instructions && (
                        <div className="mt-2 text-xs bg-ivory dark:bg-dm-card-2 p-2 rounded-md">
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
                    <p className="italic text-brown-400 dark:text-white/40">
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
            <div className="bg-plum-50 dark:bg-plum-900/20 p-4 rounded-lg">
              <h3 className="font-medium mb-3 text-plum-900 dark:text-plum-200">Delivery Tracking</h3>
              <div className="flex flex-wrap gap-6">
                {order.deliveryPersonnel && (
                  <div className="flex-1 min-w-[250px]">
                    <h4 className="text-sm font-medium mb-1 text-plum-800 dark:text-plum-200">Delivery Personnel</h4>
                    <div className="text-sm text-plum-700 dark:text-plum-200 space-y-1">
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
                    <h4 className="text-sm font-medium mb-1 text-plum-800 dark:text-plum-200">Estimated Delivery</h4>
                    <div className="text-sm text-plum-700 dark:text-plum-200">
                      {typeof format === 'function' 
                        ? format(new Date(order.estimatedDeliveryTime), 'PPP p')
                        : formatDate(order.estimatedDeliveryTime)
                      }
                    </div>
                  </div>
                )}

                {order.currentLocation && (
                  <div className="flex-1 min-w-[250px]">
                    <h4 className="text-sm font-medium mb-1 text-plum-800 dark:text-plum-200">Current Location</h4>
                    <div className="text-sm text-plum-700 dark:text-plum-200">
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
                      <button className="mt-1 text-plum-600 dark:text-plum-300 hover:underline">
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
            <div className="border border-brown-100 dark:border-dm-border rounded-lg overflow-x-auto">
              <table className="min-w-full divide-y divide-brown-100 dark:divide-dm-border text-sm">
                <thead className="bg-ivory dark:bg-dm-card-2">
                  <tr>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-brown-400 dark:text-white/40 uppercase tracking-wider">Product</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-brown-400 dark:text-white/40 uppercase tracking-wider">Price</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-brown-400 dark:text-white/40 uppercase tracking-wider">Qty</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-brown-400 dark:text-white/40 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-dm-card divide-y divide-brown-100 dark:divide-dm-border">
                  {order.product_details ? (
                    <tr>
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <div className="flex items-center">
                          {order.product_details.image && (
                            <img 
                              src={order.product_details.image[0]} 
                              alt={order.product_details.name} 
                              className="h-10 w-10 sm:h-12 sm:w-12 object-cover rounded mr-2 sm:mr-3 shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <div className="font-medium dark:text-white text-xs sm:text-sm truncate">{order.product_details.name || 'Product'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap dark:text-white/70 text-xs sm:text-sm">
                        KSh {Number(order.totalAmt / (order.quantity || 1)).toLocaleString()}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap dark:text-white/70 text-xs sm:text-sm">
                        {order.quantity || 1}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap font-medium dark:text-white text-xs sm:text-sm">
                        KSh {Number(order.totalAmt).toLocaleString()}
                      </td>
                    </tr>
                  ) : order.products && order.products.length > 0 ? (
                    order.products.map((item, index) => (
                      <tr key={index}>
                        <td className="px-2 sm:px-4 py-2 sm:py-3">
                          <div className="flex items-center">
                            {item.product?.image && (
                              <img 
                                src={item.product.image} 
                                alt={item.product?.title} 
                                className="h-10 w-10 sm:h-12 sm:w-12 object-cover rounded mr-2 sm:mr-3 shrink-0"
                              />
                            )}
                            <div className="min-w-0">
                              <div className="font-medium dark:text-white text-xs sm:text-sm truncate">{item.product?.title || 'Product'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap dark:text-white/70 text-xs sm:text-sm">
                          KSh {Number(item.price / item.quantity).toLocaleString()}
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap dark:text-white/70 text-xs sm:text-sm">
                          {item.quantity}
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap font-medium dark:text-white text-xs sm:text-sm">
                          KSh {Number(item.price).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-2 sm:px-4 py-2 sm:py-3 text-center text-brown-400 dark:text-white/40 text-xs sm:text-sm">
                        No product details available
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-ivory dark:bg-dm-card-2 text-xs sm:text-sm">
                  <tr>
                    <td colSpan="3" className="px-2 sm:px-4 py-1.5 sm:py-2 text-right dark:text-white/70">Subtotal:</td>
                    <td className="px-2 sm:px-4 py-1.5 sm:py-2 font-medium dark:text-white">
                      KSh {Number(order.subTotalAmt || order.subTotal || 0).toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan="3" className="px-2 sm:px-4 py-1.5 sm:py-2 text-right dark:text-white/70">Shipping:</td>
                    <td className="px-2 sm:px-4 py-1.5 sm:py-2 font-medium dark:text-white">
                      KSh {Number(order.shippingPrice || 0).toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan="3" className="px-2 sm:px-4 py-1.5 sm:py-2 text-right font-medium dark:text-white">Total:</td>
                    <td className="px-2 sm:px-4 py-1.5 sm:py-2 font-bold dark:text-white">
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
              <div className="border border-brown-100 dark:border-dm-border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-brown-100 dark:divide-dm-border">
                  <thead className="bg-ivory dark:bg-dm-card-2">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-brown-400 dark:text-white/40 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-brown-400 dark:text-white/40 uppercase tracking-wider">Timestamp</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-brown-400 dark:text-white/40 uppercase tracking-wider">Note</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-dm-card divide-y divide-brown-100 dark:divide-dm-border">
                    {order.statusHistory.map((status, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 dark:text-white">
                          {status.status.charAt(0).toUpperCase() + status.status.slice(1).replace('_', ' ')}
                        </td>
                        <td className="px-4 py-3 dark:text-white/70">
                          {typeof format === 'function'
                            ? format(new Date(status.timestamp), 'PPP p')
                            : formatDate(status.timestamp)
                          }
                        </td>
                        <td className="px-4 py-3 dark:text-white/70">{status.note || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        
        <div className="border-t border-brown-100 dark:border-dm-border p-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-brown-100 dark:bg-dm-card-2 text-charcoal dark:text-white rounded-pill hover:bg-brown-200 dark:hover:bg-dm-border transition-colors"
          >
            Close
          </button>
        </div>
        {gateModal}
      </div>
    </div>
  );
};

// Statistics component for the dashboard
const OrderStatistics = ({ orders, scopeLabel }) => {
  const totalOrders = orders.length;
  const pendingOrders = orders.filter((order) => ['pending', 'processing'].includes(order.status)).length;
  const inTransitOrders = orders.filter((order) =>
    ['shipped', 'driver_assigned', 'out_for_delivery', 'nearby'].includes(order.status)
  ).length;
  const completedOrders = orders.filter((order) => ['delivered', 'picked_up'].includes(order.status)).length;
  const posOrders = orders.filter((order) => order.isPOSSale || order.status === 'POS').length;
  const onlineRevenue = orders
    .filter((order) => !(order.isPOSSale || order.status === 'POS') && order.status !== 'cancelled')
    .reduce((sum, order) => sum + Number(order.totalAmt || order.totalPrice || 0), 0);
  const posRevenue = orders
    .filter((order) => order.isPOSSale || order.status === 'POS')
    .reduce((sum, order) => sum + Number(order.totalAmt || order.totalPrice || 0), 0);
  const totalRevenue = onlineRevenue + posRevenue;

  const statusBreakdown = [
    { label: 'Pending', value: orders.filter((order) => order.status === 'pending').length, tone: 'bg-gold-100 text-gold-700 dark:bg-gold-600/20 dark:text-gold-300' },
    { label: 'Processing', value: orders.filter((order) => order.status === 'processing').length, tone: 'bg-plum-100 text-plum-700 dark:bg-plum-900/30 dark:text-plum-200' },
    { label: 'Shipped', value: orders.filter((order) => order.status === 'shipped').length, tone: 'bg-plum-100 text-plum-700 dark:bg-plum-900/30 dark:text-plum-200' },
    { label: 'In Transit', value: orders.filter((order) => ['driver_assigned', 'out_for_delivery', 'nearby'].includes(order.status)).length, tone: 'bg-blush-100 text-blush-500 dark:bg-blush-500/10 dark:text-blush-300' },
    { label: 'Delivered', value: orders.filter((order) => order.status === 'delivered').length, tone: 'bg-brown-100 text-brown-700 dark:bg-brown-600/20 dark:text-brown-300' },
    { label: 'Cancelled', value: orders.filter((order) => order.status === 'cancelled').length, tone: 'bg-brown-100 text-brown-600 dark:bg-dm-card-2 dark:text-white/60' }
  ];

  const fulfillmentBreakdown = [
    {
      label: 'Delivery waiting',
      value: orders.filter((order) =>
        (order.fulfillment_type === 'delivery' || order.deliveryMethod === 'delivery') &&
        !['delivered', 'cancelled'].includes(order.status)
      ).length
    },
    {
      label: 'Delivery completed',
      value: orders.filter((order) =>
        (order.fulfillment_type === 'delivery' || order.deliveryMethod === 'delivery') &&
        order.status === 'delivered'
      ).length
    },
    {
      label: 'Pickup waiting',
      value: orders.filter((order) =>
        (order.fulfillment_type === 'pickup' || order.deliveryMethod === 'store-pickup') &&
        !['delivered', 'picked_up', 'cancelled'].includes(order.status)
      ).length
    },
    {
      label: 'Pickup completed',
      value: orders.filter((order) =>
        (order.fulfillment_type === 'pickup' || order.deliveryMethod === 'store-pickup') &&
        ['delivered', 'picked_up'].includes(order.status)
      ).length
    }
  ];

  return (
    <div className="mb-6 space-y-4">
      <div className="rounded-2xl border border-brown-100 bg-white p-4 shadow-sm dark:border-dm-border dark:bg-dm-card sm:p-5">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold dark:text-white flex items-center tracking-tight">
              <FaChartBar className="mr-2" /> Financial Snapshot
            </h2>
            <p className="mt-1 text-sm text-brown-500 dark:text-white/45">
              Showing scoped order activity for {scopeLabel}.
            </p>
          </div>
          <span className="inline-flex self-start rounded-pill bg-plum-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-plum-700 dark:bg-plum-900/30 dark:text-plum-200">
            {totalOrders} orders in scope
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-800 shadow-sm sm:p-4 dark:bg-emerald-900/30 dark:text-emerald-300">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white/60 sm:mb-3 sm:h-11 sm:w-11 dark:bg-white/10">
              <FaMoneyBillWave size={16} />
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-wide sm:text-xs">Revenue</div>
            <div className="mt-1 text-xl font-black tracking-tight sm:mt-2 sm:text-2xl">KSh {totalRevenue.toLocaleString()}</div>
          </div>

          <div className="rounded-2xl bg-plum-100 p-3 text-plum-800 shadow-sm sm:p-4 dark:bg-plum-900/30 dark:text-plum-200">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white/60 sm:mb-3 sm:h-11 sm:w-11 dark:bg-white/10">
              <FaShoppingCart size={16} />
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-wide sm:text-xs">Pending + Processing</div>
            <div className="mt-1 text-xl font-black tracking-tight sm:mt-2 sm:text-2xl">{pendingOrders}</div>
          </div>

          <div className="rounded-2xl bg-blush-100 p-3 text-blush-500 shadow-sm sm:p-4 dark:bg-blush-500/10 dark:text-blush-300">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white/70 sm:mb-3 sm:h-11 sm:w-11 dark:bg-white/10">
              <FaTruck size={16} />
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-wide sm:text-xs">Fulfillment Active</div>
            <div className="mt-1 text-xl font-black tracking-tight sm:mt-2 sm:text-2xl">{inTransitOrders}</div>
          </div>

          <div className="rounded-2xl bg-brown-100 p-3 text-brown-700 shadow-sm sm:p-4 dark:bg-brown-600/20 dark:text-brown-300">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white/70 sm:mb-3 sm:h-11 sm:w-11 dark:bg-white/10">
              <FaCashRegister size={16} />
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-wide sm:text-xs">Completed / Counter</div>
            <div className="mt-1 text-xl font-black tracking-tight sm:mt-2 sm:text-2xl">{completedOrders + posOrders}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <div className="rounded-2xl border border-brown-100 bg-white p-4 shadow-sm dark:border-dm-border dark:bg-dm-card sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-charcoal dark:text-white">Status Breakdown</h3>
            <span className="text-xs text-brown-500 dark:text-white/45">Tap filters below to narrow the list</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {statusBreakdown.map((item) => (
              <div key={item.label} className={`inline-flex items-center gap-2 rounded-pill px-3 py-2 text-sm font-semibold ${item.tone}`}>
                <span>{item.label}</span>
                <span className="rounded-full bg-white/60 px-2 py-0.5 text-xs dark:bg-black/10">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-brown-100 bg-white p-4 shadow-sm dark:border-dm-border dark:bg-dm-card sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-charcoal dark:text-white">Channel Mix</h3>
            <span className="text-xs text-brown-500 dark:text-white/45">Scope totals</span>
          </div>
          <div className="space-y-3">
            <div className="rounded-2xl bg-ivory p-3 dark:bg-dm-card-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-charcoal dark:text-white">Online revenue</span>
                <span className="text-sm font-semibold text-charcoal dark:text-white">KSh {onlineRevenue.toLocaleString()}</span>
              </div>
            </div>
            <div className="rounded-2xl bg-ivory p-3 dark:bg-dm-card-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-charcoal dark:text-white">Counter revenue</span>
                <span className="text-sm font-semibold text-charcoal dark:text-white">KSh {posRevenue.toLocaleString()}</span>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {fulfillmentBreakdown.map((item) => (
                <div key={item.label} className="rounded-2xl bg-ivory px-3 py-2 dark:bg-dm-card-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-brown-500 dark:text-white/45">{item.label}</div>
                  <div className="mt-1 text-lg font-black tracking-tight text-charcoal dark:text-white">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AllOrdersAdmin = () => {
  const [isCompactLayout] = useMobile(1024);
  const [onlineOrders, setOnlineOrders] = useState([]);
  const [posSales, setPosSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [showStatistics, setShowStatistics] = useState(true);
  const [dateScope, setDateScope] = useState('day');
  const [selectedDay, setSelectedDay] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  
  // Add pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage, setOrdersPerPage] = useState(10);
  
  // Add new state for fulfillment filtering
  const [fulfillmentFilter, setFulfillmentFilter] = useState('all');
  
  // Add new state for view mode
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  
  useEffect(() => {
    fetchAllOrders();
    fetchPOSSales();
  }, []);

  useEffect(() => {
    setViewMode(isCompactLayout ? 'grid' : 'table');
  }, [isCompactLayout]);

  const allOrders = useMemo(() => {
    return [...onlineOrders, ...posSales].sort((a, b) => {
      const firstDate = new Date(b.saleDate || b.createdAt || 0).getTime();
      const secondDate = new Date(a.saleDate || a.createdAt || 0).getTime();
      return firstDate - secondDate;
    });
  }, [onlineOrders, posSales]);

  const scopedOrders = useMemo(() => {
    return allOrders.filter((order) => {
      const sourceDate = order.saleDate || order.createdAt;
      if (!sourceDate) return false;

      const parsedDate = new Date(sourceDate);
      if (Number.isNaN(parsedDate.getTime())) return false;

      if (dateScope === 'day') {
        return format(parsedDate, 'yyyy-MM-dd') === selectedDay;
      }

      return format(parsedDate, 'yyyy-MM') === selectedMonth;
    });
  }, [allOrders, dateScope, selectedDay, selectedMonth]);

  const scopeLabel = useMemo(() => {
    if (dateScope === 'day') {
      return format(new Date(`${selectedDay}T00:00:00`), 'PPP');
    }

    return format(new Date(`${selectedMonth}-01T00:00:00`), 'LLLL yyyy');
  }, [dateScope, selectedDay, selectedMonth]);
  
  const fetchAllOrders = async () => {
    try {
      setLoading(true);
      const response = await Axios({
        url: '/api/order/admin/all',
        method: 'GET'
      });
      
      if (response.data.success) {
        setOnlineOrders(response.data.data || []);
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

  const fetchPOSSales = async () => {
    try {
      const backendUrl = buildApiUrl();
      const token = sessionStorage.getItem('accesstoken') || localStorage.getItem('accesstoken') || localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`${backendUrl}/api/pos/admin/sales?includeItems=true`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Transform POS sales to order-like format
          const mappedSales = data.data.map(sale => ({
            _id: sale._id,
            orderId: sale.saleNumber || `POS-${sale._id.slice(-8)}`,
            status: 'POS',
            paymentStatus: 'paid',
            totalAmt: sale.total,
            saleDate: sale.saleDate,
            createdAt: sale.saleDate,
            customer: {
              name: sale.customer?.name || sale.customerName || 'Walk-in Customer',
              email: sale.customer?.email || 'N/A',
              phone: sale.customer?.phone || sale.customerPhone || 'N/A'
            },
            products: sale.items.map(item => ({
              product: {
                title: item.name,
                image: item.image || '/default-product.png'
              },
              quantity: item.quantity,
              price: item.price,
              total: item.total
            })),
            paymentMethod: sale.paymentMethod,
            cashier: sale.cashierName,
            isPOSSale: true,
            source: 'POS'
          }));

            setPosSales(mappedSales);
        }
      } else {
        console.log('POS sales not available or unauthorized');
      }
    } catch (error) {
      console.log('Error fetching POS sales:', error);
    }
  };
  
  const updateOrderStatus = async (orderId, status) => {
    const patchOrderState = (targetOrderId, updates) => {
      setOnlineOrders(prevOrders =>
        prevOrders.map(order =>
          order._id === targetOrderId ? { ...order, ...updates } : order
        )
      );

      setSelectedOrder((current) => (
        current && current._id === targetOrderId
          ? { ...current, ...updates }
          : current
      ));
    };

    try {
      const response = await Axios({
        url: `/api/order/status/${orderId}`,
        method: 'PUT',
        data: { status }
      });
      
      if (response.data.success) {
        toast.success('Order status updated successfully');
        patchOrderState(orderId, { status });
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
      return 'bg-brown-50 text-brown-500 dark:bg-dm-card-2 dark:text-white/70';
    }
    
    switch (status) {
      case 'pending':
        return 'bg-gold-100 text-gold-600 dark:bg-gold-900/20 dark:text-gold-300';
      case 'processing':
        return 'bg-plum-100 text-plum-700 dark:bg-plum-900/30 dark:text-plum-200';
      case 'shipped':
        return 'bg-plum-100 text-plum-700 dark:bg-plum-900/30 dark:text-plum-200';
      case 'driver_assigned':
      case 'out_for_delivery':
      case 'nearby':
        return 'bg-blush-100 text-blush-500 dark:bg-blush-500/10 dark:text-blush-300';
      case 'delivered':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300';
      case 'cancelled':
        return 'bg-brown-100 text-brown-600 dark:bg-dm-card-2/80 dark:text-white/60';
      case 'POS':
        return 'bg-plum-100 text-plum-700 dark:bg-plum-900/30 dark:text-plum-200';
      default:
        return 'bg-brown-50 text-brown-500 dark:bg-dm-card-2 dark:text-white/70';
    }
  };
  
  // Filter orders based on tab and search term
  const getFilteredOrders = () => {
    return scopedOrders.filter(order => {
      // First filter by tab/status
      const statusMatch = 
        activeTab === 'all' ? true :
        activeTab === 'in-transit' ? 
          ['driver_assigned', 'out_for_delivery', 'nearby'].includes(order.status) :
        activeTab === 'POS' ? order.status === 'POS' :
        order.status === activeTab;
      
      // Then filter by fulfillment type if not "all"
      // POS orders don't have fulfillment types, so exclude them from fulfillment filtering
      // POS orders are always included regardless of delivery/pickup filter
      const fulfillmentMatch = 
        order.isPOSSale ? true :
        fulfillmentFilter === 'all' ? true :
        fulfillmentFilter === 'pickup' ? 
          (order.fulfillment_type === 'pickup' || order.deliveryMethod === 'store-pickup') :
        (order.fulfillment_type === 'delivery' || order.deliveryMethod === 'delivery');
      
      // Then filter by search term if provided
      const searchMatch = 
        !searchTerm ? true : (
        // Check all relevant fields for matches, including customer info from POS sales
        (order.userId?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (order.userId?.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (order.customer?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (order.customer?.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (order.orderId?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (order._id?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (order.payment_status?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (order.paymentMethod?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (order.cashier?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      );
      
      return statusMatch && searchMatch && fulfillmentMatch;
    });
  };
  
  // Get filtered orders and apply pagination
  const filteredOrders = getFilteredOrders();
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
  
  const renderStatusBadge = (status) => {
    const statusColor = getStatusColor(status);
    return (
      <span className={`px-2.5 py-0.5 rounded-pill text-[11px] font-semibold tracking-wide ${statusColor}`}>
        {status ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ') : 'Unknown'}
      </span>
    );
  };

  // Helper function to determine fulfillment type (pickup or delivery)
  const getFulfillmentType = (order) => {
    if (order.isPOSSale || order.status === 'POS') {
      return 'POS';
    } else if (order.fulfillment_type === 'pickup' || order.deliveryMethod === 'store-pickup') {
      return 'Pickup';
    } else {
      return 'Delivery';
    }
  };
  
  // Helper function to get style for fulfillment badges
  const getFulfillmentBadgeStyle = (type) => {
    if (type === 'Pickup') {
      return 'bg-gold-100 text-gold-700 dark:bg-gold-600/20 dark:text-gold-300';
    } else {
      return 'bg-plum-100 text-plum-800 dark:bg-plum-900/30 dark:text-plum-200';
    }
  };

  const tabCount = (tabKey) => {
    if (tabKey === 'all') return scopedOrders.length;
    if (tabKey === 'in-transit') {
      return scopedOrders.filter((order) => ['driver_assigned', 'out_for_delivery', 'nearby'].includes(order.status)).length;
    }
    if (tabKey === 'POS') {
      return scopedOrders.filter((order) => order.status === 'POS').length;
    }
    return scopedOrders.filter((order) => order.status === tabKey).length;
  };

  const statusTabs = [
    { key: 'all', label: 'All Orders', activeTone: 'bg-plum-700 text-white' },
    { key: 'pending', label: 'Pending', activeTone: 'bg-gold-500 text-white' },
    { key: 'processing', label: 'Processing', activeTone: 'bg-plum-500 text-white' },
    { key: 'shipped', label: 'Shipped', activeTone: 'bg-plum-700 text-white' },
    { key: 'in-transit', label: 'In Transit', activeTone: 'bg-blush-500 text-white' },
    { key: 'delivered', label: 'Delivered', activeTone: 'bg-brown-600 text-white' },
    { key: 'cancelled', label: 'Cancelled', activeTone: 'bg-brown-500 text-white' },
    { key: 'POS', label: 'Counter Sales', activeTone: 'bg-plum-700 text-white' }
  ];
  
  return (
    <div className="w-full max-w-full overflow-x-hidden p-4 md:p-6 pb-24 lg:pb-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-white tracking-tight">Order Management</h1>
          <p className="mt-1 text-sm text-brown-500 dark:text-white/45">
            Review daily or monthly order flow, then narrow the list by fulfillment, status, and customer search.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,180px)] sm:items-center">
          <div className="inline-flex rounded-full bg-brown-100 p-1 dark:bg-dm-card-2">
            {['day', 'month'].map((scope) => (
              <button
                key={scope}
                type="button"
                onClick={() => {
                  setDateScope(scope);
                  setCurrentPage(1);
                }}
                className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition ${
                  dateScope === scope
                    ? 'bg-plum-700 text-white shadow-sm'
                    : 'text-charcoal hover:bg-white dark:text-white/70 dark:hover:bg-dm-border'
                }`}
              >
                {scope}
              </button>
            ))}
          </div>

          {dateScope === 'day' ? (
            <input
              type="date"
              value={selectedDay}
              onChange={(e) => {
                setSelectedDay(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-brown-200 bg-white px-3 py-2 text-sm font-medium text-charcoal outline-none focus:ring-2 focus:ring-plum-500/30 dark:border-dm-border dark:bg-dm-card dark:text-white"
            />
          ) : (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-brown-200 bg-white px-3 py-2 text-sm font-medium text-charcoal outline-none focus:ring-2 focus:ring-plum-500/30 dark:border-dm-border dark:bg-dm-card dark:text-white"
            />
          )}
        </div>
      </div>
      
      {/* Statistics */}
      {showStatistics && (
        <>
          <OrderStatistics orders={scopedOrders} scopeLabel={scopeLabel} />
          <div className="mb-6 flex justify-end">
            <button 
              onClick={() => setShowStatistics(false)}
              className="text-brown-500 dark:text-white/55 hover:text-charcoal dark:hover:text-white flex items-center text-sm"
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
            className="text-plum-600 dark:text-plum-300 hover:text-plum-800 dark:hover:text-plum-200 flex items-center"
          >
            <FaChartBar className="mr-1" /> Show Statistics
          </button>
        </div>
      )}
      
      {/* Order Filters, Search and View Toggle */}
      <div className="mb-6 flex flex-col gap-4">
        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 pb-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition ${
                activeTab === tab.key
                  ? tab.activeTone
                  : 'bg-brown-100 dark:bg-dm-card-2 text-charcoal dark:text-white hover:bg-brown-200 dark:hover:bg-dm-border'
              }`}
              onClick={() => { setActiveTab(tab.key); setCurrentPage(1); }}
            >
              <span>{tab.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-white/70 text-charcoal dark:bg-black/10 dark:text-white/80'}`}>
                {tabCount(tab.key)}
              </span>
            </button>
          ))}
        </div>
        
        {/* Search and Controls Row */}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[auto_180px_minmax(0,1fr)_auto] md:items-center lg:items-center">
          {/* View Toggle */}
          <div className="flex items-center gap-2 self-start">
            <button
              onClick={() => setViewMode('table')}
              disabled={isCompactLayout}
              className={`p-2 rounded-md ${
                viewMode === 'table' 
                  ? 'bg-plum-700 text-white' 
                  : 'bg-brown-100 dark:bg-dm-card-2 text-charcoal dark:text-white'
              }`}
              aria-label="Table view"
            >
              <FaThList />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md ${
                viewMode === 'grid' 
                  ? 'bg-plum-700 text-white' 
                  : 'bg-brown-100 dark:bg-dm-card-2 text-charcoal dark:text-white'
              }`}
              aria-label="Grid view"
            >
              <FaThLarge />
            </button>
          </div>
          
          <div className="relative">
            <select
              className="w-full border border-brown-200 dark:border-dm-border rounded-xl p-2.5 pr-8 bg-white dark:bg-dm-card text-charcoal dark:text-white"
              value={fulfillmentFilter}
              onChange={(e) => { setFulfillmentFilter(e.target.value); setCurrentPage(1); }}
            >
              <option value="all">All Fulfillment</option>
              <option value="delivery">Delivery Only</option>
              <option value="pickup">Pickup Only</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative flex items-center min-w-0">
            <FaSearch className="absolute left-3 text-brown-300 dark:text-white/30" />
            <input
              type="text"
              placeholder={`Search ${dateScope === 'day' ? 'today\'s' : 'this month\'s'} orders...`}
              className="w-full min-w-0 pl-10 pr-4 py-2.5 border border-brown-200 dark:border-dm-border rounded-xl focus:outline-none focus:ring-2 focus:ring-plum-500 bg-white dark:bg-dm-card text-charcoal dark:text-white"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>

          <button
            onClick={() => { fetchAllOrders(); fetchPOSSales(); }}
            className="px-4 py-2.5 bg-plum-700 hover:bg-plum-600 text-white rounded-xl flex items-center justify-center font-medium"
          >
            <FaSpinner className={`mr-2 ${loading ? 'animate-spin' : 'hidden'}`} />
            Refresh
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-brown-500 dark:text-white/45">
          <span>
            Viewing <span className="font-semibold text-charcoal dark:text-white">{scopeLabel}</span>
          </span>
          <span>
            {filteredOrders.length} matching orders • {scopedOrders.length} total in scope
          </span>
        </div>
      </div>
      
      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-white dark:bg-dm-card rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-brown-100 dark:divide-dm-border">
              <thead className="bg-ivory dark:bg-dm-card-2">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-brown-400 dark:text-white/40 uppercase tracking-wider">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-brown-400 dark:text-white/40 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-brown-400 dark:text-white/40 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-brown-400 dark:text-white/40 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-brown-400 dark:text-white/40 uppercase tracking-wider">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-brown-400 dark:text-white/40 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brown-100 dark:divide-dm-border">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-4 text-center text-brown-400 dark:text-white/40">
                      <FaSpinner className="animate-spin inline mr-2" /> Loading orders...
                    </td>
                  </tr>
                ) : currentOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-4 text-center text-brown-400 dark:text-white/40">
                      {scopedOrders.length === 0 ? `No orders found for ${scopeLabel}` : 'No orders match the current filters'}
                    </td>
                  </tr>
                ) : (
                  currentOrders.map(order => (
                    <tr key={order._id} className="hover:bg-ivory dark:hover:bg-dm-card-2 cursor-pointer" onClick={() => setSelectedOrder(order)}>
                      {/* Order ID column with type badge */}
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <span className={`w-2 h-2 rounded-full mr-2 ${
                            getFulfillmentType(order) === 'Pickup' ? 'bg-gold-500' : 
                            getFulfillmentType(order) === 'POS' ? 'bg-plum-700' : 'bg-plum-500'
                          }`}></span>
                          <div>
                            <div className="text-sm font-medium dark:text-white">{order.orderId || order._id?.substring(order._id.length - 8)}</div>
                            <div className="text-xs text-brown-400 dark:text-white/40">
                              {getFulfillmentType(order)}
                              {order.cashier && <span className="ml-1">• {order.cashier}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      {/* Customer column */}
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium dark:text-white truncate max-w-[150px]">
                          {order.customer?.name || order.userId?.name || 'N/A'}
                        </div>
                        <div className="text-xs text-brown-400 dark:text-white/40 truncate max-w-[150px]">
                          {order.customer?.email || order.userId?.email || 'No email'}
                        </div>
                        <div className="text-xs text-brown-400 dark:text-white/40 truncate max-w-[150px]">
                          {order.customer?.phone || order.userId?.mobile || order.delivery_address?.phoneNumber || 'No phone'}
                        </div>
                      </td>
                      
                      {/* Date column - simplified */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm dark:text-white">
                          {format(new Date(order.saleDate || order.createdAt), 'dd MMM yyyy')}
                        </div>
                        <div className="text-xs text-brown-400 dark:text-white/40">
                          {format(new Date(order.saleDate || order.createdAt), 'HH:mm')}
                        </div>
                      </td>

                      {/* Status column with badge */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {renderStatusBadge(order.status)}
                        <div className="text-xs text-brown-400 dark:text-white/40 mt-1">
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
                          className="px-3 py-1 bg-plum-100 text-plum-700 dark:bg-plum-900/30 dark:text-plum-200 rounded hover:bg-plum-200 dark:hover:bg-plum-800/60"
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
              <FaSpinner className="animate-spin text-2xl text-plum-600" />
              <span className="ml-2 text-brown-500 dark:text-white/55">Loading orders...</span>
            </div>
          ) : currentOrders.length === 0 ? (
            <div className="col-span-full text-center py-8 text-brown-400 dark:text-white/40">
              {scopedOrders.length === 0 ? `No orders found for ${scopeLabel}` : 'No orders match the current filters'}
            </div>
          ) : (
            currentOrders.map(order => (
              <div 
                key={order._id} 
                className="flex h-full flex-col rounded-2xl border border-brown-100 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-dm-border dark:bg-dm-card cursor-pointer"
                onClick={() => setSelectedOrder(order)}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brown-500 dark:text-white/45">
                        <span className={`inline-block h-2.5 w-2.5 rounded-full ${
                          getFulfillmentType(order) === 'Pickup' ? 'bg-gold-500' : 
                          getFulfillmentType(order) === 'POS' ? 'bg-plum-700' : 'bg-plum-500'
                        }`}></span>
                        <span>{getFulfillmentType(order)}</span>
                        {order.cashier && <span className="truncate">• {order.cashier}</span>}
                      </div>
                      <div className="mt-2 text-base font-semibold dark:text-white truncate">#{order.orderId || order._id?.substring(order._id.length - 8)}</div>
                      <div className="text-xs text-brown-400 dark:text-white/40">
                        {format(new Date(order.saleDate || order.createdAt), 'dd MMM yyyy')} • {format(new Date(order.saleDate || order.createdAt), 'HH:mm')}
                      </div>
                    </div>

                    <div className="text-right">
                      {renderStatusBadge(order.status)}
                      <div className="mt-2 text-base font-black tracking-tight text-brown-700 dark:text-brown-300">
                        KSh {Number(order.totalAmt || order.totalPrice || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-ivory px-3 py-2 dark:bg-dm-card-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/45">Customer</div>
                      <div className="mt-1 text-sm font-medium text-charcoal dark:text-white truncate" title={order.customer?.name || order.userId?.name || 'N/A'}>
                        {order.customer?.name || order.userId?.name || 'N/A'}
                      </div>
                      <div className="text-xs text-brown-400 dark:text-white/40 truncate" title={order.customer?.phone || order.userId?.mobile || order.delivery_address?.phoneNumber || 'No phone'}>
                        {order.customer?.phone || order.userId?.mobile || order.delivery_address?.phoneNumber || 'No phone'}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-ivory px-3 py-2 dark:bg-dm-card-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-brown-500 dark:text-white/45">Payment</div>
                      <div className="mt-1 flex items-center text-sm font-medium text-charcoal dark:text-white">
                        <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${
                          order.payment_status === 'paid' || order.paymentStatus === 'paid' ? 'bg-brown-600' : 'bg-gold-400'
                        }`}></span>
                        {(order.payment_status || order.paymentStatus || 'pending').toUpperCase()}
                      </div>
                      <div className="text-xs text-brown-400 dark:text-white/40 truncate" title={order.customer?.email || order.userId?.email || 'No email'}>
                        {order.customer?.email || order.userId?.email || 'No email'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-auto border-t border-brown-100 bg-ivory px-4 py-3 dark:border-dm-border dark:bg-dm-card-2 flex justify-end">
                  <button 
                    className="rounded-xl bg-plum-100 px-3 py-1.5 text-sm font-medium text-plum-700 hover:bg-plum-200 dark:bg-plum-900/30 dark:text-plum-200 dark:hover:bg-plum-800/60"
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
          <div className="text-sm text-brown-400 dark:text-white/40">
            Showing {indexOfFirstOrder + 1}-{Math.min(indexOfLastOrder, filteredOrders.length)} of {filteredOrders.length} orders
          </div>
          <div className="flex space-x-2">
            <button
              className="px-3 py-1 rounded bg-brown-100 dark:bg-dm-card-2 text-charcoal dark:text-white/80 disabled:opacity-50"
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
                        'bg-plum-700 text-white' : 
                        'bg-brown-100 dark:bg-dm-card-2 text-charcoal dark:text-white/80'
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
              className="px-3 py-1 rounded bg-brown-100 dark:bg-dm-card-2 text-charcoal dark:text-white/80 disabled:opacity-50"
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
          onDispatchStateSync={(orderId, updates) => {
            setOnlineOrders((prevOrders) =>
              prevOrders.map((order) =>
                order._id === orderId ? { ...order, ...updates } : order
              )
            );

            setSelectedOrder((current) => (
              current && current._id === orderId
                ? { ...current, ...updates }
                : current
            ));
          }}
        />
      )}
    </div>
  );
};

export default AllOrdersAdmin;
