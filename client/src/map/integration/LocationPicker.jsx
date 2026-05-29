/**
 * LocationPicker - Order address selection map
 * Phase 7: Integration
 * 
 * Interactive map for customers to select/confirm delivery address.
 * Used in checkout flow.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// Core
import MapContainer, { useMap } from '../core/MapContainer';
import { DEFAULT_CENTER } from '../core/constants';

// Search
import SearchBox from '../search/SearchBox';
import { useGeocoding } from '../search/useGeocoding';

// Location
import { useUserLocation } from '../location/useUserLocation';

// UI
import CoordinatesPanel from '../ui/CoordinatesPanel';

// Styles
import ThemeToggle from '../styles/ThemeToggle';

/**
 * Draggable pin marker
 */
const DraggablePin = ({ 
  map, 
  position, 
  onDragEnd,
  isDragging,
  setIsDragging,
}) => {
  const markerRef = useRef(null);
  
  useEffect(() => {
    if (!map || !position) return;
    
    const el = document.createElement('div');
    el.className = `location-pin ${isDragging ? 'dragging' : ''}`;
    el.innerHTML = `
      <div class="pin-shadow"></div>
      <div class="pin-body">
        <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
    `;
    
    const marker = new maplibregl.Marker({
      element: el,
      draggable: true,
      anchor: 'bottom',
    })
      .setLngLat([position.lng, position.lat])
      .addTo(map);
    
    marker.on('dragstart', () => setIsDragging(true));
    marker.on('dragend', () => {
      setIsDragging(false);
      const lngLat = marker.getLngLat();
      onDragEnd({ lat: lngLat.lat, lng: lngLat.lng });
    });
    
    markerRef.current = marker;
    
    return () => marker.remove();
  }, [map, position?.lat, position?.lng]);
  
  // Update position when it changes externally
  useEffect(() => {
    if (markerRef.current && position) {
      markerRef.current.setLngLat([position.lng, position.lat]);
    }
  }, [position]);
  
  return null;
};

/**
 * Address display card
 */
