/**
 * useShareLocation - Share current map view or location
 * Phase 8: PWA Features
 * 
 * Uses Web Share API with fallbacks.
 * Generates shareable URLs with encoded map state.
 */

import { useState, useCallback } from 'react';
import { DEFAULT_CENTER } from '../core/constants';

/**
 * Share URL configuration
 */
const URL_PARAMS = {
  lat: 'lat',
  lng: 'lng',
  zoom: 'z',
  bearing: 'b',
  pitch: 'p',
  marker: 'm',
  label: 'l',
};

/**
 * Build shareable URL from map state
 */
export const buildShareUrl = ({
  center,
  zoom,
  bearing = 0,
  pitch = 0,
  marker = null,
  label = '',
  baseUrl = window.location.origin,
  path = '/map',
}) => {
  const params = new URLSearchParams();
  
  // Map view
  params.set(URL_PARAMS.lat, center.lat.toFixed(6));
  params.set(URL_PARAMS.lng, center.lng.toFixed(6));
  params.set(URL_PARAMS.zoom, zoom.toFixed(1));
  
  // Optional: bearing and pitch
  if (bearing !== 0) {
    params.set(URL_PARAMS.bearing, bearing.toFixed(1));
  }
  if (pitch !== 0) {
    params.set(URL_PARAMS.pitch, pitch.toFixed(1));
  }
  
  // Optional: marker position
  if (marker) {
    params.set(URL_PARAMS.marker, `${marker.lat.toFixed(6)},${marker.lng.toFixed(6)}`);
  }
  
  // Optional: label
  if (label) {
    params.set(URL_PARAMS.label, encodeURIComponent(label));
  }
  
  return `${baseUrl}${path}?${params.toString()}`;
};

/**
 * Parse shareable URL
 */
export const parseShareUrl = (url = window.location.href) => {
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;
    
    const lat = parseFloat(params.get(URL_PARAMS.lat));
    const lng = parseFloat(params.get(URL_PARAMS.lng));
    const zoom = parseFloat(params.get(URL_PARAMS.zoom));
    
    if (isNaN(lat) || isNaN(lng) || isNaN(zoom)) {
      return null;
    }
    
    const result = {
      center: { lat, lng },
      zoom,
      bearing: parseFloat(params.get(URL_PARAMS.bearing)) || 0,
      pitch: parseFloat(params.get(URL_PARAMS.pitch)) || 0,
      marker: null,
      label: '',
    };
    
    // Parse marker
    const markerStr = params.get(URL_PARAMS.marker);
    if (markerStr) {
      const [mLat, mLng] = markerStr.split(',').map(parseFloat);
      if (!isNaN(mLat) && !isNaN(mLng)) {
        result.marker = { lat: mLat, lng: mLng };
      }
    }
    
    // Parse label
    const labelStr = params.get(URL_PARAMS.label);
    if (labelStr) {
      result.label = decodeURIComponent(labelStr);
    }
    
    return result;
  } catch {
    return null;
  }
};

/**
 * Generate Google Maps link
 */
export const getGoogleMapsUrl = ({ center, zoom = 15, marker = null }) => {
  if (marker) {
    return `https://www.google.com/maps?q=${marker.lat},${marker.lng}&z=${zoom}`;
  }
  return `https://www.google.com/maps/@${center.lat},${center.lng},${zoom}z`;
};

/**
 * Generate Apple Maps link
 */
export const getAppleMapsUrl = ({ center, zoom = 15, marker = null, label = '' }) => {
  const ll = marker ? `${marker.lat},${marker.lng}` : `${center.lat},${center.lng}`;
  const q = label ? `&q=${encodeURIComponent(label)}` : '';
  return `https://maps.apple.com/?ll=${ll}&z=${zoom}${q}`;
};

/**
 * Generate OpenStreetMap link
 */
export const getOSMUrl = ({ center, zoom = 15, marker = null }) => {
  if (marker) {
    return `https://www.openstreetmap.org/?mlat=${marker.lat}&mlon=${marker.lng}#map=${zoom}/${center.lat}/${center.lng}`;
  }
  return `https://www.openstreetmap.org/#map=${zoom}/${center.lat}/${center.lng}`;
};

/**
 * Share location hook
 */
