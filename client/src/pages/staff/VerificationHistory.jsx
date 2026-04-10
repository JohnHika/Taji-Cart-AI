import React, { useEffect, useState } from 'react';
import { FaArrowLeft, FaCalendar, FaCheckCircle, FaExclamationTriangle, FaEye, FaFilter, FaHistory, FaSearch, FaSpinner, FaTimes, FaUser } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import SummaryApi from '../../common/SummaryApi';
import Axios from '../../utils/Axios';

const VerificationHistory = () => {
  const [history, setHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  
  // New filter states
  const [staffMembers, setStaffMembers] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetailsLoading, setOrderDetailsLoading] = useState(false);

  useEffect(() => {
    fetchVerificationHistory();
  }, []);

  // Apply filters whenever filter values change
  useEffect(() => {
    applyFilters();
  }, [selectedStaff, searchTerm, dateRange, history]);

  const fetchVerificationHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await Axios({
        ...SummaryApi.getVerificationHistory
      });

      if (response.data.success) {
        setHistory(response.data.data);
        setFilteredHistory(response.data.data);
        
        // Extract unique staff members from verification history
        const uniqueStaff = [...new Set(response.data.data
          .filter(item => item.verifiedBy)
          .map(item => item.verifiedBy))]
          .sort();
          
        setStaffMembers(uniqueStaff);
      } else {
        setError(response.data.message || 'Failed to fetch verification history');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetails = async (orderId) => {
    try {
      setOrderDetailsLoading(true);
      
      const response = await Axios({
        url: `/api/order/details?orderId=${orderId}`,
        method: 'GET'
      });
      
      if (response.data.success) {
        setSelectedOrder(response.data.data);
      } else {
        console.error('Failed to fetch order details:', response.data.message);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setOrderDetailsLoading(false);
    }
  };

  const handleViewOrderDetails = (order) => {
    setSelectedOrder(order);
    fetchOrderDetails(order._id);
  };

  const closeOrderDetails = () => {
    setSelectedOrder(null);
  };

  const applyFilters = () => {
    let filtered = [...history];
    
    // Filter by staff member
    if (selectedStaff) {
      filtered = filtered.filter(item => item.verifiedBy === selectedStaff);
    }
    
    // Filter by search term (order number or customer name)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        (item.orderNumber && item.orderNumber.toLowerCase().includes(term)) || 
        (item.customerName && item.customerName.toLowerCase().includes(term))
      );
    }
    
    // Filter by date range
    if (dateRange.startDate) {
      const startDate = new Date(dateRange.startDate);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(item => {
        const verifiedDate = item.verifiedAt ? new Date(item.verifiedAt) : null;
        return verifiedDate && verifiedDate >= startDate;
      });
    }
    
    if (dateRange.endDate) {
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(item => {
        const verifiedDate = item.verifiedAt ? new Date(item.verifiedAt) : null;
        return verifiedDate && verifiedDate <= endDate;
      });
    }
    
    setFilteredHistory(filtered);
  };

  const resetFilters = () => {
    setSelectedStaff('');
    setSearchTerm('');
    setDateRange({ startDate: '', endDate: '' });
    setFilteredHistory(history);
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'KSh 0.00';
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

  // Render the order details view
  const renderOrderDetailsView = () => {
    if (!selectedOrder) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-2 sm:p-4">
        <div className="bg-white dark:bg-dm-card rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white dark:bg-dm-card border-b border-brown-100 dark:border-dm-border p-3 sm:p-4 flex justify-between items-center">
            <h3 className="text-base sm:text-lg font-medium dark:text-white">
              Order Details
            </h3>
            <button 
              onClick={closeOrderDetails}
              className="text-brown-400 hover:text-charcoal dark:text-white/40 dark:hover:text-white"
            >
              <FaTimes />
            </button>
          </div>
          
          {orderDetailsLoading ? (
            <div className="flex justify-center items-center p-8">
              <FaSpinner className="animate-spin text-3xl text-primary-100" />
            </div>
          ) : (
            <div className="p-4 sm:p-6">
              <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-brown-400 dark:text-white/40">Order Number</h4>
                    <p className="font-medium dark:text-white text-sm sm:text-base break-all">
                      {selectedOrder.orderNumber || selectedOrder.orderId || selectedOrder._id}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-brown-400 dark:text-white/40">Customer</h4>
                    <p className="font-medium dark:text-white text-sm sm:text-base">{selectedOrder.customerName}</p>
                    {selectedOrder.customerPhone && (
                      <p className="text-sm text-brown-400 dark:text-white/40">{selectedOrder.customerPhone}</p>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-brown-400 dark:text-white/40">Pickup Code</h4>
                    <p className="font-medium font-mono dark:text-white text-sm sm:text-base">{selectedOrder.pickupCode}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-brown-400 dark:text-white/40">Verification Date</h4>
                    <p className="font-medium dark:text-white text-sm sm:text-base">{formatDate(selectedOrder.verifiedAt)}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-brown-400 dark:text-white/40">Verified By</h4>
                    <p className="font-medium dark:text-white text-sm sm:text-base">{selectedOrder.verifiedBy}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-brown-400 dark:text-white/40">Total Amount</h4>
                    <p className="font-medium text-green-600 dark:text-green-400 text-sm sm:text-base">{formatCurrency(selectedOrder.totalAmount)}</p>
                  </div>
                </div>
              </div>
              
              {/* Order Items */}
              {selectedOrder.items && selectedOrder.items.length > 0 ? (
                <div className="mt-6">
                  <h4 className="text-base sm:text-lg font-medium dark:text-white mb-3">Order Items</h4>
                  <div className="bg-ivory dark:bg-dm-card-2 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-brown-100 dark:divide-dm-border">
                        <thead className="bg-brown-50 dark:bg-dm-card">
                          <tr>
                            <th scope="col" className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-brown-400 dark:text-white/40 uppercase tracking-wider">Product</th>
                            <th scope="col" className="px-3 sm:px-4 py-2 sm:py-3 text-center text-xs font-medium text-brown-400 dark:text-white/40 uppercase tracking-wider">Qty</th>
                            <th scope="col" className="px-3 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-brown-400 dark:text-white/40 uppercase tracking-wider">
                              <span className="hidden sm:inline">Price</span>
                              <span className="sm:hidden">Price</span>
                            </th>
                            <th scope="col" className="px-3 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-brown-400 dark:text-white/40 uppercase tracking-wider">
                              <span className="hidden sm:inline">Total</span>
                              <span className="sm:hidden">Sum</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-dm-card divide-y divide-brown-100 dark:divide-dm-border">
                          {selectedOrder.items.map((item, index) => (
                            <tr key={index} className="hover:bg-ivory dark:hover:bg-dm-card-2">
                              <td className="px-3 sm:px-4 py-3 sm:py-4">
                                <div className="flex items-center">
                                  {item.productId?.image && (
                                    <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 mr-2 sm:mr-3">
                                      <img
                                        className="h-8 w-8 sm:h-10 sm:w-10 rounded-md object-cover"
                                        src={item.productId.image[0]}
                                        alt={item.productId.name || 'Product'}
                                      />
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-xs sm:text-sm font-medium dark:text-white truncate w-16 sm:w-24 md:w-32 lg:w-auto">
                                      {item.productId?.name || item.productName || 'Unknown Product'}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 sm:px-4 py-3 sm:py-4 text-center text-xs sm:text-sm text-charcoal dark:text-white">
                                {item.quantity}
                              </td>
                              <td className="px-3 sm:px-4 py-3 sm:py-4 text-right text-xs sm:text-sm text-charcoal dark:text-white">
                                {formatCurrency(item.price)}
                              </td>
                              <td className="px-3 sm:px-4 py-3 sm:py-4 text-right text-xs sm:text-sm font-medium text-charcoal dark:text-white">
                                {formatCurrency(item.price * item.quantity)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-ivory dark:bg-dm-card-2">
                          <tr>
                            <td colSpan="3" className="px-3 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-medium text-brown-400 dark:text-white/40">
                              Total Amount:
                            </td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-bold text-charcoal dark:text-white">
                              {formatCurrency(selectedOrder.totalAmount)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-lg">
                  No detailed item information available for this order.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render grid view for verification history
  const renderGridView = () => {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredHistory.map((item) => (
          <div key={item._id} className="bg-white dark:bg-dm-card rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <div className="p-5 border-b border-brown-100 dark:border-dm-border">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-semibold dark:text-white">
                    {item.orderNumber || item._id.substring(0, 8)}
                  </h3>
                  <p className="text-sm text-brown-400 dark:text-white/40">
                    {formatDate(item.verifiedAt)}
                  </p>
                </div>
                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                  <FaCheckCircle className="mr-1" /> Picked Up
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-brown-400 dark:text-white/40">Customer:</span>
                  <span className="text-sm font-medium dark:text-white">{item.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-brown-400 dark:text-white/40">Amount:</span>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">{formatCurrency(item.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-brown-400 dark:text-white/40">Verified By:</span>
                  <span className="text-sm font-medium dark:text-white">{item.verifiedBy}</span>
                </div>
              </div>
            </div>
            
            <div className="px-5 py-3 bg-ivory dark:bg-dm-card-2">
              <button
                onClick={() => handleViewOrderDetails(item)}
                className="w-full inline-flex justify-center items-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-plum-800 bg-plum-100 hover:bg-plum-200 dark:bg-plum-900/30 dark:text-plum-200 dark:hover:bg-plum-800/40"
              >
                <FaEye className="mr-2" /> View Details
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render table view for verification history
  const renderTableView = () => {
    return (
      <div className="bg-white dark:bg-dm-card rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-brown-100 dark:divide-dm-border">
            <thead className="bg-ivory dark:bg-dm-card-2">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-brown-400 dark:text-white/55 uppercase tracking-wider">
                  Order ID
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-brown-400 dark:text-white/55 uppercase tracking-wider">
                  Customer
                </th>
                <th scope="col" className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-brown-400 dark:text-white/55 uppercase tracking-wider">
                  Amount
                </th>
                <th scope="col" className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-brown-400 dark:text-white/55 uppercase tracking-wider">
                  Verified By
                </th>
                <th scope="col" className="hidden lg:table-cell px-4 py-3 text-left text-xs font-medium text-brown-400 dark:text-white/55 uppercase tracking-wider">
                  Verified At
                </th>
                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-brown-400 dark:text-white/55 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-brown-400 dark:text-white/55 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dm-card divide-y divide-brown-100 dark:divide-dm-border">
              {filteredHistory.map((item) => (
                <tr key={item._id} className="hover:bg-ivory dark:hover:bg-dm-card-2">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium dark:text-white">
                    <span className="hidden sm:inline">{item.orderNumber || ''}</span>
                    <span className="sm:hidden">{item.orderNumber?.substring(0, 6) || item._id.substring(0, 6)}...</span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-brown-500 dark:text-white/55">
                    <div className="flex flex-col">
                      <span className="font-medium truncate max-w-[120px] sm:max-w-[150px] md:max-w-none">
                        {item.customerName}
                      </span>
                      {item.customerPhone && (
                        <span className="text-xs text-brown-400 hidden sm:block truncate max-w-[120px] sm:max-w-[150px] md:max-w-none">
                          {item.customerPhone}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-4 py-4 whitespace-nowrap text-sm text-brown-500 dark:text-white/55">
                    {formatCurrency(item.totalAmount)}
                  </td>
                  <td className="hidden sm:table-cell px-4 py-4 whitespace-nowrap text-sm text-brown-500 dark:text-white/55">
                    <span className="truncate max-w-[100px] md:max-w-none block">
                      {item.verifiedBy}
                    </span>
                  </td>
                  <td className="hidden lg:table-cell px-4 py-4 whitespace-nowrap text-sm text-brown-500 dark:text-white/55">
                    {formatDate(item.verifiedAt)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      <FaCheckCircle className="mr-1" />
                      <span className="hidden sm:inline">Picked Up</span>
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center text-sm">
                    <div className="flex flex-col sm:flex-row gap-2 justify-center items-center">
                      <button
                        onClick={() => handleViewOrderDetails(item)}
                        className="text-plum-600 hover:text-plum-800 dark:text-plum-300 dark:hover:text-plum-200 flex items-center"
                        title="View Details"
                      >
                        <FaEye />
                        <span className="ml-1 hidden sm:inline">View</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Verification History</h1>
        <div className="flex space-x-2">
          <button 
            onClick={() => navigate('/dashboard/profile')}
            className="bg-brown-100 dark:bg-dm-card-2 px-4 py-2 rounded-lg flex items-center text-charcoal dark:text-white/70 hover:bg-brown-200 dark:hover:bg-dm-border"
          >
            <FaArrowLeft className="mr-2" /> Back to Dashboard
          </button>
          <button 
            onClick={fetchVerificationHistory}
            className="bg-primary-100 px-4 py-2 rounded-lg flex items-center text-white hover:bg-primary-200"
          >
            Refresh
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-plum-700 hover:bg-plum-600 px-4 py-2 rounded-lg flex items-center text-white"
          >
            <FaFilter className="mr-2" /> {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>
      </div>

      {/* View toggle buttons */}
      <div className="flex mb-4 justify-end">
        <div className="inline-flex rounded-md shadow-sm">
          <button
            onClick={() => setViewMode('grid')}
            className={`py-2 px-4 text-sm font-medium rounded-l-lg border ${
              viewMode === 'grid'
                ? 'bg-primary-100 text-white border-primary-100'
                : 'bg-white dark:bg-dm-card text-charcoal dark:text-white border-brown-200 dark:border-dm-border hover:bg-brown-50 dark:hover:bg-dm-card-2'
            }`}
          >
            Grid View
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`py-2 px-4 text-sm font-medium rounded-r-lg border ${
              viewMode === 'table'
                ? 'bg-primary-100 text-white border-primary-100'
                : 'bg-white dark:bg-dm-card text-charcoal dark:text-white border-brown-200 dark:border-dm-border hover:bg-brown-50 dark:hover:bg-dm-card-2'
            }`}
          >
            Table View
          </button>
        </div>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <div className="bg-white dark:bg-dm-card rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Staff Filter */}
            <div>
              <label htmlFor="staffFilter" className="block text-sm font-medium text-charcoal dark:text-white/55 mb-1">
                <FaUser className="inline mr-1" /> Filter by Staff Member
              </label>
              <select
                id="staffFilter"
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                className="w-full p-2 border border-brown-200 dark:border-dm-border rounded-md bg-white dark:bg-dm-card-2 text-charcoal dark:text-white"
              >
                <option value="">All Staff Members</option>
                {staffMembers.map((staff, index) => (
                  <option key={index} value={staff}>{staff}</option>
                ))}
              </select>
            </div>

            {/* Search Filter */}
            <div>
              <label htmlFor="searchFilter" className="block text-sm font-medium text-charcoal dark:text-white/55 mb-1">
                <FaSearch className="inline mr-1" /> Search by Order ID or Customer
              </label>
              <input
                type="text"
                id="searchFilter"
                placeholder="Enter order ID or customer name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 border border-brown-200 dark:border-dm-border rounded-md bg-white dark:bg-dm-card-2 text-charcoal dark:text-white"
              />
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-charcoal dark:text-white/55 mb-1">
                <FaCalendar className="inline mr-1" /> Verification Date Range
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                  className="p-2 border border-brown-200 dark:border-dm-border rounded-md bg-white dark:bg-dm-card-2 text-charcoal dark:text-white"
                />
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                  className="p-2 border border-brown-200 dark:border-dm-border rounded-md bg-white dark:bg-dm-card-2 text-charcoal dark:text-white"
                />
              </div>
            </div>
          </div>
          
          {/* Filter actions */}
          <div className="flex justify-end mt-4">
            <button
              onClick={resetFilters}
              className="flex items-center px-4 py-2 border border-brown-200 dark:border-dm-border rounded-md text-charcoal dark:text-white/55 hover:bg-brown-50 dark:hover:bg-dm-card-2 mr-2"
            >
              <FaTimes className="mr-1" /> Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Results summary */}
      {!loading && !error && (
        <div className="mb-4">
          <p className="text-brown-500 dark:text-white/40">
            <span className="font-medium">{filteredHistory.length}</span> verification{filteredHistory.length !== 1 ? 's' : ''} found
            {(selectedStaff || searchTerm || dateRange.startDate || dateRange.endDate) && ' with current filters'}
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center p-8">
          <FaSpinner className="animate-spin text-3xl text-primary-100" />
        </div>
      ) : error ? (
        <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-4 rounded-lg mb-6">
          <div className="flex items-center">
            <FaExclamationTriangle className="text-red-500 mr-2" />
            <p>{error}</p>
          </div>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="bg-white dark:bg-dm-card rounded-lg shadow-md p-8 text-center">
          <FaHistory className="text-5xl mx-auto mb-4 text-brown-400 dark:text-brown-400" />
          <h2 className="text-xl font-semibold dark:text-white mb-2">No Verification History</h2>
          <p className="text-brown-500 dark:text-white/40">
            {history.length === 0 
              ? 'There are no completed pickup verifications yet.' 
              : 'No verifications match your current filter criteria.'}
          </p>
        </div>
      ) : (
        <div>
          {viewMode === 'grid' ? renderGridView() : renderTableView()}
        </div>
      )}
      
      {/* Order Details Modal */}
      {selectedOrder && renderOrderDetailsView()}
    </div>
  );
};

export default VerificationHistory;
