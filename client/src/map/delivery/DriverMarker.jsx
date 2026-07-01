/**
 * DriverMarker - Animated driver marker with heading/rotation
 * Shows driver location with smooth animations and vehicle icon
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import maplibregl from 'maplibre-gl';

// Vehicle icons by type
const VEHICLE_ICONS = {
  car: '🚗',
  motorcycle: '🏍️',
  bicycle: '🚴',
  scooter: '🛵',
  van: '🚐',
  truck: '🚚',
  walking: '🚶',
};

// Driver marker styles
const MARKER_STYLES = {
  default: {
    size: 44,
    pulseSize: 60,
    backgroundColor: '#4285F4',
    borderColor: '#ffffff',
    borderWidth: 3,
    shadowColor: 'rgba(66, 133, 244, 0.4)',
  },
  arriving: {
    size: 48,
    pulseSize: 70,
    backgroundColor: '#34A853',
    borderColor: '#ffffff',
    borderWidth: 3,
    shadowColor: 'rgba(52, 168, 83, 0.4)',
  },
  delayed: {
    size: 44,
    pulseSize: 60,
    backgroundColor: '#F59E0B',
    borderColor: '#ffffff',
    borderWidth: 3,
    shadowColor: 'rgba(245, 158, 11, 0.4)',
  },
};

/**
 * Create driver marker element with pulse animation
 */
