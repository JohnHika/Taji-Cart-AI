/**
 * useURLState - Sync map state with URL parameters
 * Phase 8: PWA Features
 * 
 * Enables deep linking, bookmarking, and browser back/forward navigation.
 * URL format: /map?lat=X&lng=Y&z=Z&b=B&p=P
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { DEFAULT_CENTER } from '../core/constants';

/**
 * URL parameter names
 */
const PARAMS = {
  lat: 'lat',
  lng: 'lng',
  zoom: 'z',
  bearing: 'b',
  pitch: 'p',
  style: 's',
  layer: 'layer',
  poi: 'poi',
  search: 'q',
};

/**
 * Default values
 */
const DEFAULTS = {
  lat: DEFAULT_CENTER.lat,
  lng: DEFAULT_CENTER.lng,
  zoom: 12,
  bearing: 0,
  pitch: 0,
  style: 'liberty',
};

/**
 * Debounce helper
 */
const debounce = (fn, ms) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  };
};

/**
 * Parse URL to map state
 */
export const parseURLState = (url = window.location.href) => {
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;
    
    return {
      center: {
        lat: parseFloat(params.get(PARAMS.lat)) || DEFAULTS.lat,
        lng: parseFloat(params.get(PARAMS.lng)) || DEFAULTS.lng,
      },
      zoom: parseFloat(params.get(PARAMS.zoom)) || DEFAULTS.zoom,
      bearing: parseFloat(params.get(PARAMS.bearing)) || DEFAULTS.bearing,
      pitch: parseFloat(params.get(PARAMS.pitch)) || DEFAULTS.pitch,
      style: params.get(PARAMS.style) || DEFAULTS.style,
      layer: params.get(PARAMS.layer) || null,
      poi: params.get(PARAMS.poi) || null,
      search: params.get(PARAMS.search) || '',
    };
  } catch {
    return {
      center: DEFAULT_CENTER,
      zoom: DEFAULTS.zoom,
      bearing: DEFAULTS.bearing,
      pitch: DEFAULTS.pitch,
      style: DEFAULTS.style,
      layer: null,
      poi: null,
      search: '',
    };
  }
};

/**
 * Build URL from map state
 */
export const buildURLState = (state, baseUrl = window.location.href) => {
  try {
    const urlObj = new URL(baseUrl);
    const params = urlObj.searchParams;
    
    // Required params
    params.set(PARAMS.lat, state.center.lat.toFixed(6));
    params.set(PARAMS.lng, state.center.lng.toFixed(6));
    params.set(PARAMS.zoom, state.zoom.toFixed(2));
    
    // Optional params (only include if non-default)
    if (state.bearing !== 0) {
      params.set(PARAMS.bearing, state.bearing.toFixed(1));
    } else {
      params.delete(PARAMS.bearing);
    }
    
    if (state.pitch !== 0) {
      params.set(PARAMS.pitch, state.pitch.toFixed(1));
    } else {
      params.delete(PARAMS.pitch);
    }
    
    if (state.style && state.style !== DEFAULTS.style) {
      params.set(PARAMS.style, state.style);
    } else {
      params.delete(PARAMS.style);
    }
    
    if (state.layer) {
      params.set(PARAMS.layer, state.layer);
    } else {
      params.delete(PARAMS.layer);
    }
    
    if (state.poi) {
      params.set(PARAMS.poi, state.poi);
    } else {
      params.delete(PARAMS.poi);
    }
    
    if (state.search) {
      params.set(PARAMS.search, state.search);
    } else {
      params.delete(PARAMS.search);
    }
    
    return urlObj.toString();
  } catch {
    return window.location.href;
  }
};

/**
 * URL state sync hook
 */
