import { useEffect, useState } from 'react';
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
import useCriteriaGate from '../../hooks/useCriteriaGate';
import Axios from '../../utils/Axios';
import AxiosToastError from '../../utils/AxiosToastError';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const user = useSelector(state => state.user);
  const { ensureCriteria, gateModal } = useCriteriaGate();
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get delivery driver stats
        const statsResponse = await Axios({
          url: '/api/delivery/stats',
          method: 'GET'
        });
        
        if (statsResponse.data.success) {
          setDashboardData(statsResponse.data.data);
        } else {
          throw new Error(statsResponse.data.message || 'Failed to load dashboard stats');
        }
        
        // Get active deliveries
        const activeResponse = await Axios({
          url: '/api/delivery/active-orders',
          method: 'GET'
        });
        
        if (activeResponse.data.success) {
          setActiveOrders(activeResponse.data.data || []);
        } else {
          throw new Error(activeResponse.data.message || 'Failed to load active deliveries');
        }
        
      } catch (error) {
        console.error('Error fetching delivery dashboard data:', error);
        setError(error.message || 'Failed to load dashboard data. Please try again later.');
        AxiosToastError(error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
    
    // Set up polling to refresh data every minute
    const intervalId = setInterval(fetchDashboardData, 60000);
    
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

  const getStatusMeta = (status) => {
    switch (status) {
      case 'driver_assigned':
        return {
          icon: FaTruck,
          tint: 'bg-plum-50 dark:bg-plum-900/20',
          badgeBg: 'bg-plum-100 dark:bg-plum-800',
          iconColor: 'text-plum-600 dark:text-plum-200',
          chip: 'bg-plum-100 text-plum-800 dark:bg-plum-800 dark:text-plum-200'
        };
      case 'out_for_delivery':
        return {
          icon: FaMotorcycle,
          tint: 'bg-yellow-50 dark:bg-yellow-900/20',
          badgeBg: 'bg-yellow-100 dark:bg-yellow-800',
          iconColor: 'text-yellow-600 dark:text-yellow-300',
          chip: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200'
        };
      case 'nearby':
        return {
          icon: FaMapMarkerAlt,
          tint: 'bg-blush-50 dark:bg-plum-900/25',
          badgeBg: 'bg-blush-100 dark:bg-plum-800',
          iconColor: 'text-blush-500 dark:text-plum-200',
          chip: 'bg-blush-100 text-plum-800 dark:bg-plum-800 dark:text-plum-200'
        };
      default:
        return {
          icon: FaCalendarCheck,
          tint: 'bg-green-50 dark:bg-green-900/20',
          badgeBg: 'bg-green-100 dark:bg-green-800',
          iconColor: 'text-green-600 dark:text-green-300',
          chip: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200'
        };
    }
  };

  const getActionMeta = (nextStatus) => {
    switch (nextStatus) {
      case 'out_for_delivery':
        return { icon: FaTruck, label: 'Start Delivery', className: 'bg-plum-700 hover:bg-plum-600 text-white' };
      case 'nearby':
        return { icon: FaMapMarkerAlt, label: 'Mark Nearby', className: 'bg-yellow-500 hover:bg-yellow-600 text-charcoal dark:text-charcoal' };
      case 'delivered':
        return { icon: FaCalendarCheck, label: 'Mark Delivered', className: 'bg-green-600 hover:bg-green-700 text-white' };
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
    if (!(await ensureCriteria('delivery_progress'))) {
      return;
    }

    const riderCallConfirmed = newStatus === 'nearby';
    if (riderCallConfirmed && !window.confirm('Confirm that you have called the customer and told them you are nearby.')) {
      return;
    }

    try {
      const response = await Axios({
        url: '/api/delivery/update-status',
        method: 'POST',
        data: {
          orderId,
          status: newStatus,
          riderCallConfirmed
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
        
        // If the order is now delivered, refresh the dashboard stats
        if (newStatus === 'delivered') {
          const statsResponse = await Axios({
            url: '/api/delivery/stats',
            method: 'GET'
          });
          
          if (statsResponse.data.success) {
            setDashboardData(statsResponse.data.data);
          }
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
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <FaSpinner className="animate-spin text-4xl text-plum-600 mb-4" />
        <p className="text-lg text-charcoal dark:text-white/55">Loading delivery dashboard...</p>
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
          className="px-4 py-2 bg-plum-700 text-white rounded hover:bg-plum-600 transition"
        >
          Retry
        </button>
      </div>
    );
  }
  
  return (
    <div className="mobile-page-shell container mx-auto py-0 pb-20 sm:pb-0">
      <div className="mb-4 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2 dark:text-white">Delivery Dashboard</h1>
        <p className="text-sm text-brown-500 dark:text-white/40">Welcome back, {user.name}</p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-8">
        <div className="bg-plum-50 dark:bg-plum-900/20 rounded-lg shadow-sm border border-plum-100 dark:border-plum-800 p-3 sm:p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-plum-800 dark:text-plum-200">Pending</p>
              <p className="text-2xl sm:text-3xl font-bold text-plum-900 dark:text-plum-100">{dashboardData?.pendingDeliveries || 0}</p>
            </div>
            <div className="bg-plum-100 dark:bg-plum-800 p-2 sm:p-3 rounded-full shrink-0">
              <FaMotorcycle className="text-plum-600 dark:text-plum-200 w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="hidden sm:block text-xs text-plum-700 dark:text-plum-200 mt-3">Ready to start</p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg shadow-sm border border-green-100 dark:border-green-800 p-3 sm:p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-green-800 dark:text-green-300">Today</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-900 dark:text-green-100">{dashboardData?.todayDeliveries || 0}</p>
            </div>
            <div className="bg-green-100 dark:bg-green-800 p-2 sm:p-3 rounded-full shrink-0">
              <FaCalendarCheck className="text-green-500 dark:text-green-300 w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="hidden sm:block text-xs text-green-700 dark:text-green-300 mt-3">Delivered today</p>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg shadow-sm border border-purple-100 dark:border-purple-800 p-3 sm:p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-purple-800 dark:text-purple-300">Completed</p>
              <p className="text-2xl sm:text-3xl font-bold text-purple-900 dark:text-purple-100">{dashboardData?.totalDeliveries || 0}</p>
            </div>
            <div className="bg-purple-100 dark:bg-purple-800 p-2 sm:p-3 rounded-full shrink-0">
              <FaBox className="text-purple-500 dark:text-purple-300 w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="hidden sm:block text-xs text-purple-700 dark:text-purple-300 mt-3">All-time total</p>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg shadow-sm border border-yellow-100 dark:border-yellow-800 p-3 sm:p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-yellow-800 dark:text-yellow-300">Rating</p>
              <p className="text-2xl sm:text-3xl font-bold text-yellow-900 dark:text-yellow-100">
                {dashboardData?.averageRating?.toFixed(1) || 'N/A'}
              </p>
            </div>
            <div className="bg-yellow-100 dark:bg-yellow-800 p-2 sm:p-3 rounded-full shrink-0">
              <FaStar className="text-yellow-500 dark:text-yellow-300 w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="hidden sm:block text-xs text-yellow-700 dark:text-yellow-300 mt-3">Avg. customer score</p>
        </div>
      </div>
      
      {/* Active Orders */}
      <div className="mb-4 sm:mb-8">
        <div className="flex items-center justify-between mb-3 sm:mb-6">
          <h2 className="text-xl font-semibold dark:text-white">Active Orders</h2>
        </div>
        
        {activeOrders.length === 0 ? (
          <div className="rounded-2xl border border-brown-100 dark:border-dm-border bg-white dark:bg-dm-card shadow-sm p-6 sm:p-8 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-plum-50 dark:bg-plum-900/30">
              <FaTruck className="text-plum-400 dark:text-plum-300" size={24} />
            </div>
            <h3 className="text-base font-semibold text-charcoal dark:text-white/85 mb-1">No Active Deliveries</h3>
            <p className="text-sm text-brown-400 dark:text-white/40">
              You currently don&apos;t have any active deliveries assigned to you.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {activeOrders.map(order => {
              const statusMeta = getStatusMeta(order.status);
              const StatusIcon = statusMeta.icon;
              const nextStatus = getNextStatus(order.status);
              const actionMeta = getActionMeta(nextStatus);
              const ActionIcon = actionMeta?.icon;

              return (
                <div key={order._id} className="rounded-2xl border border-brown-100 dark:border-dm-border bg-white dark:bg-dm-card shadow-sm overflow-hidden">
                  <div className={`flex items-center gap-3 px-4 py-3 border-b border-brown-100 dark:border-dm-border ${statusMeta.tint}`}>
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${statusMeta.badgeBg}`}>
                      <StatusIcon className={statusMeta.iconColor} size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-charcoal dark:text-white">
                        Order #{order.orderId}
                      </p>
                      <p className="text-xs text-brown-400 dark:text-white/40">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusMeta.chip}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <FaUser className="mt-0.5 shrink-0 text-brown-300 dark:text-white/30" size={13} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-charcoal dark:text-white">{order.customer.name}</p>
                        <p className="text-xs text-brown-400 dark:text-white/40">{order.customer.phone}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <FaMapMarkerAlt className="mt-0.5 shrink-0 text-brown-300 dark:text-white/30" size={13} />
                      <p className="text-sm text-charcoal/80 dark:text-white/70">{order.deliveryAddress}</p>
                    </div>

                    <div className="flex items-center justify-between border-t border-brown-100 dark:border-dm-border pt-3">
                      <span className="text-base font-bold text-charcoal dark:text-white">KSh {order.total.toFixed(2)}</span>
                      <a
                        href={
                          order.coordinates?.lat && order.coordinates?.lng
                            ? `https://maps.google.com/?q=${order.coordinates.lat},${order.coordinates.lng}`
                            : `https://maps.google.com/?q=${encodeURIComponent(order.deliveryAddress || '')}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-plum-200 dark:border-plum-700 px-3 py-1.5 text-xs font-medium text-plum-700 dark:text-plum-200 transition hover:bg-plum-50 dark:hover:bg-plum-900/20"
                      >
                        <FaMapMarkerAlt size={12} />
                        Maps
                      </a>
                    </div>

                    {actionMeta && (
                      <button
                        onClick={() => handleStatusUpdate(order._id, nextStatus)}
                        className={`w-full px-4 py-2.5 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${actionMeta.className}`}
                      >
                        <ActionIcon size={14} />
                        {actionMeta.label}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {gateModal}
    </div>
  );
};

export default Dashboard;
