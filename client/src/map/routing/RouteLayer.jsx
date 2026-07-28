/**
 * RouteLayer - Route visualization on MapLibre
 * Shows route line, alternatives, waypoints
 */

import { useEffect, useCallback, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { useMap } from '../core/MapContainer';
import { PROFILES } from './useRouting';

// Layer IDs
const LAYER_IDS = {
  routeBackground: 'route-background',
  routeLine: 'route-line',
  routeArrows: 'route-arrows',
  alternativeLines: 'route-alternatives',
  waypoints: 'route-waypoints',
  waypointLabels: 'route-waypoint-labels',
};

// Source IDs
const SOURCE_IDS = {
  route: 'route-source',
  alternatives: 'route-alternatives-source',
  waypoints: 'route-waypoints-source',
};

/**
 * Hook to add route layer to map
 */
export const useRouteLayer = (route, alternatives = [], options = {}) => {
  const { map, isLoaded } = useMap();
  const [isLayerReady, setIsLayerReady] = useState(false);
  
  const {
    showAlternatives = true,
    fitBoundsOnRoute = true,
    fitBoundsPadding = 80,
    profile = 'driving',
  } = options;
  
  // Initialize sources and layers
  useEffect(() => {
    if (!map || !isLoaded) return;
    
    const profileConfig = PROFILES[profile] || PROFILES.driving;
    
    // Add route source
    if (!map.getSource(SOURCE_IDS.route)) {
      map.addSource(SOURCE_IDS.route, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });
    }
    
    // Add alternatives source
    if (!map.getSource(SOURCE_IDS.alternatives)) {
      map.addSource(SOURCE_IDS.alternatives, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });
    }
    
    // Add waypoints source
    if (!map.getSource(SOURCE_IDS.waypoints)) {
      map.addSource(SOURCE_IDS.waypoints, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });
    }
    
    // Add alternative route layer (below main route)
    if (!map.getLayer(LAYER_IDS.alternativeLines)) {
      map.addLayer({
        id: LAYER_IDS.alternativeLines,
        type: 'line',
        source: SOURCE_IDS.alternatives,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#888',
          'line-width': 6,
          'line-opacity': 0.5,
        },
      });
    }
    
    // Add route background (wider line for outline effect)
    if (!map.getLayer(LAYER_IDS.routeBackground)) {
      map.addLayer({
        id: LAYER_IDS.routeBackground,
        type: 'line',
        source: SOURCE_IDS.route,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#fff',
          'line-width': 10,
          'line-opacity': 0.8,
        },
      });
    }
    
    // Add main route line
    if (!map.getLayer(LAYER_IDS.routeLine)) {
      map.addLayer({
        id: LAYER_IDS.routeLine,
        type: 'line',
        source: SOURCE_IDS.route,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': profileConfig.color,
          'line-width': 6,
        },
      });
    }
    
    // Add route direction arrows
    if (!map.getLayer(LAYER_IDS.routeArrows)) {
      map.addLayer({
        id: LAYER_IDS.routeArrows,
        type: 'symbol',
        source: SOURCE_IDS.route,
        layout: {
          'symbol-placement': 'line',
          'symbol-spacing': 100,
          'text-field': '▶',
          'text-size': 12,
          'text-keep-upright': false,
          'text-rotation-alignment': 'map',
        },
        paint: {
          'text-color': '#fff',
        },
      });
    }
    
    // Add waypoint markers
    if (!map.getLayer(LAYER_IDS.waypoints)) {
      map.addLayer({
        id: LAYER_IDS.waypoints,
        type: 'circle',
        source: SOURCE_IDS.waypoints,
        paint: {
          'circle-radius': 12,
          'circle-color': '#fff',
          'circle-stroke-width': 3,
          'circle-stroke-color': profileConfig.color,
        },
      });
    }
    
    // Add waypoint labels
    if (!map.getLayer(LAYER_IDS.waypointLabels)) {
      map.addLayer({
        id: LAYER_IDS.waypointLabels,
        type: 'symbol',
        source: SOURCE_IDS.waypoints,
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 14,
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        },
        paint: {
          'text-color': profileConfig.color,
        },
      });
    }
    
    setIsLayerReady(true);
    
    // Cleanup
    return () => {
      const layerIds = Object.values(LAYER_IDS);
      layerIds.forEach(id => {
        if (map.getLayer(id)) map.removeLayer(id);
      });
      Object.values(SOURCE_IDS).forEach(id => {
        if (map.getSource(id)) map.removeSource(id);
      });
    };
  }, [map, isLoaded, profile]);
  
  // Update route data
  useEffect(() => {
    if (!map || !isLayerReady) return;
    
    const routeSource = map.getSource(SOURCE_IDS.route);
    if (routeSource) {
      routeSource.setData(route || {
        type: 'FeatureCollection',
        features: [],
      });
    }
    
    // Update route line color based on profile
    const profileConfig = PROFILES[profile] || PROFILES.driving;
    if (map.getLayer(LAYER_IDS.routeLine)) {
      map.setPaintProperty(LAYER_IDS.routeLine, 'line-color', profileConfig.color);
    }
    if (map.getLayer(LAYER_IDS.waypoints)) {
      map.setPaintProperty(LAYER_IDS.waypoints, 'circle-stroke-color', profileConfig.color);
    }
    
    // Fit bounds to route
    if (route && fitBoundsOnRoute && route.geometry?.coordinates?.length) {
      const coords = route.geometry.coordinates;
      const bounds = coords.reduce((bounds, coord) => {
        return bounds.extend(coord);
      }, new maplibregl.LngLatBounds(coords[0], coords[0]));
      
      map.fitBounds(bounds, {
        padding: fitBoundsPadding,
        duration: 500,
      });
    }
  }, [map, route, isLayerReady, profile, fitBoundsOnRoute, fitBoundsPadding]);
  
  // Update alternatives
  useEffect(() => {
    if (!map || !isLayerReady) return;
    
    const altSource = map.getSource(SOURCE_IDS.alternatives);
    if (altSource) {
      altSource.setData({
        type: 'FeatureCollection',
        features: showAlternatives ? alternatives : [],
      });
    }
    
    // Visibility toggle
    if (map.getLayer(LAYER_IDS.alternativeLines)) {
      map.setLayoutProperty(
        LAYER_IDS.alternativeLines,
        'visibility',
        showAlternatives ? 'visible' : 'none'
      );
    }
  }, [map, alternatives, isLayerReady, showAlternatives]);
  
  return { isLayerReady, layerIds: LAYER_IDS, sourceIds: SOURCE_IDS };
};

