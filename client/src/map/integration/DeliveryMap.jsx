/**
 * DeliveryMap - Full-featured delivery tracking map
 * Phase 7: Integration
 * 
 * Combines all map features into an integrated delivery experience.
 * Used for customer delivery tracking page.
 */

import React, { useState, useCallback, useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// Core
import MapContainer, { useMap } from '../core/MapContainer';
import { DEFAULT_CENTER } from '../core/constants';

// UI
import CoordinatesPanel from '../ui/CoordinatesPanel';

// Styles
import ThemeToggle from '../styles/ThemeToggle';

// Delivery tracking
import { useDeliveryTracking, DRIVER_STATUS } from '../delivery/useDeliveryTracking';
import { DriverMarker, DestinationMarker } from '../delivery/DriverMarker';
import { DeliveryRoute } from '../delivery/DeliveryRoute';
import { TrackingPanel, TrackingBar, ETADisplay } from '../delivery/TrackingPanel';

// PWA
import { useURLState } from '../pwa/useURLState';
import { useShareLocation } from '../pwa/useShareLocation';
import { OfflineIndicator } from '../pwa/OfflineTileManager';

/**
 * Share button
 */
const ShareButton = ({ map }) => {
  const shareLocation = useShareLocation(map);
  const [copied, setCopied] = useState(false);
  
  const handleShare = async () => {
    const result = await shareLocation.shareView({
      title: 'Track my delivery',
      text: 'Follow along as my order arrives!',
    });
    
    if (result.success && !shareLocation.canShare) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  return (
    <button
      onClick={handleShare}
      disabled={shareLocation.isSharing}
      className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      title="Share tracking link"
    >
      {copied ? (
        <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      )}
    </button>
  );
};

/**
 * Map controls overlay
 */
const MapControls = ({ map }) => {
  return (
    <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
      <ShareButton map={map} />
      <ThemeToggle />
      <OfflineIndicator />
    </div>
  );
};

/**
 * Map content with delivery tracking
 */
const DeliveryMapContent = ({
  orderId,
  destination,
  onETAUpdate,
  showPanel = true,
  showBar = true,
  panelPosition = 'left',
}) => {
  const { map } = useMap();
  
  // URL state sync
  useURLState(map, {
    enabled: true,
    debounceMs: 1000,
  });
  
  // Delivery tracking
  const delivery = useDeliveryTracking(orderId, {
    autoConnect: true,
  });
  const activeDriverLocation = delivery.displayLocation || delivery.driverLocation;
  const deliveryDestination = delivery.deliveryLocation || destination;
  
  // Center on driver when location updates
  useEffect(() => {
    if (map && activeDriverLocation) {
      // Only auto-center if user hasn't interacted
      // You could add a "follow driver" toggle
    }
  }, [map, activeDriverLocation]);
  
  // Notify parent of ETA updates
  useEffect(() => {
    if (onETAUpdate && delivery.eta) {
      onETAUpdate(delivery.eta);
    }
  }, [delivery.eta, onETAUpdate]);
  
  // Fit bounds to show route
  const fitToRoute = useCallback(() => {
    if (!map || !activeDriverLocation || !deliveryDestination) return;
    
    const bounds = new maplibregl.LngLatBounds()
      .extend([activeDriverLocation.lng, activeDriverLocation.lat])
      .extend([deliveryDestination.lng, deliveryDestination.lat]);
    
    map.fitBounds(bounds, {
      padding: {
        top: 100,
        bottom: 100,
        left: showPanel && panelPosition === 'left' ? 400 : 50,
        right: showPanel && panelPosition === 'right' ? 400 : 50,
      },
      duration: 1000,
    });
  }, [map, activeDriverLocation, deliveryDestination, showPanel, panelPosition]);
  
  return (
    <>
      {/* Map layers */}
      {activeDriverLocation && (
        <>
          <DriverMarker 
            map={map}
            location={activeDriverLocation}
            heading={activeDriverLocation.heading || 0}
            style={delivery.status === DRIVER_STATUS.ARRIVING ? 'arriving' : 'default'}
            driverInfo={delivery.driverInfo}
          />
          
          <DeliveryRoute
            map={map}
            driverLocation={delivery.driverLocation || activeDriverLocation}
            pickupLocation={delivery.pickupLocation}
            deliveryLocation={deliveryDestination}
          />
        </>
      )}
      
      {deliveryDestination && (
        <DestinationMarker 
          map={map}
          location={deliveryDestination}
        />
      )}
      
      {/* Controls */}
      <MapControls map={map} />
      
      {/* Coordinates (debug) */}
      <div className="absolute bottom-4 right-4 z-10">
        <CoordinatesPanel map={map} />
      </div>
      
      {/* Tracking bar (mobile) */}
      {showBar && (
        <div className="absolute bottom-0 left-0 right-0 z-20 md:hidden">
          <TrackingBar
            status={delivery.status}
            eta={delivery.eta}
            driverInfo={delivery.driverInfo}
            onClick={fitToRoute}
          />
        </div>
      )}
      
      {/* Full panel (desktop) */}
      {showPanel && (
        <div className={`
          absolute top-4 bottom-4 z-20 w-80
          ${panelPosition === 'left' ? 'left-4' : 'right-4'}
          hidden md:block
        `}>
          <TrackingPanel
            orderId={orderId}
            status={delivery.status}
            eta={delivery.eta}
            driverInfo={delivery.driverInfo}
            deliveryAddress={deliveryDestination?.address || deliveryDestination?.fullAddress || (deliveryDestination ? `${deliveryDestination.lat.toFixed(5)}, ${deliveryDestination.lng.toFixed(5)}` : null)}
            pickupAddress={delivery.pickupLocation?.address || delivery.pickupLocation?.fullAddress || (delivery.pickupLocation ? `${delivery.pickupLocation.lat.toFixed(5)}, ${delivery.pickupLocation.lng.toFixed(5)}` : null)}
            isConnected={delivery.isConnected}
            onShareLocation={fitToRoute}
          />
        </div>
      )}
    </>
  );
};

/**
 * Main DeliveryMap component
 */
export const DeliveryMap = ({
  orderId,
  destination,
  initialCenter,
  initialZoom = 14,
  onETAUpdate,
  showPanel = true,
  showBar = true,
  panelPosition = 'left',
  className = '',
  style = {},
}) => {
  const center = initialCenter || destination || DEFAULT_CENTER;
  
  return (
    <div className={`relative w-full h-full ${className}`} style={style}>
      <MapContainer
        initialCenter={center}
        initialZoom={initialZoom}
        styleKey="liberty"
        className="w-full h-full"
      >
        <DeliveryMapContent
          orderId={orderId}
          destination={destination}
          onETAUpdate={onETAUpdate}
          showPanel={showPanel}
          showBar={showBar}
          panelPosition={panelPosition}
        />
      </MapContainer>
    </div>
  );
};

/**
 * Minimal ETA widget for embedding
 */
export const DeliveryETAWidget = ({ orderId, destination }) => {
  const delivery = useDeliveryTracking(orderId, {
    autoConnect: true,
  });
  
  return (
    <ETADisplay
      eta={delivery.eta}
      isArriving={delivery.status === DRIVER_STATUS.ARRIVING}
    />
  );
};

export default DeliveryMap;
