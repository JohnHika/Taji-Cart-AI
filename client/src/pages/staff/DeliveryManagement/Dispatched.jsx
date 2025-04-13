import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_SERVER_URL}/api/delivery/dispatched-orders?sort=${sortBy}&direction=${sortDirection}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setDispatchedOrders(response.data.data);
      } else {
        setError("Failed to fetch dispatched orders");
      }
    } catch (error) {
      console.error("Error fetching dispatched orders:", error);
      setError("An error occurred while fetching dispatched orders");
      
      // Mock data for development
      setDispatchedOrders([
        {
          _id: '1',
          orderId: 'ORD-001230',
          customer: {
            name: 'Sarah Wilson',
            phone: '+254712345678'
          },
          deliveryAddress: {
            street: '123 Lenana Road',
            city: 'Nairobi',
            neighborhood: 'Kilimani',
            landmark: 'Near Yaya Center'
          },
          items: [
            { name: 'Cauliflower', quantity: 1 },
            { name: 'Broccoli', quantity: 2 }
          ],
          total: 950,
          createdAt: '2025-04-12T14:30:00Z',
          dispatchedAt: '2025-04-13T08:15:00Z',
          paymentStatus: 'paid'
        },
        {
          _id: '2',
          orderId: 'ORD-001231',
          customer: {
            name: 'David Mwangi',
            phone: '+254723456789'
          },
          deliveryAddress: {
            street: '456 Waiyaki Way',
            city: 'Nairobi',
            neighborhood: 'Westlands',
            landmark: 'Near Sarit Center'
          },
          items: [
            { name: 'Spinach', quantity: 3 },
            { name: 'Kale', quantity: 2 },
            { name: 'Carrots', quantity: 1 }
          ],
          total: 780,
          createdAt: '2025-04-12T15:20:00Z',
          dispatchedAt: '2025-04-13T08:30:00Z',
          paymentStatus: 'paid'
        },
        {
          _id: '3',
          orderId: 'ORD-001232',
          customer: {
            name: 'Grace Kimani',
            phone: '+254734567890'
          },
          deliveryAddress: {
            street: '789 Thika Road',
            city: 'Nairobi',
            neighborhood: 'Kasarani',
            landmark: 'Near Garden City Mall'
          },
          items: [
            { name: 'Red Onions', quantity: 2 },
            { name: 'Sweet Potatoes', quantity: 3 },
            { name: 'Ginger', quantity: 1 }
          ],
          total: 650,
          createdAt: '2025-04-12T16:45:00Z',
          dispatchedAt: '2025-04-13T08:45:00Z',
          paymentStatus: 'paid'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveryPersonnel = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_SERVER_URL}/api/delivery/personnel/available`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setDeliveryPersonnel(response.data.data);
      } else {
        console.error("Failed to fetch delivery personnel");
      }
    } catch (error) {
      console.error("Error fetching delivery personnel:", error);
      
      // Mock data for development
      setDeliveryPersonnel([
        {
          _id: 'dp1',
          name: 'John Kamau',
          phone: '+254712345111',
          vehicleType: 'Motorcycle',
          rating: 4.8,
          currentOrders: 0
        },
        {
          _id: 'dp2',
          name: 'Alice Ochieng',
          phone: '+254723456222',
          vehicleType: 'Bicycle',
          rating: 4.5,
          currentOrders: 1
        },
        {
          _id: 'dp3',
          name: 'Peter Njoroge',
          phone: '+254734567333',
          vehicleType: 'Motorcycle',
          rating: 4.9,
          currentOrders: 0
        }
      ]);
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
      alert('Please select at least one order to assign');
      return;
    }

    if (!selectedDeliveryPerson) {
      alert('Please select a delivery person');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/api/delivery/assign-orders`,
        { 
          orderIds: selectedOrders,
          deliveryPersonnelId: selectedDeliveryPerson
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        // Show success message and refresh the list
        alert(`Successfully assigned ${selectedOrders.length} orders to delivery personnel`);
        setSelectedOrders([]);
        setSelectedDeliveryPerson('');
        fetchDispatchedOrders();
        
        // Navigate to the assigned orders section
        navigate('/staff/delivery/assigned');
      } else {
        setError("Failed to assign orders");
      }
    } catch (error) {
      console.error("Error assigning orders:", error);
      alert("An error occurred while assigning orders");
      
      // For development purposes, simulate success
      alert(`Successfully assigned ${selectedOrders.length} orders to delivery personnel (simulated)`);
      setSelectedOrders([]);
      setSelectedDeliveryPerson('');
      fetchDispatchedOrders();
    }
  };

  const filteredOrders = dispatchedOrders.filter(order => 
    order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer.phone.includes(searchTerm)
  );

  const getSortIcon = (field) => {
    if (sortBy !== field) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const formatDate = (dateString) => {
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
    }).format(amount);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Dispatched Orders</h1>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
          </div>
          <button
            onClick={fetchDispatchedOrders}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No dispatched orders</h3>
          <p className="mt-1 text-sm text-gray-500">
            There are no orders waiting for delivery assignment.
          </p>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                onChange={handleSelectAll}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                {selectedOrders.length > 0 ? `${selectedOrders.length} selected` : 'Select all'}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={selectedDeliveryPerson}
                onChange={(e) => setSelectedDeliveryPerson(e.target.value)}
                className="block px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Select delivery personnel</option>
                {deliveryPersonnel.map(person => (
                  <option key={person._id} value={person._id}>
                    {person.name} - {person.vehicleType} - {person.currentOrders} orders
                  </option>
                ))}
              </select>
              <button
                onClick={handleAssignOrders}
                disabled={selectedOrders.length === 0 || !selectedDeliveryPerson}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  selectedOrders.length > 0 && selectedDeliveryPerson
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Assign to Delivery
              </button>
            </div>
          </div>

          <div className="bg-white shadow overflow-hidden rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-6">
                    <span className="sr-only">Select</span>
                  </th>
                  <th 
                    scope="col" 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('orderId')}
                  >
                    <div className="flex items-center">
                      Order ID
                      <span className="ml-1">{getSortIcon('orderId')}</span>
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('customer.name')}
                  >
                    <div className="flex items-center">
                      Customer
                      <span className="ml-1">{getSortIcon('customer.name')}</span>
                    </div>
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Address
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th 
                    scope="col" 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('total')}
                  >
                    <div className="flex items-center">
                      Total
                      <span className="ml-1">{getSortIcon('total')}</span>
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('dispatchedAt')}
                  >
                    <div className="flex items-center">
                      Dispatched
                      <span className="ml-1">{getSortIcon('dispatchedAt')}</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order._id)}
                        onChange={() => handleSelectOrder(order._id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 font-medium">{order.orderId}</span>
                      <div className="text-xs text-gray-500">{order.paymentStatus}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{order.customer.name}</div>
                      <div className="text-sm text-gray-500">{order.customer.phone}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">{order.deliveryAddress.street}</div>
                      <div className="text-sm text-gray-500">{order.deliveryAddress.city}, {order.deliveryAddress.neighborhood}</div>
                      {order.deliveryAddress.landmark && (
                        <div className="text-xs text-gray-500 italic">Near {order.deliveryAddress.landmark}</div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">{order.items.length} items</div>
                      <div className="text-xs text-gray-500">
                        {order.items.slice(0, 2).map((item, index) => (
                          <div key={index}>{item.quantity}x {item.name}</div>
                        ))}
                        {order.items.length > 2 && <div>+{order.items.length - 2} more</div>}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.dispatchedAt)}
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