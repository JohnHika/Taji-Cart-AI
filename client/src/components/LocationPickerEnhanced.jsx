/**
 * LocationPickerEnhanced.jsx
 * Premium location picker using modular map architecture
 * 
 * Features:
 * - Nominatim geocoding with debounced search
 * - User geolocation with accuracy display
 * - Keyboard shortcuts for power users
 * - Right-click context menu
 * - Real-time coordinates display
 * - Recent searches persistence
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { FaMapMarkerAlt, FaCrosshairs, FaSearch, FaKeyboard, FaTimes, FaCopy, FaCheck } from 'react-icons/fa';
import toast from 'react-hot-toast';

// Import from our modular map architecture
import {
  DEFAULT_CENTER,
  MAP_CONFIG,
  KEYBOARD_SHORTCUTS,
  useGeocoding,
  useRecentSearches,
  useUserLocation,
  useKeyboardShortcuts
} from '../map';

const LocationPickerEnhanced = ({ 
  onLocationSelect, 
  initialPosition = null, 
  className = "",
  showCoordinates = true,
  showKeyboardShortcuts = false,
  enableContextMenu = true
}) => {
  // State
  const [position, setPosition] = useState(initialPosition);
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [copied, setCopied] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  
  // Refs
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Hooks from our modular architecture
  const { 
    results, 
    loading: searchLoading, 
    debouncedSearch, 
    reverseGeocode 
  } = useGeocoding();

  const { 
    recentSearches, 
    addSearch, 
    removeSearch, 
    clearAll 
  } = useRecentSearches();

  const {
    location: userLocation,
    loading: locationLoading,
    error: locationError,
    accuracy,
    getCurrentPosition
  } = useUserLocation();

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;
    
    const center = position 
      ? [position.lng, position.lat] 
      : [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat];
    
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: [
              'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors',
            maxzoom: 19,
          },
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 22,
          },
        ],
      },
      center,
      zoom: position ? 16 : MAP_CONFIG.initialZoom,
      ...MAP_CONFIG
    });

    // Add controls
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 100 }), 'bottom-left');

    // Click to select location
    map.on('click', handleMapClick);
    
    // Right-click context menu
    if (enableContextMenu) {
      map.on('contextmenu', handleContextMenu);
    }

    mapInstanceRef.current = map;

    return () => {
      map.off('click', handleMapClick);
      map.off('contextmenu', handleContextMenu);
      map.remove();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle map click
  const handleMapClick = useCallback((e) => {
    const { lng, lat } = e.lngLat;
    updatePosition({ lat, lng });
    
    // Close context menu if open
    setContextMenu(null);
  }, []);

  // Handle right-click context menu
  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    const { lng, lat } = e.lngLat;
    const { x, y } = e.point;
    
    setContextMenu({
      x,
      y,
      lngLat: { lng, lat }
    });
  }, []);

  // Update position and marker
  const updatePosition = useCallback((newPos, placeName = null) => {
    setPosition(newPos);
    
    const map = mapInstanceRef.current;
    if (!map) return;

    // Fly to position
    map.flyTo({ 
      center: [newPos.lng, newPos.lat], 
      zoom: 16,
      duration: 1500
    });

    // Update marker
    if (markerRef.current) markerRef.current.remove();
    markerRef.current = new maplibregl.Marker({ color: '#e74c3c' })
      .setLngLat([newPos.lng, newPos.lat])
      .addTo(map);

    // Notify parent
    if (onLocationSelect) {
      onLocationSelect(newPos, placeName);
    }

    // Get place name if not provided
    if (!placeName) {
      reverseGeocode(newPos.lat, newPos.lng).then(place => {
        if (place) {
          addSearch({
            lat: newPos.lat,
            lon: newPos.lng,
            display_name: place
          });
        }
      });
    }
  }, [onLocationSelect, reverseGeocode, addSearch]);

  // Handle user location
  const handleGetCurrentLocation = useCallback(async () => {
    const pos = await getCurrentPosition();
    if (pos) {
      updatePosition(pos);
      toast.success('📍 Location found!');
    } else if (locationError) {
      toast.error(locationError);
    }
  }, [getCurrentPosition, updatePosition, locationError]);

  // Search handling
  const handleSearchChange = useCallback((e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    if (value.length >= 3) {
      debouncedSearch(value);
      setShowResults(true);
    } else {
      setShowResults(false);
    }
  }, [debouncedSearch]);

  // Select search result
  const selectSearchResult = useCallback((result) => {
    const newPos = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon)
    };
    
    const placeName = result.display_name?.split(',')[0] || 'Selected location';
    setSearchQuery(placeName);
    setShowResults(false);
    
    // Add to recent searches
    addSearch(result);
    
    // Update position
    updatePosition(newPos, result.display_name);
  }, [addSearch, updatePosition]);

  // Copy coordinates
  const copyCoordinates = useCallback(() => {
    if (!position) return;
    
    const coords = `${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`;
    navigator.clipboard.writeText(coords);
    setCopied(true);
    toast.success('Coordinates copied!');
    
    setTimeout(() => setCopied(false), 2000);
  }, [position]);

  // Keyboard shortcuts
  const shortcutHandlers = {
    onFocusSearch: () => searchInputRef.current?.focus(),
    onZoomIn: () => mapInstanceRef.current?.zoomIn(),
    onZoomOut: () => mapInstanceRef.current?.zoomOut(),
    onResetNorth: () => mapInstanceRef.current?.resetNorth(),
    onToggleFullscreen: () => {
      const container = mapContainerRef.current?.parentElement;
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        container?.requestFullscreen();
      }
    }
  };

  useKeyboardShortcuts(shortcutHandlers);

  // Context menu actions
  const handleContextMenuAction = useCallback((action) => {
    if (!contextMenu) return;
    
    const { lngLat } = contextMenu;
    
    switch (action) {
      case 'select':
        updatePosition({ lat: lngLat.lat, lng: lngLat.lng });
        break;
      case 'copy':
        const coords = `${lngLat.lat.toFixed(6)}, ${lngLat.lng.toFixed(6)}`;
        navigator.clipboard.writeText(coords);
        toast.success('Coordinates copied!');
        break;
      default:
        break;
    }
    
    setContextMenu(null);
  }, [contextMenu, updatePosition]);

  // Display results (recent or search)
  const displayResults = showResults && results.length > 0 
    ? results 
    : (showResults && searchQuery.length < 3 && recentSearches.length > 0 ? recentSearches : []);
  const isShowingRecent = showResults && searchQuery.length < 3 && recentSearches.length > 0;

  return (
    <div className={`relative ${className}`}>
      {/* Search bar */}
      <div className="relative mb-3">
        <div className="flex gap-2">
          {/* Search input */}
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search for a location... (/ to focus)"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-200 min-h-[44px]"
            />
            {searchLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-primary-200 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {/* GPS button */}
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={locationLoading}
            className="flex items-center gap-2 px-4 py-3 bg-primary-200 text-white rounded-lg hover:bg-primary-100 disabled:opacity-50 min-h-[44px] whitespace-nowrap transition-colors"
            title="Use current location (G)"
          >
            <FaCrosshairs className={locationLoading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">
              {locationLoading ? 'Finding...' : 'Use GPS'}
            </span>
          </button>

          {/* Keyboard shortcuts toggle */}
          {showKeyboardShortcuts && (
            <button
              type="button"
              onClick={() => setShowShortcuts(!showShortcuts)}
              className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 min-h-[44px]"
              title="Keyboard shortcuts"
            >
              <FaKeyboard className="text-gray-600" />
            </button>
          )}
        </div>

        {/* Search results dropdown */}
        {(displayResults.length > 0 || isShowingRecent) && showResults && (
          <div className="absolute z-[1000] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
            {isShowingRecent && (
              <div className="flex justify-between items-center px-4 py-2 bg-gray-50 border-b border-gray-100">
                <span className="text-xs font-medium text-gray-500">Recent Searches</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); clearAll(); }}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Clear all
                </button>
              </div>
            )}
            {displayResults.map((result, index) => (
              <button
                key={result.place_id || index}
                type="button"
                onClick={() => selectSearchResult(result)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 group"
              >
                <div className="flex items-start gap-2">
                  <FaMapMarkerAlt className="text-red-500 mt-1 flex-shrink-0" />
                  <span className="text-sm line-clamp-2 flex-1">
                    {result.display_name}
                  </span>
                  {isShowingRecent && (
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        removeSearch(result.place_id || index); 
                      }}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-1"
                    >
                      <FaTimes className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="relative h-[300px] sm:h-[400px] rounded-lg overflow-hidden border border-gray-300 shadow-sm">
        <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />

        {/* Center pin hint when no position selected */}
        {!position && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1]">
            <div className="text-center bg-white/90 px-4 py-2 rounded-lg shadow-md">
              <FaMapMarkerAlt className="text-red-500 text-2xl mx-auto mb-1" />
              <p className="text-sm text-gray-700 font-medium">Tap to select delivery location</p>
            </div>
          </div>
        )}

        {/* Context menu */}
        {contextMenu && (
          <div 
            className="absolute z-[1001] bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => handleContextMenuAction('select')}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-2"
            >
              <FaMapMarkerAlt className="text-red-500" />
              Select this location
            </button>
            <button
              onClick={() => handleContextMenuAction('copy')}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-2"
            >
              <FaCopy className="text-blue-500" />
              Copy coordinates
            </button>
            <div className="border-t border-gray-100 my-1"></div>
            <div className="px-4 py-2 text-xs text-gray-500">
              {contextMenu.lngLat.lat.toFixed(6)}, {contextMenu.lngLat.lng.toFixed(6)}
            </div>
          </div>
        )}

        {/* Coordinates panel */}
        {showCoordinates && position && (
          <div className="absolute bottom-2 left-2 z-10 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md border border-gray-200">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span className="font-mono">
                {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
              </span>
              <button
                onClick={copyCoordinates}
                className="p-1 hover:bg-gray-100 rounded"
                title="Copy coordinates"
              >
                {copied ? (
                  <FaCheck className="w-3 h-3 text-green-500" />
                ) : (
                  <FaCopy className="w-3 h-3 text-gray-400" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Accuracy indicator */}
        {accuracy && accuracy < 100 && (
          <div className="absolute top-2 left-2 z-10 bg-green-500/90 text-white text-xs px-2 py-1 rounded-full">
            ±{Math.round(accuracy)}m
          </div>
        )}
      </div>

      {/* Selected location info */}
      {position && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-2">
            <FaMapMarkerAlt className="text-green-600 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">📍 Location Selected</p>
              <p className="text-xs text-green-700 mt-1">
                Coordinates: {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
              </p>
            </div>
            <button
              onClick={copyCoordinates}
              className="p-2 hover:bg-green-100 rounded-lg transition-colors"
              title="Copy coordinates"
            >
              {copied ? (
                <FaCheck className="w-4 h-4 text-green-600" />
              ) : (
                <FaCopy className="w-4 h-4 text-green-600" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Keyboard shortcuts modal */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowShortcuts(false)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">Keyboard Shortcuts</h3>
              <button onClick={() => setShowShortcuts(false)} className="p-1 hover:bg-gray-100 rounded">
                <FaTimes />
              </button>
            </div>
            <div className="space-y-2">
              {Object.entries(KEYBOARD_SHORTCUTS).map(([action, keys]) => (
                <div key={action} className="flex justify-between items-center py-1">
                  <span className="text-sm text-gray-600 capitalize">
                    {action.replace(/_/g, ' ')}
                  </span>
                  <div className="flex gap-1">
                    {keys.map((key, i) => (
                      <kbd key={i} className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationPickerEnhanced;
