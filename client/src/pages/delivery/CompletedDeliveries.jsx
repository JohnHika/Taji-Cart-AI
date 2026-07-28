import React, { useEffect, useState } from 'react';
import { FaSpinner, FaCheckCircle, FaMapMarkerAlt, FaCalendarAlt, FaStar } from 'react-icons/fa';
import Axios from '../../utils/Axios';
import AxiosToastError from '../../utils/AxiosToastError';
import toast from 'react-hot-toast';

const RateCustomer = ({ order, onRated }) => {
  const [submitting, setSubmitting] = useState(false);
  const existingRating = order.customerRating?.rating;

  const submitRating = async (rating) => {
    try {
      setSubmitting(true);
      const response = await Axios({
        url: `/api/delivery/rate-customer/${order._id}`,
        method: 'POST',
        data: { rating }
      });

      if (response.data?.success) {
        toast.success(response.data.message || 'Rating submitted');
        onRated(order._id, rating);
      } else {
        toast.error(response.data?.message || 'Failed to submit rating');
      }
    } catch (error) {
      AxiosToastError(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={Boolean(existingRating) || submitting}
          onClick={() => submitRating(star)}
          className="disabled:cursor-default"
          title={existingRating ? undefined : `Rate ${star} star${star > 1 ? 's' : ''}`}
        >
          <FaStar
            className={`w-5 h-5 ${star <= (existingRating || 0) ? 'text-yellow-400' : 'text-brown-200 dark:text-brown-500'} ${existingRating ? '' : 'hover:text-yellow-300 cursor-pointer'}`}
          />
        </button>
      ))}
    </div>
  );
};

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
        <p className="text-lg text-charcoal dark:text-white/55">Loading completed deliveries...</p>
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
        <div className="bg-white dark:bg-dm-card rounded-lg shadow p-8 text-center">
          <FaCheckCircle className="mx-auto text-brown-400 dark:text-brown-400 mb-4" size={48} />
          <p className="text-brown-500 dark:text-white/40">
            You don't have any completed deliveries yet.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-6">
            {completedOrders.map(order => (
              <div 
                key={order._id} 
                className="bg-white dark:bg-dm-card rounded-lg shadow overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-brown-100 dark:border-dm-border bg-green-50 dark:bg-green-900/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-charcoal dark:text-white">
                        Order #{order.orderId}
                      </h3>
                      <div className="flex items-center text-sm text-brown-500 dark:text-white/40 gap-2">
                        <FaCalendarAlt className="text-brown-400" />
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
                      <h4 className="text-sm font-medium text-brown-400 dark:text-white/40 mb-1">Customer</h4>
                      <p className="text-charcoal dark:text-white/70">{order.customer?.name || 'N/A'}</p>
                    </div>
                    
                    <div className="text-right">
                      <h4 className="text-sm font-medium text-brown-400 dark:text-white/40 mb-1">Amount</h4>
                      <p className="text-charcoal dark:text-white/70 font-medium">KSh {order.total != null ? Number(order.total).toFixed(2) : '0.00'}</p>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-brown-400 dark:text-white/40 mb-1">Delivered To</h4>
                    <div className="flex items-start">
                      <FaMapMarkerAlt className="text-brown-400 mt-1 mr-2" />
                      <p className="text-charcoal dark:text-white/70">{order.deliveryAddress}</p>
                    </div>
                  </div>
                  
                  <div className="border-t dark:border-dm-border pt-4 mt-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-medium text-brown-400 dark:text-white/40 mb-1">
                          {order.customerRating?.rating ? 'You rated this customer' : 'Rate this customer'}
                        </h4>
                        <RateCustomer
                          order={order}
                          onRated={(orderId, rating) => {
                            setCompletedOrders((prev) =>
                              prev.map((o) => (o._id === orderId ? { ...o, customerRating: { ...o.customerRating, rating } } : o))
                            );
                          }}
                        />
                      </div>
                      
                      <a
                        href={
                          order.coordinates?.lat && order.coordinates?.lng
                            ? `https://maps.google.com/?q=${order.coordinates.lat},${order.coordinates.lng}`
                            : `https://maps.google.com/?q=${encodeURIComponent(order.deliveryAddress || '')}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 border border-brown-200 text-brown-500 dark:border-dm-border dark:text-white/55 rounded hover:bg-brown-50 dark:hover:bg-dm-card-2 flex items-center"
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
