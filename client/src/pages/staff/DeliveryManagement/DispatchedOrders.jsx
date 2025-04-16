import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FaMapMarkerAlt, FaSpinner, FaUserCircle } from 'react-icons/fa';

const DispatchedOrders = () => {
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigningOrder, setAssigningOrder] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [assignmentNote, setAssignmentNote] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDispatchedOrders();
    fetchAvailableDrivers();
  }, []);

  const fetchDispatchedOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Using a query that specifically looks for dispatched delivery orders
      const response = await axios.get(
        `${import.meta.env.VITE_SERVER_URL}/api/order/list`, 
        {
          params: { 
            status: 'dispatched',
            fulfillment_type: 'delivery',
            limit: 50
          },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.success && response.data.data) {
        setOrders(response.data.data);
      } else {
        // If direct API fails, try the backup endpoint
        const backupResponse = await axios.get(
          `${import.meta.env.VITE_SERVER_URL}/api/order/by-status`,
          {
            params: { status: 'dispatched' },
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        
        if (backupResponse.data.data) {
          // Filter to only include delivery orders
          const deliveryOrders = backupResponse.data.data.filter(
            order => order.fulfillment_type === 'delivery' || order.deliveryMethod === 'delivery'
          );
          setOrders(deliveryOrders);
        } else {
          setOrders([]);
        }
      }
    } catch (error) {
      console.error('Error fetching dispatched orders:', error);
      toast.error('Failed to fetch dispatched orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableDrivers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_SERVER_URL}/api/delivery/available-drivers`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setDrivers(response.data.data || []);
      } else {
        toast.error('Failed to fetch available drivers');
        setDrivers([]);
      }
    } catch (error) {
      console.error('Error fetching available drivers:', error);
      toast.error('Failed to fetch available drivers');
      setDrivers([]);
    }
  };

  const handleAssignDriver = async () => {
    if (!selectedOrder || !selectedDriver) {
      toast.error('Please select an order and a driver');
      return;
    }
    
    try {
      setAssigningOrder(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/api/delivery/assign-driver`,
        { 
          orderId: selectedOrder._id,
          driverId: selectedDriver,
          notes: assignmentNote
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        toast.success('Driver assigned successfully!');
        // Close the modal and reset form
        setSelectedOrder(null);
        setSelectedDriver('');
        setAssignmentNote('');
        
        // Refresh both lists
        fetchDispatchedOrders();
        fetchAvailableDrivers();
      } else {
        toast.error(response.data.message || 'Failed to assign driver');
      }
    } catch (error) {
      console.error('Error assigning driver:', error);
      toast.error(error.response?.data?.message || 'Failed to assign driver');
    } finally {
      setAssigningOrder(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    if (!searchTerm) return true;
    
    const orderId = order.orderId?.toLowerCase() || '';
    const customerName = order.userId?.name?.toLowerCase() || '';
    const customerEmail = order.userId?.email?.toLowerCase() || '';
    const searchLower = searchTerm.toLowerCase();
    
    return orderId.includes(searchLower) || 
           customerName.includes(searchLower) || 
           customerEmail.includes(searchLower);
  });

  const getDriverDetails = (driverId) => {
    const driver = drivers.find(d => d._id === driverId);
    return driver || {};
  };

  return (
    <div className="container mx-auto px-4">
      <h2 className="text-xl font-semibold mb-6">Dispatched Orders</h2>
      
      {/* Search and refresh controls */}
      <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
        <div className="relative flex-grow">
          <input
            type="text"
            placeholder="Search by order ID or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        <button 
          onClick={fetchDispatchedOrders}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition flex items-center justify-center"
          disabled={loading}
        >
          {loading ? (
            <>
              <FaSpinner className="animate-spin mr-2" />
              Loading...
            </>
          ) : (
            'Refresh Orders'
          )}
        </button>
      </div>
      
      {/* Orders display */}
      {loading && orders.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-64">
          <FaSpinner className="animate-spin h-8 w-8 text-blue-500 mb-4" />
          <p>Loading dispatched orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
            <FaMapMarkerAlt className="h-full w-full" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No dispatched orders found</h3>
          <p className="text-gray-500 mb-6">
            There are no orders waiting for driver assignment at the moment.
          </p>
          <button
            onClick={fetchDispatchedOrders}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Refresh List
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dispatch Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Delivery Address
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{order.orderId}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <FaUserCircle className="h-6 w-6 text-gray-400" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{order.userId?.name || 'Unknown Customer'}</div>
                          <div className="text-sm text-gray-500">{order.userId?.email || 'No email'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {order.dispatchInfo?.dispatchedAt ? (
                          new Date(order.dispatchInfo.dispatchedAt).toLocaleDateString()
                        ) : (
                          new Date(order.updatedAt || order.createdAt).toLocaleDateString()
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {order.dispatchInfo?.dispatchedAt ? (
                          new Date(order.dispatchInfo.dispatchedAt).toLocaleTimeString()
                        ) : (
                          new Date(order.updatedAt || order.createdAt).toLocaleTimeString()
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {order.delivery_address ? (
                        <div className="text-sm text-gray-900">
                          <div>{order.delivery_address.street || order.delivery_address.address}</div>
                          <div className="text-xs text-gray-500">
                            {order.delivery_address.city}
                            {order.delivery_address.neighborhood && `, ${order.delivery_address.neighborhood}`}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">No address details</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="text-blue-600 hover:text-blue-900 px-4 py-2 border border-blue-600 rounded-md hover:bg-blue-50 transition"
                      >
                        Assign Driver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Driver Assignment Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Assign Driver to Order</h3>
            
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <p className="mb-2">
                <span className="font-semibold">Order ID:</span> {selectedOrder.orderId}
              </p>
              <p className="mb-2">
                <span className="font-semibold">Customer:</span> {selectedOrder.userId?.name || 'Unknown'}
              </p>
              <p className="mb-2">
                <span className="font-semibold">Delivery Address:</span> {
                  selectedOrder.delivery_address 
                    ? `${selectedOrder.delivery_address.street || selectedOrder.delivery_address.address}, ${selectedOrder.delivery_address.city}`
                    : 'No address details'
                }
              </p>
              {selectedOrder.items && (
                <div>
                  <span className="font-semibold">Items:</span> {selectedOrder.items.length} items
                  <div className="text-sm text-gray-500 mt-1">
                    {selectedOrder.items.slice(0, 3).map((item, idx) => (
                      <div key={idx}>{item.quantity || 1}x {item.name || item.productName || 'Item'}</div>
                    ))}
                    {selectedOrder.items.length > 3 && (
                      <div>+{selectedOrder.items.length - 3} more items</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Driver
              </label>
              {drivers.length === 0 ? (
                <div className="p-3 bg-yellow-50 text-yellow-700 rounded-md mb-2">
                  No delivery drivers available. Please add drivers to the system first.
                </div>
              ) : (
                <select
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select a Driver --</option>
                  {drivers.map((driver) => (
                    <option key={driver._id} value={driver._id}>
                      {driver.name} ({driver.isAvailable ? 'Available' : 'Busy'}) - 
                      {driver.activeOrdersCount || 0} active orders
                    </option>
                  ))}
                </select>
              )}
              
              {selectedDriver && (
                <div className="mt-3 p-3 bg-blue-50 rounded-md">
                  <h4 className="font-medium text-blue-800">Selected Driver Details</h4>
                  <div className="mt-2 text-sm">
                    <p><span className="font-medium">Name:</span> {getDriverDetails(selectedDriver).name}</p>
                    <p><span className="font-medium">Contact:</span> {getDriverDetails(selectedDriver).contact?.mobile || 'N/A'}</p>
                    <p>
                      <span className="font-medium">Rating:</span> {
                        typeof getDriverDetails(selectedDriver).efficiencyScore === 'object' 
                          ? getDriverDetails(selectedDriver).efficiencyScore.avgRating
                          : 'N/A'
                      }
                    </p>
                    <p>
                      <span className="font-medium">Completed Deliveries:</span> {
                        typeof getDriverDetails(selectedDriver).efficiencyScore === 'object'
                          ? getDriverDetails(selectedDriver).efficiencyScore.completedOrders
                          : 'N/A'
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assignment Notes (optional)
              </label>
              <textarea
                value={assignmentNote}
                onChange={(e) => setAssignmentNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add any special instructions for the driver..."
              ></textarea>
            </div>
            
            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setSelectedOrder(null);
                  setSelectedDriver('');
                  setAssignmentNote('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition"
                disabled={assigningOrder}
              >
                Cancel
              </button>
              <button
                onClick={handleAssignDriver}
                disabled={!selectedDriver || assigningOrder || drivers.length === 0}
                className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition flex items-center justify-center ${
                  (!selectedDriver || assigningOrder || drivers.length === 0) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {assigningOrder ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    Assigning...
                  </>
                ) : (
                  'Assign Driver'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DispatchedOrders;