import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { FaExclamationTriangle, FaQrcode, FaStore } from 'react-icons/fa';
import { toast } from 'react-toastify';
import PickupVerification from '../../components/PickupVerification';
import { formatDate } from '../../utils/helpers';

const PickupManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    fetchPickupOrders();
  }, [activeTab]);

  const fetchPickupOrders = async () => {
    setLoading(true);
    try {
      const status = activeTab === 'completed' ? 'picked_up' : (activeTab === 'ready' ? 'ready_for_pickup' : 'processing,pending');
      const response = await axios.get(`/api/order/admin/all?fulfillment_type=pickup&status=${status}`);
      if (response.data.success) {
        setOrders(response.data.data);
      } else {
        setError('Failed to fetch pickup orders');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      const response = await axios.post('/api/order/update-status', {
        orderId,
        status,
        note: `Status changed to ${status} by admin`
      });

      if (response.data.success) {
        toast.success(`Order status updated to ${status}`);
        fetchPickupOrders();
      } else {
        toast.error(response.data.message || 'Failed to update status');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'An error occurred');
    }
  };

  const handleVerificationSuccess = () => {
    toast.success('Order verified and marked as picked up');
    fetchPickupOrders();
  };

  const renderOrderCard = (order) => (
    <div key={order._id} className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="bg-gray-50 dark:bg-gray-750 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <div className="font-medium dark:text-white">{order.orderId}</div>
          <div className={`text-sm px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
            {order.status}
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Customer</div>
            <div className="font-medium dark:text-white">{order.userId?.name || 'N/A'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Order Date</div>
            <div className="font-medium dark:text-white">{formatDate(order.createdAt)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Pickup Location</div>
            <div className="font-medium dark:text-white">{order.pickup_location || 'N/A'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Amount</div>
            <div className="font-medium dark:text-white">KSh {order.totalAmt?.toLocaleString() || 'N/A'}</div>
          </div>
        </div>
        
        {order.pickup_instructions && (
          <div className="mb-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">Special Instructions</div>
            <div className="p-2 bg-gray-50 dark:bg-gray-750 rounded mt-1 text-sm dark:text-gray-300">
              {order.pickup_instructions}
            </div>
          </div>
        )}
        
        {order.pickupVerificationCode && (
          <div className="mb-4 p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-750">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">Verification Code</div>
              <div className="font-mono font-bold text-primary-100">
                <FaQrcode className="inline mr-1" />
                {order.pickupVerificationCode}
              </div>
            </div>
          </div>
        )}
        
        <div className="flex justify-between items-center mt-4">
          {activeTab === 'pending' && (
            <button
              onClick={() => updateOrderStatus(order._id, 'ready_for_pickup')}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-100"
            >
              Mark Ready for Pickup
            </button>
          )}
          
          {activeTab === 'ready' && (
            <button
              onClick={() => updateOrderStatus(order._id, 'picked_up')}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Mark as Picked Up
            </button>
          )}
          
          {activeTab === 'completed' && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Completed on {formatDate(order.statusHistory?.find(h => h.status === 'picked_up')?.timestamp || order.updatedAt)}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'ready_for_pickup':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'picked_up':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'pending':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  return (
    <div>
      <div className="flex items-center mb-6">
        <FaStore className="text-primary-100 text-2xl mr-2" />
        <h1 className="text-2xl font-bold dark:text-white">Pickup Management</h1>
      </div>
      
      <div className="mb-6">
        <PickupVerification onSuccess={handleVerificationSuccess} />
      </div>
      
      <div className="mb-6">
        <div className="sm:hidden">
          <label htmlFor="tabs" className="sr-only">Select a tab</label>
          <select
            id="tabs"
            name="tabs"
            className="block w-full rounded-md border-gray-300 dark:border-gray-700 focus:border-primary-100 focus:ring-primary-100 dark:bg-gray-800 dark:text-white"
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
          >
            <option value="pending">Pending Orders</option>
            <option value="ready">Ready for Pickup</option>
            <option value="completed">Completed Pickups</option>
          </select>
        </div>
        
        <div className="hidden sm:block">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                className={`${
                  activeTab === 'pending'
                    ? 'border-primary-100 text-primary-100'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                onClick={() => setActiveTab('pending')}
              >
                Pending Orders
              </button>
              <button
                className={`${
                  activeTab === 'ready'
                    ? 'border-primary-100 text-primary-100'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                onClick={() => setActiveTab('ready')}
              >
                Ready for Pickup
              </button>
              <button
                className={`${
                  activeTab === 'completed'
                    ? 'border-primary-100 text-primary-100'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                onClick={() => setActiveTab('completed')}
              >
                Completed Pickups
              </button>
            </nav>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <svg className="animate-spin h-8 w-8 text-primary-100" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-md text-red-700 dark:text-red-400">
          <FaExclamationTriangle className="inline mr-2" />
          {error}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <FaStore className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">No orders found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {activeTab === 'pending' ? 'No pending pickup orders available.' : 
             activeTab === 'ready' ? 'No orders are ready for pickup yet.' : 
             'No completed pickup orders found.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {orders.map(renderOrderCard)}
        </div>
      )}
    </div>
  );
};

export default PickupManagement;
