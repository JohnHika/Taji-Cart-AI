import React, { useEffect, useState } from 'react';
import { FaSpinner, FaCalendarAlt, FaSearch, FaFileDownload } from 'react-icons/fa';
import Axios from '../../utils/Axios';
import AxiosToastError from '../../utils/AxiosToastError';
import toast from 'react-hot-toast';

const DeliveryHistory = () => {
  const [deliveryHistory, setDeliveryHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0] // Today
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredHistory, setFilteredHistory] = useState([]);

  useEffect(() => {
    const fetchDeliveryHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await Axios({
          url: '/api/delivery/history',
          method: 'GET',
          params: {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate
          }
        });
        
        if (response.data.success) {
          setDeliveryHistory(response.data.data || []);
          setFilteredHistory(response.data.data || []);
        } else {
          setError(response.data.message || 'Failed to fetch delivery history');
          toast.error(response.data.message || 'Failed to fetch delivery history');
        }
      } catch (error) {
        console.error('Error fetching delivery history:', error);
        setError('Failed to load delivery history. Please try again later.');
        AxiosToastError(error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDeliveryHistory();
  }, [dateRange]);
  
  // Filter history when searchTerm changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredHistory(deliveryHistory);
      return;
    }
    
    const lowercaseSearch = searchTerm.toLowerCase();
    const filtered = deliveryHistory.filter(order => {
      return (
        (order.orderId && order.orderId.toLowerCase().includes(lowercaseSearch)) ||
        (order.customer?.name && order.customer.name.toLowerCase().includes(lowercaseSearch)) ||
        (order.deliveryAddress && order.deliveryAddress.toLowerCase().includes(lowercaseSearch))
      );
    });
    
    setFilteredHistory(filtered);
  }, [searchTerm, deliveryHistory]);
  
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({ ...prev, [name]: value }));
  };
  
  const exportToCSV = async () => {
    try {
      const response = await Axios({
        url: '/api/delivery/export-history',
        method: 'GET',
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          searchTerm
        },
        responseType: 'blob' // Important for file downloads
      });
      
      // Create a download link and trigger it
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `delivery-history-${dateRange.startDate}-to-${dateRange.endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Export completed successfully');
    } catch (error) {
      console.error('Error exporting history:', error);
      toast.error('Failed to export delivery history');
      AxiosToastError(error);
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
        <p className="text-lg text-gray-700 dark:text-gray-300">Loading delivery history...</p>
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Delivery History</h1>
        
        <button 
          onClick={exportToCSV} 
          className="bg-primary-200 text-white px-4 py-2 rounded flex items-center hover:bg-primary-300"
        >
          <FaFileDownload className="mr-2" />
          Export
        </button>
      </div>
      
      {/* Filters and search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              From Date
            </label>
            <input
              type="date"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateChange}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              To Date
            </label>
            <input
              type="date"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateChange}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by order ID, customer, or address"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm p-2 pl-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <FaSearch className="absolute left-3 top-3 text-gray-400" />
            </div>
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredHistory.length} of {deliveryHistory.length} deliveries
        </div>
      </div>
      
      {filteredHistory.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <FaCalendarAlt className="mx-auto text-gray-400 dark:text-gray-500 text-4xl mb-3" />
          <p className="text-gray-600 dark:text-gray-400">
            No delivery history found for the selected criteria.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Delivered
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Rating
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredHistory.map(order => (
                <tr key={order._id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {order.orderId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {order.customer.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                    {order.deliveryAddress}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(order.deliveredAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    KSh {order.total.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <svg 
                          key={i}
                          className={`w-4 h-4 ${i < order.rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DeliveryHistory;
