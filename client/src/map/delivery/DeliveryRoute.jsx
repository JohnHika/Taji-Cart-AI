/**
 * DeliveryRoute - Shows delivery route on map
 * Displays route from pickup to delivery with driver progress
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useRouting } from '../routing/useRouting';

// Route colors by segment
const ROUTE_COLORS = {
  driverToPickup: '#3B82F6',    // Blue - driver heading to pickup
  pickupToDelivery: '#10B981',  // Green - on the way to customer
  completed: '#9CA3AF',         // Gray - completed segments
  remaining: '#E5E7EB',         // Light gray - remaining distance
};

/**
 * Hook for delivery route visualization
 */
export const useDeliveryRoute = (map) => {
  const { fetchRoute } = useRouting();
  const [routes, setRoutes] = useState({
    driverToPickup: null,
    pickupToDelivery: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const layerIdsRef = useRef([]);
  
  // Cleanup layers
  const clearLayers = useCallback(() => {
    if (!map) return;
    
    layerIdsRef.current.forEach(id => {
      if (map.getLayer(id)) {
        map.removeLayer(id);
      }
      if (map.getSource(id)) {
        map.removeSource(id);
      }
    });
    layerIdsRef.current = [];
  }, [map]);
  
  // Add route to map
  const addRouteLayer = useCallback((id, geojson, color, width = 5, dashArray = null) => {
    if (!map || !geojson) return;
    
    // Add source
    if (!map.getSource(id)) {
      map.addSource(id, {
        type: 'geojson',
        data: geojson,
      });
    } else {
      map.getSource(id).setData(geojson);
    }
    
    // Add outline layer
    const outlineId = `${id}-outline`;
    if (!map.getLayer(outlineId)) {
      map.addLayer({
        id: outlineId,
        type: 'line',
        source: id,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#ffffff',
          'line-width': width + 3,
          'line-opacity': 0.8,
        },
      });
      layerIdsRef.current.push(outlineId);
    }
    
    // Add main line layer
    if (!map.getLayer(id)) {
      const paint = {
        'line-color': color,
        'line-width': width,
        'line-opacity': 0.9,
      };
      
      if (dashArray) {
        paint['line-dasharray'] = dashArray;
      }
      
      map.addLayer({
        id,
        type: 'line',
        source: id,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint,
      });
      layerIdsRef.current.push(id);
    }
  }, [map]);
  
  // Calculate full delivery route
  // deliveryMode: 'foot' | 'walking' | 'walker' → use 'foot' profile; otherwise 'driving'
  const calculateRoute = useCallback(async (driverLocation, pickupLocation, deliveryLocation, deliveryMode = 'driving') => {
    if (!driverLocation || !deliveryLocation) {
      setError('Missing locations');
      return null;
    }

    const FOOT_MODES = ['foot', 'walking', 'walker'];
    const routingProfile = FOOT_MODES.includes(deliveryMode) ? 'foot' : 'driving';

    setIsLoading(true);
    setError(null);

    try {
      const routeResults = {};

      // Route from driver to pickup (if pickup exists and driver hasn't reached it)
      if (pickupLocation) {
        try {
          const toPickup = await fetchRoute(
            [driverLocation, pickupLocation],
            routingProfile
          );
          routeResults.driverToPickup = toPickup;
        } catch (err) {
          console.warn('Could not calculate driver to pickup route:', err);
        }

        // Route from pickup to delivery
        try {
          const toDelivery = await fetchRoute(
            [pickupLocation, deliveryLocation],
            routingProfile
          );
          routeResults.pickupToDelivery = toDelivery;
        } catch (err) {
          console.warn('Could not calculate pickup to delivery route:', err);
        }
      } else {
        // Direct route from driver to delivery
        try {
          const direct = await fetchRoute(
            [driverLocation, deliveryLocation],
            routingProfile
          );
          routeResults.pickupToDelivery = direct;
        } catch (err) {
          setError('Could not calculate route');
          throw err;
        }
      }
      
      setRoutes(routeResults);
      setIsLoading(false);
      return routeResults;
    } catch (err) {
      setIsLoading(false);
      setError(err.message || 'Failed to calculate route');
      return null;
    }
  }, [fetchRoute]);
  
  // Display routes on map
  const displayRoutes = useCallback((showCompleted = false) => {
    if (!map) return;
    
    clearLayers();
    
    // Show driver to pickup route
    if (routes.driverToPickup?.geojson) {
      addRouteLayer(
        'delivery-route-to-pickup',
        routes.driverToPickup.geojson,
        showCompleted ? ROUTE_COLORS.completed : ROUTE_COLORS.driverToPickup,
        5,
        null
      );
    }
    
    // Show pickup to delivery route
    if (routes.pickupToDelivery?.geojson) {
      addRouteLayer(
        'delivery-route-to-delivery',
        routes.pickupToDelivery.geojson,
        ROUTE_COLORS.pickupToDelivery,
        5,
        null
      );
    }
  }, [map, routes, clearLayers, addRouteLayer]);
  
  // Fit map to show entire route
  const fitToRoute = useCallback((padding = 80) => {
    if (!map) return;
    
    const coordinates = [];
    
    if (routes.driverToPickup?.geojson?.geometry?.coordinates) {
      coordinates.push(...routes.driverToPickup.geojson.geometry.coordinates);
    }
    if (routes.pickupToDelivery?.geojson?.geometry?.coordinates) {
      coordinates.push(...routes.pickupToDelivery.geojson.geometry.coordinates);
    }
    
    if (coordinates.length === 0) return;
    
    const bounds = coordinates.reduce((b, coord) => {
      return b.extend(coord);
    }, new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));
    
    map.fitBounds(bounds, {
      padding,
      duration: 500,
    });
  }, [map, routes]);
  
  // Update progress line (shows completed portion)
  const updateProgress = useCallback((driverLocation) => {
    if (!map || !routes.pickupToDelivery?.geojson) return;
    
    const routeCoords = routes.pickupToDelivery.geojson.geometry.coordinates;
    
    // Find closest point on route
    let minDist = Infinity;
    let closestIndex = 0;
    
    routeCoords.forEach((coord, i) => {
      const dist = Math.sqrt(
        Math.pow(coord[0] - driverLocation.lng, 2) +
        Math.pow(coord[1] - driverLocation.lat, 2)
      );
      if (dist < minDist) {
        minDist = dist;
        closestIndex = i;
      }
    });
    
    // Create completed segment
    const completedCoords = routeCoords.slice(0, closestIndex + 1);
    const remainingCoords = routeCoords.slice(closestIndex);
    
    // Update completed segment
    if (completedCoords.length > 1) {
      const completedGeoJSON = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: completedCoords,
        },
      };
      addRouteLayer(
        'delivery-route-completed',
        completedGeoJSON,
        ROUTE_COLORS.completed,
        5
      );
    }
    
    // Update remaining segment
    if (remainingCoords.length > 1) {
      const remainingGeoJSON = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: remainingCoords,
        },
      };
      addRouteLayer(
        'delivery-route-remaining',
        remainingGeoJSON,
        ROUTE_COLORS.pickupToDelivery,
        5
      );
    }
  }, [map, routes, addRouteLayer]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => clearLayers();
  }, [clearLayers]);
  
  return {
    routes,
    isLoading,
    error,
    calculateRoute,
    displayRoutes,
    fitToRoute,
    updateProgress,
    clearLayers,
    
    // Combined stats
    totalDistance: (routes.driverToPickup?.distance || 0) + (routes.pickupToDelivery?.distance || 0),
    totalDuration: (routes.driverToPickup?.duration || 0) + (routes.pickupToDelivery?.duration || 0),
  };
};

