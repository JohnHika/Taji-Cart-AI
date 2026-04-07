import React, { useEffect, useRef, useState } from 'react';
import { FaArrowLeft, FaBoxOpen, FaExclamationTriangle, FaQrcode, FaSpinner } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import io from 'socket.io-client';
import { socketBaseUrl } from '../../common/apiBaseUrl';
import SummaryApi from '../../common/SummaryApi';
import Axios from '../../utils/Axios';

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
            token: localStorage.getItem('token')
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

  return (
    <div className="mobile-page-shell container mx-auto">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold dark:text-white">Pending Pickups</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:space-x-2">
          <button 
            onClick={() => navigate('/dashboard/profile')}
            className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            <FaArrowLeft className="mr-2" /> Back to Dashboard
          </button>
          <button 
            onClick={fetchPendingPickups}
            className="bg-plum-700 px-4 py-2 rounded-lg flex items-center justify-center text-white hover:bg-plum-600"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center p-8">
          <FaSpinner className="animate-spin text-3xl text-plum-600" />
        </div>
      ) : error ? (
        <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-4 rounded-lg mb-6">
          <div className="flex items-center">
            <FaExclamationTriangle className="text-red-500 mr-2" />
            <p>{error}</p>
          </div>
        </div>
      ) : pickups.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
          <FaBoxOpen className="text-5xl mx-auto mb-4 text-gray-400 dark:text-gray-500" />
          <h2 className="text-xl font-semibold dark:text-white mb-2">No Pending Pickups</h2>
          <p className="text-gray-600 dark:text-gray-400">
            There are currently no orders waiting for pickup.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:hidden">
            {pickups.map((pickup) => (
              <div key={pickup._id} className="mobile-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-gray-900 dark:text-white">#{pickup.orderNumber || pickup._id.substring(0, 8)}</p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{pickup.customerName}</p>
                    {pickup.customerPhone && <p className="text-xs text-gray-500 dark:text-gray-400">{pickup.customerPhone}</p>}
                  </div>
                  <span className="inline-flex rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                    {pickup.status}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Date</p>
                    <p className="mt-1 text-gray-700 dark:text-gray-200">{formatDate(pickup.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Amount</p>
                    <p className="mt-1 text-gray-700 dark:text-gray-200">{formatCurrency(pickup.totalAmount)}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleVerifyPickup(pickup.pickupCode)}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-plum-700 px-4 py-2.5 font-medium text-white hover:bg-plum-600"
                >
                  <FaQrcode className="mr-2" /> Verify Pickup
                </button>
              </div>
            ))}
          </div>

          <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Customer
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {pickups.map((pickup) => (
                    <tr key={pickup._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium dark:text-white">
                        {pickup.orderNumber || pickup._id.substring(0, 8)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {pickup.customerName}
                        {pickup.customerPhone && <div className="text-xs text-gray-500">{pickup.customerPhone}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {formatDate(pickup.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {formatCurrency(pickup.totalAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                          {pickup.status}
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
                  ))}
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