const AddressCard = ({ 
  address, 
  isLoading, 
  onConfirm,
  onEdit,
  apartmentNumber,
  onApartmentChange,
  deliveryNotes,
  onNotesChange,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
          <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-800 dark:text-white mb-1">
            Delivery Location
          </div>
          
          {isLoading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              <span className="text-sm">Finding address...</span>
            </div>
          ) : address ? (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {address}
            </p>
          ) : (
            <p className="text-sm text-gray-400">
              Drag pin or search to select location
            </p>
          )}
        </div>
        
        {address && (
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        )}
      </div>
      
      {/* Additional details */}
      {address && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Apartment / Suite (optional)
            </label>
            <input
              type="text"
              value={apartmentNumber}
              onChange={(e) => onApartmentChange(e.target.value)}
              placeholder="Apt 4B, Floor 2, etc."
              className="w-full px-3 py-2 text-sm border dark:border-gray-600 rounded-lg 
                       dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Delivery notes (optional)
            </label>
            <textarea
              value={deliveryNotes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Gate code, landmarks, instructions..."
              rows={2}
              className="w-full px-3 py-2 text-sm border dark:border-gray-600 rounded-lg 
                       dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>
          
          <button
            onClick={onConfirm}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-medium 
                     rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Confirm Location
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Map content
 */
const LocationPickerContent = ({
  onLocationSelect,
  onConfirm,
  initialLocation,
  deliveryZone,
}) => {
  const { map } = useMap();
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [address, setAddress] = useState('');
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [apartmentNumber, setApartmentNumber] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [isOutOfZone, setIsOutOfZone] = useState(false);
  
  // User location
  const userLocation = useUserLocation({
    enableHighAccuracy: true,
    timeout: 10000,
  });
  
  // Geocoding
  const geocoding = useGeocoding();
  
  // Reverse geocode location
  const reverseGeocode = useCallback(async (location) => {
    if (!location) return;
    
    setIsLoadingAddress(true);
    try {
      const result = await geocoding.reverseGeocode(location.lat, location.lng);
      if (result) {
        setAddress(result.displayName);
      }
    } catch (error) {
      console.error('Reverse geocode error:', error);
    } finally {
      setIsLoadingAddress(false);
    }
  }, [geocoding]);
  
  // Handle pin drag
  const handlePinDrag = useCallback((location) => {
    setSelectedLocation(location);
    onLocationSelect?.(location);
    reverseGeocode(location);
    
    // Check if in delivery zone
    // TODO: Implement zone check
    setIsOutOfZone(false);
  }, [onLocationSelect, reverseGeocode]);
  
  // Handle search result select
  const handleSearchSelect = useCallback((result) => {
    const location = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lng),
    };
    
    setSelectedLocation(location);
    setAddress(result.displayName);
    onLocationSelect?.(location);
    
    map?.flyTo({
      center: [location.lng, location.lat],
      zoom: 17,
      duration: 1000,
    });
  }, [map, onLocationSelect]);
  
  // Handle use my location
  const handleUseMyLocation = useCallback(() => {
    if (userLocation.position) {
      const location = {
        lat: userLocation.position.lat,
        lng: userLocation.position.lng,
      };
      
      setSelectedLocation(location);
      onLocationSelect?.(location);
      reverseGeocode(location);
      
      map?.flyTo({
        center: [location.lng, location.lat],
        zoom: 17,
        duration: 1000,
      });
    }
  }, [userLocation.position, map, onLocationSelect, reverseGeocode]);
  
  // Handle confirm
  const handleConfirm = useCallback(() => {
    if (selectedLocation && address) {
      onConfirm?.({
        location: selectedLocation,
        address,
        apartmentNumber,
        deliveryNotes,
      });
    }
  }, [selectedLocation, address, apartmentNumber, deliveryNotes, onConfirm]);
  
  // Center on user location or default
  useEffect(() => {
    if (!map) return;
    
    if (initialLocation) {
      map.flyTo({
        center: [initialLocation.lng, initialLocation.lat],
        zoom: 17,
      });
      setSelectedLocation(initialLocation);
      reverseGeocode(initialLocation);
    } else if (userLocation.position && !selectedLocation) {
      handleUseMyLocation();
    }
  }, [map, initialLocation, userLocation.position]);
  
  // Map click to move pin
  useEffect(() => {
    if (!map) return;
    
    const handleClick = (e) => {
      const location = {
        lat: e.lngLat.lat,
        lng: e.lngLat.lng,
      };
      handlePinDrag(location);
    };
    
    map.on('click', handleClick);
    return () => map.off('click', handleClick);
  }, [map, handlePinDrag]);
  
  return (
    <>
      {/* Pin marker */}
      {selectedLocation && (
        <DraggablePin
          map={map}
          position={selectedLocation}
          onDragEnd={handlePinDrag}
          isDragging={isDragging}
          setIsDragging={setIsDragging}
        />
      )}
      
      {/* Search box */}
      <div className="absolute top-4 left-4 right-4 z-20 max-w-md mx-auto">
        <SearchBox
          onSelect={handleSearchSelect}
          placeholder="Search for address..."
          className="shadow-lg"
        />
      </div>
      
      {/* My location button */}
      <div className="absolute top-20 right-4 z-10">
        <button
          onClick={handleUseMyLocation}
          disabled={!userLocation.position || userLocation.isLoading}
          className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg 
                   hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed"
          title="Use my location"
        >
          {userLocation.isLoading ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
            </svg>
          )}
        </button>
      </div>
      
      {/* Theme toggle */}
      <div className="absolute top-32 right-4 z-10">
        <ThemeToggle />
      </div>
      
      {/* Out of zone warning */}
      {isOutOfZone && (
        <div className="absolute top-4 left-4 right-4 z-30 max-w-md mx-auto">
          <div className="bg-amber-50 dark:bg-amber-900/50 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/>
              </svg>
              <span className="text-sm font-medium">
                This location may be outside our delivery zone
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* Address card */}
      <div className="absolute bottom-4 left-4 right-4 z-20 max-w-md mx-auto">
        <AddressCard
          address={address}
          isLoading={isLoadingAddress}
          onConfirm={handleConfirm}
          onEdit={() => {}}
          apartmentNumber={apartmentNumber}
          onApartmentChange={setApartmentNumber}
          deliveryNotes={deliveryNotes}
          onNotesChange={setDeliveryNotes}
        />
      </div>
      
      {/* Coordinates (debug) */}
      <div className="absolute bottom-4 right-4 z-10 hidden md:block">
        <CoordinatesPanel map={map} />
      </div>
      
      {/* Center crosshair when dragging */}
      {isDragging && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0">
          <div className="w-8 h-8 border-2 border-green-500 rounded-full opacity-50" />
        </div>
      )}
      
      {/* Inject styles */}
      <style>{`
        .location-pin {
          cursor: grab;
          transition: transform 0.2s ease;
        }
        
        .location-pin.dragging {
          cursor: grabbing;
        }
        
        .location-pin.dragging .pin-body {
          transform: translateY(-10px) scale(1.1);
        }
        
        .location-pin.dragging .pin-shadow {
          transform: scale(0.8);
          opacity: 0.3;
        }
        
        .location-pin .pin-body {
          color: #22c55e;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
          transition: transform 0.2s ease;
        }
        
        .location-pin .pin-shadow {
          position: absolute;
          bottom: -4px;
          left: 50%;
          transform: translateX(-50%);
          width: 12px;
          height: 4px;
          background: rgba(0,0,0,0.2);
          border-radius: 50%;
          transition: all 0.2s ease;
        }
      `}</style>
    </>
  );
};

/**
 * LocationPicker component
 */
export const LocationPicker = ({
  onLocationSelect,
  onConfirm,
  initialLocation,
  deliveryZone,
  initialCenter,
  initialZoom = 15,
  className = '',
  style = {},
}) => {
  const center = initialLocation || initialCenter || DEFAULT_CENTER;
  
  return (
    <div className={`relative w-full h-full min-h-[400px] ${className}`} style={style}>
      <MapContainer
        initialCenter={center}
        initialZoom={initialZoom}
        styleKey="bright"
        className="w-full h-full rounded-lg overflow-hidden"
      >
        <LocationPickerContent
          onLocationSelect={onLocationSelect}
          onConfirm={onConfirm}
          initialLocation={initialLocation}
          deliveryZone={deliveryZone}
        />
      </MapContainer>
    </div>
  );
};

/**
 * Compact location display with edit button
 */
export const LocationDisplay = ({ 
  location, 
  address, 
  onEdit,
  compact = false,
}) => {
  if (!location) return null;
  
  if (compact) {
    return (
      <button
        onClick={onEdit}
        className="flex items-center gap-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors"
      >
        <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-full">
          <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-800 dark:text-white truncate">
            {address || 'Selected location'}
          </div>
        </div>
        <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
    );
  }
  
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
        <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-800 dark:text-white">
          Delivery Address
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          {address || `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`}
        </p>
      </div>
      {onEdit && (
        <button
          onClick={onEdit}
          className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default LocationPicker;
