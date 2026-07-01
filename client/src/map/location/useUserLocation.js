/**
 * useUserLocation - Hook for browser geolocation with watch mode
 * Features: one-shot location, continuous tracking, accuracy info, compass heading
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { MAP_CONFIG, STORAGE_KEYS } from '../core/constants';

export function useUserLocation(options = {}) {
  const {
    enableHighAccuracy = MAP_CONFIG.geolocation.enableHighAccuracy,
    timeout = MAP_CONFIG.geolocation.timeout,
    maximumAge = MAP_CONFIG.geolocation.maximumAge,
    onPositionChange,
    onError
  } = options;

  const [position, setPosition] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [heading, setHeading] = useState(null);
  const [speed, setSpeed] = useState(null);
  const [altitude, setAltitude] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isWatching, setIsWatching] = useState(false);
  const [followMode, setFollowMode] = useState(false);

  const watchIdRef = useRef(null);
  const orientationHandlerRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWatching();
      stopCompass();
    };
  }, []);

  // Process position update
  const processPosition = useCallback((geoPosition) => {
    const { coords, timestamp } = geoPosition;
    
    const newPosition = {
      lat: coords.latitude,
      lng: coords.longitude,
      timestamp
    };

    setPosition(newPosition);
    setAccuracy(coords.accuracy);
    setHeading(coords.heading);
    setSpeed(coords.speed);
    setAltitude(coords.altitude);
    setError(null);
    setIsLoading(false);

    // Save last position
    try {
      localStorage.setItem(STORAGE_KEYS.lastPosition, JSON.stringify(newPosition));
    } catch (e) {
      // Ignore storage errors
    }

    if (onPositionChange) {
      onPositionChange({
        position: newPosition,
        accuracy: coords.accuracy,
        heading: coords.heading,
        speed: coords.speed,
        altitude: coords.altitude
      });
    }

    return newPosition;
  }, [onPositionChange]);

  // Handle error
  const handleError = useCallback((geoError) => {
    setIsLoading(false);
    
    const errorMessage = {
      1: 'Location permission denied',
      2: 'Location unavailable',
      3: 'Location request timed out'
    }[geoError.code] || geoError.message;

    setError(errorMessage);
    
    if (onError) {
      onError({ code: geoError.code, message: errorMessage });
    }
  }, [onError]);

  // Get current position (one-shot)
  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return Promise.reject(new Error('Geolocation not supported'));
    }

    setIsLoading(true);
    setError(null);

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const position = processPosition(pos);
          resolve(position);
        },
        (err) => {
          handleError(err);
          reject(err);
        },
        { enableHighAccuracy, timeout, maximumAge }
      );
    });
  }, [enableHighAccuracy, timeout, maximumAge, processPosition, handleError]);

  // Start watching position
  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    if (watchIdRef.current !== null) return; // Already watching

    setIsLoading(true);
    setIsWatching(true);
    setError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      processPosition,
      handleError,
      { enableHighAccuracy, timeout, maximumAge }
    );
  }, [enableHighAccuracy, timeout, maximumAge, processPosition, handleError]);

  // Stop watching position
  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsWatching(false);
    setFollowMode(false);
  }, []);

  // Toggle follow mode (continuous tracking + map follows)
  const toggleFollowMode = useCallback((enabled) => {
    setFollowMode(enabled);
    
    if (enabled) {
      startWatching();
    } else {
      stopWatching();
    }

    try {
      localStorage.setItem(STORAGE_KEYS.followMode, JSON.stringify(enabled));
    } catch (e) {
      // Ignore
    }
  }, [startWatching, stopWatching]);

  // Device orientation for compass heading
  const startCompass = useCallback(() => {
    if (!window.DeviceOrientationEvent) return;

    // iOS 13+ requires permission
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission()
        .then((state) => {
          if (state === 'granted') {
            addOrientationListener();
          }
        })
        .catch(console.error);
    } else {
      addOrientationListener();
    }

    function addOrientationListener() {
      orientationHandlerRef.current = (event) => {
        // webkitCompassHeading for iOS, or calculate from alpha
        let compassHeading = event.webkitCompassHeading;
        
        if (compassHeading === undefined && event.alpha !== null) {
          // Convert alpha (0-360, counterclockwise) to compass (0-360, clockwise)
          compassHeading = 360 - event.alpha;
        }

        if (compassHeading !== undefined) {
          setHeading(compassHeading);
        }
      };

      window.addEventListener('deviceorientation', orientationHandlerRef.current, true);
    }
  }, []);

  const stopCompass = useCallback(() => {
    if (orientationHandlerRef.current) {
      window.removeEventListener('deviceorientation', orientationHandlerRef.current, true);
      orientationHandlerRef.current = null;
    }
  }, []);

  // Load last known position
  const getLastKnownPosition = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.lastPosition);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      // Ignore
    }
    return null;
  }, []);

  return {
    position,
    accuracy,
    heading,
    speed,
    altitude,
    isLoading,
    error,
    isWatching,
    followMode,
    getCurrentPosition,
    startWatching,
    stopWatching,
    toggleFollowMode,
    startCompass,
    stopCompass,
    getLastKnownPosition
  };
}

export default useUserLocation;
