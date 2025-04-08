import React, { useEffect, useState } from 'react';
import { FaSpinner, FaCheckCircle, FaMapMarkerAlt, FaCalendarAlt } from 'react-icons/fa';
import Axios from '../../utils/Axios';
import AxiosToastError from '../../utils/AxiosToastError';
import toast from 'react-hot-toast';

const CompletedDeliveries = () => {
  const [completedOrders, setCompletedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const fetchCompletedDeliveries = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await Axios({
          url: '/api/delivery/completed-orders',
          method: 'GET',
          params: {
            page,
            limit: 10
          }
        });
        
        if (response.data.success) {
          if (page === 1) {
            setCompletedOrders(response.data.data || []);
          } else {
            setCompletedOrders(prev => [...prev, ...(response.data.data || [])]);
          }
          
          // Check if we have more pages
          setHasMore(response.data.hasMore || false);
        } else {
          setError(response.data.message || 'Failed to fetch completed deliveries');
          toast.error(response.data.message || 'Failed to fetch completed deliveries');
        }
      } catch (error) {
        console.error('Error fetching completed deliveries:', error);
        setError('Failed to load completed deliveries. Please try again later.');
        AxiosToastError(error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCompletedDeliveries();
  }, [page]);
  
  const loadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
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
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <FaSpinner className="animate-spin text-4xl text-primary-200 mb-4" />
        <p className="text-lg text-gray-700 dark:text-gray-300">Loading completed deliveries...</p>
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
      <h1 className="text-2xl font-bold mb-6 dark:text-white">Completed Deliveries</h1>
      
      {completedOrders.length === 0 && !loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <FaCheckCircle className="mx-auto text-gray-400 dark:text-gray-500 mb-4" size={48} />
          <p className="text-gray-600 dark:text-gray-400">
            You don't have any completed deliveries yet.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-6">
            {completedOrders.map(order => (
              <div 
                key={order._id} 
                className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-green-50 dark:bg-green-900/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                        Order #{order.orderId}
                      </h3>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 gap-2">
                        <FaCalendarAlt className="text-gray-400" />
                        <span>Delivered: {formatDate(order.deliveredAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200 flex items-center">
                        <FaCheckCircle className="mr-1" />
                        Delivered
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="flex justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Customer</h4>
                      <p className="text-gray-800 dark:text-gray-200">{order.customer.name}</p>
                    </div>
                    
                    <div className="text-right">
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Amount</h4>
                      <p className="text-gray-800 dark:text-gray-200 font-medium">KSh {order.total.toFixed(2)}</p>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Delivered To</h4>
                    <div className="flex items-start">
                      <FaMapMarkerAlt className="text-gray-400 mt-1 mr-2" />
                      <p className="text-gray-800 dark:text-gray-200">{order.deliveryAddress}</p>
                    </div>
                  </div>
                  
                  <div className="border-t dark:border-gray-700 pt-4 mt-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Customer Rating</h4>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <svg 
                              key={i}
                              className={`w-5 h-5 ${i < order.rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                      
                      <a
                        href={`https://maps.google.com/?q=${order.deliveryAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 border border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                      >
                        <FaMapMarkerAlt className="mr-1" />
                        View on Map
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {hasMore && (
            <div className="mt-6 text-center">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-4 py-2 bg-primary-200 text-white rounded hover:bg-primary-300 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <FaSpinner className="inline-block animate-spin mr-2" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CompletedDeliveries;
