import React, { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { FaMapMarkerAlt, FaCrosshairs, FaSearch } from 'react-icons/fa';
import toast from 'react-hot-toast';

const NAIROBI = { lat: -1.286389, lng: 36.817223 };
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

const LocationPicker = ({ onLocationSelect, initialPosition = null, className = "" }) => {
  const [position, setPosition] = useState(initialPosition);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const searchTimeout = useRef(null);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  // Initialise MapLibre once the container div mounts
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;
    const center = position || NAIROBI;
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE,
      center: [center.lng, center.lat],
      zoom: position ? 16 : 13,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      const newPos = { lat, lng };
      setPosition(newPos);
      if (onLocationSelect) onLocationSelect(newPos);

      // Replace marker
      if (markerRef.current) markerRef.current.remove();
      markerRef.current = new maplibregl.Marker({ color: '#e74c3c' })
        .setLngLat([lng, lat])
        .addTo(map);
    });

    mapInstanceRef.current = map;
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fly to position and update marker whenever position changes externally
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !position) return;

    map.flyTo({ center: [position.lng, position.lat], zoom: 16 });

    if (markerRef.current) markerRef.current.remove();
    markerRef.current = new maplibregl.Marker({ color: '#e74c3c' })
      .setLngLat([position.lng, position.lat])
      .addTo(map);
  }, [position]);

  // Get current location
  const getCurrentLocation = () => {
    setLoading(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPos = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          };
          setPosition(newPos);
          if (onLocationSelect) {
            onLocationSelect(newPos);
          }
          setLoading(false);
          toast.success('Location found!');
        },
        (error) => {
          console.error("Error getting location:", error);
          toast.error('Could not get your location. Please select manually.');
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      toast.error('Geolocation is not supported by your browser');
      setLoading(false);
    }
  };

  // Search for location using Nominatim (OpenStreetMap)
  const searchLocation = async (query) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Kenya')}&limit=5`
      );
      const data = await response.json();
      setSearchResults(data);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  // Debounced search
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    searchTimeout.current = setTimeout(() => {
      searchLocation(value);
    }, 500);
  };

  // Select a search result
  const selectSearchResult = (result) => {
    const newPos = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon)
    };
    setPosition(newPos);
    setSearchQuery(result.display_name.split(',')[0]);
    setShowResults(false);
    if (onLocationSelect) {
      onLocationSelect(newPos, result.display_name);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search bar */}
      <div className="relative mb-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search for a location..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => setShowResults(searchResults.length > 0)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-200 min-h-[44px]"
            />
          </div>
          <button
            type="button"
            onClick={getCurrentLocation}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-3 bg-primary-200 text-white rounded-lg hover:bg-primary-100 disabled:opacity-50 min-h-[44px] whitespace-nowrap"
          >
            <FaCrosshairs className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{loading ? 'Finding...' : 'Use GPS'}</span>
          </button>
        </div>
        
        {/* Search results dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-[1000] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
            {searchResults.map((result, index) => (
              <button
                key={index}
                type="button"
                onClick={() => selectSearchResult(result)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-start gap-2">
                  <FaMapMarkerAlt className="text-red-500 mt-1 flex-shrink-0" />
                  <span className="text-sm line-clamp-2">{result.display_name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="relative h-[300px] sm:h-[350px] rounded-lg overflow-hidden border border-gray-300 shadow-sm">
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
      </div>

      {/* Selected location info */}
      {position && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-2">
            <FaMapMarkerAlt className="text-green-600 mt-1 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-800">📍 Location Selected</p>
              <p className="text-xs text-green-700 mt-1">
                Coordinates: {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationPicker;