const createDriverMarkerElement = (vehicleType = 'car', style = 'default', heading = 0) => {
  const styles = MARKER_STYLES[style] || MARKER_STYLES.default;
  const icon = VEHICLE_ICONS[vehicleType] || VEHICLE_ICONS.car;
  
  const container = document.createElement('div');
  container.className = 'driver-marker-container';
  container.style.cssText = `
    position: relative;
    width: ${styles.pulseSize}px;
    height: ${styles.pulseSize}px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  // Pulse ring
  const pulse = document.createElement('div');
  pulse.className = 'driver-marker-pulse';
  pulse.style.cssText = `
    position: absolute;
    width: ${styles.pulseSize}px;
    height: ${styles.pulseSize}px;
    border-radius: 50%;
    background: ${styles.shadowColor};
    animation: driverPulse 2s ease-out infinite;
  `;
  
  // Heading indicator (direction arrow)
  const headingIndicator = document.createElement('div');
  headingIndicator.className = 'driver-heading';
  headingIndicator.style.cssText = `
    position: absolute;
    width: 0;
    height: 0;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-bottom: 14px solid ${styles.backgroundColor};
    top: 4px;
    transform-origin: center calc(100% + ${styles.size / 2 - 14}px);
    transform: rotate(${heading}deg);
    transition: transform 0.3s ease;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
  `;
  
  // Main marker circle
  const marker = document.createElement('div');
  marker.className = 'driver-marker';
  marker.style.cssText = `
    width: ${styles.size}px;
    height: ${styles.size}px;
    border-radius: 50%;
    background: ${styles.backgroundColor};
    border: ${styles.borderWidth}px solid ${styles.borderColor};
    box-shadow: 0 4px 12px ${styles.shadowColor}, 0 2px 6px rgba(0,0,0,0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    z-index: 1;
    transition: transform 0.3s ease, background 0.3s ease;
    cursor: pointer;
  `;
  marker.textContent = icon;
  
  // Add hover effect
  marker.addEventListener('mouseenter', () => {
    marker.style.transform = 'scale(1.1)';
  });
  marker.addEventListener('mouseleave', () => {
    marker.style.transform = 'scale(1)';
  });
  
  container.appendChild(pulse);
  container.appendChild(headingIndicator);
  container.appendChild(marker);
  
  // Store references for updates
  container._heading = headingIndicator;
  container._marker = marker;
  container._pulse = pulse;
  
  // Add animation styles if not already added
  if (!document.getElementById('driver-marker-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'driver-marker-styles';
    styleSheet.textContent = `
      @keyframes driverPulse {
        0% {
          transform: scale(0.8);
          opacity: 0.8;
        }
        100% {
          transform: scale(1.5);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(styleSheet);
  }
  
  return container;
};

/**
 * DriverMarker component
 */
export const DriverMarker = ({
  map,
  location,
  heading = 0,
  vehicleType = 'car',
  style = 'default',
  driverInfo,
  onClick,
  showPopup = true,
  popupOffset = [0, -30],
}) => {
  const markerRef = useRef(null);
  const popupRef = useRef(null);
  const elementRef = useRef(null);
  
  // Create marker
  useEffect(() => {
    if (!map || !location) return;
    
    const element = createDriverMarkerElement(vehicleType, style, heading);
    elementRef.current = element;
    
    const marker = new maplibregl.Marker({
      element,
      anchor: 'center',
      rotationAlignment: 'map',
    })
      .setLngLat([location.lng, location.lat])
      .addTo(map);
    
    markerRef.current = marker;
    
    // Click handler
    if (onClick) {
      element.addEventListener('click', () => onClick(driverInfo));
    }
    
    // Popup
    if (showPopup && driverInfo) {
      const popup = new maplibregl.Popup({
        offset: popupOffset,
        closeButton: true,
        closeOnClick: false,
        className: 'driver-popup',
      }).setHTML(`
        <div style="padding: 8px; min-width: 150px;">
          <div style="font-weight: 600; margin-bottom: 4px;">
            ${driverInfo.name || 'Driver'}
          </div>
          ${driverInfo.vehiclePlate ? `
            <div style="font-size: 12px; color: #666;">
              ${VEHICLE_ICONS[vehicleType] || '🚗'} ${driverInfo.vehiclePlate}
            </div>
          ` : ''}
          ${driverInfo.rating ? `
            <div style="font-size: 12px; color: #F59E0B; margin-top: 4px;">
              ⭐ ${driverInfo.rating.toFixed(1)}
            </div>
          ` : ''}
          ${driverInfo.phone ? `
            <a href="tel:${driverInfo.phone}" 
               style="display: block; margin-top: 8px; color: #4285F4; text-decoration: none; font-size: 12px;">
              📞 Call Driver
            </a>
          ` : ''}
        </div>
      `);
      
      popupRef.current = popup;
      
      element.addEventListener('click', () => {
        marker.setPopup(popup);
        popup.addTo(map);
      });
    }
    
    return () => {
      marker.remove();
      popupRef.current?.remove();
    };
  }, [map]); // Only recreate when map changes
  
  // Update position smoothly
  useEffect(() => {
    if (markerRef.current && location) {
      markerRef.current.setLngLat([location.lng, location.lat]);
    }
  }, [location?.lat, location?.lng]);
  
  // Update heading
  useEffect(() => {
    if (elementRef.current?._heading) {
      elementRef.current._heading.style.transform = `rotate(${heading}deg)`;
    }
  }, [heading]);
  
  // Update style
  useEffect(() => {
    if (!elementRef.current?._marker) return;
    
    const styles = MARKER_STYLES[style] || MARKER_STYLES.default;
    elementRef.current._marker.style.background = styles.backgroundColor;
    elementRef.current._pulse.style.background = styles.shadowColor;
  }, [style]);
  
  return null; // Marker is managed via MapLibre directly
};

/**
 * Hook for managing driver marker
 */
export const useDriverMarker = (map, options = {}) => {
  const [marker, setMarker] = useState(null);
  const [isVisible, setIsVisible] = useState(true);
  
  const show = useCallback((location, config = {}) => {
    if (!map || !location) return null;
    
    const element = createDriverMarkerElement(
      config.vehicleType,
      config.style,
      config.heading
    );
    
    const m = new maplibregl.Marker({
      element,
      anchor: 'center',
    })
      .setLngLat([location.lng, location.lat])
      .addTo(map);
    
    setMarker(m);
    setIsVisible(true);
    return m;
  }, [map]);
  
  const hide = useCallback(() => {
    marker?.remove();
    setMarker(null);
    setIsVisible(false);
  }, [marker]);
  
  const moveTo = useCallback((location, heading) => {
    if (marker) {
      marker.setLngLat([location.lng, location.lat]);
      // Update heading if element reference exists
      const element = marker.getElement();
      if (element?._heading) {
        element._heading.style.transform = `rotate(${heading || 0}deg)`;
      }
    }
  }, [marker]);
  
  const setStyle = useCallback((style) => {
    if (!marker) return;
    const element = marker.getElement();
    if (element?._marker && element?._pulse) {
      const styles = MARKER_STYLES[style] || MARKER_STYLES.default;
      element._marker.style.background = styles.backgroundColor;
      element._pulse.style.background = styles.shadowColor;
    }
  }, [marker]);
  
  // Cleanup
  useEffect(() => {
    return () => marker?.remove();
  }, []);
  
  return {
    marker,
    isVisible,
    show,
    hide,
    moveTo,
    setStyle,
  };
};

/**
 * Destination marker with different styles
 */
export const DestinationMarker = ({
  map,
  location,
  type = 'delivery', // 'delivery' | 'pickup'
  label,
  onClick,
}) => {
  const markerRef = useRef(null);
  
  useEffect(() => {
    if (!map || !location) return;
    
    const isPickup = type === 'pickup';
    
    const element = document.createElement('div');
    element.style.cssText = `
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: ${isPickup ? '#3B82F6' : '#10B981'};
      border: 3px solid white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      cursor: pointer;
      transition: transform 0.2s ease;
    `;
    element.textContent = isPickup ? '📍' : '🏠';
    
    element.addEventListener('mouseenter', () => {
      element.style.transform = 'scale(1.1)';
    });
    element.addEventListener('mouseleave', () => {
      element.style.transform = 'scale(1)';
    });
    
    if (onClick) {
      element.addEventListener('click', onClick);
    }
    
    const marker = new maplibregl.Marker({
      element,
      anchor: 'center',
    })
      .setLngLat([location.lng, location.lat])
      .addTo(map);
    
    // Add label popup if provided
    if (label) {
      const popup = new maplibregl.Popup({
        offset: 25,
        closeButton: false,
        className: 'destination-popup',
      }).setHTML(`
        <div style="padding: 6px 10px; font-size: 12px; font-weight: 500;">
          ${label}
        </div>
      `);
      
      element.addEventListener('mouseenter', () => popup.addTo(map));
      element.addEventListener('mouseleave', () => popup.remove());
      
      marker.setPopup(popup);
    }
    
    markerRef.current = marker;
    
    return () => marker.remove();
  }, [map, location?.lat, location?.lng, type, label, onClick]);
  
  return null;
};

export default DriverMarker;