export const useShareLocation = (map) => {
  const [isSharing, setIsSharing] = useState(false);
  const [lastShared, setLastShared] = useState(null);
  const [error, setError] = useState(null);
  
  // Check Web Share API support
  const canShare = typeof navigator?.share === 'function';
  const canShareFiles = typeof navigator?.canShare === 'function';
  
  // Get current map state
  const getMapState = useCallback(() => {
    if (!map) {
      return {
        center: DEFAULT_CENTER,
        zoom: 12,
        bearing: 0,
        pitch: 0,
      };
    }
    
    const center = map.getCenter();
    return {
      center: { lat: center.lat, lng: center.lng },
      zoom: map.getZoom(),
      bearing: map.getBearing(),
      pitch: map.getPitch(),
    };
  }, [map]);
  
  // Share current view
  const shareView = useCallback(async ({
    title = 'Check out this location',
    text = '',
    marker = null,
    label = '',
  } = {}) => {
    setIsSharing(true);
    setError(null);
    
    try {
      const state = getMapState();
      const url = buildShareUrl({
        ...state,
        marker,
        label,
      });
      
      const shareData = {
        title,
        text: text || `Location at ${state.center.lat.toFixed(4)}, ${state.center.lng.toFixed(4)}`,
        url,
      };
      
      if (canShare) {
        await navigator.share(shareData);
        setLastShared({ type: 'view', ...state, timestamp: Date.now() });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(url);
        setLastShared({ type: 'clipboard', url, timestamp: Date.now() });
      }
      
      setIsSharing(false);
      return { success: true, url };
      
    } catch (err) {
      // User cancelled or error
      if (err.name !== 'AbortError') {
        setError(err.message);
      }
      setIsSharing(false);
      return { success: false, error: err.message };
    }
  }, [getMapState, canShare]);
  
  // Share with screenshot
  const shareWithScreenshot = useCallback(async ({
    title = 'Check out this location',
    text = '',
    marker = null,
    label = '',
  } = {}) => {
    if (!map) {
      setError('Map not ready');
      return { success: false };
    }
    
    setIsSharing(true);
    setError(null);
    
    try {
      // Get map canvas
      const canvas = map.getCanvas();
      
      // Convert to blob
      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/png');
      });
      
      if (!blob) {
        throw new Error('Failed to capture map');
      }
      
      const state = getMapState();
      const url = buildShareUrl({
        ...state,
        marker,
        label,
      });
      
      const file = new File([blob], 'map-location.png', { type: 'image/png' });
      
      const shareData = {
        title,
        text: text || `Location at ${state.center.lat.toFixed(4)}, ${state.center.lng.toFixed(4)}`,
        url,
        files: [file],
      };
      
      // Check if files can be shared
      if (canShareFiles && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        setLastShared({ type: 'screenshot', ...state, timestamp: Date.now() });
        setIsSharing(false);
        return { success: true, url };
      } else if (canShare) {
        // Fallback: share without file
        const { files, ...dataWithoutFiles } = shareData;
        await navigator.share(dataWithoutFiles);
        setLastShared({ type: 'view', ...state, timestamp: Date.now() });
        setIsSharing(false);
        return { success: true, url };
      } else {
        // Fallback: copy URL
        await navigator.clipboard.writeText(url);
        setLastShared({ type: 'clipboard', url, timestamp: Date.now() });
        setIsSharing(false);
        return { success: true, url };
      }
      
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
      }
      setIsSharing(false);
      return { success: false, error: err.message };
    }
  }, [map, getMapState, canShare, canShareFiles]);
  
  // Copy link to clipboard
  const copyLink = useCallback(async ({
    marker = null,
    label = '',
  } = {}) => {
    try {
      const state = getMapState();
      const url = buildShareUrl({
        ...state,
        marker,
        label,
      });
      
      await navigator.clipboard.writeText(url);
      setLastShared({ type: 'clipboard', url, timestamp: Date.now() });
      return { success: true, url };
      
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, [getMapState]);
  
  // Get all external map links
  const getExternalLinks = useCallback(({
    marker = null,
    label = '',
  } = {}) => {
    const state = getMapState();
    
    return {
      google: getGoogleMapsUrl({ ...state, marker }),
      apple: getAppleMapsUrl({ ...state, marker, label }),
      osm: getOSMUrl({ ...state, marker }),
    };
  }, [getMapState]);
  
  return {
    // State
    isSharing,
    lastShared,
    error,
    canShare,
    canShareFiles,
    
    // Actions
    shareView,
    shareWithScreenshot,
    copyLink,
    getExternalLinks,
    getMapState,
    
    // Utilities
    buildShareUrl,
    parseShareUrl,
  };
};

/**
 * Share button component props helper
 */
export const getShareButtonProps = (shareLocation, options = {}) => ({
  onClick: () => shareLocation.shareView(options),
  disabled: shareLocation.isSharing,
  title: shareLocation.canShare ? 'Share location' : 'Copy link',
});

export default useShareLocation;