export const useURLState = (map, {
  enabled = true,
  debounceMs = 500,
  replaceState = true,
  onStateChange = null,
} = {}) => {
  const [initialized, setInitialized] = useState(false);
  const [urlState, setUrlState] = useState(() => parseURLState());
  const isInternalUpdate = useRef(false);
  
  // Update URL from map
  const updateURL = useCallback((state) => {
    if (!enabled) return;
    
    const newUrl = buildURLState(state);
    
    if (replaceState) {
      window.history.replaceState(state, '', newUrl);
    } else {
      window.history.pushState(state, '', newUrl);
    }
    
    setUrlState(state);
  }, [enabled, replaceState]);
  
  // Debounced URL update
  const debouncedUpdateURL = useCallback(
    debounce(updateURL, debounceMs),
    [updateURL, debounceMs]
  );
  
  // Sync map to URL on map events
  useEffect(() => {
    if (!map || !enabled) return;
    
    const handleMoveEnd = () => {
      if (isInternalUpdate.current) {
        isInternalUpdate.current = false;
        return;
      }
      
      const center = map.getCenter();
      const state = {
        center: { lat: center.lat, lng: center.lng },
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
        style: urlState.style,
        layer: urlState.layer,
        poi: urlState.poi,
        search: urlState.search,
      };
      
      debouncedUpdateURL(state);
    };
    
    map.on('moveend', handleMoveEnd);
    
    return () => {
      map.off('moveend', handleMoveEnd);
    };
  }, [map, enabled, debouncedUpdateURL, urlState]);
  
  // Initialize map from URL on mount
  useEffect(() => {
    if (!map || !enabled || initialized) return;
    
    const state = parseURLState();
    
    // Check if URL has map params
    const params = new URLSearchParams(window.location.search);
    const hasMapParams = params.has(PARAMS.lat) && params.has(PARAMS.lng);
    
    if (hasMapParams) {
      isInternalUpdate.current = true;
      
      map.jumpTo({
        center: [state.center.lng, state.center.lat],
        zoom: state.zoom,
        bearing: state.bearing,
        pitch: state.pitch,
      });
      
      setUrlState(state);
      
      if (onStateChange) {
        onStateChange(state);
      }
    }
    
    setInitialized(true);
  }, [map, enabled, initialized, onStateChange]);
  
  // Handle browser back/forward
  useEffect(() => {
    if (!map || !enabled) return;
    
    const handlePopState = (event) => {
      const state = event.state || parseURLState();
      
      if (state.center) {
        isInternalUpdate.current = true;
        
        map.flyTo({
          center: [state.center.lng, state.center.lat],
          zoom: state.zoom,
          bearing: state.bearing || 0,
          pitch: state.pitch || 0,
          duration: 1000,
        });
        
        setUrlState(state);
        
        if (onStateChange) {
          onStateChange(state);
        }
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [map, enabled, onStateChange]);
  
  // Update extra state (style, layer, etc.) without map movement
  const updateExtraState = useCallback((extras) => {
    const newState = { ...urlState, ...extras };
    updateURL(newState);
  }, [urlState, updateURL]);
  
  // Set search query
  const setSearchQuery = useCallback((query) => {
    updateExtraState({ search: query });
  }, [updateExtraState]);
  
  // Set active style
  const setActiveStyle = useCallback((style) => {
    updateExtraState({ style });
  }, [updateExtraState]);
  
  // Set active layer
  const setActiveLayer = useCallback((layer) => {
    updateExtraState({ layer });
  }, [updateExtraState]);
  
  // Set selected POI
  const setSelectedPOI = useCallback((poi) => {
    updateExtraState({ poi });
  }, [updateExtraState]);
  
  // Navigate to state
  const navigateToState = useCallback((state, options = {}) => {
    if (!map) return;
    
    const { animate = true, push = false } = options;
    
    isInternalUpdate.current = true;
    
    if (animate) {
      map.flyTo({
        center: [state.center.lng, state.center.lat],
        zoom: state.zoom,
        bearing: state.bearing || 0,
        pitch: state.pitch || 0,
        duration: 1500,
      });
    } else {
      map.jumpTo({
        center: [state.center.lng, state.center.lat],
        zoom: state.zoom,
        bearing: state.bearing || 0,
        pitch: state.pitch || 0,
      });
    }
    
    const newUrl = buildURLState(state);
    
    if (push) {
      window.history.pushState(state, '', newUrl);
    } else {
      window.history.replaceState(state, '', newUrl);
    }
    
    setUrlState(state);
  }, [map]);
  
  // Generate shareable link
  const getShareableLink = useCallback(() => {
    return buildURLState(urlState);
  }, [urlState]);
  
  return {
    // State
    urlState,
    initialized,
    
    // Actions
    updateURL,
    updateExtraState,
    setSearchQuery,
    setActiveStyle,
    setActiveLayer,
    setSelectedPOI,
    navigateToState,
    getShareableLink,
    
    // Utilities
    parseURLState,
    buildURLState,
    PARAMS,
    DEFAULTS,
  };
};

/**
 * URL hash state (alternative for single page apps)
 */
export const useHashState = (map, options = {}) => {
  const parseHash = useCallback(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return null;
    
    const parts = hash.split('/');
    if (parts.length < 3) return null;
    
    // Format: #zoom/lat/lng or #zoom/lat/lng/bearing/pitch
    const [zoom, lat, lng, bearing, pitch] = parts.map(parseFloat);
    
    if (isNaN(zoom) || isNaN(lat) || isNaN(lng)) return null;
    
    return {
      center: { lat, lng },
      zoom,
      bearing: bearing || 0,
      pitch: pitch || 0,
    };
  }, []);
  
  const buildHash = useCallback((state) => {
    const { center, zoom, bearing, pitch } = state;
    let hash = `#${zoom.toFixed(2)}/${center.lat.toFixed(6)}/${center.lng.toFixed(6)}`;
    
    if (bearing !== 0 || pitch !== 0) {
      hash += `/${bearing.toFixed(1)}/${pitch.toFixed(1)}`;
    }
    
    return hash;
  }, []);
  
  return useURLState(map, {
    ...options,
    // Override parse/build functions
  });
};

export default useURLState;
