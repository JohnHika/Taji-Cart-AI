import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
    FaBox,
    FaCalendarCheck,
    FaExclamationTriangle,
    FaMapMarkerAlt,
    FaMotorcycle,
    FaSpinner,
    FaStar,
    FaTruck,
    FaUser
} from 'react-icons/fa';
import { useSelector } from 'react-redux';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const user = useSelector(state => state.user);
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Placeholder API calls - replace with your actual endpoints
        // const dashboardResponse = await Axios({
        //   url: '/api/delivery/dashboard',
        //   method: 'GET'
        // });
        
        // For now, using dummy data
        setDashboardData({
          pendingDeliveries: 3,
          todayDeliveries: 5,
          totalDeliveries: 42,
          averageRating: 4.8
        });
        
        setActiveOrders([
          {
            _id: '1',
            orderId: 'ORD38912',
            createdAt: new Date(),
            status: 'driver_assigned',
            customer: {
              name: 'Jane Smith',
              address: '123 Main St, Nairobi',
              phone: '+254712345678'
            },
            deliveryAddress: '123 Main St, Nairobi, Kenya',
            total: 2500
          },
          {
            _id: '2',
            orderId: 'ORD38915',
            createdAt: new Date(),
            status: 'out_for_delivery',
            customer: {
              name: 'John Doe',
              address: '456 Park Ave, Nairobi',
              phone: '+254723456789'
            },
            deliveryAddress: '456 Park Ave, Nairobi, Kenya',
            total: 1800
          }
        ]);
        
        setError(null);
      } catch (err) {
        console.error('Error fetching delivery dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');
        toast.error('Error loading dashboard data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);
  
  const handleStatusUpdate = (orderId, newStatus) => {
    toast.success(`Order ${orderId} status updated to ${newStatus}`);
    // Update the orders list accordingly
    setActiveOrders(activeOrders.map(order => 
      order._id === orderId ? { ...order, status: newStatus } : order
    ));
  };
  
  const getNextStatus = (currentStatus) => {
    switch (currentStatus) {
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
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <FaSpinner className="animate-spin text-4xl text-primary-200 mb-4" />
        <p className="text-lg text-gray-700 dark:text-gray-300">Loading delivery dashboard...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <FaExclamationTriangle className="text-4xl text-red-500 mb-4" />
        <p className="text-lg text-red-600 dark:text-red-400 mb-2">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary-200 text-white rounded hover:bg-primary-300 transition"
        >
          Retry
        </button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2 dark:text-white">Delivery Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">Welcome back, {user.name}</p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
              <FaMotorcycle className="text-blue-500 dark:text-blue-300" size={24} />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Deliveries</h2>
              <p className="text-3xl font-semibold text-gray-800 dark:text-white">{dashboardData?.pendingDeliveries || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full">
              <FaCalendarCheck className="text-green-500 dark:text-green-300" size={24} />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Today's Deliveries</h2>
              <p className="text-3xl font-semibold text-gray-800 dark:text-white">{dashboardData?.todayDeliveries || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full">
              <FaBox className="text-purple-500 dark:text-purple-300" size={24} />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Completed</h2>
              <p className="text-3xl font-semibold text-gray-800 dark:text-white">{dashboardData?.totalDeliveries || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-yellow-100 dark:bg-yellow-900 p-3 rounded-full">
              <FaStar className="text-yellow-500 dark:text-yellow-300" size={24} />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Rating</h2>
              <p className="text-3xl font-semibold text-gray-800 dark:text-white">
                {dashboardData?.averageRating?.toFixed(1) || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Active Orders */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold dark:text-white">Active Orders</h2>
        </div>
        
        {activeOrders.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <FaTruck className="mx-auto text-gray-400 dark:text-gray-500 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">No Active Deliveries</h3>
            <p className="text-gray-500 dark:text-gray-400">
              You currently don't have any active deliveries assigned to you.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {activeOrders.map(order => (
              <div key={order._id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
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
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Customer Information</h4>
                    <div className="flex items-start">
                      <FaUser className="text-gray-400 mt-1 mr-2" />
                      <div>
                        <p className="text-gray-800 dark:text-gray-200 font-medium">{order.customer.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{order.customer.phone}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Delivery Address</h4>
                    <div className="flex items-start">
                      <FaMapMarkerAlt className="text-gray-400 mt-1 mr-2" />
                      <div>
                        <p className="text-gray-800 dark:text-gray-200">{order.deliveryAddress}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Order Summary</h4>
                    <div className="flex justify-between text-gray-700 dark:text-gray-300">
                      <span>Order Total:</span>
                      <span className="font-medium">${order.total.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <a
                      href={`https://maps.google.com/?q=${order.deliveryAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm font-medium text-primary-200 hover:text-primary-300 dark:text-primary-300 dark:hover:text-primary-400"
                    >
                      <FaMapMarkerAlt className="mr-1" />
                      Open in Maps
                    </a>
                    
                    {getNextStatus(order.status) && (
                      <button 
                        onClick={() => handleStatusUpdate(order._id, getNextStatus(order.status))}
                        className="px-4 py-2 bg-primary-200 text-white rounded-md hover:bg-primary-300 transition-colors flex items-center"
                      >
                        {order.status === 'nearby' ? (
                          <>
                            <FaCheckCircle className="mr-2" />
                            Mark Delivered
                          </>
                        ) : order.status === 'out_for_delivery' ? (
                          <>
                            <FaMapMarkerAlt className="mr-2" />
                            Mark Nearby
                          </>
                        ) : (
                          <>
                            <FaTruck className="mr-2" />
                            Start Delivery
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
