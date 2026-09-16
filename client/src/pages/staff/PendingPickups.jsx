import React, { useEffect, useRef, useState } from 'react';
import { FaArrowLeft, FaBoxOpen, FaCheckCircle, FaClock, FaExclamationTriangle, FaLock, FaQrcode, FaSpinner } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import io from 'socket.io-client';
import { socketBaseUrl } from '../../common/apiBaseUrl';
import SummaryApi from '../../common/SummaryApi';
import Axios from '../../utils/Axios';

const getPickupStatusMeta = (status) => {
  switch (status) {
    case 'ready_for_pickup':
      return {
        label: 'Ready for pickup',
        icon: <FaCheckCircle />,
        badge: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
        chip: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
      };
    case 'processing':
      return {
        label: 'Processing',
        icon: <FaBoxOpen />,
        badge: 'bg-plum-100 text-plum-700 dark:bg-plum-900/30 dark:text-plum-200',
        chip: 'bg-plum-100 text-plum-800 dark:bg-plum-900/30 dark:text-plum-200'
      };
    default:
      return {
        label: (status || 'pending').replaceAll('_', ' '),
        icon: <FaClock />,
        badge: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-300',
        chip: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      };
  }
};

const formatStatusLabel = (status) =>
  (status || '').split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

const PendingPickups = () => {
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const socketRef = useRef(null);

  // Connect to socket when component mounts
  useEffect(() => {
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
          console.log('Socket connected for staff pending pickups');
          
          // Join staff-pickups room to receive pickup order updates
          socket.emit('join', 'staff-pickups');
        });

        socket.on('disconnect', () => {
          console.log('Socket disconnected from staff pickups');
        });

        // Listen for new pickup orders
        socket.on('new_pickup_order', (data) => {
          console.log('New pickup order received', data);
          toast.info(`New pickup order received: #${data.orderNumber || data._id.substring(0,8)}`);
          
          // Add to our list of pickups
          setPickups(prevPickups => [data, ...prevPickups]);
        });

        // Listen for pickup order status updates
        socket.on('pickup_status_updated', (data) => {
          console.log('Pickup status updated', data);
          
          setPickups(prevPickups => 
            prevPickups.map(pickup => 
              pickup._id === data._id ? { ...pickup, ...data } : pickup
            ).filter(pickup => 
              // Keep only orders that are still pending or ready for pickup
              pickup.status !== 'picked_up' && pickup.status !== 'cancelled'
            )
          );
          
          // If order was picked up or cancelled, show a toast
          if (data.status === 'picked_up' || data.status === 'cancelled') {
            toast.info(`Order #${data.orderNumber || data._id.substring(0,8)} ${data.status}`);
          }
        });

        socketRef.current = socket;
      } catch (err) {
        console.error('Socket connection error:', err);
      }
    };

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
    fetchPendingPickups();
  }, []);

  const fetchPendingPickups = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await Axios({
        ...SummaryApi.getPendingPickups
      });

      if (response.data.success) {
        setPickups(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch pending pickups');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `KSh ${parseFloat(amount).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleVerifyPickup = (pickupCode) => {
    navigate(`/dashboard/staff/verify-pickup?code=${pickupCode}`);
  };

  const isPermissionError = Boolean(error) && error.toLowerCase().includes('permission');
  const readyCount = pickups.filter((pickup) => pickup.status === 'ready_for_pickup').length;

  return (
    <div className="mobile-page-shell container mx-auto">
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold dark:text-white sm:text-2xl">Pending Pickups</h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/dashboard/profile')}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brown-100 px-4 py-2.5 text-sm font-medium text-charcoal hover:bg-brown-200 dark:bg-dm-card-2 dark:text-white/70 dark:hover:bg-dm-border sm:flex-none"
          >
            <FaArrowLeft /> <span className="sm:inline">Back</span>
          </button>
          <button
            onClick={fetchPendingPickups}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-plum-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-plum-600 sm:flex-none"
          >
            {loading && <FaSpinner className="animate-spin" />} Refresh
          </button>
        </div>
      </div>

      {!loading && !error && (
        <div className="mb-4 grid grid-cols-2 gap-2.5 sm:mb-6 sm:gap-4">
          <div className="rounded-2xl border border-plum-100 bg-plum-50 p-3 shadow-sm dark:border-plum-800 dark:bg-plum-900/20 sm:p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-plum-800 dark:text-plum-200">Waiting</p>
                <p className="mt-1 text-2xl font-bold text-plum-900 dark:text-plum-100 sm:text-3xl">{pickups.length}</p>
              </div>
              <div className="rounded-full bg-plum-100 p-2 dark:bg-plum-800">
                <FaClock className="h-4 w-4 text-plum-600 dark:text-plum-200 sm:h-5 sm:w-5" />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 shadow-sm dark:border-emerald-800 dark:bg-emerald-900/20 sm:p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200">Ready now</p>
                <p className="mt-1 text-2xl font-bold text-emerald-900 dark:text-emerald-100 sm:text-3xl">{readyCount}</p>
              </div>
              <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-800">
                <FaCheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-200 sm:h-5 sm:w-5" />
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center p-8">
          <FaSpinner className="animate-spin text-3xl text-plum-600" />
        </div>
      ) : error ? (
        <div className="mobile-surface p-6 text-center sm:p-8">
          <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${isPermissionError ? 'bg-gold-100 text-gold-600 dark:bg-gold-600/20 dark:text-gold-300' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300'}`}>
            {isPermissionError ? <FaLock size={22} /> : <FaExclamationTriangle size={22} />}
          </div>
          <h2 className="mt-4 text-lg font-semibold text-charcoal dark:text-white">
            {isPermissionError ? 'Permission required' : 'Something went wrong'}
          </h2>
          <p className="mt-2 text-sm text-brown-500 dark:text-white/55">{error}</p>
          {isPermissionError ? (
            <p className="mt-1 text-xs text-brown-400 dark:text-white/40">Ask an administrator to grant pickup queue access on your staff account.</p>
          ) : (
            <button
              onClick={fetchPendingPickups}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-plum-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-plum-600"
            >
              Try again
            </button>
          )}
        </div>
      ) : pickups.length === 0 ? (
        <div className="mobile-surface p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-plum-100 text-plum-700 dark:bg-plum-900/20 dark:text-plum-200">
            <FaBoxOpen size={22} />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-charcoal dark:text-white">No Pending Pickups</h2>
          <p className="mt-2 text-sm text-brown-500 dark:text-white/40">
            There are currently no orders waiting for pickup.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {pickups.map((pickup) => {
              const statusMeta = getPickupStatusMeta(pickup.status);
              return (
              <div key={pickup._id} className="mobile-surface p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${statusMeta.badge}`}>
                      {statusMeta.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-charcoal dark:text-white">#{pickup.orderNumber || pickup._id.substring(0, 8)}</p>
                      <p className="truncate text-sm text-brown-500 dark:text-white/55">{pickup.customerName}</p>
                      {pickup.customerPhone && <p className="truncate text-xs text-brown-400 dark:text-white/40">{pickup.customerPhone}</p>}
                    </div>
                  </div>
                  <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta.chip}`}>
                    {formatStatusLabel(pickup.status)}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-brown-400 dark:text-white/40">Date</p>
                    <p className="mt-1 text-charcoal dark:text-white/70">{formatDate(pickup.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-brown-400 dark:text-white/40">Amount</p>
                    <p className="mt-1 text-charcoal dark:text-white/70">{formatCurrency(pickup.totalAmount)}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleVerifyPickup(pickup.pickupCode)}
                  className="mt-3.5 inline-flex w-full items-center justify-center rounded-xl bg-plum-700 px-4 py-2.5 font-medium text-white hover:bg-plum-600"
                >
                  <FaQrcode className="mr-2" /> Verify Pickup
                </button>
              </div>
              );
            })}
          </div>

          <div className="hidden md:block bg-white dark:bg-dm-card rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-brown-100 dark:divide-dm-border">
                <thead className="bg-ivory dark:bg-dm-card-2">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brown-400 dark:text-white/55 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brown-400 dark:text-white/55 uppercase tracking-wider">
                      Customer
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brown-400 dark:text-white/55 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brown-400 dark:text-white/55 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brown-400 dark:text-white/55 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-brown-400 dark:text-white/55 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-dm-card divide-y divide-brown-100 dark:divide-dm-border">
                  {pickups.map((pickup) => {
                    const statusMeta = getPickupStatusMeta(pickup.status);
                    return (
                    <tr key={pickup._id} className="hover:bg-ivory dark:hover:bg-dm-card-2">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium dark:text-white">
                        <span className="inline-flex items-center gap-2">
                          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${statusMeta.badge}`}>{statusMeta.icon}</span>
                          {pickup.orderNumber || pickup._id.substring(0, 8)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-brown-500 dark:text-white/55">
                        {pickup.customerName}
                        {pickup.customerPhone && <div className="text-xs text-brown-400">{pickup.customerPhone}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-brown-500 dark:text-white/55">
                        {formatDate(pickup.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-brown-500 dark:text-white/55">
                        {formatCurrency(pickup.totalAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusMeta.chip}`}>
                          {formatStatusLabel(pickup.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleVerifyPickup(pickup.pickupCode)}
                          className="text-plum-700 hover:text-plum-600 dark:text-plum-300 dark:hover:text-plum-200 flex items-center justify-end"
                        >
                          <FaQrcode className="mr-1" /> Verify
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PendingPickups;
