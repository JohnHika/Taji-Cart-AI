/**
 * useMapInstance - Core hook for MapLibre GL JS map management
 * Handles map initialization, cleanup, and provides access to map instance
 */
import { useRef, useEffect, useCallback, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MAP_STYLES, DEFAULT_STYLE, MAP_CONFIG, DEFAULT_CENTER, STORAGE_KEYS } from './constants';

/**
 * @param {Object} options
 * @param {HTMLElement|null} options.container - DOM element or ref to mount map
 * @param {Object} options.initialCenter - {lat, lng} starting center
 * @param {number} options.initialZoom - Starting zoom level
 * @param {string} options.styleKey - Key from MAP_STYLES
 * @param {Function} options.onMapLoad - Callback when map loads
 * @param {Function} options.onMapClick - Callback on map click
 * @param {Function} options.onMapMove - Callback on map move
 */
export function useMapInstance({
  container,
  initialCenter = DEFAULT_CENTER,
  initialZoom = MAP_CONFIG.defaultZoom,
  styleKey = null,
  onMapLoad,
  onMapClick,
  onMapMove,
  onMapContextMenu
} = {}) {
  const mapRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [mapCenter, setMapCenter] = useState(initialCenter);
  const [zoom, setZoom] = useState(initialZoom);
  const [pitch, setPitch] = useState(0);
  const [bearing, setBearing] = useState(0);

  // Get saved style or default
  const getInitialStyle = useCallback(() => {
    if (styleKey && MAP_STYLES[styleKey]) {
      return MAP_STYLES[styleKey].url;
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.preferredStyle);
      if (saved && MAP_STYLES[saved]) {
        return MAP_STYLES[saved].url;
      }
    } catch (e) {
      console.warn('Could not read saved style:', e);
    }
    return MAP_STYLES[DEFAULT_STYLE].url;
  }, [styleKey]);

  // Initialize map
  useEffect(() => {
    if (!container || mapRef.current) return;

    const map = new maplibregl.Map({
      container,
      style: getInitialStyle(),
      center: [initialCenter.lng, initialCenter.lat],
      zoom: initialZoom,
      minZoom: MAP_CONFIG.minZoom,
      maxZoom: MAP_CONFIG.maxZoom,
      pitchWithRotate: true,
      dragRotate: true,
      touchZoomRotate: true,
      attributionControl: true
    });

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl({
      visualizePitch: true,
      showCompass: true,
      showZoom: true
    }), 'top-right');

    // Add scale control
    map.addControl(new maplibregl.ScaleControl({
      maxWidth: 100,
      unit: 'metric'
    }), 'bottom-left');

    // Map load event
    map.on('load', () => {
      setIsLoaded(true);
      if (onMapLoad) onMapLoad(map);
    });

    // Click event
    map.on('click', (e) => {
      if (onMapClick) {
        onMapClick({
          lngLat: e.lngLat,
          point: e.point,
          originalEvent: e.originalEvent
        });
      }
    });

    // Context menu (right-click)
    map.on('contextmenu', (e) => {
      e.preventDefault();
      if (onMapContextMenu) {
        onMapContextMenu({
          lngLat: e.lngLat,
          point: e.point,
          originalEvent: e.originalEvent
        });
      }
    });

    // Move event (for coordinates panel)
    map.on('moveend', () => {
      const center = map.getCenter();
      setMapCenter({ lat: center.lat, lng: center.lng });
      setZoom(map.getZoom());
      setPitch(map.getPitch());
      setBearing(map.getBearing());
      
      if (onMapMove) {
        onMapMove({
          center: { lat: center.lat, lng: center.lng },
          zoom: map.getZoom(),
          pitch: map.getPitch(),
          bearing: map.getBearing(),
          bounds: map.getBounds()
        });
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      setIsLoaded(false);
    };
  }, [container, initialCenter, initialZoom, getInitialStyle, onMapLoad, onMapClick, onMapMove, onMapContextMenu]);

  // Fly to location with animation
  const flyTo = useCallback((position, options = {}) => {
    const map = mapRef.current;
    if (!map) return;

    map.flyTo({
      center: [position.lng, position.lat],
      zoom: options.zoom ?? MAP_CONFIG.locationZoom,
      pitch: options.pitch ?? map.getPitch(),
      bearing: options.bearing ?? map.getBearing(),
      duration: options.duration ?? MAP_CONFIG.animationDuration,
      essential: true,
      ...options
    });
  }, []);

  // Fit bounds to show multiple points
  const fitBounds = useCallback((bounds, options = {}) => {
    const map = mapRef.current;
    if (!map) return;

    map.fitBounds(bounds, {
      padding: options.padding ?? 50,
      duration: options.duration ?? MAP_CONFIG.animationDuration,
      ...options
    });
  }, []);

  // Change map style
  const setStyle = useCallback((styleKey) => {
    const map = mapRef.current;
    if (!map || !MAP_STYLES[styleKey]) return;

    map.setStyle(MAP_STYLES[styleKey].url);
    
    try {
      localStorage.setItem(STORAGE_KEYS.preferredStyle, styleKey);
    } catch (e) {
      console.warn('Could not save style preference:', e);
    }
  }, []);

  // Reset pitch and bearing
  const resetNorth = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    map.easeTo({
      pitch: 0,
      bearing: 0,
      duration: 500
    });
  }, []);

  // Pan by pixels
  const panBy = useCallback((x, y) => {
    const map = mapRef.current;
    if (!map) return;
    map.panBy([x, y], { duration: 300 });
  }, []);

  // Zoom in/out
  const zoomIn = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    map.zoomIn({ duration: 300 });
  }, []);

  const zoomOut = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    map.zoomOut({ duration: 300 });
  }, []);

  return {
    map: mapRef.current,
    isLoaded,
    mapCenter,
    zoom,
    pitch,
    bearing,
    flyTo,
    fitBounds,
    setStyle,
    resetNorth,
    panBy,
    zoomIn,
    zoomOut
  };
}

export default useMapInstance;
