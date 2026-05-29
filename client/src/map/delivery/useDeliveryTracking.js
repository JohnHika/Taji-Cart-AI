/**
 * useDeliveryTracking - Real-time driver location tracking
 * Connects to Socket.IO for live updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { API_ENDPOINTS } from '../core/constants';

// Driver status enum
export const DRIVER_STATUS = {
  ASSIGNED: 'assigned',
  HEADING_TO_PICKUP: 'heading_to_pickup',
  AT_PICKUP: 'at_pickup',
  HEADING_TO_DELIVERY: 'heading_to_delivery',
  ARRIVING: 'arriving',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

// Status display config
export const STATUS_CONFIG = {
  [DRIVER_STATUS.ASSIGNED]: {
    label: 'Driver Assigned',
    icon: '👤',
    color: '#6B7280',
    description: 'Your driver has been assigned and will start soon',
  },
  [DRIVER_STATUS.HEADING_TO_PICKUP]: {
    label: 'Heading to Pickup',
    icon: '🏃',
    color: '#F59E0B',
    description: 'Driver is heading to pick up your order',
  },
  [DRIVER_STATUS.AT_PICKUP]: {
    label: 'At Pickup Location',
    icon: '📦',
    color: '#3B82F6',
    description: 'Driver is collecting your order',
  },
  [DRIVER_STATUS.HEADING_TO_DELIVERY]: {
    label: 'On the Way',
    icon: '🚗',
    color: '#10B981',
    description: 'Driver is on the way with your order',
  },
  [DRIVER_STATUS.ARRIVING]: {
    label: 'Arriving Soon',
    icon: '🏁',
    color: '#8B5CF6',
    description: 'Driver is almost at your location',
  },
  [DRIVER_STATUS.DELIVERED]: {
    label: 'Delivered',
    icon: '✅',
    color: '#059669',
    description: 'Your order has been delivered',
  },
  [DRIVER_STATUS.CANCELLED]: {
    label: 'Cancelled',
    icon: '❌',
    color: '#EF4444',
    description: 'This delivery has been cancelled',
  },
};

/**
 * Calculate ETA from current position
 */
