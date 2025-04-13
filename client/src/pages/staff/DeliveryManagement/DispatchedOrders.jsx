import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

const DispatchedOrders = () => {
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
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
      const response = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/order/by-status`, {
        params: { status: 'dispatched' },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setOrders(response.data.data || []);
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
      
      setDrivers(response.data.data || []);
    } catch (error) {
      console.error('Error fetching available drivers:', error);
      toast.error('Failed to fetch available drivers');
    }
  };

  const handleAssignDriver = async () => {
    if (!selectedOrder || !selectedDriver) {
      toast.error('Please select an order and a driver');
      return;
    }
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/api/delivery/assign-driver`,
        { 
          orderId: selectedOrder._id,
          driverId: selectedDriver,
          notes: assignmentNote
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Driver assigned successfully!');
      setSelectedOrder(null);
      setSelectedDriver('');
      setAssignmentNote('');
      
      // Refresh both lists
      fetchDispatchedOrders();
      fetchAvailableDrivers();
      
    } catch (error) {
      console.error('Error assigning driver:', error);
      toast.error(error.response?.data?.message || 'Failed to assign driver');
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => 
    order.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDriverDetails = (driverId) => {
    const driver = drivers.find(d => d._id === driverId);
    return driver || {};
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Assign Drivers to Orders</h2>
      
      {/* Search input */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by order ID, customer name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      {loading && orders.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No dispatched orders found waiting for driver assignment.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left">Order ID</th>
                <th className="px-4 py-2 text-left">Customer</th>
                <th className="px-4 py-2 text-left">Dispatch Date</th>
                <th className="px-4 py-2 text-left">Delivery Address</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order._id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">{order.orderId}</td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium">{order.userId?.name || 'Unknown'}</div>
                      <div className="text-sm text-gray-600">{order.userId?.email || 'No email'}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {order.dispatchInfo?.dispatchedAt ? (
                      <>
                        {new Date(order.dispatchInfo.dispatchedAt).toLocaleDateString()}
                        <div className="text-xs text-gray-500">
                          {new Date(order.dispatchInfo.dispatchedAt).toLocaleTimeString()}
                        </div>
                      </>
                    ) : (
                      new Date(order.updatedAt).toLocaleDateString()
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {order.delivery_address ? (
                      <div className="text-sm">
                        <div>{order.delivery_address.street || order.delivery_address.address}</div>
                        <div>{order.delivery_address.city}, {order.delivery_address.state}</div>
                      </div>
                    ) : (
                      <span className="text-gray-500">No address details</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600 transition"
                    >
                      Assign Driver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Driver Assignment Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-lg w-full">
            <h3 className="text-xl font-semibold mb-4">Assign Driver to Order</h3>
            
            <div className="mb-4">
              <p className="mb-2">
                <span className="font-semibold">Order:</span> {selectedOrder.orderId}
              </p>
              <p className="mb-2">
                <span className="font-semibold">Customer:</span> {selectedOrder.userId?.name || 'Unknown'}
              </p>
              <p>
                <span className="font-semibold">Delivery Address:</span> {
                  selectedOrder.delivery_address 
                    ? `${selectedOrder.delivery_address.street || selectedOrder.delivery_address.address}, ${selectedOrder.delivery_address.city}`
                    : 'No address details'
                }
              </p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Driver
              </label>
              <select
                value={selectedDriver}
                onChange={(e) => setSelectedDriver(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select a Driver --</option>
                {drivers.map((driver) => (
                  <option key={driver._id} value={driver._id}>
                    {driver.name} ({driver.isAvailable ? 'Available' : 'Busy'}) - 
                    {driver.activeOrdersCount} active orders
                  </option>
                ))}
              </select>
              
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
            
            <div className="mb-4">
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
              >
                Cancel
              </button>
              <button
                onClick={handleAssignDriver}
                disabled={!selectedDriver}
                className={`px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition ${
                  !selectedDriver ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Assign Driver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DispatchedOrders;