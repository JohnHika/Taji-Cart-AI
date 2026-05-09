import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FaCalendarCheck, FaMapMarkerAlt, FaRedo, FaSpinner, FaTruck, FaUser } from 'react-icons/fa';
import io from 'socket.io-client';
import { socketBaseUrl } from '../../common/apiBaseUrl';
import useCriteriaGate from '../../hooks/useCriteriaGate';
import Axios from '../../utils/Axios';
import AxiosToastError from '../../utils/AxiosToastError';

const ActiveDeliveries = () => {
  const [activeOrders, setActiveOrders] = useState([]);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [claimingOrderIds, setClaimingOrderIds] = useState([]);
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

      const [activeResponse, availableResponse] = await Promise.allSettled([
        Axios({
          url: '/api/delivery/active-orders',
          method: 'GET'
        }),
        Axios({
          url: '/api/delivery/available',
          method: 'GET'
        })
      ]);

      let activeError = null;

      if (activeResponse.status === 'fulfilled' && activeResponse.value.data?.success) {
        setActiveOrders(activeResponse.value.data.data || []);
      } else {
        activeError = activeResponse.status === 'fulfilled'
          ? (activeResponse.value.data?.message || 'Failed to fetch active deliveries')
          : 'Failed to load active deliveries. Please try again later.';
      }

      if (availableResponse.status === 'fulfilled' && availableResponse.value.data?.success) {
        setAvailableOrders(availableResponse.value.data.data || []);
      } else {
        setAvailableOrders([]);
      }

      if (activeError) {
        setError(activeError);
        if (!silent) {
          toast.error(activeError);
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
            token: sessionStorage.getItem('accesstoken') || ''
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

        // Listen for new delivery assignments
        socket.on('new_delivery_assigned', (data) => {
          console.log('New delivery assigned', data);
          toast.success(`New delivery assigned: Order #${data.orderId}`);
          
          // Add to our list of active orders
          setAvailableOrders(prevOrders => prevOrders.filter(order => order._id !== data._id && order._id !== data.orderId));
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
            setAvailableOrders(prevOrders => 
              prevOrders.filter(order => order._id !== data._id)
            );
          } else {
            // Update the order status
            setActiveOrders(prevOrders => 
              prevOrders.map(order => 
                order._id === data._id ? { ...order, status: data.status } : order
              )
            );

            if (['driver_assigned', 'out_for_delivery', 'nearby', 'delivered'].includes(data.status)) {
              setAvailableOrders(prevOrders => prevOrders.filter(order => order._id !== data._id));
            }
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
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleClaimDelivery = async (orderId) => {
    if (!(await ensureCriteria('delivery_claim'))) {
      return;
    }

    try {
      setClaimingOrderIds((prev) => [...prev, orderId]);

      const response = await Axios({
        url: `/api/delivery/accept/${orderId}`,
        method: 'POST'
      });

      if (response.data?.success) {
        toast.success(response.data.message || 'Delivery claimed successfully');
        await fetchDeliveries({ showLoader: false, silent: true });
      } else {
        toast.error(response.data?.message || 'Failed to claim delivery');
      }
    } catch (error) {
      console.error('Error claiming delivery:', error);
      AxiosToastError(error);
    } finally {
      setClaimingOrderIds((prev) => prev.filter((id) => id !== orderId));
    }
  };
  
  const handleStatusUpdate = async (orderId, newStatus) => {
    if (!(await ensureCriteria('delivery_progress'))) {
      return;
    }

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
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Delivery Workboard</h1>
          <p className="mt-1 text-sm text-brown-500 dark:text-white/40">
            Claim dispatched jobs, then progress your active deliveries from one place.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchDeliveries({ showLoader: false, silent: true })}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-plum-300 px-4 py-2 text-sm font-medium text-plum-700 transition hover:bg-plum-50 disabled:opacity-60 dark:border-plum-700 dark:text-plum-200 dark:hover:bg-plum-900/20"
        >
          {refreshing ? <FaSpinner className="animate-spin" /> : <FaRedo />}
          Refresh deliveries
        </button>
      </div>

      {availableOrders.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-charcoal dark:text-white">Available to Claim</h2>
          <div className="grid gap-6">
            {availableOrders.map(order => (
              <div
                key={order._id}
                className="bg-white dark:bg-dm-card rounded-lg shadow overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-brown-100 dark:border-dm-border bg-sky-50 dark:bg-sky-900/20">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-charcoal dark:text-white">
                        Order #{order.orderId}
                      </h3>
                      <p className="text-sm text-brown-500 dark:text-white/40">
                        Dispatched {formatDate(order.dispatchedAt || order.updatedAt || order.createdAt)}
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-sky-100 text-sky-800 dark:bg-sky-800 dark:text-sky-200">
                      Ready to claim
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="text-sm font-medium text-brown-400 dark:text-white/40 mb-2">Customer</h4>
                      <div className="flex items-start">
                        <FaUser className="text-brown-400 dark:text-white/40 mt-1 mr-2" />
                        <div>
                          <p className="text-charcoal dark:text-white font-medium">{order.customer?.name}</p>
                          <p className="text-sm text-brown-500 dark:text-white/40">{order.customer?.phone}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-brown-400 dark:text-white/40 mb-2">Delivery Address</h4>
                      <div className="flex items-start">
                        <FaMapMarkerAlt className="text-brown-400 mt-1 mr-2" />
                        <p className="text-charcoal dark:text-white/70">{order.deliveryAddress?.fullAddress || order.deliveryAddress?.street || order.deliveryAddress}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 border-t pt-4 dark:border-dm-border sm:flex-row sm:items-center sm:justify-between">
                    <div className="font-medium">
                      <span className="text-brown-400 dark:text-white/40">Total: </span>
                      <span className="text-charcoal dark:text-white">KSh {Number(order.total || 0).toFixed(2)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleClaimDelivery(order._id)}
                      disabled={claimingOrderIds.includes(order._id)}
                      className="px-3 py-2 bg-sky-700 text-white rounded hover:bg-sky-600 disabled:opacity-60 flex items-center justify-center"
                    >
                      {claimingOrderIds.includes(order._id) ? (
                        <>
                          <FaSpinner className="animate-spin mr-1" />
                          Claiming...
                        </>
                      ) : (
                        <>
                          <FaTruck className="mr-1" />
                          Claim Delivery
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {activeOrders.length === 0 && availableOrders.length === 0 ? (
        <div className="bg-white dark:bg-dm-card rounded-lg shadow p-8 text-center">
          <FaTruck className="mx-auto text-brown-400 dark:text-white/40 mb-4" size={48} />
          <p className="text-brown-500 dark:text-white/40">
            You don&apos;t have any active or claimable deliveries at the moment.
          </p>
        </div>
      ) : activeOrders.length > 0 ? (
        <div className="grid gap-6">
          <h2 className="text-xl font-semibold text-charcoal dark:text-white">Your Active Deliveries</h2>
          {activeOrders.map(order => (
            <div 
              key={order._id} 
              className="bg-white dark:bg-dm-card rounded-lg shadow overflow-hidden"
            >
              <div className={`px-6 py-4 border-b border-brown-100 dark:border-dm-border ${
                order.status === 'driver_assigned' ? 'bg-plum-50 dark:bg-plum-900/20' :
                order.status === 'out_for_delivery' ? 'bg-yellow-50 dark:bg-yellow-900/20' :
                'bg-green-50 dark:bg-green-900/20'
              }`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-charcoal dark:text-white">
                      Order #{order.orderId}
                    </h3>
                    <p className="text-sm text-brown-500 dark:text-white/40">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    order.status === 'driver_assigned' ? 'bg-plum-100 text-plum-800 dark:bg-plum-800 dark:text-plum-200' :
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
                    <h4 className="text-sm font-medium text-brown-400 dark:text-white/40 mb-2">Customer</h4>
                    <div className="flex items-start">
                      <FaUser className="text-brown-400 dark:text-white/40 mt-1 mr-2" />
                      <div>
                        <p className="text-charcoal dark:text-white font-medium">{order.customer.name}</p>
                        <p className="text-sm text-brown-500 dark:text-white/40">{order.customer.phone}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-brown-400 dark:text-white/40 mb-2">Delivery Address</h4>
                    <div className="flex items-start">
                      <FaMapMarkerAlt className="text-brown-400 mt-1 mr-2" />
                      <p className="text-charcoal dark:text-white/70">{order.deliveryAddress}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 flex flex-col gap-3 border-t pt-4 dark:border-dm-border sm:flex-row sm:items-center sm:justify-between">
                  <div className="font-medium">
                    <span className="text-brown-400 dark:text-white/40">Total: </span>
                    <span className="text-charcoal dark:text-white">KSh {order.total.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex flex-col gap-2 sm:flex-row sm:space-x-3">
                    <a
                      href={`https://maps.google.com/?q=${order.deliveryAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 border border-plum-300 text-plum-700 rounded hover:bg-plum-50 dark:hover:bg-plum-900/20 flex items-center justify-center"
                    >
                      <FaMapMarkerAlt className="mr-1" />
                      Map
                    </a>
                    
                    {getNextStatus(order.status) && (
                      <button 
                        onClick={() => handleStatusUpdate(order._id, getNextStatus(order.status))}
                        className="px-3 py-2 bg-plum-700 text-white rounded hover:bg-plum-600 flex items-center justify-center"
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
      ) : (
        <div className="bg-white dark:bg-dm-card rounded-lg shadow p-8 text-center">
          <FaTruck className="mx-auto text-brown-400 dark:text-white/40 mb-4" size={48} />
          <p className="text-brown-500 dark:text-white/40">
            You have deliveries waiting to be claimed, but nothing is assigned to you yet.
          </p>
        </div>
      )}
      {gateModal}
    </div>
  );
};

export default ActiveDeliveries;
