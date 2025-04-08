import React, { useEffect, useState } from 'react';
import { FaSpinner, FaMapMarkerAlt, FaTruck, FaUserAlt, FaCalendarCheck } from 'react-icons/fa';
import toast from 'react-hot-toast';
import Axios from '../../utils/Axios';
import AxiosToastError from '../../utils/AxiosToastError';

const DeliveryMap = () => {
  const [activeDeliveries, setActiveDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [updatingLocation, setUpdatingLocation] = useState(false);

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(location);
          
          // Automatically update location on the server when first obtained
          updateLocationOnServer(location);
        },
        error => {
          console.error('Error getting location:', error);
          toast.error('Unable to get your current location. Please enable location services.');
        }
      );
    } else {
      toast.error('Geolocation is not supported by your browser');
    }
    
    const fetchActiveDeliveries = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await Axios({
          url: '/api/delivery/active-orders',
          method: 'GET'
        });
        
        if (response.data.success) {
          setActiveDeliveries(response.data.data || []);
        } else {
          setError(response.data.message || 'Failed to fetch active deliveries');
          toast.error(response.data.message || 'Failed to fetch active deliveries');
        }
      } catch (error) {
        console.error('Error fetching active deliveries:', error);
        setError('Failed to load active deliveries. Please try again later.');
        AxiosToastError(error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchActiveDeliveries();
    
    // Set up polling to refresh data every 60 seconds
    const intervalId = setInterval(fetchActiveDeliveries, 60000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  const updateLocationOnServer = async (location = null) => {
    try {
      const locationToUpdate = location || currentLocation;
      if (!locationToUpdate) {
        toast.error('Location data not available');
        return;
      }
      
      setUpdatingLocation(true);
      
      const response = await Axios({
        url: '/api/delivery/update-location',
        method: 'POST',
        data: {
          location: locationToUpdate
        }
      });
      
      if (response.data.success) {
        toast.success('Location updated successfully');
      } else {
        toast.error(response.data.message || 'Failed to update location');
      }
    } catch (error) {
      console.error('Error updating location:', error);
      AxiosToastError(error);
    } finally {
      setUpdatingLocation(false);
    }
  };
  
  const updateCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(newLocation);
          updateLocationOnServer(newLocation);
        },
        error => {
          console.error('Error getting updated location:', error);
          toast.error('Unable to get your current location');
        }
      );
    } else {
      toast.error('Geolocation is not supported by your browser');
    }
  };
  
  const handleStatusUpdate = async (orderId, newStatus) => {
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
        toast.success(`Order status updated to ${newStatus}`);
        
        // Update the list of active deliveries
        const updatedActiveDeliveries = activeDeliveries.map(delivery => {
          if (delivery._id === orderId) {
            return { ...delivery, status: newStatus };
          }
          return delivery;
        });
        
        // If order is now delivered, remove it from active deliveries
        if (newStatus === 'delivered') {
          setActiveDeliveries(updatedActiveDeliveries.filter(delivery => delivery._id !== orderId));
        } else {
          setActiveDeliveries(updatedActiveDeliveries);
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
        <FaSpinner className="animate-spin text-4xl text-primary-200 mb-4" />
        <p className="text-lg text-gray-700 dark:text-gray-300">Loading map view...</p>
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
        <h1 className="text-2xl font-bold dark:text-white">Delivery Map</h1>
        <button
          onClick={updateCurrentLocation}
          disabled={updatingLocation}
          className="bg-primary-200 text-white px-4 py-2 rounded hover:bg-primary-300 flex items-center disabled:opacity-50"
        >
          {updatingLocation ? (
            <FaSpinner className="animate-spin mr-2" />
          ) : (
            <FaMapMarkerAlt className="mr-2" />
          )}
          Update My Location
        </button>
      </div>
      
      {/* Map container */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="h-[60vh] w-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          {/* This is where the map component would be rendered */}
          {/* In a real implementation, you'd use a library like Google Maps, Mapbox, or Leaflet */}
          <div className="text-center">
            <FaMapMarkerAlt className="text-5xl text-gray-500 dark:text-gray-400 mb-4 mx-auto" />
            <p className="text-gray-600 dark:text-gray-300">
              Map view would display here, showing your location and delivery destinations.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              (Integration with Google Maps or similar service required)
            </p>
          </div>
        </div>
        
        {/* Active deliveries sidebar */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold mb-2 dark:text-white">Active Deliveries ({activeDeliveries.length})</h2>
          
          {activeDeliveries.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No active deliveries at the moment.</p>
          ) : (
            <div className="grid gap-2">
              {activeDeliveries.map(delivery => (
                <div 
                  key={delivery._id} 
                  className={`p-3 rounded border ${
                    delivery.status === 'out_for_delivery' 
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' 
                      : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <p className="font-medium dark:text-white">{delivery.orderId}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      delivery.status === 'out_for_delivery' 
                        ? 'bg-yellow-200 text-yellow-800' 
                        : 'bg-blue-200 text-blue-800'
                    }`}>
                      {delivery.status === 'out_for_delivery' ? 'On Route' : 'Assigned'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <FaUserAlt className="inline mr-1 text-xs" /> {delivery.customer.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <FaMapMarkerAlt className="inline mr-1 text-xs" /> {delivery.deliveryAddress}
                  </p>
                  <div className="mt-2 flex justify-between">
                    <a
                      href={`https://maps.google.com/?q=${delivery.deliveryAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-200 hover:text-primary-300 text-sm"
                    >
                      Open in Maps
                    </a>
                    {delivery.status === 'driver_assigned' && (
                      <button 
                        className="text-primary-200 hover:text-primary-300 text-sm"
                        onClick={() => handleStatusUpdate(delivery._id, 'out_for_delivery')}
                      >
                        <FaTruck className="inline mr-1" /> Start
                      </button>
                    )}
                    {delivery.status === 'out_for_delivery' && (
                      <button 
                        className="text-green-600 hover:text-green-700 text-sm"
                        onClick={() => handleStatusUpdate(delivery._id, 'delivered')}
                      >
                        <FaCalendarCheck className="inline mr-1" /> Mark Complete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeliveryMap;
