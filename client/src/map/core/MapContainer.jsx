/**
 * MapContainer - Core map wrapper component
 * Provides the base map with all premium features
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MAP_STYLES, DEFAULT_STYLE, MAP_CONFIG, DEFAULT_CENTER, STORAGE_KEYS } from './constants';

const MapContainer = ({
  initialCenter = DEFAULT_CENTER,
  initialZoom = MAP_CONFIG.defaultZoom,
  styleKey = DEFAULT_STYLE,
  onMapReady,
  onMapClick,
  onMapContextMenu,
  onMapMove,
  className = '',
  children,
  // Feature flags
  showNavigation = true,
  showScale = true,
  showFullscreen = false,
  showGeolocate = false
}) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const styleUrl = MAP_STYLES[styleKey]?.url || MAP_STYLES[DEFAULT_STYLE].url;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: [initialCenter.lng, initialCenter.lat],
      zoom: initialZoom,
      minZoom: MAP_CONFIG.minZoom,
      maxZoom: MAP_CONFIG.maxZoom,
      pitchWithRotate: true,
      dragRotate: true,
      touchZoomRotate: true,
      attributionControl: true
    });

    // Navigation controls
    if (showNavigation) {
      map.addControl(new maplibregl.NavigationControl({
        visualizePitch: true,
        showCompass: true,
        showZoom: true
      }), 'top-right');
    }

    // Scale control
    if (showScale) {
      map.addControl(new maplibregl.ScaleControl({
        maxWidth: 100,
        unit: 'metric'
      }), 'bottom-left');
    }

    // Fullscreen control
    if (showFullscreen) {
      map.addControl(new maplibregl.FullscreenControl(), 'top-right');
    }

    // Geolocate control
    if (showGeolocate) {
      const geolocate = new maplibregl.GeolocateControl({
        positionOptions: MAP_CONFIG.geolocation,
        trackUserLocation: true,
        showUserHeading: true,
        showAccuracyCircle: true
      });
      map.addControl(geolocate, 'top-right');
    }

    // Event handlers
    map.on('load', () => {
      setIsLoaded(true);
      if (onMapReady) onMapReady(map);
    });

    map.on('click', (e) => {
      if (onMapClick) {
        onMapClick({
          lngLat: e.lngLat,
          lat: e.lngLat.lat,
          lng: e.lngLat.lng,
          point: e.point,
          originalEvent: e.originalEvent
        });
      }
    });

    map.on('contextmenu', (e) => {
      e.preventDefault();
      if (onMapContextMenu) {
        onMapContextMenu({
          lngLat: e.lngLat,
          lat: e.lngLat.lat,
          lng: e.lngLat.lng,
          point: e.point,
          originalEvent: e.originalEvent
        });
      }
    });

    map.on('moveend', () => {
      if (onMapMove) {
        const center = map.getCenter();
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
  }, []); // Only run once

  // Update style when styleKey changes
  useEffect(() => {
    if (mapRef.current && MAP_STYLES[styleKey]) {
      mapRef.current.setStyle(MAP_STYLES[styleKey].url);
    }
  }, [styleKey]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div 
        ref={containerRef} 
        className="absolute inset-0"
        style={{ width: '100%', height: '100%' }}
      />
      {/* Render children with map context */}
      {isLoaded && children && (
        <MapContext.Provider value={{ map: mapRef.current, isLoaded }}>
          {children}
        </MapContext.Provider>
      )}
    </div>
  );
};

// Map context for child components
export const MapContext = React.createContext({ map: null, isLoaded: false });

export const useMap = () => {
  const context = React.useContext(MapContext);
  if (!context) {
    throw new Error('useMap must be used within a MapContainer');
  }
  return context;
};

export default MapContainer;
