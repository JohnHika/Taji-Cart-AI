/**
 * LocationControl - Custom map control for user location
 * Features: locate button, follow mode toggle, accuracy circle, compass heading
 */
import React, { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { useUserLocation } from './useUserLocation';
import { MAP_CONFIG } from '../core/constants';

const LocationControl = ({
  map,
  onLocationFound,
  onLocationError,
  showFollowToggle = true,
  flyOnLocate = true,
  className = ''
}) => {
  const {
    position,
    accuracy,
    heading,
    isLoading,
    error,
    isWatching,
    followMode,
    getCurrentPosition,
    toggleFollowMode,
    startCompass
  } = useUserLocation({
    onPositionChange: (data) => {
      if (onLocationFound) onLocationFound(data);
      
      // Update marker and circle
      updateUserMarker(data.position);
      updateAccuracyCircle(data.position, data.accuracy);
      
      // Fly to position if follow mode
      if (followMode && map && flyOnLocate) {
        map.flyTo({
          center: [data.position.lng, data.position.lat],
          duration: 500
        });
      }
    },
    onError: (err) => {
      if (onLocationError) onLocationError(err);
    }
  });

  const markerRef = useRef(null);
  const accuracySourceRef = useRef(null);
  const headingMarkerRef = useRef(null);

  // Create user location marker
  useEffect(() => {
    if (!map) return;

    // Create custom marker element
    const el = document.createElement('div');
    el.className = 'user-location-marker';
    el.innerHTML = `
      <div class="user-location-dot">
        <div class="user-location-pulse"></div>
      </div>
    `;

    markerRef.current = new maplibregl.Marker({
      element: el,
      anchor: 'center'
    });

    // Add accuracy circle source
    map.on('load', () => {
      if (!map.getSource('user-accuracy')) {
        map.addSource('user-accuracy', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [0, 0]
            }
          }
        });

        map.addLayer({
          id: 'user-accuracy-circle',
          type: 'circle',
          source: 'user-accuracy',
          paint: {
            'circle-radius': 0,
            'circle-color': '#4285f4',
            'circle-opacity': 0.15,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#4285f4',
            'circle-stroke-opacity': 0.3
          }
        });

        accuracySourceRef.current = map.getSource('user-accuracy');
      }
    });

    // Inject marker CSS
    if (!document.getElementById('user-location-styles')) {
      const style = document.createElement('style');
      style.id = 'user-location-styles';
      style.textContent = `
        .user-location-marker {
          width: 24px;
          height: 24px;
          position: relative;
        }
        .user-location-dot {
          width: 16px;
          height: 16px;
          background: #4285f4;
          border: 3px solid #fff;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
        .user-location-pulse {
          width: 40px;
          height: 40px;
          background: rgba(66, 133, 244, 0.3);
          border-radius: 50%;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: pulse 2s ease-out infinite;
        }
        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
        }
        .user-location-heading {
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-bottom: 16px solid #4285f4;
          position: absolute;
          top: -20px;
          left: 50%;
          transform: translateX(-50%);
          transform-origin: center bottom;
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      markerRef.current?.remove();
    };
  }, [map]);

  // Update user marker position
  const updateUserMarker = useCallback((pos) => {
    if (!markerRef.current || !map) return;
    markerRef.current.setLngLat([pos.lng, pos.lat]).addTo(map);
  }, [map]);

  // Update accuracy circle
  const updateAccuracyCircle = useCallback((pos, accuracyMeters) => {
    if (!map || !accuracyMeters) return;

    try {
      // Calculate circle radius in pixels based on meters
      // This is approximate - proper implementation would use turf.js
      const metersPerPixel = (40075016.686 * Math.cos(pos.lat * Math.PI / 180)) / Math.pow(2, map.getZoom() + 8);
      const radiusPixels = accuracyMeters / metersPerPixel;

      if (map.getSource('user-accuracy')) {
        map.getSource('user-accuracy').setData({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [pos.lng, pos.lat]
          }
        });

        map.setPaintProperty('user-accuracy-circle', 'circle-radius', radiusPixels);
      }
    } catch (e) {
      // Source might not be ready
    }
  }, [map]);

  // Handle locate button click
  const handleLocate = async () => {
    try {
      const pos = await getCurrentPosition();
      if (map && flyOnLocate) {
        map.flyTo({
          center: [pos.lng, pos.lat],
          zoom: MAP_CONFIG.locationZoom,
          duration: MAP_CONFIG.animationDuration
        });
      }
      startCompass();
    } catch (err) {
      console.error('Location error:', err);
    }
  };

  // Handle follow mode toggle
  const handleFollowToggle = () => {
    toggleFollowMode(!followMode);
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Locate button */}
      <button
        type="button"
        onClick={handleLocate}
        disabled={isLoading}
        className={`w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 transition-all ${
          position ? 'text-blue-500' : 'text-gray-600'
        }`}
        title="Find my location"
        aria-label="Find my location"
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )}
      </button>

      {/* Follow mode toggle */}
      {showFollowToggle && position && (
        <button
          type="button"
          onClick={handleFollowToggle}
          className={`w-10 h-10 rounded-lg shadow-md flex items-center justify-center transition-all ${
            followMode 
              ? 'bg-blue-500 text-white hover:bg-blue-600' 
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
          title={followMode ? 'Stop following' : 'Follow my location'}
          aria-label={followMode ? 'Stop following' : 'Follow my location'}
          aria-pressed={followMode}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
        </button>
      )}

      {/* Error display */}
      {error && (
        <div className="absolute bottom-16 left-0 right-0 mx-2 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-700 text-center">
          {error}
        </div>
      )}
    </div>
  );
};

export default LocationControl;
