/**
 * StoreLocator - Find nearby stores/pickup points
 * Phase 7: Integration
 * 
 * Displays store locations with clustering and search.
 * Used for store pickup option.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// Core
import MapContainer, { useMap } from '../core/MapContainer';
import { DEFAULT_CENTER } from '../core/constants';

// Search
import SearchBox from '../search/SearchBox';

// Location
import { useUserLocation } from '../location/useUserLocation';

/**
 * Store marker component
 */
const StoreMarker = ({ map, store, isSelected, onSelect }) => {
  useEffect(() => {
    if (!map) return;
    
    const el = document.createElement('div');
    el.className = `store-marker ${isSelected ? 'selected' : ''}`;
    el.innerHTML = `
      <div class="store-icon">
        <svg viewBox="0 0 24 24" fill="white" width="20" height="20">
          <path d="M12 2L2 7l2 3h1v9h14v-9h1l2-3L12 2zm0 2.84L17.36 8H6.64L12 4.84zM17 18H7v-7h10v7zm-8-5h2v4H9v-4zm4 0h2v4h-2v-4z"/>
        </svg>
      </div>
      ${store.isOpen !== false ? '<div class="store-open-badge"></div>' : ''}
    `;
    
    const popup = new maplibregl.Popup({
      offset: 25,
      closeButton: false,
    }).setHTML(`
      <div class="store-popup">
        <div class="font-semibold text-gray-800">${store.name}</div>
        <div class="text-sm text-gray-600 mt-1">${store.address}</div>
        ${store.distance ? `<div class="text-sm text-green-600 mt-1">${store.distance}</div>` : ''}
        ${store.hours ? `<div class="text-xs text-gray-500 mt-2">${store.hours}</div>` : ''}
      </div>
    `);
    
    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([store.location.lng, store.location.lat])
      .setPopup(popup)
      .addTo(map);
    
    el.addEventListener('click', () => onSelect(store));
    
    return () => marker.remove();
  }, [map, store, isSelected, onSelect]);
  
  return null;
};

/**
 * User location marker
 */
const UserMarker = ({ map, position }) => {
  useEffect(() => {
    if (!map || !position) return;
    
    const el = document.createElement('div');
    el.className = 'user-marker';
    el.innerHTML = `
      <div class="user-pulse"></div>
      <div class="user-dot"></div>
    `;
    
    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([position.lng, position.lat])
      .addTo(map);
    
    return () => marker.remove();
  }, [map, position]);
  
  return null;
};

/**
 * Store list sidebar
 */
