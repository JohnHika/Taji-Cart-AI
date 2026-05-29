/**
 * useMeasurement - Distance and area measurement hook
 * Calculates distances between points and polygon areas
 */

import { useState, useCallback, useMemo } from 'react';

/**
 * Calculate distance between two points using Haversine formula
 * @param {Object} from - {lat, lng}
 * @param {Object} to - {lat, lng}
 * @returns {number} Distance in meters
 */
export const haversineDistance = (from, to) => {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
};

/**
 * Calculate bearing between two points
 * @param {Object} from - {lat, lng}
 * @param {Object} to - {lat, lng}
 * @returns {number} Bearing in degrees (0-360)
 */
export const calculateBearing = (from, to) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;
  
  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  
  const x = Math.sin(dLng) * Math.cos(lat2);
  const y = Math.cos(lat1) * Math.sin(lat2) - 
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  
  let bearing = toDeg(Math.atan2(x, y));
  return (bearing + 360) % 360;
};

/**
 * Calculate area of polygon using Shoelace formula
 * @param {Array} coordinates - Array of {lat, lng} points
 * @returns {number} Area in square meters
 */
export const calculatePolygonArea = (coordinates) => {
  if (coordinates.length < 3) return 0;
  
  // Convert to flat earth approximation (good for small areas)
  const toMeters = (coord, center) => {
    const latM = 111320; // meters per degree latitude
    const lngM = 111320 * Math.cos((center.lat * Math.PI) / 180);
    return {
      x: (coord.lng - center.lng) * lngM,
      y: (coord.lat - center.lat) * latM,
    };
  };
  
  // Calculate center
  const center = {
    lat: coordinates.reduce((sum, c) => sum + c.lat, 0) / coordinates.length,
    lng: coordinates.reduce((sum, c) => sum + c.lng, 0) / coordinates.length,
  };
  
  // Convert to meters
  const meters = coordinates.map(c => toMeters(c, center));
  
  // Shoelace formula
  let area = 0;
  for (let i = 0; i < meters.length; i++) {
    const j = (i + 1) % meters.length;
    area += meters[i].x * meters[j].y;
    area -= meters[j].x * meters[i].y;
  }
  
  return Math.abs(area / 2);
};

/**
 * Format distance for display
 */
export const formatDistance = (meters) => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
};

/**
 * Format area for display
 */
export const formatArea = (sqMeters) => {
  if (sqMeters < 10000) {
    return `${Math.round(sqMeters)} m²`;
  }
  if (sqMeters < 1000000) {
    return `${(sqMeters / 10000).toFixed(2)} hectares`;
  }
  return `${(sqMeters / 1000000).toFixed(2)} km²`;
};

/**
 * Format bearing for display
 */
export const formatBearing = (degrees) => {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return `${Math.round(degrees)}° ${directions[index]}`;
};

/**
 * Measurement types
 */
export const MEASUREMENT_TYPES = {
  DISTANCE: 'distance',
  AREA: 'area',
  RADIUS: 'radius',
};

/**
 * useMeasurement hook - Core measurement functionality
 */
export const useMeasurement = () => {
  const [points, setPoints] = useState([]);
  const [measurementType, setMeasurementType] = useState(MEASUREMENT_TYPES.DISTANCE);
  const [isActive, setIsActive] = useState(false);
  
  // Add a point
  const addPoint = useCallback((point) => {
    setPoints(prev => [...prev, { ...point, id: Date.now() }]);
  }, []);
  
  // Remove last point
  const removeLastPoint = useCallback(() => {
    setPoints(prev => prev.slice(0, -1));
  }, []);
  
  // Clear all points
  const clearPoints = useCallback(() => {
    setPoints([]);
  }, []);
  
  // Update a specific point
  const updatePoint = useCallback((index, newPoint) => {
    setPoints(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...newPoint };
      return updated;
    });
  }, []);
  
  // Start measuring
  const startMeasuring = useCallback((type = MEASUREMENT_TYPES.DISTANCE) => {
    setMeasurementType(type);
    setIsActive(true);
    setPoints([]);
  }, []);
  
  // Stop measuring
  const stopMeasuring = useCallback(() => {
    setIsActive(false);
  }, []);
  
  // Calculate segment distances
  const segmentDistances = useMemo(() => {
    if (points.length < 2) return [];
    
    return points.slice(1).map((point, i) => {
      const from = points[i];
      const to = point;
      return {
        from,
        to,
        distance: haversineDistance(from, to),
        bearing: calculateBearing(from, to),
      };
    });
  }, [points]);
  
  // Total distance
  const totalDistance = useMemo(() => {
    return segmentDistances.reduce((sum, seg) => sum + seg.distance, 0);
  }, [segmentDistances]);
  
  // Polygon area (if measuring area)
  const area = useMemo(() => {
    if (measurementType !== MEASUREMENT_TYPES.AREA || points.length < 3) {
      return 0;
    }
    return calculatePolygonArea(points);
  }, [points, measurementType]);
  
  // Perimeter (for area measurement)
  const perimeter = useMemo(() => {
    if (measurementType !== MEASUREMENT_TYPES.AREA || points.length < 2) {
      return 0;
    }
    // Add closing segment
    let total = totalDistance;
    if (points.length >= 3) {
      total += haversineDistance(points[points.length - 1], points[0]);
    }
    return total;
  }, [measurementType, points, totalDistance]);
  
  // Radius measurement (from first point to current)
  const radius = useMemo(() => {
    if (measurementType !== MEASUREMENT_TYPES.RADIUS || points.length < 2) {
      return 0;
    }
    return haversineDistance(points[0], points[points.length - 1]);
  }, [measurementType, points]);
  
  // Circle area (for radius measurement)
  const circleArea = useMemo(() => {
    return Math.PI * radius * radius;
  }, [radius]);
  
  // GeoJSON for rendering
  const geoJSON = useMemo(() => {
    if (points.length === 0) return null;
    
    const coordinates = points.map(p => [p.lng, p.lat]);
    
    // Distance line
    if (measurementType === MEASUREMENT_TYPES.DISTANCE) {
      return {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates,
        },
        properties: {
          distance: totalDistance,
        },
      };
    }
    
    // Area polygon
    if (measurementType === MEASUREMENT_TYPES.AREA && points.length >= 3) {
      return {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[...coordinates, coordinates[0]]], // Close the polygon
        },
        properties: {
          area,
          perimeter,
        },
      };
    }
    
    // Radius circle (approximation with points)
    if (measurementType === MEASUREMENT_TYPES.RADIUS && points.length >= 2) {
      const center = points[0];
      const circlePoints = [];
      const steps = 64;
      
      for (let i = 0; i <= steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        const dx = radius * Math.cos(angle) / 111320;
        const dy = radius * Math.sin(angle) / (111320 * Math.cos((center.lat * Math.PI) / 180));
        circlePoints.push([center.lng + dx, center.lat + dy]);
      }
      
      return {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [circlePoints],
        },
        properties: {
          radius,
          area: circleArea,
        },
      };
    }
    
    return null;
  }, [points, measurementType, totalDistance, area, perimeter, radius, circleArea]);
  
  return {
    // State
    points,
    measurementType,
    isActive,
    
    // Actions
    addPoint,
    removeLastPoint,
    clearPoints,
    updatePoint,
    startMeasuring,
    stopMeasuring,
    setMeasurementType,
    
    // Calculated values
    segmentDistances,
    totalDistance,
    area,
    perimeter,
    radius,
    circleArea,
    geoJSON,
    
    // Formatting helpers
    formatDistance,
    formatArea,
    formatBearing,
  };
};

export default useMeasurement;
