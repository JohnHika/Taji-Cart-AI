import axios from 'axios';
import React, { useCallback, useEffect, useState } from 'react';
import { BiTargetLock } from 'react-icons/bi';
import { FaBoxOpen, FaCalculator, FaCalendarCheck, FaCheck, FaClock, FaMapMarkerAlt, FaRedo, FaShoppingCart, FaTruck, FaUserCircle } from 'react-icons/fa';
import { HiOutlineStatusOnline } from 'react-icons/hi';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { buildApiUrl } from '../../common/apiBaseUrl';

// Dashboard component for staff members
const Dashboard = () => {
  const user = useSelector((state) => state.user);
  
  // State management for dashboard data
  const [dashboardData, setDashboardData] = useState({
    counts: {
      pendingOrders: 0,
      dispatchedOrders: 0,
      activeDeliveries: 0,
      completedToday: 0,
      availableDrivers: 0,
      totalDrivers: 0
    },
    recentOrders: [],
    activeDrivers: [],
    deliveryPerformance: {
      avgDeliveryTime: 0,
      deliveriesLast7Days: 0,
      dailyStats: []
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [showDriversMap, setShowDriversMap] = useState(false);
  
  // Colors for visual elements
  const COLORS = ['#4B1E3E', '#7B3D6E', '#C9943A', '#BD7EAF', '#5F2B50', '#9C5A8E'];
  
  // Fetch dashboard data from API
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await axios.get(
        buildApiUrl('/api/delivery/dashboard-stats'),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setDashboardData(response.data.data);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError("Failed to load dashboard data. Please try again later.");
      setLoading(false);
      
      // Use placeholder data for development if API fails
      if (import.meta.env.DEV) {
        setDashboardData({
          counts: {
            pendingOrders: 12,
            dispatchedOrders: 5,
            activeDeliveries: 8,
            completedToday: 23,
            availableDrivers: 4,
            totalDrivers: 7
          },
          recentOrders: [
            { _id: '1', orderId: '2351', status: 'dispatched', customerName: 'John Doe', total: 1200, createdAt: new Date().toISOString() },
            { _id: '2', orderId: '2344', status: 'driver_assigned', customerName: 'Jane Smith', total: 850, createdAt: new Date().toISOString() },
            { _id: '3', orderId: '2332', status: 'delivered', customerName: 'Robert Johnson', total: 2100, createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() }
          ],
          activeDrivers: [
            { _id: '1', name: 'David Driver', isAvailable: true, activeOrdersCount: 1, currentLocation: { lat: -1.2855, lng: 36.8126, lastUpdated: new Date() } },
            { _id: '2', name: 'Sarah Speedy', isAvailable: false, activeOrdersCount: 3, currentLocation: { lat: -1.2755, lng: 36.8226, lastUpdated: new Date() } }
          ],
          deliveryPerformance: {
            avgDeliveryTime: 45,
            deliveriesLast7Days: 87,
            dailyStats: [
              { date: '2025-04-07', count: 11 },
              { date: '2025-04-08', count: 14 },
              { date: '2025-04-09', count: 9 },
              { date: '2025-04-10', count: 16 },
              { date: '2025-04-11', count: 12 },
              { date: '2025-04-12', count: 15 },
              { date: '2025-04-13', count: 10 }
            ]
          },
          lastUpdated: new Date()
        });
      }
    }
  }, []);

  // Set up initial data load and refresh interval
  useEffect(() => {
    // Initial data fetch
    fetchDashboardData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);
    
    setRefreshInterval(interval);
    
    // Clean up interval on unmount
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
      if (interval) clearInterval(interval);
    };
  }, [fetchDashboardData]);
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Get appropriate icon and color for order status
  const getStatusInfo = (status) => {
    switch (status) {
      case 'confirmed':
        return { icon: <FaClock className="text-plum-600" />, color: 'bg-plum-100 text-plum-800 dark:bg-plum-900/40 dark:text-plum-200' };
      case 'dispatched':
        return { icon: <FaTruck className="text-yellow-600" />, color: 'bg-yellow-100 text-yellow-800' };
      case 'driver_assigned':
        return { icon: <FaUserCircle className="text-plum-700" />, color: 'bg-plum-100 text-plum-800 dark:bg-plum-900/40 dark:text-plum-200' };
      case 'out_for_delivery':
        return { icon: <BiTargetLock className="text-plum-800" />, color: 'bg-plum-200 text-plum-900 dark:bg-plum-800/50 dark:text-plum-100' };
      case 'nearby':
        return { icon: <FaMapMarkerAlt className="text-blush-500" />, color: 'bg-blush-100 text-blush-800 dark:bg-blush-900/30 dark:text-blush-200' };
      case 'delivered':
        return { icon: <FaCheck className="text-green-500" />, color: 'bg-green-100 text-green-800' };
      default:
        return { icon: <FaClock className="text-brown-400 dark:text-white/40" />, color: 'bg-ivory text-charcoal dark:bg-dm-card-2 dark:text-white' };
    }
  };
  
  // Format status for display
  const formatStatus = (status) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Get percentage of available drivers
  const getDriverAvailabilityPercentage = () => {
    const { availableDrivers, totalDrivers } = dashboardData.counts;
    if (totalDrivers === 0) return 0;
    return Math.round((availableDrivers / totalDrivers) * 100);
  };

  // Get delivery status data for simple visualization
  const getDeliveryStatusData = () => {
    const { pendingOrders, dispatchedOrders, activeDeliveries } = dashboardData.counts;
    const total = pendingOrders + dispatchedOrders + activeDeliveries;
    
    return [
      { name: 'Pending', value: pendingOrders, color: '#4B1E3E', percentage: total > 0 ? Math.round((pendingOrders / total) * 100) : 0 },
      { name: 'Dispatched', value: dispatchedOrders, color: '#7B3D6E', percentage: total > 0 ? Math.round((dispatchedOrders / total) * 100) : 0 },
      { name: 'Active', value: activeDeliveries, color: '#C9943A', percentage: total > 0 ? Math.round((activeDeliveries / total) * 100) : 0 }
    ];
  };

  return (
    <div className="container mx-auto px-4 py-6 dark:bg-dm-surface dark:text-white">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Header with welcome message */}
        <div>
          <h1 className="text-2xl font-bold text-charcoal dark:text-white">Staff Dashboard</h1>
          <p className="text-sm text-brown-400 dark:text-white/40">
            Welcome, {user?.firstName || user?.name || 'Staff Member'} | Last updated: {formatDate(dashboardData.lastUpdated || new Date())}
          </p>
        </div>
        
        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-plum-700 hover:bg-plum-600 focus:outline-none"
          >
            <FaRedo className="mr-2 h-4 w-4" />
            Refresh
          </button>
          <Link
            to="/dashboard/staff/delivery"
            className="inline-flex items-center px-4 py-2 border border-brown-200 dark:border-dm-border rounded-md shadow-sm text-sm font-medium text-charcoal dark:text-white/90 bg-white dark:bg-dm-card hover:bg-plum-50 dark:hover:bg-dm-card-2 focus:outline-none"
          >
            <FaTruck className="mr-2 h-4 w-4" />
            Delivery Management
          </Link>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
          <p>{error}</p>
          <button 
            className="text-sm underline mt-2" 
            onClick={fetchDashboardData}
          >
            Try again
          </button>
        </div>
      )}
      
      {/* Main dashboard layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column - stats and actions */}
        <div className="lg:col-span-8 space-y-6">
          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="animate-pulse bg-white dark:bg-dm-card rounded-lg shadow border border-brown-100 dark:border-dm-border p-5 h-32">
                  <div className="h-5 bg-brown-100 dark:bg-dm-card-2 rounded w-1/2 mb-4"></div>
                  <div className="h-8 bg-brown-100 dark:bg-dm-card-2 rounded w-1/3"></div>
                </div>
              ))
            ) : (
              <>
                <Link to="/dashboard/staff/delivery/pending" className="bg-plum-50 dark:bg-plum-900/20 rounded-lg shadow hover:shadow-lg transition-shadow border border-plum-100 dark:border-plum-800 p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-plum-800 dark:text-plum-200">Pending Orders</p>
                      <p className="text-3xl font-bold text-plum-900 dark:text-plum-100">{dashboardData.counts.pendingOrders}</p>
                    </div>
                    <div className="bg-plum-100 dark:bg-plum-800 p-3 rounded-full">
                      <FaClock className="text-plum-600 dark:text-plum-200 w-6 h-6" />
                    </div>
                  </div>
                  <div className="text-xs text-plum-700 dark:text-plum-200 mt-4">
                    <span className="font-medium">Action:</span> Dispatch these orders
                  </div>
                </Link>
                
                <Link to="/dashboard/staff/delivery/dispatched" className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg shadow hover:shadow-lg transition-shadow border border-yellow-100 dark:border-yellow-800 p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Dispatched</p>
                      <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">{dashboardData.counts.dispatchedOrders}</p>
                    </div>
                    <div className="bg-yellow-100 dark:bg-yellow-800 p-3 rounded-full">
                      <FaTruck className="text-yellow-500 dark:text-yellow-300 w-6 h-6" />
                    </div>
                  </div>
                  <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-4">
                    <span className="font-medium">Action:</span> Assign drivers
                  </div>
                </Link>
                
                <Link to="/dashboard/staff/delivery/active" className="bg-blush-50 dark:bg-plum-900/25 rounded-lg shadow hover:shadow-lg transition-shadow border border-blush-200 dark:border-plum-800 p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-plum-800 dark:text-plum-200">Active Deliveries</p>
                      <p className="text-3xl font-bold text-plum-900 dark:text-plum-100">{dashboardData.counts.activeDeliveries}</p>
                    </div>
                    <div className="bg-blush-100 dark:bg-plum-800 p-3 rounded-full">
                      <FaBoxOpen className="text-plum-600 dark:text-plum-200 w-6 h-6" />
                    </div>
                  </div>
                  <div className="text-xs text-plum-700 dark:text-plum-200 mt-4">
                    <span className="font-medium">Status:</span> {dashboardData.counts.activeDeliveries} orders in transit
                  </div>
                </Link>
                
                <Link to="/dashboard/staff/delivery/completed" className="bg-green-50 dark:bg-green-900/20 rounded-lg shadow hover:shadow-lg transition-shadow border border-green-100 dark:border-green-800 p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-green-800 dark:text-green-300">Completed Today</p>
                      <p className="text-3xl font-bold text-green-900 dark:text-green-100">{dashboardData.counts.completedToday}</p>
                    </div>
                    <div className="bg-green-100 dark:bg-green-800 p-3 rounded-full">
                      <FaCalendarCheck className="text-green-500 dark:text-green-300 w-6 h-6" />
                    </div>
                  </div>
                  <div className="text-xs text-green-700 dark:text-green-300 mt-4">
                    <span className="font-medium">Performance:</span> {dashboardData.deliveryPerformance.avgDeliveryTime} min avg delivery time
                  </div>
                </Link>

                {/* POS System Cards */}
                <Link to="/dashboard/sales-counter" className="bg-gold-50 dark:bg-gold-600/15 rounded-lg shadow hover:shadow-lg transition-shadow border border-gold-200 dark:border-gold-600/40 p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gold-800 dark:text-gold-200">Sales Counter</p>
                      <p className="text-lg font-bold text-charcoal dark:text-gold-100">Open Counter</p>
                    </div>
                    <div className="bg-gold-100 dark:bg-gold-700/40 p-3 rounded-full">
                      <FaShoppingCart className="text-gold-600 dark:text-gold-300 w-6 h-6" />
                    </div>
                  </div>
                  <div className="text-xs text-gold-800 dark:text-gold-200 mt-4">
                    <span className="font-medium">Action:</span> Process in-store sales
                  </div>
                </Link>

                <Link to="/dashboard/sales-hub" className="bg-orange-50 dark:bg-orange-900/20 rounded-lg shadow hover:shadow-lg transition-shadow border border-orange-100 dark:border-orange-800 p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-orange-800 dark:text-orange-300">Sales Hub</p>
                      <p className="text-lg font-bold text-orange-900 dark:text-orange-100">View Activity</p>
                    </div>
                    <div className="bg-orange-100 dark:bg-orange-800 p-3 rounded-full">
                      <FaCalculator className="text-orange-500 dark:text-orange-300 w-6 h-6" />
                    </div>
                  </div>
                  <div className="text-xs text-orange-700 dark:text-orange-300 mt-4">
                    <span className="font-medium">View:</span> Sales reports & analytics
                  </div>
                </Link>
              </>
            )}
          </div>
          
          {/* Delivery trend chart (simple version) */}
          <div className="bg-white dark:bg-dm-card rounded-lg shadow border border-brown-100 dark:border-dm-border p-5">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-medium text-charcoal dark:text-white">Delivery Performance</h2>
            </div>
            {loading ? (
              <div className="animate-pulse h-64 bg-brown-100 dark:bg-dm-card-2 rounded"></div>
            ) : (
              <div className="h-64 flex flex-col">
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold">{dashboardData.deliveryPerformance.deliveriesLast7Days}</div>
                  <div className="text-sm text-brown-400 dark:text-white/40">Deliveries in the last 7 days</div>
                </div>
                
                <div className="flex flex-col flex-grow justify-end">
                  <div className="grid grid-cols-7 gap-1 h-full items-end">
                    {dashboardData.deliveryPerformance.dailyStats.map((day, index) => {
                      const maxCount = Math.max(...dashboardData.deliveryPerformance.dailyStats.map(d => d.count));
                      const heightPercentage = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                      
                      return (
                        <div key={index} className="flex flex-col items-center">
                          <div 
                            className="w-full bg-plum-600 dark:bg-plum-500 rounded-t"
                            style={{ height: `${heightPercentage}%`, minHeight: '10px' }}
                          ></div>
                          <div className="text-xs mt-1">{day.date.split('-')[2]}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div className="text-xs text-center mt-2 text-brown-400 dark:text-white/40">
                  Last 7 days
                </div>
              </div>
            )}
          </div>
          
          {/* Recent orders */}
          <div className="bg-white dark:bg-dm-card rounded-lg shadow border border-brown-100 dark:border-dm-border overflow-hidden">
            <div className="px-5 py-4 border-b border-brown-100 dark:border-dm-border flex items-center justify-between">
              <h2 className="text-lg font-medium text-charcoal dark:text-white">Recent Orders</h2>
              <Link to="/dashboard/staff/delivery" className="text-sm font-medium text-plum-700 dark:text-plum-300 hover:text-plum-600">
                View all
              </Link>
            </div>
            {loading ? (
              <div className="divide-y divide-brown-100 dark:divide-dm-border">
                {Array(3).fill(0).map((_, i) => (
                  <div key={i} className="px-5 py-4 animate-pulse">
                    <div className="flex items-center">
                      <div className="rounded-full bg-brown-100 dark:bg-dm-card-2 h-10 w-10"></div>
                      <div className="ml-4 flex-1">
                        <div className="h-4 bg-brown-100 dark:bg-dm-card-2 rounded w-1/4 mb-2"></div>
                        <div className="h-3 bg-brown-100 dark:bg-dm-card-2 rounded w-1/3"></div>
                      </div>
                      <div className="h-8 bg-brown-100 dark:bg-dm-card-2 rounded w-20"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : dashboardData.recentOrders.length > 0 ? (
              <div className="divide-y divide-brown-100 dark:divide-dm-border">
                {dashboardData.recentOrders.map((order) => {
                  const statusInfo = getStatusInfo(order.status);
                  return (
                    <div key={order._id} className="px-5 py-4 hover:bg-plum-50/50 dark:hover:bg-dm-card-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="p-2 rounded-full bg-ivory dark:bg-dm-card-2">
                            {statusInfo.icon}
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-charcoal dark:text-white">
                              Order #{order.orderId}
                            </p>
                            <p className="text-xs text-brown-400 dark:text-white/40">
                              {order.customerName} • ${order.total?.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <div>
                          <span className={`text-xs px-2 py-1 rounded-full ${statusInfo.color}`}>
                            {formatStatus(order.status)}
                          </span>
                          <p className="text-xs text-right text-brown-400 dark:text-white/40 mt-1">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-5 text-center text-brown-400 dark:text-white/40">
                No recent orders available
              </div>
            )}
          </div>
        </div>
        
        {/* Right column - driver stats and distribution */}
        <div className="lg:col-span-4 space-y-6">
          {/* Driver availability */}
          <div className="bg-white dark:bg-dm-card rounded-lg shadow border border-brown-100 dark:border-dm-border p-5">
            <Link to="/dashboard/staff/delivery/drivers" className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-medium text-charcoal dark:text-white">Driver Availability</h2>
              <span className="text-sm text-plum-700 dark:text-plum-300 hover:underline">Manage</span>
            </Link>
            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-32 bg-brown-100 dark:bg-dm-card-2 rounded"></div>
                <div className="h-4 bg-brown-100 dark:bg-dm-card-2 rounded w-1/2"></div>
              </div>
            ) : (
              <>
                <div className="flex justify-center mb-5">
                  <div className="relative inline-flex items-center justify-center">
                    <svg className="w-32 h-32">
                      <circle
                        className="text-brown-100 dark:text-dm-border"
                        strokeWidth="10"
                        stroke="currentColor"
                        fill="transparent"
                        r="58"
                        cx="64"
                        cy="64"
                      />
                      <circle
                        className="text-plum-600"
                        strokeWidth="10"
                        strokeDasharray={360}
                        strokeDashoffset={360 - (getDriverAvailabilityPercentage() / 100) * 360}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="58"
                        cx="64"
                        cy="64"
                      />
                    </svg>
                    <span className="absolute text-xl text-plum-700 dark:text-plum-300 font-bold">
                      {getDriverAvailabilityPercentage()}%
                    </span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-plum-800 dark:text-plum-200 font-medium text-lg">
                    {dashboardData.counts.availableDrivers} of {dashboardData.counts.totalDrivers} drivers available
                  </p>
                </div>
                <hr className="my-4 border-brown-100 dark:border-dm-border" />
                <div className="text-sm text-charcoal dark:text-white/55">
                  <div className="flex justify-between items-center mb-2">
                    <span>Active Orders Per Driver:</span>
                    <span className="font-semibold">
                      {dashboardData.counts.totalDrivers > 0 
                        ? (dashboardData.counts.activeDeliveries / dashboardData.counts.totalDrivers).toFixed(1) 
                        : '0.0'}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* Delivery Status Distribution (simple version) */}
          <div className="bg-white dark:bg-dm-card rounded-lg shadow border border-brown-100 dark:border-dm-border p-5">
            <h2 className="text-lg font-medium text-charcoal dark:text-white mb-5">Delivery Status</h2>
            {loading ? (
              <div className="animate-pulse h-64 bg-brown-100 dark:bg-dm-card-2 rounded"></div>
            ) : (
              <div className="h-64 flex flex-col justify-center">
                {getDeliveryStatusData().map((status, index) => (
                  <div key={index} className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-charcoal dark:text-white">
                        {status.name}
                      </span>
                      <span className="text-brown-500 dark:text-white/55">
                        {status.value} ({status.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-brown-100 dark:bg-dm-card-2 rounded-full h-2.5">
                      <div 
                        className="h-2.5 rounded-full" 
                        style={{ 
                          width: `${status.percentage}%`,
                          backgroundColor: status.color
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Active Drivers */}
          <div className="bg-white dark:bg-dm-card rounded-lg shadow border border-brown-100 dark:border-dm-border p-5">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-medium text-charcoal dark:text-white">Active Drivers</h2>
              <button
                onClick={() => setShowDriversMap(!showDriversMap)}
                className="text-sm text-plum-700 dark:text-plum-300 hover:underline flex items-center"
              >
                <FaMapMarkerAlt className="mr-1" /> {showDriversMap ? 'Hide Map' : 'Show Map'}
              </button>
            </div>
            {loading ? (
              <div className="space-y-4">
                {Array(3).fill(0).map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center p-2">
                    <div className="rounded-full bg-brown-100 dark:bg-dm-card-2 h-10 w-10"></div>
                    <div className="ml-3 flex-1">
                      <div className="h-4 bg-brown-100 dark:bg-dm-card-2 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-brown-100 dark:bg-dm-card-2 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : dashboardData.activeDrivers.length > 0 ? (
              <>
                {showDriversMap ? (
                  <div className="h-64 bg-ivory dark:bg-dm-card-2 rounded mb-4">
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-brown-500 dark:text-white/55">
                        <FaMapMarkerAlt className="mx-auto mb-2 text-3xl" />
                        <p>Map view would display here</p>
                        <p className="text-xs">(Integration with Google Maps or Mapbox)</p>
                      </div>
                    </div>
                  </div>
                ) : null}
                <div className="divide-y divide-brown-100 dark:divide-dm-border">
                  {dashboardData.activeDrivers.map((driver) => (
                    <div key={driver._id} className="py-3">
                      <div className="flex items-center">
                        <div className={`p-2 rounded-full ${driver.isAvailable ? 'bg-green-100 dark:bg-green-900/30' : 'bg-ivory dark:bg-dm-card-2'}`}>
                          {driver.isAvailable
                            ? <HiOutlineStatusOnline className="text-green-500 dark:text-green-300 w-5 h-5" />
                            : <FaTruck className="text-brown-400 dark:text-white/40 w-5 h-5" />
                          }
                        </div>
                        <div className="ml-3 flex-1">
                          <p className="text-sm font-medium text-charcoal dark:text-white">{driver.name}</p>
                          <p className="text-xs text-brown-400 dark:text-white/40">
                            {driver.isAvailable 
                              ? 'Available now'
                              : `${driver.activeOrdersCount} active order${driver.activeOrdersCount !== 1 ? 's' : ''}`
                            }
                            {driver.currentLocation?.lastUpdated && 
                              ` • Updated ${new Date(driver.currentLocation.lastUpdated).toLocaleTimeString()}`
                            }
                          </p>
                        </div>
                        <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                          driver.isAvailable 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' 
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                        }`}>
                          {driver.activeOrdersCount}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center text-brown-400 dark:text-white/40 py-6">
                No active drivers at the moment
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