/**
 * DeliveryRoute component
 */
export const DeliveryRoute = ({
  map,
  driverLocation,
  pickupLocation,
  deliveryLocation,
  autoCalculate = true,
  showProgress = true,
  fitOnLoad = true,
  onRouteCalculated,
}) => {
  const {
    routes,
    isLoading,
    error,
    calculateRoute,
    displayRoutes,
    fitToRoute,
    updateProgress,
    totalDistance,
    totalDuration,
  } = useDeliveryRoute(map);
  
  // Calculate route when locations change
  useEffect(() => {
    if (autoCalculate && driverLocation && deliveryLocation) {
      calculateRoute(driverLocation, pickupLocation, deliveryLocation)
        .then((result) => {
          if (result) {
            onRouteCalculated?.(result);
          }
        });
    }
  }, [
    autoCalculate,
    driverLocation?.lat,
    driverLocation?.lng,
    pickupLocation?.lat,
    pickupLocation?.lng,
    deliveryLocation?.lat,
    deliveryLocation?.lng,
  ]);
  
  // Display routes when calculated
  useEffect(() => {
    if (routes.driverToPickup || routes.pickupToDelivery) {
      displayRoutes();
      if (fitOnLoad) {
        fitToRoute();
      }
    }
  }, [routes, displayRoutes, fitOnLoad, fitToRoute]);
  
  // Update progress as driver moves
  useEffect(() => {
    if (showProgress && driverLocation && routes.pickupToDelivery) {
      updateProgress(driverLocation);
    }
  }, [showProgress, driverLocation, routes.pickupToDelivery, updateProgress]);
  
  return null; // Route is managed via MapLibre layers
};

/**
 * Format route info for display
 */
export const formatRouteInfo = (routes) => {
  const totalDistance = (routes?.driverToPickup?.distance || 0) + (routes?.pickupToDelivery?.distance || 0);
  const totalDuration = (routes?.driverToPickup?.duration || 0) + (routes?.pickupToDelivery?.duration || 0);
  
  return {
    distance: totalDistance,
    distanceFormatted: totalDistance < 1000 
      ? `${Math.round(totalDistance)} m`
      : `${(totalDistance / 1000).toFixed(1)} km`,
    duration: totalDuration,
    durationFormatted: totalDuration < 60
      ? `${Math.round(totalDuration)} min`
      : `${Math.floor(totalDuration / 60)}h ${Math.round(totalDuration % 60)}m`,
    legs: [
      routes?.driverToPickup && {
        label: 'To Pickup',
        distance: routes.driverToPickup.distance,
        duration: routes.driverToPickup.duration,
      },
      routes?.pickupToDelivery && {
        label: 'To Delivery',
        distance: routes.pickupToDelivery.distance,
        duration: routes.pickupToDelivery.duration,
      },
    ].filter(Boolean),
  };
};

export default DeliveryRoute;