/**
 * Hook to add draggable waypoint markers
 */
export const useDraggableWaypoints = (waypoints, onWaypointDrag) => {
  const { map, isLoaded } = useMap();
  
  useEffect(() => {
    if (!map || !isLoaded) return;
    
    const source = map.getSource(SOURCE_IDS.waypoints);
    if (!source) return;
    
    // Create waypoint features
    const features = [
      // Origin
      waypoints.origin && {
        type: 'Feature',
        properties: { type: 'origin', label: 'A', index: -1 },
        geometry: {
          type: 'Point',
          coordinates: waypoints.origin,
        },
      },
      // Intermediate waypoints
      ...waypoints.intermediate.map((coords, index) => ({
        type: 'Feature',
        properties: { type: 'waypoint', label: String(index + 1), index },
        geometry: {
          type: 'Point',
          coordinates: coords,
        },
      })),
      // Destination
      waypoints.destination && {
        type: 'Feature',
        properties: { type: 'destination', label: 'B', index: -2 },
        geometry: {
          type: 'Point',
          coordinates: waypoints.destination,
        },
      },
    ].filter(Boolean);
    
    source.setData({
      type: 'FeatureCollection',
      features,
    });
  }, [map, isLoaded, waypoints]);
  
  // Add drag interaction
  useEffect(() => {
    if (!map || !isLoaded || !onWaypointDrag) return;
    
    let isDragging = false;
    let draggedFeature = null;
    
    const onMouseDown = (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: [LAYER_IDS.waypoints],
      });
      
      if (features.length > 0) {
        isDragging = true;
        draggedFeature = features[0];
        map.getCanvas().style.cursor = 'grabbing';
        
        map.on('mousemove', onMouseMove);
        map.once('mouseup', onMouseUp);
      }
    };
    
    const onMouseMove = (e) => {
      if (!isDragging || !draggedFeature) return;
      
      const coords = [e.lngLat.lng, e.lngLat.lat];
      const { type, index } = draggedFeature.properties;
      
      // Update waypoint position
      onWaypointDrag(type, index, coords);
    };
    
    const onMouseUp = () => {
      isDragging = false;
      draggedFeature = null;
      map.getCanvas().style.cursor = '';
      map.off('mousemove', onMouseMove);
    };
    
    map.on('mousedown', LAYER_IDS.waypoints, onMouseDown);
    
    // Hover cursor
    map.on('mouseenter', LAYER_IDS.waypoints, () => {
      map.getCanvas().style.cursor = 'grab';
    });
    
    map.on('mouseleave', LAYER_IDS.waypoints, () => {
      if (!isDragging) {
        map.getCanvas().style.cursor = '';
      }
    });
    
    return () => {
      map.off('mousedown', LAYER_IDS.waypoints, onMouseDown);
      map.off('mousemove', onMouseMove);
    };
  }, [map, isLoaded, onWaypointDrag]);
};

/**
 * RouteLayer component
 */
export const RouteLayer = ({
  route,
  alternatives = [],
  origin,
  destination,
  waypoints = [],
  profile = 'driving',
  showAlternatives = true,
  fitBoundsOnRoute = true,
  fitBoundsPadding = 80,
  onAlternativeClick,
}) => {
  const { map, isLoaded } = useMap();
  
  const { isLayerReady } = useRouteLayer(route, alternatives, {
    showAlternatives,
    fitBoundsOnRoute,
    fitBoundsPadding,
    profile,
  });
  
  // Update waypoints
  useDraggableWaypoints({
    origin,
    destination,
    intermediate: waypoints,
  });
  
  // Handle alternative click
  useEffect(() => {
    if (!map || !isLayerReady || !onAlternativeClick) return;
    
    const onClick = (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: [LAYER_IDS.alternativeLines],
      });
      
      if (features.length > 0) {
        const index = alternatives.findIndex(
          alt => alt.properties.distance === features[0].properties.distance
        );
        if (index !== -1) {
          onAlternativeClick(alternatives[index], index);
        }
      }
    };
    
    map.on('click', LAYER_IDS.alternativeLines, onClick);
    
    return () => {
      map.off('click', LAYER_IDS.alternativeLines, onClick);
    };
  }, [map, isLayerReady, alternatives, onAlternativeClick]);
  
  return null; // This component only manages map layers
};

export default RouteLayer;