const calculateETA = (fromCoords, toCoords, speedKmh = 30) => {
  if (!fromCoords || !toCoords) return null;
  
  const R = 6371; // Earth's radius in km
  const dLat = (toCoords.lat - fromCoords.lat) * Math.PI / 180;
  const dLon = (toCoords.lng - fromCoords.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(fromCoords.lat * Math.PI / 180) * Math.cos(toCoords.lat * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distanceKm = R * c;
  
  const durationMinutes = (distanceKm / speedKmh) * 60;
  const etaDate = new Date();
  etaDate.setMinutes(etaDate.getMinutes() + durationMinutes);
  
  return {
    distance: distanceKm * 1000, // Convert to meters
    distanceFormatted: distanceKm < 1 
      ? `${Math.round(distanceKm * 1000)} m` 
      : `${distanceKm.toFixed(1)} km`,
    duration: durationMinutes,
    durationFormatted: durationMinutes < 1 
      ? 'Less than a minute' 
      : durationMinutes < 60 
        ? `${Math.round(durationMinutes)} min`
        : `${Math.floor(durationMinutes / 60)}h ${Math.round(durationMinutes % 60)}m`,
    eta: etaDate,
    etaFormatted: etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
};

/**
 * Smooth location interpolation for animations
 */
const interpolateLocation = (from, to, progress) => {
  if (!from || !to) return to || from;
  return {
    lat: from.lat + (to.lat - from.lat) * progress,
    lng: from.lng + (to.lng - from.lng) * progress,
  };
};

/**
 * Main delivery tracking hook
 */
export const useDeliveryTracking = (orderId, options = {}) => {
  const {
    autoConnect = true,
    smoothAnimation = true,
    animationDuration = 1000,
    onStatusChange,
    onLocationUpdate,
    onArrival,
    onDelivered,
  } = options;
  
  const [isConnected, setIsConnected] = useState(false);
  const [driverLocation, setDriverLocation] = useState(null);
  const [displayLocation, setDisplayLocation] = useState(null);
  const [status, setStatus] = useState(null);
  const [eta, setEta] = useState(null);
  const [driverInfo, setDriverInfo] = useState(null);
  const [pickupLocation, setPickupLocation] = useState(null);
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [error, setError] = useState(null);
  
  const socketRef = useRef(null);
  const animationRef = useRef(null);
  
  // Connect to socket
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;
    
    const socket = io(API_ENDPOINTS?.socket || '/', {
      transports: ['websocket'],
      query: { orderId },
    });
    
    socket.on('connect', () => {
      console.log('[DeliveryTracking] Connected');
      setIsConnected(true);
      setError(null);
      
      // Join order tracking room
      socket.emit('track:join', { orderId });
    });
    
    socket.on('disconnect', () => {
      console.log('[DeliveryTracking] Disconnected');
      setIsConnected(false);
    });
    
    socket.on('connect_error', (err) => {
      console.error('[DeliveryTracking] Connection error:', err);
      setError('Failed to connect to tracking service');
    });
    
    // Driver location updates
    socket.on('driver:location', (data) => {
      const newLocation = {
        lat: data.latitude || data.lat,
        lng: data.longitude || data.lng,
        heading: data.heading,
        speed: data.speed,
        timestamp: new Date(data.timestamp || Date.now()),
      };
      
      setLocationHistory(prev => [...prev.slice(-50), newLocation]);
      
      if (smoothAnimation) {
        // Animate to new position
        const startLocation = displayLocation || newLocation;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / animationDuration, 1);
          const easeProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic
          
          const interpolated = interpolateLocation(startLocation, newLocation, easeProgress);
          setDisplayLocation(interpolated);
          
          if (progress < 1) {
            animationRef.current = requestAnimationFrame(animate);
          }
        };
        
        cancelAnimationFrame(animationRef.current);
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayLocation(newLocation);
      }
      
      setDriverLocation(newLocation);
      onLocationUpdate?.(newLocation);
      
      // Recalculate ETA
      if (deliveryLocation) {
        setEta(calculateETA(newLocation, deliveryLocation));
      }
    });
    
    // Status updates
    socket.on('delivery:status', (data) => {
      const newStatus = data.status;
      setStatus(newStatus);
      onStatusChange?.(newStatus, data);
      
      if (newStatus === DRIVER_STATUS.ARRIVING) {
        onArrival?.(data);
      } else if (newStatus === DRIVER_STATUS.DELIVERED) {
        onDelivered?.(data);
      }
    });
    
    // Initial tracking data
    socket.on('track:init', (data) => {
      if (data.driver) {
        setDriverInfo({
          id: data.driver.id,
          name: data.driver.name,
          phone: data.driver.phoneNumber,
          avatar: data.driver.avatar,
          rating: data.driver.rating,
          vehicleType: data.driver.vehicleType,
          vehiclePlate: data.driver.vehiclePlate,
        });
        
        if (data.driver.currentLocation) {
          const loc = data.driver.currentLocation;
          setDriverLocation({
            lat: loc.latitude || loc.lat,
            lng: loc.longitude || loc.lng,
          });
          setDisplayLocation({
            lat: loc.latitude || loc.lat,
            lng: loc.longitude || loc.lng,
          });
        }
      }
      
      if (data.pickup) {
        setPickupLocation({
          lat: data.pickup.latitude || data.pickup.lat,
          lng: data.pickup.longitude || data.pickup.lng,
          address: data.pickup.address,
        });
      }
      
      if (data.delivery) {
        setDeliveryLocation({
          lat: data.delivery.latitude || data.delivery.lat,
          lng: data.delivery.longitude || data.delivery.lng,
          address: data.delivery.address,
        });
      }
      
      if (data.status) {
        setStatus(data.status);
      }
      
      if (data.eta) {
        setEta(data.eta);
      }
    });
    
    // ETA updates from server
    socket.on('delivery:eta', (data) => {
      setEta({
        ...data,
        eta: new Date(data.eta),
        etaFormatted: new Date(data.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    });
    
    socketRef.current = socket;
    
    return () => {
      socket.emit('track:leave', { orderId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [orderId, deliveryLocation, smoothAnimation, animationDuration, onStatusChange, onLocationUpdate, onArrival, onDelivered]);
  
  // Disconnect
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
    cancelAnimationFrame(animationRef.current);
  }, []);
  
  // Auto connect
  useEffect(() => {
    if (autoConnect && orderId) {
      const cleanup = connect();
      return () => {
        cleanup?.();
        disconnect();
      };
    }
  }, [autoConnect, orderId, connect, disconnect]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, []);
  
  return {
    // Connection state
    isConnected,
    connect,
    disconnect,
    error,
    
    // Location data
    driverLocation,
    displayLocation, // Use this for smooth animation
    locationHistory,
    pickupLocation,
    deliveryLocation,
    
    // Driver info
    driverInfo,
    
    // Status & ETA
    status,
    statusConfig: status ? STATUS_CONFIG[status] : null,
    eta,
    
    // Utilities
    calculateETA: (from, to) => calculateETA(from, to),
  };
};

/**
 * Hook for simulating driver movement (for testing)
 */
export const useSimulatedDriver = (route, options = {}) => {
  const {
    speed = 50, // km/h
    updateInterval = 1000,
    autoStart = false,
  } = options;
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [currentLocation, setCurrentLocation] = useState(null);
  
  useEffect(() => {
    if (!route?.geometry?.coordinates?.length || !isRunning) return;
    
    const coords = route.geometry.coordinates;
    
    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        const next = prev + 1;
        if (next >= coords.length) {
          setIsRunning(false);
          return prev;
        }
        
        const [lng, lat] = coords[next];
        setCurrentLocation({ lat, lng });
        return next;
      });
    }, updateInterval);
    
    return () => clearInterval(interval);
  }, [route, isRunning, updateInterval]);
  
  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);
  const reset = useCallback(() => {
    setCurrentIndex(0);
    setIsRunning(false);
    if (route?.geometry?.coordinates?.[0]) {
      const [lng, lat] = route.geometry.coordinates[0];
      setCurrentLocation({ lat, lng });
    }
  }, [route]);
  
  return {
    currentLocation,
    currentIndex,
    totalPoints: route?.geometry?.coordinates?.length || 0,
    progress: route?.geometry?.coordinates?.length 
      ? currentIndex / route.geometry.coordinates.length 
      : 0,
    isRunning,
    start,
    pause,
    reset,
  };
};

export default useDeliveryTracking;
