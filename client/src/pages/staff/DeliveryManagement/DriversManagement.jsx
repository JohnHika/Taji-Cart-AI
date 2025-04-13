import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

const DriversManagement = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [viewType, setViewType] = useState('grid'); // 'grid' or 'list'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_SERVER_URL}/api/delivery/available-drivers`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setDrivers(response.data.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      toast.error('Failed to fetch delivery drivers');
      setLoading(false);
    }
  };

  const handleToggleDriverStatus = async (driverId, currentStatus) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // This is a placeholder - you would need to implement this endpoint in your backend
      await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/api/delivery/toggle-driver-status`,
        { 
          driverId, 
          isActive: !currentStatus 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(`Driver ${currentStatus ? 'deactivated' : 'activated'} successfully`);
      fetchDrivers(); // Refresh the list
    } catch (error) {
      console.error('Error toggling driver status:', error);
      toast.error('Failed to update driver status');
      setLoading(false);
    }
  };

  // Filter drivers based on search term and status
  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = 
      driver.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.contact?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.contact?.mobile?.includes(searchTerm);
      
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && driver.isActive) ||
      (statusFilter === 'inactive' && !driver.isActive) ||
      (statusFilter === 'available' && driver.isAvailable) ||
      (statusFilter === 'busy' && !driver.isAvailable && driver.isActive);
    
    return matchesSearch && matchesStatus;
  });

  if (loading && drivers.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Delivery Drivers</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setViewType('grid')}
            className={`p-2 ${viewType === 'grid' ? 'bg-blue-500 text-white' : 'bg-gray-200'} rounded-md`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
            </svg>
          </button>
          <button
            onClick={() => setViewType('list')}
            className={`p-2 ${viewType === 'list' ? 'bg-blue-500 text-white' : 'bg-gray-200'} rounded-md`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
            </svg>
          </button>
        </div>
      </div>
      
      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="w-full md:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Drivers</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="available">Available</option>
            <option value="busy">Busy</option>
          </select>
        </div>
      </div>
      
      {filteredDrivers.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No drivers found matching your criteria.</p>
        </div>
      ) : viewType === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDrivers.map((driver) => (
            <div key={driver._id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full bg-gray-300 flex justify-center items-center overflow-hidden mr-3">
                      {driver.profileImage ? (
                        <img 
                          src={driver.profileImage} 
                          alt={driver.name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl text-gray-600">
                          {driver.name?.charAt(0) || '?'}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{driver.name}</h3>
                      <div className="flex items-center mt-1">
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                          driver.isAvailable && driver.isActive ? 'bg-green-500' : 
                          driver.isActive ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></span>
                        <span className="text-sm text-gray-600">
                          {driver.isAvailable && driver.isActive ? 'Available' : 
                           driver.isActive ? 'Busy' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-500 block">Active Orders</span>
                    <span className="text-xl font-bold">{driver.activeOrdersCount || 0}</span>
                  </div>
                </div>
                
                <div className="mt-4 space-y-2 text-sm">
                  {driver.contact?.mobile && (
                    <p className="flex items-center">
                      <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                      </svg>
                      {driver.contact.mobile}
                    </p>
                  )}
                  {driver.contact?.email && (
                    <p className="flex items-center">
                      <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                      </svg>
                      {driver.contact.email}
                    </p>
                  )}
                  {typeof driver.efficiencyScore === 'object' && (
                    <p className="flex items-center">
                      <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
                      </svg>
                      Rating: {driver.efficiencyScore.avgRating || 'N/A'}
                    </p>
                  )}
                </div>
                
                <div className="mt-4 flex justify-between">
                  <button
                    onClick={() => setSelectedDriver(driver)}
                    className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => handleToggleDriverStatus(driver._id, driver.isActive)}
                    className={`px-3 py-1 rounded-md transition ${
                      driver.isActive 
                        ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {driver.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left">Driver</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Contact</th>
                <th className="px-4 py-2 text-left">Active Orders</th>
                <th className="px-4 py-2 text-left">Rating</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.map((driver) => (
                <tr key={driver._id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex justify-center items-center overflow-hidden mr-3">
                        {driver.profileImage ? (
                          <img 
                            src={driver.profileImage} 
                            alt={driver.name} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-lg text-gray-600">
                            {driver.name?.charAt(0) || '?'}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{driver.name}</div>
                        <div className="text-sm text-gray-500">
                          Last active: {driver.lastActive ? new Date(driver.lastActive).toLocaleDateString() : 'Unknown'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      driver.isAvailable && driver.isActive ? 'bg-green-100 text-green-800' : 
                      driver.isActive ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {driver.isAvailable && driver.isActive ? 'Available' : 
                       driver.isActive ? 'Busy' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      {driver.contact?.mobile && <div>{driver.contact.mobile}</div>}
                      {driver.contact?.email && <div className="text-gray-500">{driver.contact.email}</div>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {driver.activeOrdersCount || 0}
                  </td>
                  <td className="px-4 py-3">
                    {typeof driver.efficiencyScore === 'object' ? (
                      <div>
                        <div className="flex items-center">
                          <span className="font-medium mr-1">{driver.efficiencyScore.avgRating || 'N/A'}</span>
                          <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                          </svg>
                        </div>
                        <div className="text-xs text-gray-500">
                          {driver.efficiencyScore.completedOrders || 0} deliveries
                        </div>
                      </div>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedDriver(driver)}
                        className="px-3 py-1 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600 transition"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleToggleDriverStatus(driver._id, driver.isActive)}
                        className={`px-3 py-1 text-xs rounded-md transition ${
                          driver.isActive 
                            ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {driver.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Driver Details Modal */}
      {selectedDriver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl font-semibold">Driver Details</h3>
              <button
                onClick={() => setSelectedDriver(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-1/3">
                <div className="w-full h-48 bg-gray-200 rounded-lg flex justify-center items-center overflow-hidden mb-4">
                  {selectedDriver.profileImage ? (
                    <img 
                      src={selectedDriver.profileImage} 
                      alt={selectedDriver.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-6xl text-gray-400">
                      {selectedDriver.name?.charAt(0) || '?'}
                    </span>
                  )}
                </div>
                
                <div className="flex justify-center mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    selectedDriver.isAvailable && selectedDriver.isActive ? 'bg-green-100 text-green-800' : 
                    selectedDriver.isActive ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedDriver.isAvailable && selectedDriver.isActive ? 'Available' : 
                     selectedDriver.isActive ? 'Busy' : 'Inactive'}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold text-lg">{selectedDriver.name}</h4>
                  
                  {selectedDriver.contact?.mobile && (
                    <p className="flex items-center">
                      <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                      </svg>
                      {selectedDriver.contact.mobile}
                    </p>
                  )}
                  
                  {selectedDriver.contact?.email && (
                    <p className="flex items-center">
                      <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                      </svg>
                      {selectedDriver.contact.email}
                    </p>
                  )}
                  
                  <p className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    Last Active: {selectedDriver.lastActive ? new Date(selectedDriver.lastActive).toLocaleString() : 'Unknown'}
                  </p>
                </div>
              </div>
              
              <div className="md:w-2/3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h5 className="text-sm text-blue-800 font-medium">Active Orders</h5>
                    <p className="text-3xl font-bold text-blue-600">{selectedDriver.activeOrdersCount || 0}</p>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h5 className="text-sm text-green-800 font-medium">Completed Orders</h5>
                    <p className="text-3xl font-bold text-green-600">
                      {typeof selectedDriver.efficiencyScore === 'object' ? selectedDriver.efficiencyScore.completedOrders || 0 : 'N/A'}
                    </p>
                  </div>
                  
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h5 className="text-sm text-yellow-800 font-medium">Average Rating</h5>
                    <div className="flex items-center">
                      <p className="text-3xl font-bold text-yellow-600 mr-2">
                        {typeof selectedDriver.efficiencyScore === 'object' ? selectedDriver.efficiencyScore.avgRating || 'N/A' : 'N/A'}
                      </p>
                      <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                      </svg>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h5 className="text-sm text-purple-800 font-medium">Average Delivery Time</h5>
                    <p className="text-3xl font-bold text-purple-600">
                      {typeof selectedDriver.efficiencyScore === 'object' ? selectedDriver.efficiencyScore.avgDeliveryTime || 'N/A' : 'N/A'}
                    </p>
                  </div>
                </div>
                
                <div className="mb-4">
                  <h5 className="font-medium mb-2">Current Location</h5>
                  {selectedDriver.currentLocation ? (
                    <div className="bg-gray-100 p-4 rounded-lg text-sm">
                      <p>Last updated: {new Date(selectedDriver.currentLocation.lastUpdated).toLocaleString()}</p>
                      <p>Coordinates: {selectedDriver.currentLocation.coordinates.join(', ')}</p>
                      
                      {/* Placeholder for map - in real implementation you would integrate a map here */}
                      <div className="w-full h-48 bg-gray-200 mt-2 flex items-center justify-center">
                        <span className="text-gray-500">Map view would be displayed here</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">Location data not available</p>
                  )}
                </div>
                
                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => handleToggleDriverStatus(selectedDriver._id, selectedDriver.isActive)}
                    className={`px-4 py-2 rounded-md transition ${
                      selectedDriver.isActive 
                        ? 'bg-red-500 text-white hover:bg-red-600' 
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                  >
                    {selectedDriver.isActive ? 'Deactivate Driver' : 'Activate Driver'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriversManagement;