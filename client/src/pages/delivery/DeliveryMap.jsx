import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FaBoxOpen, FaBullseye, FaCalendarCheck, FaChartLine, FaCheck, FaCloud, FaCloudRain, FaCloudSun, FaCompressAlt, FaExchangeAlt, FaExpandAlt, FaList, FaLocationArrow, FaMapMarkerAlt, FaRoute, FaSpinner, FaStar, FaStopwatch, FaSun, FaThermometerHalf, FaTimes, FaTrafficLight, FaTruck, FaUserAlt, FaWind } from 'react-icons/fa';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, ZoomControl } from 'react-leaflet';
import Axios from '../../utils/Axios';
import AxiosToastError from '../../utils/AxiosToastError';
import { getCurrentWeather, getForecast } from '../../utils/WeatherService';

// Fix for Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png'
});

// Custom truck icon for delivery driver
const truckIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom icon for delivery destinations
const destinationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to recenter map when location changes
function MapCenterSetter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, map.getZoom(), {
        duration: 1
      });
    }
  }, [center, map]);
  
  return null;
}

const DeliveryMap = () => {
  const [activeDeliveries, setActiveDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [mapCenter, setMapCenter] = useState([-1.286389, 36.817223]); // Default center (Nairobi)
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapHeight, setMapHeight] = useState('60vh');
  const [selectedTileLayer, setSelectedTileLayer] = useState('osm');
  const [routePoints, setRoutePoints] = useState([]);
  const [isRouteFetching, setIsRouteFetching] = useState(false);
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);
  const [showPerformance, setShowPerformance] = useState(false);
  const [performanceData, setPerformanceData] = useState(null);
  const [loadingPerformance, setLoadingPerformance] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [trafficLayer, setTrafficLayer] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedDeliveries, setSelectedDeliveries] = useState([]);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [weatherMode, setWeatherMode] = useState(false);
  const [locationWeatherData, setLocationWeatherData] = useState(null);
  const [showLocationWeather, setShowLocationWeather] = useState(false);
  const [clickedLocation, setClickedLocation] = useState(null);

  // Available tile layers
  const tileLayers = {
    osm: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      name: 'Street Map'
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      name: 'Satellite'
    },
    cycle: {
      url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
      attribution: '<a href="https://github.com/cyclosm/cyclosm-cartocss-style/releases" title="CyclOSM - Open Bicycle render">CyclOSM</a> | Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      name: 'Cycling'
    },
    transport: {
      url: 'https://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=6170aad10dfd42a38d4d8c709a536f38',
      attribution: '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      name: 'Transport'
    }
  };

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
          setMapCenter([location.lat, location.lng]);
          
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

  // Convert address to coordinates using OpenStreetMap Nominatim API
  const getCoordinatesFromAddress = async (address) => {
    try {
      const encodedAddress = encodeURIComponent(address);
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
      return null;
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  };
  
  useEffect(() => {
    // Get coordinates for delivery addresses when active deliveries change
    const enrichDeliveriesWithCoordinates = async () => {
      if (!activeDeliveries.length) return;
      
      const updatedDeliveries = [...activeDeliveries];
      let needsUpdate = false;
      
      for (let i = 0; i < updatedDeliveries.length; i++) {
        if (!updatedDeliveries[i].coordinates) {
          const coordinates = await getCoordinatesFromAddress(updatedDeliveries[i].deliveryAddress);
          if (coordinates) {
            updatedDeliveries[i] = {
              ...updatedDeliveries[i],
              coordinates
            };
            needsUpdate = true;
          }
        }
      }
      
      if (needsUpdate) {
        setActiveDeliveries(updatedDeliveries);
      }
    };
    
    enrichDeliveriesWithCoordinates();
  }, [activeDeliveries]);
  
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
          setMapCenter([newLocation.lat, newLocation.lng]);
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

  const fetchOrderDetails = async (orderId) => {
    try {
      setLoadingOrderDetails(true);
      const response = await Axios({
        url: `/api/delivery/order-details/${orderId}`,
        method: 'GET'
      });
      
      if (response.data.success) {
        setSelectedOrderDetails(response.data.data);
        setShowOrderDetails(true);
      } else {
        toast.error(response.data.message || 'Failed to fetch order details');
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      AxiosToastError(error);
    } finally {
      setLoadingOrderDetails(false);
    }
  };

  const handleDeliverySelect = (delivery) => {
    setSelectedDelivery(delivery);
    if (delivery.coordinates) {
      setMapCenter([delivery.coordinates.lat, delivery.coordinates.lng]);
      
      if (currentLocation) {
        getDetailedDirections(currentLocation, delivery.coordinates);
      }
    }
    
    // Fetch complete order details when selecting a delivery
    fetchOrderDetails(delivery._id);
  };
  
  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const response = await Axios({
        url: '/api/delivery/update-status',
        method: 'POST',
        data: {
          orderId,
          status: newStatus,
          notifyCustomer: true // Enable customer notifications
        }
      });
      
      if (response.data.success) {
        toast.success(`Order status updated to ${newStatus}`);
        
        // Show notification feedback to driver
        if (newStatus === 'nearby') {
          toast.success('Customer has been notified that you are nearby');
        } else if (newStatus === 'delivered') {
          toast.success('Customer has been notified that the order was delivered');
        }
        
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
          if (selectedDelivery && selectedDelivery._id === orderId) {
            setSelectedDelivery(null);
          }
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

  // Get directions from OpenStreetMap (OSRM)
  const getDirections = async (start, end) => {
    try {
      if (!start || !end) return null;
      
      const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        return data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
      }
      
      // Fallback to straight line if route not found
      return [[start.lat, start.lng], [end.lat, end.lng]];
    } catch (error) {
      console.error('Error getting directions:', error);
      // Fallback to straight line
      return [[start.lat, start.lng], [end.lat, end.lng]];
    }
  };

  // Get detailed directions from OSRM
  const getDetailedDirections = async (start, end) => {
    if (!start || !end) return;
    
    try {
      setIsRouteFetching(true);
      const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const coordinates = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
        setRoutePoints(coordinates);
        
        // Display route information
        const distance = (data.routes[0].distance / 1000).toFixed(2); // km
        const duration = Math.round(data.routes[0].duration / 60); // minutes
        toast.success(`Route found: ${distance} km, approx. ${duration} minutes`);
      } else {
        // Fallback to straight line
        setRoutePoints([[start.lat, start.lng], [end.lat, end.lng]]);
        toast.error('Unable to find optimal route. Showing direct path.');
      }
    } catch (error) {
      console.error('Error fetching directions:', error);
      // Fallback to straight line
      setRoutePoints([[start.lat, start.lng], [end.lat, end.lng]]);
      toast.error('Error getting directions. Showing direct path.');
    } finally {
      setIsRouteFetching(false);
    }
  };

  // Toggle fullscreen view for the map
  const toggleFullscreen = () => {
    if (isFullscreen) {
      document.exitFullscreen().catch(err => console.error(err));
      // Fullscreen event listeners will handle the state change
    } else if (mapContainerRef.current) {
      mapContainerRef.current.requestFullscreen().catch(err => console.error(err));
      // Fullscreen event listeners will handle the state change
    }
  };

  // Update map height based on viewport size
  useEffect(() => {
    const updateMapHeight = () => {
      // For mobile devices, make map taller
      if (window.innerWidth < 768) {
        setMapHeight(isFullscreen ? '100vh' : '70vh');
      } else {
        // For tablets and larger
        setMapHeight(isFullscreen ? '100vh' : '75vh');
      }
    };

    updateMapHeight();
    window.addEventListener('resize', updateMapHeight);
    
    // Detect fullscreen changes
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      updateMapHeight();
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      window.removeEventListener('resize', updateMapHeight);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isFullscreen]);

  // Center on current location
  const centerOnCurrentLocation = () => {
    if (currentLocation) {
      setMapCenter([currentLocation.lat, currentLocation.lng]);
    } else {
      updateCurrentLocation();
    }
  };

  // Fetch driver performance metrics
  const fetchPerformanceData = async () => {
    try {
      setLoadingPerformance(true);
      const response = await Axios({
        url: '/api/delivery/stats',
        method: 'GET'
      });
      
      if (response.data.success) {
        setPerformanceData(response.data.data);
      } else {
        toast.error(response.data.message || 'Failed to fetch performance data');
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
      AxiosToastError(error);
    } finally {
      setLoadingPerformance(false);
    }
  };

  // Fetch weather data for the current location using WeatherAPI.com
  const fetchWeatherData = async (lat, lng) => {
    try {
      setLoadingWeather(true);
      // Using WeatherAPI.com with environment variable
      const apiKey = import.meta.env.VITE_WEATHERAPI_KEY;
      
      if (!apiKey || apiKey === 'your_weatherapi_key_here') {
        console.warn('WeatherAPI.com key is missing or invalid. Please configure it in your .env file.');
        return;
      }
      
      const response = await fetch(
        `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${lat},${lng}&aqi=no`
      );
      
      if (response.ok) {
        const data = await response.json();
        setWeatherData(data);
        console.log('Weather data:', data);
      } else {
        console.error('Weather API error:', await response.text());
      }
    } catch (error) {
      console.error('Error fetching weather data:', error);
    } finally {
      setLoadingWeather(false);
    }
  };
  
  // Update weather when location changes
  useEffect(() => {
    if (currentLocation) {
      fetchWeatherData(currentLocation.lat, currentLocation.lng);
    }
  }, [currentLocation]);
  
  // Weather icon based on condition code from WeatherAPI.com
  const getWeatherIcon = (condition) => {
    const code = condition?.code;
    
    // WeatherAPI.com condition codes
    // Sunny/Clear
    if (code === 1000) return <FaSun className="text-yellow-500" />;
    
    // Partly cloudy
    if (code === 1003) return <FaCloudSun className="text-gray-500" />;
    
    // Cloudy, overcast
    if ([1006, 1009].includes(code)) return <FaCloud className="text-gray-400" />;
    
    // Fog, mist
    if ([1030, 1135, 1147].includes(code)) return <FaCloud className="text-gray-300" />;
    
    // Rain, drizzle, etc.
    if ([1063, 1150, 1153, 1180, 1183, 1186, 1189, 1192, 1195, 1240, 1243, 1246].includes(code)) 
      return <FaCloudRain className="text-blue-500" />;
    
    // Snow, sleet, etc.
    if ([1066, 1114, 1117, 1210, 1213, 1216, 1219, 1222, 1225, 1255, 1258].includes(code))
      return <FaCloudRain className="text-blue-200" />;
    
    // Thunderstorm
    if ([1087, 1273, 1276, 1279, 1282].includes(code)) 
      return <FaCloudRain className="text-gray-600" />;
    
    // Default
    return <FaCloud className="text-gray-500" />;
  };

  // Toggle traffic information layer
  const toggleTrafficLayer = () => {
    setTrafficLayer(!trafficLayer);
  };
  
  // Calculate the most efficient route between multiple stops
  const optimizeMultiStopRoute = async () => {
    if (!currentLocation || selectedDeliveries.length === 0) return;
    
    try {
      setIsOptimizing(true);
      
      // Prepare waypoints including current location as start
      const waypoints = [
        `${currentLocation.lng},${currentLocation.lat}`,
        ...selectedDeliveries.map(delivery => 
          `${delivery.coordinates.lng},${delivery.coordinates.lat}`
        )
      ];
      
      // Use OSRM trip service for optimization (not route service)
      const url = `https://router.project-osrm.org/trip/v1/driving/${waypoints.join(';')}?roundtrip=false&source=first`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.code === 'Ok' && data.trips && data.trips.length > 0) {
        const coordinates = data.trips[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
        
        // Show the optimized route
        setOptimizedRoute(coordinates);
        
        // Calculate total distance and time
        const totalDistance = (data.trips[0].distance / 1000).toFixed(2); // km
        const totalDuration = Math.round(data.trips[0].duration / 60); // minutes
        
        // Get the optimized waypoint order
        const waypointOrder = data.waypoints
          .sort((a, b) => a.waypoint_index - b.waypoint_index)
          .map(w => w.waypoint_index)
          .slice(1); // Remove the first waypoint (current location)
        
        // Reorder the selected deliveries based on optimization
        const optimizedDeliveries = waypointOrder.map(index => 
          // Index - 1 because we removed the current location from the ordering
          selectedDeliveries[index - 1]
        );
        
        // Update the order of selected deliveries
        setSelectedDeliveries(optimizedDeliveries);
        
        toast.success(`Route optimized: ${totalDistance} km, approx. ${totalDuration} minutes total`);
        
        // Close the modal
        setShowOptimizeModal(false);
      } else {
        toast.error('Unable to optimize route. Please try again.');
      }
    } catch (error) {
      console.error('Error optimizing route:', error);
      toast.error('Error optimizing route. Please try again.');
    } finally {
      setIsOptimizing(false);
    }
  };
  
  // Toggle selection of a delivery for multi-stop optimization
  const toggleDeliverySelection = (delivery) => {
    if (selectedDeliveries.some(selected => selected._id === delivery._id)) {
      setSelectedDeliveries(selectedDeliveries.filter(selected => selected._id !== delivery._id));
    } else {
      setSelectedDeliveries([...selectedDeliveries, delivery]);
    }
  };
  
  // Clear all selected deliveries
  const clearSelectedDeliveries = () => {
    setSelectedDeliveries([]);
    setOptimizedRoute([]);
  };

  // Fetch weather data for a specific location
  const fetchLocationWeather = async (lat, lng) => {
    try {
      setLocationWeatherData(null);
      const apiKey = import.meta.env.VITE_WEATHERAPI_KEY;
      
      if (!apiKey || apiKey === 'your_weatherapi_key_here') {
        toast.error('WeatherAPI key is missing. Please configure it in your .env file.');
        return;
      }
      
      toast.loading('Fetching weather data...');
      
      try {
        const weatherData = await getCurrentWeather(apiKey, { lat, lng });
        const forecastData = await getForecast(apiKey, { lat, lng }, 3, false, true);
        
        setLocationWeatherData({ 
          current: weatherData.current,
          location: weatherData.location,
          forecast: forecastData.forecast,
          alerts: forecastData.alerts
        });
        
        setShowLocationWeather(true);
        toast.dismiss();
        toast.success(`Weather data for ${weatherData.location.name}`);
      } catch (error) {
        console.error('Error fetching location weather:', error);
        toast.dismiss();
        toast.error('Failed to fetch weather data for this location');
      }
    } catch (error) {
      console.error('Error in fetchLocationWeather:', error);
      toast.dismiss();
      toast.error('An error occurred while fetching weather data');
    }
  };
  
  // Toggle weather mode for map clicks
  const toggleWeatherMode = () => {
    setWeatherMode(!weatherMode);
    toast.success(weatherMode ? 'Weather check mode disabled' : 'Click anywhere on map to check weather');
  };
  
  // Handle map click for weather check
  const handleMapClick = (e) => {
    if (!weatherMode) return;
    
    const { lat, lng } = e.latlng;
    setClickedLocation({ lat, lng });
    fetchLocationWeather(lat, lng);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <FaSpinner className="animate-spin text-4xl text-plum-500 mb-4" />
        <p className="text-lg text-charcoal dark:text-white/70">Loading map view...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-blush-100 dark:bg-blush-500/10 text-blush-500 dark:text-blush-300 p-4 rounded-card border border-blush-200 dark:border-blush-500/20">
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 px-4 py-2 bg-plum-700 hover:bg-plum-800 text-white rounded-pill text-sm transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex flex-wrap justify-between items-center mb-6">
        <div>
          <h1 className="font-display text-2xl italic text-plum-900 dark:text-white mb-1">Delivery Map</h1>
          
          {/* Weather widget */}
          {weatherData && (
            <div className="flex items-center text-sm text-brown-400 dark:text-white/50 bg-blush-50 dark:bg-dm-card rounded-pill px-3 py-1 mt-1">
              {getWeatherIcon(weatherData.current.condition)}
              <span className="ml-1">{weatherData.current.condition.text}</span>
              <FaThermometerHalf className="ml-3 mr-1 text-gold-500" />
              <span>{Math.round(weatherData.current.temp_c)}°C</span>
              <FaWind className="ml-3 mr-1 text-plum-400" />
              <span>{Math.round(weatherData.current.wind_kph)} km/h</span>
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setShowPerformance(true);
              fetchPerformanceData();
            }}
            className="bg-plum-700 hover:bg-plum-800 text-white px-4 py-2 rounded-pill flex items-center gap-2 transition-colors text-sm"
          >
            <FaChartLine size={13} />
            Performance
          </button>
          <button
            onClick={updateCurrentLocation}
            disabled={updatingLocation}
            className="bg-gold-500 hover:bg-gold-400 text-charcoal font-medium px-4 py-2 rounded-pill flex items-center gap-2 disabled:opacity-50 transition-colors text-sm press"
          >
            {updatingLocation ? (
              <FaSpinner className="animate-spin" size={13} />
            ) : (
              <FaMapMarkerAlt size={13} />
            )}
            Update Location
          </button>
        </div>
      </div>
      
      {/* Performance Metrics Modal */}
      {showPerformance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-ivory dark:bg-dm-card rounded-card shadow-hover p-6 max-w-lg w-full animate-scale-in">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-display text-xl italic text-plum-900 dark:text-white">
                Delivery Performance
              </h3>
              <button
                onClick={() => setShowPerformance(false)}
                className="text-brown-300 hover:text-charcoal dark:text-white/40 dark:hover:text-white transition-colors"
              >
                <FaTimes />
              </button>
            </div>
            
            {loadingPerformance ? (
              <div className="flex justify-center py-8">
                <FaSpinner className="animate-spin text-3xl text-plum-500" />
              </div>
            ) : performanceData ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-plum-50 dark:bg-plum-900/20 rounded-card text-center border border-plum-100 dark:border-plum-800/30">
                  <FaTruck className="mx-auto text-plum-500 text-xl mb-2" />
                  <p className="text-xs text-brown-400 dark:text-white/50">Pending</p>
                  <p className="text-2xl font-bold text-charcoal dark:text-white">{performanceData.pendingDeliveries || 0}</p>
                </div>
                
                <div className="p-4 bg-blush-50 dark:bg-blush-500/5 rounded-card text-center border border-blush-100 dark:border-blush-500/10">
                  <FaBoxOpen className="mx-auto text-blush-500 text-xl mb-2" />
                  <p className="text-xs text-brown-400 dark:text-white/50">Today's</p>
                  <p className="text-2xl font-bold text-charcoal dark:text-white">{performanceData.todayDeliveries || 0}</p>
                </div>
                
                <div className="p-4 bg-brown-50 dark:bg-dm-card-2 rounded-card text-center border border-brown-100 dark:border-dm-border">
                  <FaStopwatch className="mx-auto text-brown-400 dark:text-brown-300 text-xl mb-2" />
                  <p className="text-xs text-brown-400 dark:text-white/50">Total</p>
                  <p className="text-2xl font-bold text-charcoal dark:text-white">{performanceData.totalDeliveries || 0}</p>
                </div>
                
                <div className="p-4 bg-gold-50 dark:bg-gold-900/10 rounded-card text-center border border-gold-100 dark:border-gold-800/20">
                  <FaStar className="mx-auto text-gold-500 text-xl mb-2" />
                  <p className="text-xs text-brown-400 dark:text-white/50">Rating</p>
                  <p className="text-2xl font-bold text-charcoal dark:text-white">{performanceData.averageRating || 'N/A'}</p>
                </div>
                
                {performanceData.avgDeliveryTime && (
                  <div className="col-span-2 p-4 bg-plum-50 dark:bg-plum-900/20 rounded-card border border-plum-100 dark:border-plum-800/30">
                    <p className="text-sm text-brown-400 dark:text-white/50">Average Delivery Time</p>
                    <p className="text-xl font-bold text-charcoal dark:text-white">{performanceData.avgDeliveryTime} min</p>
                    <div className="h-1.5 bg-brown-100 dark:bg-dm-border rounded-full mt-2">
                      <div
                        className="h-1.5 bg-gradient-to-r from-plum-400 to-plum-700 rounded-full"
                        style={{ width: `${Math.min(100, (performanceData.avgDeliveryTime / 60) * 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-brown-300 dark:text-white/30 mt-1 text-right">Target: 60 min</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-brown-400 dark:text-white/40 py-8">No performance data available</p>
            )}
            
            <div className="mt-6 text-center">
              <button
                onClick={() => setShowPerformance(false)}
                className="px-5 py-2 bg-plum-50 dark:bg-dm-card-2 text-plum-700 dark:text-white/70 rounded-pill hover:bg-plum-100 transition-colors text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Order details modal */}
      {showOrderDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-ivory dark:bg-dm-card rounded-card shadow-hover p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display text-xl italic text-plum-900 dark:text-white">
                Order #{selectedOrderDetails?.orderId}
              </h3>
              <button
                onClick={() => setShowOrderDetails(false)}
                className="text-brown-300 hover:text-charcoal dark:text-white/40 dark:hover:text-white transition-colors"
              >
                <FaTimes />
              </button>
            </div>
            
            {loadingOrderDetails ? (
              <div className="flex justify-center py-8">
                <FaSpinner className="animate-spin text-3xl text-plum-500" />
              </div>
            ) : (
              <>
                {/* Customer details */}
                <div className="mb-4 p-4 bg-blush-50 dark:bg-dm-card-2 rounded-card border border-blush-100 dark:border-dm-border">
                  <h4 className="font-semibold mb-2 text-charcoal dark:text-white">Customer Information</h4>
                  <p className="text-charcoal dark:text-white/70 text-sm"><span className="font-medium">Name:</span> {selectedOrderDetails?.customer?.name}</p>
                  <p className="text-charcoal dark:text-white/70 text-sm"><span className="font-medium">Phone:</span> {selectedOrderDetails?.customer?.phone}</p>
                  <p className="text-charcoal dark:text-white/70 text-sm"><span className="font-medium">Address:</span> {selectedOrderDetails?.deliveryAddress}</p>
                  
                  {selectedOrderDetails?.deliveryNotes && (
                    <div className="mt-2 p-2 bg-gold-50 dark:bg-gold-900/20 rounded-card border border-gold-200 dark:border-gold-800/30">
                      <p className="font-medium text-gold-700 dark:text-gold-300 text-sm">Delivery Notes:</p>
                      <p className="text-gold-600 dark:text-gold-400 text-sm">{selectedOrderDetails.deliveryNotes}</p>
                    </div>
                  )}
                </div>
                
                {/* Order items */}
                <div className="mb-4">
                  <h4 className="font-medium mb-2 dark:text-white">Order Items</h4>
                  <div className="divide-y dark:divide-gray-700">
                    {selectedOrderDetails?.items?.map((item, index) => (
                      <div key={index} className="py-2 flex items-center">
                        {item.image && (
                          <img src={item.image} alt={item.name} className="h-10 w-10 object-cover rounded mr-3" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium dark:text-white">{item.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Qty: {item.quantity} × KSh {item.price?.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Order summary */}
                <div className="border-t border-brown-100 dark:border-dm-border pt-4 mt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-brown-400 dark:text-white/50">Order Total:</span>
                    <span className="font-price font-semibold text-gold-600 dark:text-gold-400">KSh {selectedOrderDetails?.total?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mt-2 text-sm">
                    <span className="text-brown-400 dark:text-white/50">Payment:</span>
                    <span className="font-medium text-charcoal dark:text-white">{selectedOrderDetails?.paymentMethod || 'Cash on Delivery'}</span>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    onClick={() => setShowOrderDetails(false)}
                    className="px-4 py-2 bg-blush-50 dark:bg-dm-card-2 text-charcoal dark:text-white/70 rounded-pill hover:bg-blush-100 transition-colors text-sm"
                  >
                    Close
                  </button>
                  {selectedDelivery?.status === 'out_for_delivery' && (
                    <button
                      onClick={() => {
                        handleStatusUpdate(selectedDelivery._id, 'nearby');
                        setShowOrderDetails(false);
                      }}
                      className="px-4 py-2 bg-gold-500 hover:bg-gold-400 text-charcoal rounded-pill text-sm font-medium press transition-colors"
                    >
                      Mark Nearby
                    </button>
                  )}
                  {selectedDelivery?.status === 'nearby' && (
                    <button
                      onClick={() => {
                        handleStatusUpdate(selectedDelivery._id, 'delivered');
                        setShowOrderDetails(false);
                      }}
                      className="px-4 py-2 bg-plum-700 hover:bg-plum-800 text-white rounded-pill text-sm font-medium press transition-colors"
                    >
                      Mark Delivered
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Route optimizer modal */}
      {showOptimizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-ivory dark:bg-dm-card rounded-card shadow-hover p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display text-xl italic text-plum-900 dark:text-white">
                Optimize Delivery Route
              </h3>
              <button
                onClick={() => setShowOptimizeModal(false)}
                className="text-brown-300 hover:text-charcoal dark:text-white/40 dark:hover:text-white transition-colors"
              >
                <FaTimes />
              </button>
            </div>
            
            <p className="mb-4 text-sm text-brown-400 dark:text-white/50">
              Select the deliveries to include in your optimized route:
            </p>
            
            <div className="mb-4 max-h-[40vh] overflow-y-auto scrollbar-hide space-y-1">
              {activeDeliveries.length === 0 ? (
                <p className="text-brown-300 dark:text-white/30 text-sm">No active deliveries to optimize.</p>
              ) : (
                <div className="divide-y divide-brown-100 dark:divide-dm-border">
                  {activeDeliveries.map(delivery => (
                    <div
                      key={delivery._id}
                      className="py-2 flex items-center"
                    >
                      <input
                        type="checkbox"
                        id={`delivery-${delivery._id}`}
                        checked={selectedDeliveries.some(selected => selected._id === delivery._id)}
                        onChange={() => toggleDeliverySelection(delivery)}
                        className="mr-3 h-4 w-4 accent-plum-600 rounded border-brown-200"
                      />
                      <label
                        htmlFor={`delivery-${delivery._id}`}
                        className="flex-1 flex items-center cursor-pointer"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-charcoal dark:text-white text-sm">Order #{delivery.orderId}</p>
                          <p className="text-xs text-brown-400 dark:text-white/40">
                            {delivery.customer.name} • {delivery.deliveryAddress.substring(0, 30)}
                            {delivery.deliveryAddress.length > 30 ? '...' : ''}
                          </p>
                        </div>
                        <span className={`ml-2 px-2 py-0.5 rounded-pill text-xs font-medium ${
                          delivery.status === 'out_for_delivery'
                            ? 'bg-gold-100 dark:bg-gold-900/20 text-gold-700 dark:text-gold-300'
                            : 'bg-plum-100 dark:bg-plum-900/20 text-plum-700 dark:text-plum-200'
                        }`}>
                          {delivery.status === 'out_for_delivery' ? 'On Route' : 'Assigned'}
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap justify-between gap-2">
              <button
                onClick={clearSelectedDeliveries}
                className="px-3 py-1.5 bg-blush-50 dark:bg-dm-card-2 text-charcoal dark:text-white/70 rounded-pill hover:bg-blush-100 transition-colors text-sm"
              >
                Clear
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setShowOptimizeModal(false)}
                  className="px-3 py-1.5 bg-blush-50 dark:bg-dm-card-2 text-charcoal dark:text-white/70 rounded-pill hover:bg-blush-100 transition-colors text-sm"
                >
                  Cancel
                </button>
                
                <button
                  onClick={optimizeMultiStopRoute}
                  disabled={selectedDeliveries.length < 2 || isOptimizing}
                  className="px-3 py-1.5 bg-plum-700 hover:bg-plum-800 text-white rounded-pill disabled:opacity-50 flex items-center gap-2 transition-colors text-sm press"
                >
                  {isOptimizing ? (
                    <><FaSpinner className="animate-spin" size={12} /> Optimizing...</>
                  ) : (
                    <><FaExchangeAlt size={12} /> Optimize</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Map controls */}
      <div className="bg-white dark:bg-dm-card rounded-card shadow-card p-2 mb-2 flex flex-wrap justify-between items-center">
        <div className="flex flex-wrap gap-2 mb-2 sm:mb-0">
          <select
            value={selectedTileLayer}
            onChange={(e) => setSelectedTileLayer(e.target.value)}
            className="bg-white dark:bg-dm-card border border-blush-200 dark:border-dm-border rounded-pill px-3 py-1 text-sm text-charcoal dark:text-white outline-none"
          >
            {Object.keys(tileLayers).map(key => (
              <option key={key} value={key}>{tileLayers[key].name}</option>
            ))}
          </select>
          
          <button
            onClick={centerOnCurrentLocation}
            className="bg-plum-100 dark:bg-plum-900/30 text-plum-700 dark:text-plum-200 rounded-pill px-2.5 py-1 text-xs flex items-center gap-1 hover:bg-plum-200 transition-colors"
          >
            <FaLocationArrow size={10} /> Center
          </button>
          
          <button
            onClick={toggleTrafficLayer}
            className={`rounded-pill px-2.5 py-1 text-xs flex items-center gap-1 transition-colors ${
              trafficLayer
                ? 'bg-blush-500 text-white'
                : 'bg-blush-50 dark:bg-dm-card text-charcoal dark:text-white/70 hover:bg-blush-100'
            }`}
          >
            <FaTrafficLight size={10} />
            {trafficLayer ? 'Hide Traffic' : 'Traffic'}
          </button>
          
          <button
            onClick={toggleWeatherMode}
            className={`rounded-pill px-2.5 py-1 text-xs flex items-center gap-1 transition-colors ${
              weatherMode
                ? 'bg-plum-700 text-white'
                : 'bg-blush-50 dark:bg-dm-card text-charcoal dark:text-white/70 hover:bg-blush-100'
            }`}
          >
            <FaCloud size={10} />
            {weatherMode ? 'Exit Weather' : 'Weather'}
          </button>
          
          <button
            onClick={() => setShowOptimizeModal(true)}
            className="bg-plum-700 hover:bg-plum-800 text-white rounded-pill px-2.5 py-1 text-xs flex items-center gap-1 transition-colors"
          >
            <FaRoute size={10} /> Optimize
            {selectedDeliveries.length > 0 && (
              <span className="ml-0.5 bg-gold-500 text-charcoal rounded-full h-4 w-4 flex items-center justify-center text-[10px] font-bold">
                {selectedDeliveries.length}
              </span>
            )}
          </button>
          
          {loadingWeather ? (
            <div className="bg-blush-50 dark:bg-dm-card rounded-pill px-2.5 py-1 text-xs flex items-center gap-1 text-brown-400 dark:text-white/40">
              <FaSpinner className="animate-spin" size={10} /> Weather...
            </div>
          ) : weatherData ? (
            <div className="bg-blush-50 dark:bg-dm-card rounded-pill px-2.5 py-1 text-xs flex items-center gap-1 text-charcoal dark:text-white/70">
              {getWeatherIcon(weatherData.current.condition)}
              <span>{Math.round(weatherData.current.temp_c)}°C</span>
            </div>
          ) : null}
        </div>
        
        <div className="flex items-center gap-2">
          {selectedDelivery && currentLocation && (
            <button
              onClick={() => getDetailedDirections(currentLocation, selectedDelivery.coordinates)}
              disabled={isRouteFetching}
              className="bg-plum-50 dark:bg-plum-900/30 text-plum-700 dark:text-plum-200 rounded-pill px-2.5 py-1 text-xs flex items-center gap-1 hover:bg-plum-100 disabled:opacity-50 transition-colors"
            >
              {isRouteFetching ? <FaSpinner className="animate-spin" size={10} /> : <FaRoute size={10} />}
              Route
            </button>
          )}
          
          <button
            onClick={toggleFullscreen}
            className="bg-brown-50 dark:bg-dm-card text-charcoal dark:text-white/70 rounded-pill px-2.5 py-1 text-xs flex items-center gap-1 hover:bg-brown-100 transition-colors"
          >
            {isFullscreen ? <FaCompressAlt size={10} /> : <FaExpandAlt size={10} />}
            {isFullscreen ? 'Exit' : 'Fullscreen'}
          </button>
        </div>
      </div>
      
      {/* Map container with sidebar layout */}
      <div
        ref={mapContainerRef}
        className={`bg-white dark:bg-dm-card rounded-card shadow-card overflow-hidden flex flex-col ${isFullscreen ? '' : 'md:flex-row'}`}
      >
        {/* Map */}
        <div 
          className={`${isFullscreen ? 'w-full h-screen' : `h-[${mapHeight}] md:h-[${mapHeight}] md:flex-grow w-full`}`}
          style={{ height: mapHeight }}
        >
          <MapContainer 
            center={mapCenter} 
            zoom={14} 
            style={{ height: '100%', width: '100%' }}
            ref={mapRef}
            zoomControl={false}
            onClick={handleMapClick}
          >
            <TileLayer
              attribution={tileLayers[selectedTileLayer].attribution}
              url={tileLayers[selectedTileLayer].url}
            />
            
            {/* Traffic layer */}
            {trafficLayer && (
              <TileLayer
                url="https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=6170aad10dfd42a38d4d8c709a536f38"
                attribution="Maps &copy; Thunderforest, Data &copy; OpenStreetMap contributors"
                opacity={0.6}
              />
            )}
            
            <ZoomControl position="bottomright" />
            <MapCenterSetter center={mapCenter} />
            
            {/* Current location marker */}
            {currentLocation && (
              <Marker 
                position={[currentLocation.lat, currentLocation.lng]} 
                icon={truckIcon}
              >
                <Popup>
                  <strong>Your current location</strong>
                </Popup>
              </Marker>
            )}
            
            {/* Delivery destination markers */}
            {activeDeliveries.map(delivery => 
              delivery.coordinates && (
                <Marker 
                  key={delivery._id}
                  position={[delivery.coordinates.lat, delivery.coordinates.lng]} 
                  icon={destinationIcon}
                >
                  <Popup>
                    <div className="text-center">
                      <strong className="block">Order #{delivery.orderId}</strong>
                      <p>{delivery.customer.name}</p>
                      <p className="text-sm text-gray-600">{delivery.deliveryAddress}</p>
                      {delivery.deliveryNotes && (
                        <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200 text-xs">
                          <p className="font-medium">Delivery Notes:</p>
                          <p>{delivery.deliveryNotes}</p>
                        </div>
                      )}
                      <button
                        onClick={() => handleDeliverySelect(delivery)}
                        className="mt-2 bg-gold-500 hover:bg-gold-400 text-charcoal font-semibold px-2 py-1 rounded-pill text-xs w-full transition-colors"
                      >
                        Navigate Here
                      </button>
                    </div>
                  </Popup>
                </Marker>
              )
            )}
            
            {/* Optimized Multi-stop Route */}
            {currentLocation && optimizedRoute.length > 0 && (
              <Polyline 
                positions={optimizedRoute}
                color="green"
                weight={5}
                opacity={0.8}
                lineJoin="round"
                dashArray="10, 10"
              />
            )}
            
            {/* Regular route line to selected delivery */}
            {currentLocation && selectedDelivery && selectedDelivery.coordinates && routePoints.length > 0 && optimizedRoute.length === 0 && (
              <Polyline 
                positions={routePoints}
                color="blue"
                weight={4}
                opacity={0.7}
                lineJoin="round"
              />
            )}
            
            {/* Add numbered waypoint markers for the optimized route */}
            {selectedDeliveries.length > 0 && selectedDeliveries.map((delivery, index) => (
              delivery.coordinates && (
                <Marker
                  key={`waypoint-${delivery._id}`}
                  position={[delivery.coordinates.lat, delivery.coordinates.lng]}
                  icon={new L.DivIcon({
                    className: 'custom-div-icon',
                    html: `<div style="background-color: #10B981; color: white; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; border: 2px solid white;">${index + 1}</div>`,
                    iconSize: [22, 22],
                    iconAnchor: [11, 11],
                  })}
                >
                  <Popup>
                    <div>
                      <strong>Stop #{index + 1}</strong>
                      <p>Order #{delivery.orderId}</p>
                      <p>{delivery.customer.name}</p>
                    </div>
                  </Popup>
                </Marker>
              )
            ))}
          </MapContainer>
        </div>
        
        {/* Active deliveries sidebar - hide in fullscreen mode */}
        {!isFullscreen && (
          <div className="p-4 border-t md:border-t-0 md:border-l border-brown-100 dark:border-dm-border md:w-80 lg:w-96">
            {selectedDeliveries.length > 0 && (
              <div className="mb-4 p-3 bg-plum-50 dark:bg-plum-900/20 rounded-card border border-plum-100 dark:border-plum-800/30">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-plum-800 dark:text-plum-200 text-sm">
                    <FaList className="inline mr-1.5" /> Optimized Route ({selectedDeliveries.length} stops)
                  </h3>
                  <button
                    onClick={clearSelectedDeliveries}
                    className="text-brown-300 hover:text-charcoal dark:text-white/40 dark:hover:text-white transition-colors"
                  >
                    <FaTimes size={13} />
                  </button>
                </div>
                
                <ol className="list-decimal list-inside text-xs text-plum-700 dark:text-plum-200 pl-2 space-y-1">
                  {selectedDeliveries.map((delivery, index) => (
                    <li key={delivery._id}>
                      {delivery.customer.name} • #{delivery.orderId}
                    </li>
                  ))}
                </ol>
                
                <div className="mt-2 text-right">
                  <button
                    onClick={optimizeMultiStopRoute}
                    disabled={isOptimizing}
                    className="bg-plum-700 hover:bg-plum-800 text-white px-3 py-1 rounded-pill text-xs flex items-center gap-1 ml-auto transition-colors disabled:opacity-50 press"
                  >
                    {isOptimizing ? (
                      <><FaSpinner className="animate-spin" size={10} /> Optimizing...</>
                    ) : (
                      <><FaBullseye size={10} /> Re-optimize</>
                    )}
                  </button>
                </div>
              </div>
            )}
            
            <h2 className="font-semibold text-charcoal dark:text-white text-sm mb-3">
              Active Deliveries <span className="text-brown-400 dark:text-white/40 font-normal">({activeDeliveries.length})</span>
            </h2>
            
            {activeDeliveries.length === 0 ? (
              <p className="text-brown-300 dark:text-white/30 text-sm">No active deliveries at the moment.</p>
            ) : (
              <div className="grid gap-2 max-h-[50vh] md:max-h-[65vh] overflow-y-auto pr-1 scrollbar-hide">
                {activeDeliveries.map(delivery => (
                  <div
                    key={delivery._id}
                    className={`p-3 rounded-card border cursor-pointer hover-lift transition-all relative ${
                      delivery._id === selectedDelivery?._id
                        ? 'bg-plum-50 dark:bg-plum-900/20 border-plum-300 dark:border-plum-700'
                        : delivery.status === 'out_for_delivery'
                        ? 'bg-gold-50 dark:bg-gold-900/10 border-gold-200 dark:border-gold-800/30'
                        : 'bg-white dark:bg-dm-card border-brown-100 dark:border-dm-border'
                    }`}
                    onClick={() => handleDeliverySelect(delivery)}
                  >
                    {/* Multi-stop selection checkbox */}
                    <div
                      className="absolute right-2 top-2 z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDeliverySelection(delivery);
                      }}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        selectedDeliveries.some(selected => selected._id === delivery._id)
                          ? 'bg-plum-700 border-plum-700 text-white'
                          : 'bg-white dark:bg-dm-card border-brown-200 dark:border-dm-border'
                      }`}>
                        {selectedDeliveries.some(selected => selected._id === delivery._id) && (
                          <FaCheck size={8} />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center pr-6">
                      <p className="font-semibold text-sm text-charcoal dark:text-white">{delivery.orderId}</p>
                      <span className={`px-2 py-0.5 rounded-pill text-xs font-medium ${
                        delivery.status === 'out_for_delivery'
                          ? 'bg-gold-100 dark:bg-gold-900/20 text-gold-700 dark:text-gold-300'
                          : 'bg-plum-100 dark:bg-plum-900/20 text-plum-700 dark:text-plum-200'
                      }`}>
                        {delivery.status === 'out_for_delivery' ? 'On Route' : 'Assigned'}
                      </span>
                    </div>
                    <p className="text-xs text-brown-400 dark:text-white/50 mt-0.5">
                      <FaUserAlt className="inline mr-1" size={9} /> {delivery.customer.name}
                    </p>
                    <p className="text-xs text-brown-400 dark:text-white/50 truncate">
                      <FaMapMarkerAlt className="inline mr-1" size={9} /> {delivery.deliveryAddress}
                    </p>
                    <div className="mt-2 flex justify-between">
                      <div className="flex gap-1.5">
                        <a
                          href={`https://maps.google.com/?q=${delivery.deliveryAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-blush-50 dark:bg-dm-card-2 hover:bg-blush-100 text-charcoal dark:text-white/60 px-2 py-0.5 rounded-pill text-xs flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FaMapMarkerAlt size={9} />
                          Maps
                        </a>
                        {currentLocation && delivery.coordinates && (
                          <button
                            className="bg-plum-50 dark:bg-plum-900/20 hover:bg-plum-100 text-plum-700 dark:text-plum-300 px-2 py-0.5 rounded-pill text-xs flex items-center gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              getDetailedDirections(currentLocation, delivery.coordinates);
                            }}
                          >
                            <FaRoute size={9} />
                            Route
                          </button>
                        )}
                      </div>
                      
                      {delivery.status === 'driver_assigned' && (
                        <button
                          className="bg-gold-500 hover:bg-gold-400 text-charcoal font-medium px-2 py-0.5 rounded-pill text-xs flex items-center gap-1 transition-colors press"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusUpdate(delivery._id, 'out_for_delivery');
                          }}
                        >
                          <FaTruck size={9} /> Start
                        </button>
                      )}
                      {delivery.status === 'out_for_delivery' && (
                        <button
                          className="bg-plum-700 hover:bg-plum-800 text-white px-2 py-0.5 rounded-pill text-xs flex items-center gap-1 transition-colors press"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusUpdate(delivery._id, 'delivered');
                          }}
                        >
                          <FaCalendarCheck size={9} /> Done
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Weather info modal for clicked locations */}
      {showLocationWeather && locationWeatherData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-ivory dark:bg-dm-card rounded-card shadow-hover p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display text-xl italic text-plum-900 dark:text-white">
                {locationWeatherData.location.name}, {locationWeatherData.location.region}
              </h3>
              <button
                onClick={() => setShowLocationWeather(false)}
                className="text-brown-300 hover:text-charcoal dark:text-white/40 dark:hover:text-white transition-colors"
              >
                <FaTimes />
              </button>
            </div>
            
            {/* Current weather */}
            <div className="flex flex-col md:flex-row items-center md:items-start mb-6 p-4 bg-gradient-to-br from-plum-50 to-blush-50 dark:from-plum-900/20 dark:to-dm-card-2 rounded-card border border-plum-100 dark:border-plum-800/30">
              <div className="flex flex-col items-center mb-4 md:mb-0 md:mr-8">
                {locationWeatherData.current.condition.icon && (
                  <img
                    src={locationWeatherData.current.condition.icon.replace('64x64', '128x128')}
                    alt={locationWeatherData.current.condition.text}
                    className="w-24 h-24 mb-2"
                  />
                )}
                <p className="font-price text-3xl font-bold text-charcoal dark:text-white">{Math.round(locationWeatherData.current.temp_c)}°C</p>
                <p className="text-brown-400 dark:text-white/50 text-sm">{locationWeatherData.current.condition.text}</p>
              </div>
              
              <div className="w-full md:flex-1 grid grid-cols-2 gap-3">
                <div className="bg-white/70 dark:bg-dm-card/70 p-2 rounded-card border border-brown-100 dark:border-dm-border">
                  <div className="flex items-center text-brown-400 dark:text-white/50 mb-1 text-xs">
                    <FaThermometerHalf className="mr-1 text-gold-500" />
                    <span>Feels Like</span>
                  </div>
                  <p className="font-semibold text-charcoal dark:text-white">{Math.round(locationWeatherData.current.feelslike_c)}°C</p>
                </div>
                
                <div className="bg-white/70 dark:bg-dm-card/70 p-2 rounded-card border border-brown-100 dark:border-dm-border">
                  <div className="flex items-center text-brown-400 dark:text-white/50 mb-1 text-xs">
                    <FaWind className="mr-1 text-plum-400" />
                    <span>Wind</span>
                  </div>
                  <p className="font-semibold text-charcoal dark:text-white">
                    {Math.round(locationWeatherData.current.wind_kph)} km/h
                  </p>
                </div>
                
                <div className="bg-white/70 dark:bg-dm-card/70 p-2 rounded-card border border-brown-100 dark:border-dm-border">
                  <div className="flex items-center text-brown-400 dark:text-white/50 mb-1 text-xs">
                    <span>Humidity</span>
                  </div>
                  <p className="font-semibold text-charcoal dark:text-white">{locationWeatherData.current.humidity}%</p>
                </div>
                
                <div className="bg-white/70 dark:bg-dm-card/70 p-2 rounded-card border border-brown-100 dark:border-dm-border">
                  <div className="flex items-center text-brown-400 dark:text-white/50 mb-1 text-xs">
                    <span>Visibility</span>
                  </div>
                  <p className="font-semibold text-charcoal dark:text-white">{locationWeatherData.current.vis_km} km</p>
                </div>
              </div>
            </div>
            
            {/* Forecast */}
            {locationWeatherData.forecast && (
              <div className="mb-6">
                <h4 className="font-semibold text-charcoal dark:text-white mb-3">3-Day Forecast</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {locationWeatherData.forecast.forecastday.map((day, index) => (
                    <div key={index} className="bg-blush-50 dark:bg-dm-card-2 p-3 rounded-card border border-blush-100 dark:border-dm-border">
                      <p className="text-xs text-brown-400 dark:text-white/40 mb-2">
                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                      
                      <div className="flex items-center mb-2">
                        {day.day.condition.icon && (
                          <img
                            src={day.day.condition.icon}
                            alt={day.day.condition.text}
                            className="w-10 h-10 mr-2"
                          />
                        )}
                        <div>
                          <p className="font-medium text-charcoal dark:text-white text-sm">{day.day.condition.text}</p>
                          <p className="text-xs text-brown-400 dark:text-white/50">
                            {Math.round(day.day.maxtemp_c)}° / {Math.round(day.day.mintemp_c)}°
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-xs grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-brown-300 dark:text-white/30">Rain</p>
                          <p className="text-charcoal dark:text-white font-medium">{day.day.daily_chance_of_rain}%</p>
                        </div>
                        <div>
                          <p className="text-brown-300 dark:text-white/30">Wind</p>
                          <p className="text-charcoal dark:text-white font-medium">{Math.round(day.day.maxwind_kph)} km/h</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Weather alerts if any */}
            {locationWeatherData.alerts && locationWeatherData.alerts.alert && locationWeatherData.alerts.alert.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-blush-500 dark:text-blush-400 mb-3">Weather Alerts</h4>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {locationWeatherData.alerts.alert.map((alert, index) => (
                    <div key={index} className="bg-blush-50 dark:bg-blush-500/10 p-3 rounded-card border-l-4 border-blush-500">
                      <p className="font-semibold text-blush-500 dark:text-blush-300 text-sm">{alert.headline || 'Weather Alert'}</p>
                      <p className="text-xs text-blush-500 dark:text-blush-400 mb-1">{alert.event}</p>
                      <p className="text-xs text-brown-400 dark:text-white/40">
                        {new Date(alert.effective).toLocaleString()} — {new Date(alert.expires).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="border-t border-brown-100 dark:border-dm-border pt-4 mt-4 flex flex-wrap justify-between items-center gap-2">
              <p className="text-xs text-brown-300 dark:text-white/30">
                Updated: {new Date(locationWeatherData.current.last_updated).toLocaleString()}
              </p>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setShowLocationWeather(false)}
                  className="px-4 py-2 bg-blush-50 dark:bg-dm-card-2 text-charcoal dark:text-white/70 rounded-pill hover:bg-blush-100 transition-colors text-sm"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    if (currentLocation && clickedLocation) {
                      getDetailedDirections(currentLocation, clickedLocation);
                      setShowLocationWeather(false);
                    }
                  }}
                  className="px-4 py-2 bg-plum-700 hover:bg-plum-800 text-white rounded-pill flex items-center gap-2 disabled:opacity-50 transition-colors text-sm press"
                  disabled={!currentLocation || !clickedLocation}
                >
                  <FaRoute size={12} />
                  Get Directions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryMap;