const StoreList = ({ 
  stores, 
  selectedStore, 
  onSelect, 
  onSelectForPickup,
  userLocation,
}) => {
  // Sort stores by distance if user location available
  const sortedStores = useMemo(() => {
    if (!userLocation) return stores;
    
    return [...stores].sort((a, b) => {
      const distA = calculateDistance(userLocation, a.location);
      const distB = calculateDistance(userLocation, b.location);
      return distA - distB;
    });
  }, [stores, userLocation]);
  
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-3 border-b dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-10">
        <h3 className="font-semibold text-gray-800 dark:text-white">
          {stores.length} Store{stores.length !== 1 ? 's' : ''} Found
        </h3>
      </div>
      
      <div className="divide-y dark:divide-gray-700">
        {sortedStores.map((store) => (
          <StoreListItem
            key={store.id}
            store={store}
            isSelected={selectedStore?.id === store.id}
            onSelect={onSelect}
            onSelectForPickup={onSelectForPickup}
            userLocation={userLocation}
          />
        ))}
        
        {stores.length === 0 && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l2 3h1v9h14v-9h1l2-3L12 2z"/>
            </svg>
            <p>No stores found in this area</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Store list item
 */
const StoreListItem = ({ 
  store, 
  isSelected, 
  onSelect, 
  onSelectForPickup,
  userLocation,
}) => {
  const distance = userLocation 
    ? formatDistance(calculateDistance(userLocation, store.location))
    : null;
  
  return (
    <div 
      className={`
        p-4 cursor-pointer transition-colors
        ${isSelected 
          ? 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500' 
          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
        }
      `}
      onClick={() => onSelect(store)}
    >
      <div className="flex items-start gap-3">
        <div className={`
          p-2 rounded-lg
          ${store.isOpen !== false 
            ? 'bg-green-100 dark:bg-green-900/30' 
            : 'bg-gray-100 dark:bg-gray-800'
          }
        `}>
          <svg 
            className={`w-5 h-5 ${store.isOpen !== false ? 'text-green-600' : 'text-gray-500'}`}
            viewBox="0 0 24 24" 
            fill="currentColor"
          >
            <path d="M12 2L2 7l2 3h1v9h14v-9h1l2-3L12 2z"/>
          </svg>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-800 dark:text-white truncate">
              {store.name}
            </h4>
            {store.isOpen !== false ? (
              <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded">
                Open
              </span>
            ) : (
              <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded">
                Closed
              </span>
            )}
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
            {store.address}
          </p>
          
          <div className="flex items-center gap-3 mt-2">
            {distance && (
              <span className="text-sm text-green-600 dark:text-green-400">
                {distance}
              </span>
            )}
            {store.hours && (
              <span className="text-xs text-gray-500">
                {store.hours}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {isSelected && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectForPickup(store);
            }}
            className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Select for Pickup
          </button>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${store.location.lat},${store.location.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="px-3 py-2 border dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Directions
          </a>
        </div>
      )}
    </div>
  );
};

/**
 * Calculate distance between two points (in km)
 */
function calculateDistance(from, to) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(to.lat - from.lat);
  const dLon = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  
  const a = Math.sin(dLat / 2) ** 2 + 
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

function formatDistance(km) {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

/**
 * Map content
 */
const StoreLocatorContent = ({
  stores = [],
  selectedStore,
  onSelectStore,
  onSelectForPickup,
  showSearch = true,
}) => {
  const { map } = useMap();
  
  // User location
  const userLocation = useUserLocation({
    enableHighAccuracy: true,
    timeout: 10000,
  });
  
  // Center on selected store
  const handleSelectStore = useCallback((store) => {
    onSelectStore(store);
    
    map?.flyTo({
      center: [store.location.lng, store.location.lat],
      zoom: 16,
      duration: 1000,
    });
  }, [map, onSelectStore]);
  
  // Center on user location
  const centerOnUser = useCallback(() => {
    if (userLocation.position && map) {
      map.flyTo({
        center: [userLocation.position.lng, userLocation.position.lat],
        zoom: 14,
        duration: 1000,
      });
    }
  }, [map, userLocation.position]);
  
  // Fit all stores in view
  const fitAllStores = useCallback(() => {
    if (!map || stores.length === 0) return;
    
    const bounds = new maplibregl.LngLatBounds();
    
    stores.forEach(store => {
      bounds.extend([store.location.lng, store.location.lat]);
    });
    
    if (userLocation.position) {
      bounds.extend([userLocation.position.lng, userLocation.position.lat]);
    }
    
    map.fitBounds(bounds, {
      padding: { top: 50, bottom: 50, left: 350, right: 50 },
      maxZoom: 14,
    });
  }, [map, stores, userLocation.position]);
  
  return (
    <>
      {/* Store markers */}
      {stores.map(store => (
        <StoreMarker
          key={store.id}
          map={map}
          store={store}
          isSelected={selectedStore?.id === store.id}
          onSelect={handleSelectStore}
        />
      ))}
      
      {/* User location marker */}
      {userLocation.position && (
        <UserMarker map={map} position={userLocation.position} />
      )}
      
      {/* Search (if enabled) */}
      {showSearch && (
        <div className="absolute top-4 left-80 right-4 z-20 max-w-md">
          <SearchBox
            placeholder="Search by city or address..."
            className="shadow-lg"
            onSelect={(result) => {
              map?.flyTo({
                center: [parseFloat(result.lng), parseFloat(result.lat)],
                zoom: 13,
                duration: 1000,
              });
            }}
          />
        </div>
      )}
      
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={centerOnUser}
          disabled={!userLocation.position || userLocation.isLoading}
          className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg 
                   hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed"
          title="My location"
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
        
        <button
          onClick={fitAllStores}
          disabled={stores.length === 0}
          className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg 
                   hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                   disabled:opacity-50"
          title="Show all stores"
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M15 3h6m0 0v6m0-6l-7 7M9 21H3m0 0v-6m0 6l7-7" />
          </svg>
        </button>
      </div>
      
      {/* Store list sidebar */}
      <div className="absolute top-4 left-4 bottom-4 w-72 bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden z-10">
        <StoreList
          stores={stores}
          selectedStore={selectedStore}
          onSelect={handleSelectStore}
          onSelectForPickup={onSelectForPickup}
          userLocation={userLocation.position}
        />
      </div>
      
      {/* Inject styles */}
      <style>{`
        .store-marker {
          cursor: pointer;
          transition: transform 0.2s ease;
        }
        
        .store-marker:hover,
        .store-marker.selected {
          transform: scale(1.1);
          z-index: 10;
        }
        
        .store-marker .store-icon {
          width: 36px;
          height: 36px;
          background: #22c55e;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        
        .store-marker.selected .store-icon {
          background: #16a34a;
          box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.3);
        }
        
        .store-marker .store-open-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          width: 10px;
          height: 10px;
          background: #22c55e;
          border: 2px solid white;
          border-radius: 50%;
        }
        
        .user-marker {
          position: relative;
        }
        
        .user-marker .user-dot {
          width: 16px;
          height: 16px;
          background: #3b82f6;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        
        .user-marker .user-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 40px;
          height: 40px;
          background: rgba(59, 130, 246, 0.2);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% {
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 0;
          }
        }
        
        .store-popup {
          padding: 8px 4px;
          min-width: 160px;
        }
      `}</style>
    </>
  );
};

/**
 * StoreLocator component
 */
export const StoreLocator = ({
  stores = [],
  onSelectStore,
  onSelectForPickup,
  initialCenter,
  initialZoom = 12,
  showSearch = true,
  className = '',
  style = {},
}) => {
  const [selectedStore, setSelectedStore] = useState(null);
  
  const handleSelectStore = useCallback((store) => {
    setSelectedStore(store);
    onSelectStore?.(store);
  }, [onSelectStore]);
  
  const handleSelectForPickup = useCallback((store) => {
    onSelectForPickup?.(store);
  }, [onSelectForPickup]);
  
  const center = initialCenter || (stores.length > 0 ? stores[0].location : DEFAULT_CENTER);
  
  return (
    <div className={`relative w-full h-full min-h-[500px] ${className}`} style={style}>
      <MapContainer
        initialCenter={center}
        initialZoom={initialZoom}
        styleKey="bright"
        className="w-full h-full"
      >
        <StoreLocatorContent
          stores={stores}
          selectedStore={selectedStore}
          onSelectStore={handleSelectStore}
          onSelectForPickup={handleSelectForPickup}
          showSearch={showSearch}
        />
      </MapContainer>
    </div>
  );
};

/**
 * Mini store locator for checkout
 */
export const StoreLocatorMini = ({
  stores = [],
  selectedStore,
  onSelectStore,
  className = '',
}) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 overflow-hidden ${className}`}>
      <div className="p-3 border-b dark:border-gray-700">
        <h3 className="font-semibold text-gray-800 dark:text-white">
          Select Pickup Location
        </h3>
      </div>
      
      <div className="max-h-64 overflow-y-auto">
        {stores.map((store) => (
          <button
            key={store.id}
            onClick={() => onSelectStore(store)}
            className={`
              w-full text-left p-3 border-b dark:border-gray-700 last:border-b-0
              transition-colors
              ${selectedStore?.id === store.id 
                ? 'bg-green-50 dark:bg-green-900/20' 
                : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }
            `}
          >
            <div className="flex items-center gap-3">
              <div className={`
                w-4 h-4 rounded-full border-2 flex items-center justify-center
                ${selectedStore?.id === store.id 
                  ? 'border-green-500 bg-green-500' 
                  : 'border-gray-300 dark:border-gray-600'
                }
              `}>
                {selectedStore?.id === store.id && (
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-800 dark:text-white">
                  {store.name}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {store.address}
                </div>
              </div>
              
              {store.isOpen !== false && (
                <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded">
                  Open
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StoreLocator;
