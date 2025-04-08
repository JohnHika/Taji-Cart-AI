import axios from 'axios'; // Use lowercase axios
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import React, { useEffect, useRef, useState } from 'react';
import { FaArrowLeft, FaBox, FaBoxOpen, FaCheckCircle, FaExclamationTriangle, FaHistory, FaLock, FaMapMarkerAlt, FaSpinner, FaSync, FaTruck } from 'react-icons/fa';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import io from 'socket.io-client';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Custom icons for markers
const deliveryIcon = new L.Icon({
  iconUrl: '/images/delivery-marker.png',
  iconRetinaUrl: '/images/delivery-marker.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
  // Add fallback
  onError: function() {
    this.src = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png';
  }
});

const homeIcon = new L.Icon({
  iconUrl: '/images/home-marker.png',
  iconRetinaUrl: '/images/home-marker.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
  // Add fallback
  onError: function() {
    this.src = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png';
  }
});

const OrderTracking = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [destinationLocation, setDestinationLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([-1.286389, 36.817223]); // Default to Nairobi
  const [mapZoom, setMapZoom] = useState(12);
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const mapRef = useRef(null);
  const socketRef = useRef(null);
  const [error, setError] = useState(null);
  const [errorCode, setErrorCode] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Add network status detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('You are back online!');
      // Refresh data when coming back online
      if (orderId) {
        fetchOrderDetails();
        if (socketRef.current) socketRef.current.connect();
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('You are offline. Tracking updates paused.');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [orderId]);
  
  // Connect to Socket.io server with reconnection handling
  useEffect(() => {
    // Get backend URL from environment variable or use default
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
    
    const connectSocket = () => {
      console.log(`Connecting to socket server at ${backendUrl}`);
      
      const newSocket = io(backendUrl, {
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: 10, // Increased from 5
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 30000, // Increased from 20000
        autoConnect: true,
        query: { orderId } // Add orderId to query params
      });
      
      socketRef.current = newSocket;
      setSocket(newSocket);
      
      newSocket.on('connect', () => {
        console.log('Socket connected');
        setReconnectAttempts(0);
        // Join the order's tracking room
        newSocket.emit('joinOrderRoom', orderId);
      });
      
      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        toast.error('Connection error. Attempting to reconnect...');
        // If not already retrying
        if (reconnectAttempts === 0) {
          setTimeout(() => {
            if (socketRef.current) socketRef.current.connect();
          }, 3000);
        }
      });
      
      newSocket.on('disconnect', (reason) => {
        console.log(`Socket disconnected: ${reason}`);
        if (reason === 'io server disconnect') {
          // The server has forcefully disconnected the socket
          setTimeout(() => {
            newSocket.connect();
          }, 3000);
        }
      });
      
      newSocket.on('reconnect_attempt', (attempt) => {
        console.log(`Reconnection attempt ${attempt}`);
        setReconnectAttempts(attempt);
      });
      
      newSocket.on('reconnect_failed', () => {
        console.log('Failed to reconnect');
        toast.error('Connection lost. Please refresh the page to restore live tracking.');
      });
      
      newSocket.on('reconnect', () => {
        console.log('Reconnected to server');
        toast.success('Connection restored!');
        // Re-join room after reconnection
        newSocket.emit('joinOrderRoom', orderId);
      });
      
      // Listen for location updates
      newSocket.on('locationUpdated', (data) => {
        if (data.orderId === orderId) {
          console.log('Location update received:', data);
          setDeliveryLocation(data.location);
          
          // Update distance and ETA if available
          if (data.distance) setDistance(data.distance);
          if (data.eta) setEta(data.eta);
          
          // Center map on new location
          if (mapRef.current) {
            // Try both methods as leaflet component might be accessed differently
            const mapInstance = mapRef.current.leafletElement || mapRef.current;
            if (mapInstance && mapInstance.flyTo) {
              mapInstance.flyTo(
                [data.location.lat, data.location.lng], 
                mapZoom,
                { duration: 1.5 } // Smooth animation
              );
            } else {
              setMapCenter([data.location.lat, data.location.lng]);
            }
          }
          
          // Update order status if included
          if (data.status && order && data.status !== order.status) {
            setOrder(prev => ({...prev, status: data.status}));
            toast.info(`Order status updated to: ${data.status.replace('_', ' ')}`);
          }
        }
      });
      
      // Also listen for location_update events for backward compatibility
      newSocket.on('location_update', (data) => {
        if (data.orderId === orderId) {
          console.log('Legacy location update received:', data);
          setDeliveryLocation(data.location);
          
          if (data.eta) setEta(data.eta);
          if (data.distance) setDistance(data.distance);
        }
      });
      
      // Listen for status updates
      newSocket.on('statusUpdated', (data) => {
        if (data.orderId === orderId) {
          setOrder(prev => ({
            ...prev, 
            status: data.status,
            estimatedDeliveryTime: data.estimatedDelivery,
            statusHistory: data.statusHistory || prev?.statusHistory
          }));
          
          toast.info(`Order status: ${data.status.replace('_', ' ')}`);
        }
      });
    };
    
    if (orderId) {
      connectSocket();
    }
    
    // Clean up socket connection
    return () => {
      if (socketRef.current) {
        console.log('Cleaning up socket connection');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [orderId]);
  
  // Fetch order details
  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorCode(null);
      
      const response = await axios.get(`/api/order/track/${orderId}`);
      
      if (response.data.success) {
        const orderData = response.data.data;
        
        // Handle different product data structures
        if (!orderData.items && orderData.product_details) {
          orderData.items = [{
            productId: {
              _id: orderData.productId,
              name: orderData.product_details.name,
              image: orderData.product_details.image?.[0],
              price: orderData.totalAmt
            },
            quantity: orderData.quantity || 1
          }];
        }
        
        setOrder(orderData);
        
        // Set delivery location if available
        if (orderData.currentLocation) {
          const location = orderData.currentLocation;
          setDeliveryLocation(location);
          setMapCenter([location.lat, location.lng]);
        }
        
        // Set destination location from delivery address
        if (orderData.delivery_address && 
            orderData.delivery_address.coordinates) {
          const coords = orderData.delivery_address.coordinates;
          setDestinationLocation(coords);
        }
      } else {
        setError(response.data.message || 'Failed to load order details');
        setErrorCode(response.data.errorCode);
        toast.error('Failed to load order details');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      setError(error.response?.data?.message || 'Error loading tracking information');
      setErrorCode(error.response?.data?.errorCode || 'NETWORK_ERROR');
      toast.error('Error loading tracking information');
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);
  
  const handleRetry = () => {
    setRetrying(true);
    fetchOrderDetails();
  };

  // Format date with time
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Render function for status history
  const renderStatusHistory = () => {
    if (!order || !order.statusHistory || order.statusHistory.length === 0) {
      return null;
    }
    
    return (
      <div className="border-t pt-4 mb-6">
        <h3 className="font-medium mb-3 flex items-center">
          <FaHistory className="mr-2 text-gray-600" /> 
          Status History
        </h3>
        <div className="space-y-3">
          {order.statusHistory.slice().reverse().map((status, index) => (
            <div key={index} className="flex items-start">
              <div className="w-2 h-2 rounded-full bg-primary-100 mt-2 mr-3"></div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <p className="font-medium">
                    {status.status.charAt(0).toUpperCase() + status.status.slice(1).replace('_', ' ')}
                  </p>
                  <p className="text-sm text-gray-600">{formatDateTime(status.timestamp)}</p>
                </div>
                {status.note && <p className="text-sm text-gray-600 mt-1">{status.note}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Render function for status steps
  const renderStatusSteps = () => {
    const statuses = [
      { key: 'pending', label: 'Order Received', icon: <FaBox /> },
      { key: 'processing', label: 'Preparing Order', icon: <FaBox /> },
      { key: 'driver_assigned', label: 'Driver Assigned', icon: <FaTruck /> },
      { key: 'out_for_delivery', label: 'Out for Delivery', icon: <FaTruck /> },
      { key: 'nearby', label: 'Driver Nearby', icon: <FaMapMarkerAlt /> },
      { key: 'delivered', label: 'Delivered', icon: <FaCheckCircle /> }
    ];
    
    // Find the index of the current status
    const currentStatusIndex = statuses.findIndex(s => s.key === (order?.status || 'pending'));
    
    return (
      <div className="flex flex-col md:flex-row justify-between mb-8 px-4">
        {statuses.map((status, index) => {
          // Determine if this status is active, completed, or upcoming
          const isCompleted = index <= currentStatusIndex;
          const isActive = index === currentStatusIndex;
          
          return (
            <div key={status.key} className="flex flex-col items-center mb-4 md:mb-0 relative">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                isActive ? 'bg-primary-100 text-white' :
                isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {status.icon}
              </div>
              <div className="text-sm text-center">
                {status.label}
              </div>
              {index < statuses.length - 1 && (
                <div className="hidden md:block h-[2px] w-16 bg-gray-300 absolute"
                    style={{left: '100%', top: '24px', width: '100%'}} />
              )}
            </div>
          );
        })}
      </div>
    );
  };
  
  // Add delivery progress calculation
  const calculateProgress = () => {
    const statuses = ['pending', 'processing', 'driver_assigned', 'out_for_delivery', 'nearby', 'delivered'];
    const currentIndex = statuses.indexOf(order?.status || 'pending');
    return Math.max(5, Math.min(100, ((currentIndex + 1) / statuses.length) * 100));
  };
  
  // Add this conditional rendering for offline state
  if (!isOnline) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
          <div className="mb-4">
            <FaExclamationTriangle className="mx-auto text-5xl text-yellow-500 mb-3" />
          </div>
          <h2 className="text-xl font-bold mb-3 dark:text-white">You're Offline</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Your internet connection appears to be offline. Real-time tracking is paused.
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Last updated: {formatDateTime(new Date())}
          </p>
          <div className="flex justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary-100 hover:bg-primary-200 text-white rounded-md transition-colors flex items-center justify-center"
            >
              <FaSync className="mr-2" />
              Retry Connection
            </button>
          </div>
        </div>
        {order && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h2 className="text-lg font-medium mb-4">Last Known Status</h2>
            <p className="font-medium">Order #{order.orderId || order._id}</p>
            <p className="mb-4">Status: {order.status?.replace('_', ' ')}</p>
            <p className="text-sm text-gray-500">
              *This information may not be current due to your offline status.
            </p>
          </div>
        )}
      </div>
    );
  }
  
  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <FaSpinner className="animate-spin text-primary-100 text-3xl mb-4" />
        <p>Loading tracking information...</p>
      </div>
    );
  }
  
  // If order not found or error
  if (!order && !loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
          <div className="mb-4">
            {errorCode === "ORDER_NOT_FOUND" ? (
              <FaBoxOpen className="mx-auto text-5xl text-red-500 mb-3" />
            ) : errorCode === "UNAUTHORIZED_ACCESS" ? (
              <FaLock className="mx-auto text-5xl text-red-500 mb-3" />
            ) : (
              <FaExclamationTriangle className="mx-auto text-5xl text-red-500 mb-3" />
            )}
          </div>
          
          <h2 className="text-xl font-bold mb-3 dark:text-white">
            {errorCode === "ORDER_NOT_FOUND" ? "Order Not Found" : 
             errorCode === "UNAUTHORIZED_ACCESS" ? "Access Denied" :
             "Tracking Unavailable"}
          </h2>
          
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {errorCode === "ORDER_NOT_FOUND" ? 
              "We couldn't find this order in our system. Please check if the order ID is correct." : 
             errorCode === "UNAUTHORIZED_ACCESS" ? 
              "You don't have permission to track this order. Please make sure you're logged in with the correct account." :
             error || "We're having trouble retrieving tracking information for this order."}
          </p>
          
          <div className="flex flex-col md:flex-row gap-3 justify-center">
            <button 
              onClick={handleRetry}
              disabled={retrying}
              className="px-4 py-2 bg-primary-100 hover:bg-primary-200 text-white rounded-md transition-colors flex items-center justify-center"
            >
              {retrying ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Retrying...
                </>
              ) : (
                <>
                  <FaSync className="mr-2" />
                  Retry
                </>
              )}
            </button>
            
            <Link to="/dashboard/myorders" className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-md transition-colors flex items-center justify-center">
              <FaArrowLeft className="mr-2" />
              Return to My Orders
            </Link>
          </div>
          
          {errorCode && (
            <div className="mt-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
              <h3 className="font-medium mb-2 text-gray-800 dark:text-gray-300">Troubleshooting Tips:</h3>
              <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-400 text-left">
                {errorCode === "ORDER_NOT_FOUND" && (
                  <>
                    <li>Check if the order ID in the URL is correct</li>
                    <li>The order may have been recently placed and is still processing</li>
                    <li>Try refreshing your My Orders page and clicking Track Order again</li>
                  </>
                )}
                {errorCode === "UNAUTHORIZED_ACCESS" && (
                  <>
                    <li>Make sure you're logged in with the account that placed this order</li>
                    <li>Your session may have expired. Try logging out and back in</li>
                  </>
                )}
                {errorCode === "NETWORK_ERROR" && (
                  <>
                    <li>Check your internet connection</li>
                    <li>The server might be temporarily unavailable</li>
                    <li>Try again in a few minutes</li>
                  </>
                )}
                {(errorCode === "SERVER_ERROR" || !errorCode) && (
                  <>
                    <li>Try refreshing the page</li>
                    <li>Check if the order has a tracking status in your order history</li>
                    <li>Contact customer support if the problem persists</li>
                  </>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Order Tracking</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">Order #{order.orderId || order._id}</h2>
          <div className={`px-3 py-1 rounded-full text-sm ${
            order.status === 'delivered' ? 'bg-green-100 text-green-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {order.status?.replace('_', ' ')}
          </div>
        </div>
        
        {reconnectAttempts > 0 && (
          <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
            <p className="font-medium flex items-center">
              <FaSpinner className="animate-spin mr-2" />
              Reconnecting to tracking service... (Attempt {reconnectAttempts})
            </p>
          </div>
        )}
        
        {eta && (
          <div className="mb-4 p-3 bg-green-50 rounded-lg">
            <p className="font-medium">
              Estimated Time of Arrival: {formatDateTime(eta)}
              {distance && ` (${(distance / 1000).toFixed(1)} km away)`}
            </p>
          </div>
        )}
        
        {order.estimatedDeliveryTime && (
          <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
            <p className="font-medium">
              Estimated Delivery: {new Date(order.estimatedDeliveryTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </p>
          </div>
        )}
        
        {/* Status timeline */}
        {renderStatusSteps()}
        
        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
          <div 
            className="bg-primary-100 h-2.5 rounded-full transition-all duration-1000" 
            style={{ width: `${calculateProgress()}%` }}
          ></div>
        </div>
        
        {/* Status history */}
        {renderStatusHistory()}
        
        {/* Delivery details */}
        {order.deliveryPersonnel && (
          <div className="border-t pt-4 mb-6">
            <h3 className="font-medium mb-2">Delivery Personnel</h3>
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                <FaTruck className="text-gray-500" />
              </div>
              <div>
                <p className="font-medium">{order.deliveryPersonnel.name}</p>
                <p className="text-sm text-gray-600">{order.deliveryPersonnel.phoneNumber}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Map */}
        <div className="h-96 w-full rounded-lg overflow-hidden border relative">
          {(!deliveryLocation && !destinationLocation) && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10">
              <div className="text-center">
                <FaMapMarkerAlt className="mx-auto text-3xl text-gray-400 mb-2" />
                <p className="text-gray-600">Waiting for location data...</p>
              </div>
            </div>
          )}
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {deliveryLocation && (
              <Marker 
                position={[deliveryLocation.lat, deliveryLocation.lng]}
                icon={deliveryIcon}
              >
                <Popup>
                  Delivery personnel is here
                </Popup>
              </Marker>
            )}
            
            {destinationLocation && (
              <Marker 
                position={[destinationLocation.lat, destinationLocation.lng]}
                icon={homeIcon}
              >
                <Popup>
                  Delivery destination
                </Popup>
              </Marker>
            )}
            
            {/* Path between delivery and destination */}
            {deliveryLocation && destinationLocation && (
              <Polyline 
                positions={[
                  [deliveryLocation.lat, deliveryLocation.lng],
                  [destinationLocation.lat, destinationLocation.lng]
                ]}
                color="#3B82F6"
                weight={4}
                opacity={0.7}
                dashArray="10, 10"
              />
            )}
          </MapContainer>
        </div>
      </div>
      
      {/* Order summary */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-medium mb-4">Order Summary</h2>
        <div className="divide-y">
          {order.items && order.items.map((item, index) => (
            <div key={index} className="py-3 flex justify-between">
              <div className="flex items-center">
                {item.productId?.image && (
                  <img 
                    src={item.productId.image} 
                    alt={item.productId.name} 
                    className="h-12 w-12 object-cover rounded mr-3"
                  />
                )}
                <div>
                  <p className="font-medium">{item.productId ? item.productId.name : 'Product'}</p>
                  <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                </div>
              </div>
              <p className="font-medium">KSh {(item.productId ? item.productId.price : 0).toFixed(2)}</p>
            </div>
          ))}
          
          <div className="py-3 flex justify-between">
            <p className="font-medium">Total</p>
            <p className="font-bold">KSh {order.totalAmt?.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;
