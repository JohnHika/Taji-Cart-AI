/**
 * useRouting - OSRM-based routing hook
 * Free routing via project-osrm.org public server
 */

import { useState, useCallback, useRef } from 'react';
import { API_ENDPOINTS, MAP_CONFIG } from '../core/constants';

// Route profile configurations
const PROFILES = {
  driving: {
    id: 'driving',
    osrmProfile: 'driving',
    name: 'Drive',
    icon: '🚗',
    color: '#4285F4',
  },
  walking: {
    id: 'walking',
    osrmProfile: 'foot',
    name: 'Walk',
    icon: '🚶',
    color: '#34A853',
  },
  cycling: {
    id: 'cycling',
    osrmProfile: 'bike',
    name: 'Bike',
    icon: '🚲',
    color: '#FBBC05',
  },
};

// Format duration for display
const formatDuration = (seconds) => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

// Format distance for display
const formatDistance = (meters) => {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

// Parse OSRM polyline (precision 5)
const decodePolyline = (encoded) => {
  const coordinates = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  
  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;
    
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;
    
    shift = 0;
    result = 0;
    
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;
    
    coordinates.push([lng / 1e5, lat / 1e5]);
  }
  
  return coordinates;
};

// Convert OSRM route to GeoJSON
const routeToGeoJSON = (route, profile) => {
  const coordinates = decodePolyline(route.geometry);
  
  return {
    type: 'Feature',
    properties: {
      duration: route.duration,
      distance: route.distance,
      profile: profile,
      summary: route.legs?.map(l => l.summary).join(' → ') || '',
      formattedDuration: formatDuration(route.duration),
      formattedDistance: formatDistance(route.distance),
    },
    geometry: {
      type: 'LineString',
      coordinates,
    },
  };
};

// Parse maneuver type to instruction
const parseManeuver = (step) => {
  const { maneuver, name, distance, duration } = step;
  const type = maneuver?.type || 'unknown';
  const modifier = maneuver?.modifier || '';
  
  let instruction = '';
  
  switch (type) {
    case 'depart':
      instruction = `Start on ${name || 'the road'}`;
      break;
    case 'arrive':
      instruction = `Arrive at your destination`;
      break;
    case 'turn':
      instruction = `Turn ${modifier} onto ${name || 'the road'}`;
      break;
    case 'continue':
      instruction = `Continue on ${name || 'the road'}`;
      break;
    case 'merge':
      instruction = `Merge ${modifier}`;
      break;
    case 'fork':
      instruction = `Take the ${modifier} fork`;
      break;
    case 'roundabout':
      instruction = `Enter roundabout and take exit`;
      break;
    case 'exit roundabout':
      instruction = `Exit the roundabout`;
      break;
    case 'off ramp':
      instruction = `Take the exit`;
      break;
    case 'on ramp':
      instruction = `Enter the highway`;
      break;
    default:
      instruction = name ? `Continue on ${name}` : 'Continue';
  }
  
  return {
    instruction,
    distance: formatDistance(distance),
    duration: formatDuration(duration),
    type,
    modifier,
    coordinates: maneuver?.location,
  };
};

/**
 * Main routing hook
 */
export const useRouting = () => {
  const [route, setRoute] = useState(null);
  const [alternatives, setAlternatives] = useState([]);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeProfile, setActiveProfile] = useState('driving');
  const abortControllerRef = useRef(null);
  
  const getRoute = useCallback(async (
    origin, // [lng, lat]
    destination, // [lng, lat]
    options = {}
  ) => {
    const {
      profile = activeProfile,
      alternatives: includeAlternatives = true,
      steps: includeSteps = true,
      waypoints = [],
    } = options;
    
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setError(null);
    
    try {
      // Build coordinates string (origin, waypoints, destination)
      const coords = [origin, ...waypoints, destination]
        .map(c => `${c[0]},${c[1]}`)
        .join(';');
      
      // Get OSRM profile
      const osrmProfile = PROFILES[profile]?.osrmProfile || 'driving';
      
      // Build URL
      const baseUrl = API_ENDPOINTS.osrm.base;
      const url = new URL(`${baseUrl}/route/v1/${osrmProfile}/${coords}`);
      url.searchParams.set('overview', 'full');
      url.searchParams.set('geometries', 'polyline');
      url.searchParams.set('steps', includeSteps.toString());
      url.searchParams.set('alternatives', includeAlternatives.toString());
      
      const response = await fetch(url.toString(), {
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) {
        throw new Error(`OSRM error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.code !== 'Ok') {
        throw new Error(data.message || 'Route not found');
      }
      
      // Process main route
      const mainRoute = routeToGeoJSON(data.routes[0], profile);
      setRoute(mainRoute);
      
      // Process alternatives
      const altRoutes = data.routes.slice(1).map(r => routeToGeoJSON(r, profile));
      setAlternatives(altRoutes);
      
      // Process steps
      if (includeSteps && data.routes[0].legs) {
        const allSteps = data.routes[0].legs.flatMap(leg =>
          leg.steps.map(parseManeuver)
        );
        setSteps(allSteps);
      }
      
      setLoading(false);
      return mainRoute;
      
    } catch (err) {
      if (err.name === 'AbortError') {
        return null;
      }
      console.error('Routing error:', err);
      setError(err.message);
      setLoading(false);
      return null;
    }
  }, [activeProfile]);
  
  const clearRoute = useCallback(() => {
    setRoute(null);
    setAlternatives([]);
    setSteps([]);
    setError(null);
  }, []);
  
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);
  
  const switchProfile = useCallback((profile) => {
    setActiveProfile(profile);
  }, []);
  
  return {
    route,
    alternatives,
    steps,
    loading,
    error,
    activeProfile,
    getRoute,
    clearRoute,
    cancelRequest,
    switchProfile,
    profiles: PROFILES,
  };
};

/**
 * Hook for waypoint management
 */
export const useWaypoints = () => {
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [waypoints, setWaypoints] = useState([]);
  
  const addWaypoint = useCallback((coords, index = -1) => {
    setWaypoints(prev => {
      if (index < 0 || index >= prev.length) {
        return [...prev, coords];
      }
      const next = [...prev];
      next.splice(index, 0, coords);
      return next;
    });
  }, []);
  
  const removeWaypoint = useCallback((index) => {
    setWaypoints(prev => prev.filter((_, i) => i !== index));
  }, []);
  
  const updateWaypoint = useCallback((index, coords) => {
    setWaypoints(prev => {
      const next = [...prev];
      next[index] = coords;
      return next;
    });
  }, []);
  
  const reorderWaypoints = useCallback((fromIndex, toIndex) => {
    setWaypoints(prev => {
      const next = [...prev];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);
      return next;
    });
  }, []);
  
  const clearAll = useCallback(() => {
    setOrigin(null);
    setDestination(null);
    setWaypoints([]);
  }, []);
  
  const swapOriginDestination = useCallback(() => {
    setOrigin(prev => {
      const dest = destination;
      setDestination(prev);
      return dest;
    });
  }, [destination]);
  
  return {
    origin,
    destination,
    waypoints,
    setOrigin,
    setDestination,
    addWaypoint,
    removeWaypoint,
    updateWaypoint,
    reorderWaypoints,
    clearAll,
    swapOriginDestination,
    hasRoute: Boolean(origin && destination),
  };
};

export { PROFILES };
export default useRouting;
