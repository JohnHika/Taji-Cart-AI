import React, { useEffect, useState } from 'react';
import { FaSpinner, FaTruck, FaMapMarkerAlt, FaUser, FaCalendarCheck } from 'react-icons/fa';
import toast from 'react-hot-toast';
import Axios from '../../utils/Axios';
import AxiosToastError from '../../utils/AxiosToastError';

const ActiveDeliveries = () => {
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchActiveDeliveries = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await Axios({
          url: '/api/delivery/active-orders',
          method: 'GET'
        });
        
        if (response.data.success) {
          setActiveOrders(response.data.data || []);
        } else {
          setError(response.data.message || 'Failed to fetch active deliveries');
          toast.error(response.data.message || 'Failed to fetch active deliveries');
        }
      } catch (error) {
        console.error('Error fetching active deliveries:', error);
        setError('Failed to load active deliveries. Please try again later.');
        AxiosToastError(error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchActiveDeliveries();
    
    // Set up polling to refresh data every 30 seconds
    const intervalId = setInterval(fetchActiveDeliveries, 30000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  const getStatusLabel = (status) => {
    switch (status) {
      case 'driver_assigned':
        return 'Assigned';
      case 'out_for_delivery':
        return 'Out for Delivery';
      case 'nearby':
        return 'Nearby';
      case 'delivered':
        return 'Delivered';
      default:
        return status;
    }
  };
  
  const getNextStatus = (status) => {
    switch (status) {
      case 'driver_assigned':
        return 'out_for_delivery';
      case 'out_for_delivery':
        return 'nearby';
      case 'nearby':
        return 'delivered';
      default:
        return null;
    }
  };
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const response = await Axios({
        url: '/api/delivery/update-status',
        method: 'POST',
        data: {
          orderId,
          status: newStatus
        }
      });
      
      if (response.data.success) {
        toast.success(`Order status updated to ${getStatusLabel(newStatus)}`);
        
        // Update local state to reflect the change
        setActiveOrders(prev => 
          prev.map(order => 
            order._id === orderId ? {...order, status: newStatus} : order
          )
        );
        
        // If the order is delivered, remove it from the active list
        if (newStatus === 'delivered') {
          setActiveOrders(prev => prev.filter(order => order._id !== orderId));
        }
      } else {
        toast.error(response.data.message || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      AxiosToastError(error);
    }
  };
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <FaSpinner className="animate-spin text-4xl text-primary-200 mb-4" />
        <p className="text-lg text-gray-700 dark:text-gray-300">Loading active deliveries...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-4 rounded-lg">
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 dark:text-white">Active Deliveries</h1>
      
      {activeOrders.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <FaTruck className="mx-auto text-gray-400 dark:text-gray-500 mb-4" size={48} />
          <p className="text-gray-600 dark:text-gray-400">
            You don't have any active deliveries at the moment.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {activeOrders.map(order => (
            <div 
              key={order._id} 
              className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden"
            >
              <div className={`px-6 py-4 border-b border-gray-200 dark:border-gray-700 ${
                order.status === 'driver_assigned' ? 'bg-blue-50 dark:bg-blue-900/20' :
                order.status === 'out_for_delivery' ? 'bg-yellow-50 dark:bg-yellow-900/20' :
                'bg-green-50 dark:bg-green-900/20'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                      Order #{order.orderId}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    order.status === 'driver_assigned' ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200' :
                    order.status === 'out_for_delivery' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200' :
                    'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200'
                  }`}>
                    {getStatusLabel(order.status)}
                  </span>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Customer</h4>
                    <div className="flex items-start">
                      <FaUser className="text-gray-400 mt-1 mr-2" />
                      <div>
                        <p className="text-gray-800 dark:text-gray-200 font-medium">{order.customer.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{order.customer.phone}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Delivery Address</h4>
                    <div className="flex items-start">
                      <FaMapMarkerAlt className="text-gray-400 mt-1 mr-2" />
                      <p className="text-gray-800 dark:text-gray-200">{order.deliveryAddress}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center border-t dark:border-gray-700 pt-4 mt-4">
                  <div className="font-medium">
                    <span className="text-gray-500 dark:text-gray-400">Total: </span>
                    <span className="text-gray-800 dark:text-white">KSh {order.total.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex space-x-3">
                    <a
                      href={`https://maps.google.com/?q=${order.deliveryAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 border border-primary-200 text-primary-200 rounded hover:bg-primary-100 dark:hover:bg-primary-900/20 flex items-center"
                    >
                      <FaMapMarkerAlt className="mr-1" />
                      Map
                    </a>
                    
                    {getNextStatus(order.status) && (
                      <button 
                        onClick={() => handleStatusUpdate(order._id, getNextStatus(order.status))}
                        className="px-3 py-1 bg-primary-200 text-white rounded hover:bg-primary-300 flex items-center"
                      >
                        {order.status === 'nearby' ? (
                          <>
                            <FaCalendarCheck className="mr-1" />
                            Mark Delivered
                          </>
                        ) : order.status === 'out_for_delivery' ? (
                          <>
                            <FaMapMarkerAlt className="mr-1" />
                            Nearby
                          </>
                        ) : (
                          <>
                            <FaTruck className="mr-1" />
                            Start
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActiveDeliveries;
