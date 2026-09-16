import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FaCalendarCheck, FaMapMarkerAlt, FaMotorcycle, FaRedo, FaSpinner, FaTruck, FaUser, FaWalking } from 'react-icons/fa';
import io from 'socket.io-client';
import { socketBaseUrl } from '../../common/apiBaseUrl';
import useCriteriaGate from '../../hooks/useCriteriaGate';
import Axios from '../../utils/Axios';
import AxiosToastError from '../../utils/AxiosToastError';

const ActiveDeliveries = () => {
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);
  const { ensureCriteria, gateModal } = useCriteriaGate();

  const fetchDeliveries = useCallback(async ({ showLoader = true, silent = false } = {}) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      if (!silent) {
        setError(null);
      }

      const response = await Axios({
        url: '/api/delivery/active-orders',
        method: 'GET'
      });

      if (response.data?.success) {
        setActiveOrders(response.data.data || []);
      } else {
        const message = response.data?.message || 'Failed to fetch active deliveries';
        setError(message);
        if (!silent) {
          toast.error(message);
        }
      }
    } catch (error) {
      console.error('Error fetching delivery workboard:', error);
      setError('Failed to load delivery workboard. Please try again later.');
      if (!silent) {
        AxiosToastError(error);
      }
    } finally {
      if (showLoader) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    // Connect to Socket.IO for real-time updates
    const connectSocket = () => {
      try {
        // Connect to the socket server
        const socket = io(socketBaseUrl, {
          path: '/socket.io',
          transports: ['websocket'],
          auth: {
            token: sessionStorage.getItem('accesstoken') || localStorage.getItem('accesstoken') || ''
          }
        });

        socket.on('connect', () => {
          console.log('Socket connected for delivery assignments');
          
          // Join delivery room to receive updates
          socket.emit('join', 'delivery-updates');
        });

        socket.on('disconnect', () => {
          console.log('Socket disconnected from delivery updates');
        });

        // Listen for new delivery assignments made by staff/admin
        socket.on('new_delivery_assigned', (data) => {
          console.log('New delivery assigned', data);
          toast.success(`New delivery assigned: Order #${data.orderId}`);

          setActiveOrders(prevOrders => {
            const existing = prevOrders.some(order => order._id === data._id);
            return existing ? prevOrders : [data, ...prevOrders];
          });
        });

        // Listen for order status updates
        socket.on('order_status_updated', (data) => {
          console.log('Order status updated', data);

          if (data.status === 'cancelled') {
            toast.error(`Order #${data.orderId} has been cancelled`);
            // Remove from active orders
            setActiveOrders(prevOrders =>
              prevOrders.filter(order => order._id !== data._id)
            );
          } else {
            // Update the order status
            setActiveOrders(prevOrders =>
              prevOrders.map(order =>
                order._id === data._id ? { ...order, status: data.status } : order
              )
            );
          }
        });
        
        // Store the socket reference
        socketRef.current = socket;
      } catch (err) {
        console.error('Socket connection error:', err);
      }
    };

    // Initialize socket connection
    connectSocket();

    // Clean up socket connection when component unmounts
    return () => {
      if (socketRef.current) {
        console.log('Cleaning up socket connection');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    fetchDeliveries();

    const intervalId = setInterval(() => {
      fetchDeliveries({ showLoader: false, silent: true });
    }, 30000);

    return () => clearInterval(intervalId);
  }, [fetchDeliveries]);
  
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
        return { icon: FaTruck, label: 'Start', className: 'bg-plum-700 hover:bg-plum-600 text-white' };
      case 'nearby':
        return { icon: FaMapMarkerAlt, label: 'Nearby', className: 'bg-yellow-500 hover:bg-yellow-600 text-charcoal dark:text-charcoal' };
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
        <FaSpinner className="animate-spin text-4xl text-plum-600 mb-4" />
        <p className="text-lg text-charcoal dark:text-white/55">Loading delivery workboard...</p>
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
    <div className="mobile-page-shell px-0 py-0 sm:px-0 sm:py-0 lg:px-0">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold dark:text-white">My Deliveries</h1>
          <p className="mt-0.5 text-xs text-brown-500 dark:text-white/40">
            Deliveries assigned to you by dispatch. Update their status as you go.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchDeliveries({ showLoader: false, silent: true })}
          disabled={refreshing}
          aria-label="Refresh deliveries"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-plum-300 text-plum-700 transition hover:bg-plum-50 disabled:opacity-60 dark:border-plum-700 dark:text-plum-200 dark:hover:bg-plum-900/20"
        >
          {refreshing ? <FaSpinner className="animate-spin" size={16} /> : <FaRedo size={16} />}
        </button>
      </div>

      {activeOrders.length === 0 ? (
        <div className="rounded-2xl border border-brown-100 dark:border-dm-border bg-white dark:bg-dm-card shadow-sm p-6 sm:p-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-plum-50 dark:bg-plum-900/30">
            <FaTruck className="text-plum-400 dark:text-plum-300" size={24} />
          </div>
          <p className="text-sm font-medium text-charcoal dark:text-white/70">Nothing assigned yet</p>
          <p className="mt-1 text-xs text-brown-400 dark:text-white/40">
            You don&apos;t have any deliveries assigned to you right now.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          <h2 className="text-lg font-semibold text-charcoal dark:text-white">Your Active Deliveries</h2>
          {activeOrders.map(order => {
            const statusMeta = getStatusMeta(order.status);
            const StatusIcon = statusMeta.icon;
            const nextStatus = getNextStatus(order.status);
            const actionMeta = getActionMeta(nextStatus);
            const ActionIcon = actionMeta?.icon;

            return (
              <div
                key={order._id}
                className="rounded-2xl border border-brown-100 dark:border-dm-border bg-white dark:bg-dm-card shadow-sm overflow-hidden"
              >
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
                      <p className="truncate text-sm font-semibold text-charcoal dark:text-white">{order.customer?.name}</p>
                      <p className="text-xs text-brown-400 dark:text-white/40">{order.customer?.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <FaMapMarkerAlt className="mt-0.5 shrink-0 text-brown-300 dark:text-white/30" size={13} />
                    <div className="min-w-0">
                      <p className="text-sm text-charcoal/80 dark:text-white/70">
                        {order.deliveryAddress?.fullAddress || order.deliveryAddress?.street || order.deliveryAddress}
                      </p>
                      {order.deliveryMode === 'foot' && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-gold-100 px-2 py-0.5 text-[10px] font-semibold text-gold-600 dark:bg-gold-600/30 dark:text-gold-200">
                          <FaWalking size={9} />
                          On foot (CBD)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-brown-100 dark:border-dm-border pt-3">
                    <span className="text-base font-bold text-charcoal dark:text-white">KSh {Number(order.total || 0).toFixed(2)}</span>
                    <a
                      href={
                        order.coordinates?.lat && order.coordinates?.lng
                          ? `https://maps.google.com/?q=${order.coordinates.lat},${order.coordinates.lng}`
                          : `https://maps.google.com/?q=${encodeURIComponent(order.deliveryAddress?.fullAddress || order.deliveryAddress?.street || '')}`
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
      {gateModal}
    </div>
  );
};

export default ActiveDeliveries;
