import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Axios from '../../../utils/Axios';
import { buildApiUrl } from '../../../common/apiBaseUrl';
import toast from 'react-hot-toast';

const Dispatched = () => {
  const [dispatchedOrders, setDispatchedOrders] = useState([]);
  const [deliveryPersonnel, setDeliveryPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('dispatchedAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedDeliveryPerson, setSelectedDeliveryPerson] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchDispatchedOrders();
    fetchDeliveryPersonnel();
  }, [sortBy, sortDirection]);

  const fetchDispatchedOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await Axios({
        url: buildApiUrl(`/api/delivery/dispatched-orders?sort=${sortBy}&direction=${sortDirection}`),
        method: 'GET'
      });
      if (response.data.success) {
        setDispatchedOrders(response.data.data);
      } else {
        setError('Failed to fetch dispatched orders');
      }
    } catch (err) {
      console.error('Error fetching dispatched orders:', err);
      setError('An error occurred while fetching dispatched orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveryPersonnel = async () => {
    try {
      // Active route: /api/delivery/available-drivers
      const response = await Axios({
        url: buildApiUrl('/api/delivery/available-drivers'),
        method: 'GET'
      });
      if (response.data.success) {
        setDeliveryPersonnel(response.data.data);
      } else {
        console.error('Failed to fetch delivery personnel');
      }
    } catch (err) {
      console.error('Error fetching delivery personnel:', err);
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  const handleSelectOrder = (orderId) => {
    if (selectedOrders.includes(orderId)) {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
    } else {
      setSelectedOrders([...selectedOrders, orderId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === dispatchedOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(dispatchedOrders.map(order => order._id));
    }
  };

  const handleAssignOrders = async () => {
    if (selectedOrders.length === 0) {
      toast.error('Please select at least one order to assign');
      return;
    }
    if (!selectedDeliveryPerson) {
      toast.error('Please select a delivery person');
      return;
    }
    try {
      // Active route: /api/delivery/assign-driver
      const response = await Axios({
        url: buildApiUrl('/api/delivery/assign-driver'),
        method: 'POST',
        data: {
          orderIds: selectedOrders,
          deliveryPersonnelId: selectedDeliveryPerson
        }
      });
      if (response.data.success) {
        toast.success(`Successfully assigned ${selectedOrders.length} order(s) to delivery personnel`);
        setSelectedOrders([]);
        setSelectedDeliveryPerson('');
        fetchDispatchedOrders();
        navigate('/dashboard/staff/delivery/active');
      } else {
        setError('Failed to assign orders');
        toast.error(response.data.message || 'Failed to assign orders');
      }
    } catch (err) {
      console.error('Error assigning orders:', err);
      toast.error(err?.response?.data?.message || 'An error occurred while assigning orders');
    }
  };

  const filteredOrders = dispatchedOrders.filter(order => {
    const term = searchTerm.toLowerCase();
    return (
      (order.orderId || '').toLowerCase().includes(term) ||
      (order.customer?.name || '').toLowerCase().includes(term) ||
      (order.customer?.phone || '').includes(searchTerm)
    );
  });

  const getSortIcon = (field) => {
    if (sortBy !== field) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount || 0);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold text-charcoal">Dispatched Orders</h1>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-4 py-2 border border-brown-200 rounded-md shadow-sm focus:ring-plum-500 focus:border-plum-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-brown-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <button
            onClick={fetchDispatchedOrders}
            className="inline-flex items-center px-3 py-2 border border-brown-200 shadow-sm text-sm leading-4 font-medium rounded-md text-charcoal bg-white hover:bg-ivory focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-plum-500"
          >
            <svg className="mr-2 -ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-plum-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-brown-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-charcoal">No dispatched orders</h3>
          <p className="mt-1 text-sm text-brown-400">There are no orders waiting for delivery assignment.</p>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                onChange={handleSelectAll}
                className="h-4 w-4 text-plum-600 focus:ring-plum-500 border-brown-200 rounded"
              />
              <span className="ml-2 text-sm text-charcoal">
                {selectedOrders.length > 0 ? `${selectedOrders.length} selected` : 'Select all'}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={selectedDeliveryPerson}
                onChange={(e) => setSelectedDeliveryPerson(e.target.value)}
                className="block px-3 py-2 bg-white border border-brown-200 rounded-md shadow-sm focus:outline-none focus:ring-plum-500 focus:border-plum-500 sm:text-sm"
              >
                <option value="">Select delivery personnel</option>
                {deliveryPersonnel.map(person => (
                  <option key={person._id} value={person._id}>
                    {person.name} - {person.vehicleType || 'N/A'} - {person.currentOrders ?? 0} orders
                  </option>
                ))}
              </select>
              <button
                onClick={handleAssignOrders}
                disabled={selectedOrders.length === 0 || !selectedDeliveryPerson}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  selectedOrders.length > 0 && selectedDeliveryPerson
                    ? 'bg-plum-700 text-white hover:bg-plum-600'
                    : 'bg-brown-200 text-brown-400 cursor-not-allowed'
                }`}
              >
                Assign to Delivery
              </button>
            </div>
          </div>

          <div className="bg-white shadow overflow-hidden rounded-lg">
            <table className="min-w-full divide-y divide-brown-100">
              <thead className="bg-ivory">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-brown-400 uppercase tracking-wider w-6">
                    <span className="sr-only">Select</span>
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-brown-400 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('orderId')}>
                    <div className="flex items-center">Order ID<span className="ml-1">{getSortIcon('orderId')}</span></div>
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-brown-400 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('customer.name')}>
                    <div className="flex items-center">Customer<span className="ml-1">{getSortIcon('customer.name')}</span></div>
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-brown-400 uppercase tracking-wider">Address</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-brown-400 uppercase tracking-wider">Items</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-brown-400 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('total')}>
                    <div className="flex items-center">Total<span className="ml-1">{getSortIcon('total')}</span></div>
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-brown-400 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('dispatchedAt')}>
                    <div className="flex items-center">Dispatched<span className="ml-1">{getSortIcon('dispatchedAt')}</span></div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-brown-100">
                {filteredOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-ivory">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order._id)}
                        onChange={() => handleSelectOrder(order._id)}
                        className="h-4 w-4 text-plum-600 focus:ring-plum-500 border-brown-200 rounded"
                      />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm text-charcoal font-medium">{order.orderId}</span>
                      <div className="text-xs text-brown-400">{order.paymentStatus}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-charcoal">{order.customer?.name || '—'}</div>
                      <div className="text-sm text-brown-400">{order.customer?.phone || '—'}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-charcoal">{order.deliveryAddress?.street || order.deliveryAddress?.address_line || '—'}</div>
                      <div className="text-sm text-brown-400">{order.deliveryAddress?.city}{order.deliveryAddress?.neighborhood ? `, ${order.deliveryAddress.neighborhood}` : ''}</div>
                      {order.deliveryAddress?.landmark && (
                        <div className="text-xs text-brown-400 italic">Near {order.deliveryAddress.landmark}</div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-charcoal">{(order.items || []).length} items</div>
                      <div className="text-xs text-brown-400">
                        {(order.items || []).slice(0, 2).map((item, index) => (
                          <div key={index}>{item.quantity}x {item.name}</div>
                        ))}
                        {(order.items || []).length > 2 && <div>+{order.items.length - 2} more</div>}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-charcoal">
                      {formatCurrency(order.total || order.totalAmt)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-brown-400">
                      {formatDate(order.dispatchedAt || order.dispatchInfo?.dispatchedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dispatched;
