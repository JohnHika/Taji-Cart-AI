import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FaCheck, FaSpinner } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const PendingDispatch = () => {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPendingOrders();
  }, [sortBy, sortDirection]);

  const fetchPendingOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_SERVER_URL}/api/delivery/pending-orders?sort=${sortBy}&direction=${sortDirection}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setPendingOrders(response.data.data);
      } else {
        setError(response.data.message || "Failed to fetch pending orders");
        toast.error(response.data.message || "Failed to fetch pending orders");
      }
    } catch (error) {
      console.error("Error fetching pending orders:", error);
      setError(error.response?.data?.message || "An error occurred while fetching pending orders");
      toast.error(error.response?.data?.message || "An error occurred while fetching pending orders");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  const handleSelectOrder = (orderId) => {
    if (selectedOrders.includes(orderId)) {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
    } else {
      setSelectedOrders([...selectedOrders, orderId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map(order => order._id));
    }
  };

  const dispatchOrderById = async (orderId, notes = '') => {
    try {
      setProcessing(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/api/delivery/dispatch`,
        { 
          orderId, 
          notes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        toast.success(`Order #${response.data.data.orderId} dispatched successfully`);
        return true;
      } else {
        toast.error(response.data.message || "Failed to dispatch order");
        return false;
      }
    } catch (error) {
      console.error("Error dispatching order:", error);
      toast.error(error.response?.data?.message || "An error occurred while dispatching the order");
      return false;
    } finally {
      setProcessing(false);
    }
  };

  const handleDispatchSingle = async (orderId) => {
    const success = await dispatchOrderById(orderId);
    if (success) {
      // Remove the order from the list
      setPendingOrders(prev => prev.filter(order => order._id !== orderId));
      // Remove from selected orders if it was selected
      setSelectedOrders(prev => prev.filter(id => id !== orderId));
    }
  };

  const handleDispatchSelected = async () => {
    if (selectedOrders.length === 0) {
      toast.error('Please select at least one order to dispatch');
      return;
    }

    setProcessing(true);
    let successCount = 0;
    let failCount = 0;

    try {
      // Process each order sequentially 
      for (const orderId of selectedOrders) {
        const success = await dispatchOrderById(orderId);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      // Show summary toast
      if (successCount > 0) {
        toast.success(`Successfully dispatched ${successCount} orders`);
      }
      
      if (failCount > 0) {
        toast.error(`Failed to dispatch ${failCount} orders`);
      }

      // Refresh the list and clear selected orders
      setSelectedOrders([]);
      fetchPendingOrders();
      
      // If all were successful, navigate to dispatched orders view
      if (failCount === 0 && successCount > 0) {
        navigate('/staff/delivery/dispatched');
      }
    } catch (error) {
      console.error("Error in batch dispatch:", error);
      toast.error("An error occurred during batch dispatch");
    } finally {
      setProcessing(false);
    }
  };

  const filteredOrders = pendingOrders.filter(order => 
    order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (order.customer.phone && order.customer.phone.includes(searchTerm))
  );

  const getSortIcon = (field) => {
    if (sortBy !== field) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Pending Orders for Dispatch</h1>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
          </div>
          <button
            onClick={fetchPendingOrders}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? (
              <FaSpinner className="mr-2 -ml-1 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 -ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
            )}
            Refresh
          </button>
        </div>
      </div>

      {loading && !pendingOrders.length ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error && !pendingOrders.length ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
          <button 
            onClick={fetchPendingOrders}
            className="ml-2 underline"
          >
            Try Again
          </button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No pending orders</h3>
          <p className="mt-1 text-sm text-gray-500">
            All orders have been dispatched or there are no new orders.
          </p>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                onChange={handleSelectAll}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                {selectedOrders.length > 0 ? `${selectedOrders.length} selected` : 'Select all'}
              </span>
            </div>
            <button
              onClick={handleDispatchSelected}
              disabled={selectedOrders.length === 0 || processing}
              className={`px-4 py-2 rounded-md text-sm font-medium inline-flex items-center ${
                selectedOrders.length > 0 && !processing
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {processing ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <FaCheck className="mr-2" />
                  Dispatch Selected Orders
                </>
              )}
            </button>
          </div>

          <div className="bg-white shadow overflow-hidden rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-6">
                    <span className="sr-only">Select</span>
                  </th>
                  <th 
                    scope="col" 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('orderId')}
                  >
                    <div className="flex items-center">
                      Order ID
                      <span className="ml-1">{getSortIcon('orderId')}</span>
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('customer.name')}
                  >
                    <div className="flex items-center">
                      Customer
                      <span className="ml-1">{getSortIcon('customer.name')}</span>
                    </div>
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Address
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th 
                    scope="col" 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('total')}
                  >
                    <div className="flex items-center">
                      Total
                      <span className="ml-1">{getSortIcon('total')}</span>
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center">
                      Date
                      <span className="ml-1">{getSortIcon('createdAt')}</span>
                    </div>
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order._id)}
                        onChange={() => handleSelectOrder(order._id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 font-medium">{order.orderId}</span>
                      <div className="text-xs text-gray-500">{order.paymentStatus}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{order.customer.name}</div>
                      <div className="text-sm text-gray-500">{order.customer.phone}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">{order.deliveryAddress.street}</div>
                      <div className="text-sm text-gray-500">{order.deliveryAddress.city || ''}{order.deliveryAddress.city && order.deliveryAddress.neighborhood ? ', ' : ''}{order.deliveryAddress.neighborhood || ''}</div>
                      {order.deliveryAddress.landmark && (
                        <div className="text-xs text-gray-500 italic">Near {order.deliveryAddress.landmark}</div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">{order.items?.length || 0} items</div>
                      <div className="text-xs text-gray-500">
                        {order.items && order.items.slice(0, 2).map((item, index) => (
                          <div key={index}>{item.quantity}x {item.name}</div>
                        ))}
                        {order.items && order.items.length > 2 && <div>+{order.items.length - 2} more</div>}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => handleDispatchSingle(order._id)}
                        disabled={processing}
                        className={`text-white bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded-md text-xs ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {processing ? (
                          <FaSpinner className="animate-spin inline-block" />
                        ) : "Dispatch"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingDispatch;