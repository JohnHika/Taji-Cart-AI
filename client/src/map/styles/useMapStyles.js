/**
 * useMapStyles - Premium map style management hook
 * Handles style switching, persistence, and preloading for instant transitions
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { MAP_STYLES, STORAGE_KEYS } from '../core/constants';

// Extended style configurations with UI metadata
export const STYLE_CONFIGS = {
  liberty: {
    id: 'liberty',
    ...MAP_STYLES.liberty,
    icon: '🗺️',
    category: 'standard',
    previewColor: '#f0f0f0',
  },
  bright: {
    id: 'bright',
    ...MAP_STYLES.bright,
    icon: '☀️',
    category: 'standard',
    previewColor: '#ffffff',
  },
  positron: {
    id: 'positron',
    ...MAP_STYLES.positron,
    icon: '🌤️',
    category: 'standard',
    previewColor: '#e8e8e8',
  },
  dark: {
    id: 'dark',
    ...MAP_STYLES.dark,
    icon: '🌙',
    category: 'dark',
    previewColor: '#2a2a2a',
  },
};

// Additional third-party styles (all free)
export const EXTRA_STYLES = {
  satellite: {
    id: 'satellite',
    url: 'https://api.maptiler.com/maps/hybrid/style.json?key=get_your_own_key',
    name: 'Satellite',
    description: 'Aerial imagery with labels',
    icon: '🛰️',
    category: 'imagery',
    previewColor: '#1a3d1f',
    requiresKey: true,
  },
  terrain: {
    id: 'terrain',
    url: 'https://api.maptiler.com/maps/outdoor/style.json?key=get_your_own_key',
    name: 'Terrain',
    description: 'Topographic with elevation',
    icon: '⛰️',
    category: 'terrain',
    previewColor: '#c5d4a0',
    requiresKey: true,
  },
  osm: {
    id: 'osm',
    url: 'https://tiles.openfreemap.org/styles/liberty',
    name: 'OpenStreetMap',
    description: 'Classic OSM styling',
    icon: '🌍',
    category: 'standard',
    previewColor: '#f2efe9',
  },
};

/**
 * Hook for managing map styles with persistence and preloading
 */
export function useMapStyles(mapInstance, options = {}) {
  const {
    defaultStyle = 'liberty',
    persistPreference = true,
    preloadStyles = true,
    onStyleChange = null,
    enableSystemTheme = true,
  } = options;

  // Get initial style from storage or default
  const getInitialStyle = () => {
    if (persistPreference && typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.MAP_STYLE);
      if (saved && STYLE_CONFIGS[saved]) {
        return saved;
      }
    }
    return defaultStyle;
  };

  const [currentStyle, setCurrentStyle] = useState(getInitialStyle);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preloadedStyles, setPreloadedStyles] = useState(new Set());
  const styleChangeAbort = useRef(null);

  // Get all available styles
  const availableStyles = { ...STYLE_CONFIGS };

  // System theme detection
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    typeof window !== 'undefined' && 
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    if (!enableSystemTheme || typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setSystemPrefersDark(e.matches);
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [enableSystemTheme]);

  // Apply system theme if enabled and no manual preference
  useEffect(() => {
    if (!enableSystemTheme) return;
    
    const hasManualPreference = localStorage.getItem(STORAGE_KEYS.MAP_STYLE);
    if (!hasManualPreference) {
      const autoStyle = systemPrefersDark ? 'dark' : 'liberty';
      if (autoStyle !== currentStyle) {
        changeStyle(autoStyle, false); // Don't persist auto-selection
      }
    }
  }, [systemPrefersDark, enableSystemTheme]);

  // Preload style definitions for instant switching
  useEffect(() => {
    if (!preloadStyles) return;

    const preload = async () => {
      const stylesToPreload = Object.values(STYLE_CONFIGS)
        .filter(s => s.id !== currentStyle && !s.requiresKey);

      for (const style of stylesToPreload) {
        try {
          // Fetch style JSON to warm the cache
          const response = await fetch(style.url);
          if (response.ok) {
            setPreloadedStyles(prev => new Set([...prev, style.id]));
          }
        } catch {
          // Silent fail for preloading
        }
      }
    };

    // Delay preloading to not block initial render
    const timer = setTimeout(preload, 2000);
    return () => clearTimeout(timer);
  }, [preloadStyles, currentStyle]);

  /**
   * Change the map style
   */
  const changeStyle = useCallback(async (styleId, persist = true) => {
    const style = availableStyles[styleId];
    if (!style) {
      setError(`Unknown style: ${styleId}`);
      return false;
    }

    if (!mapInstance) {
      setError('Map not initialized');
      return false;
    }

    // Cancel any pending style change
    if (styleChangeAbort.current) {
      styleChangeAbort.current.abort();
    }
    styleChangeAbort.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      // Store current view state
      const center = mapInstance.getCenter();
      const zoom = mapInstance.getZoom();
      const bearing = mapInstance.getBearing();
      const pitch = mapInstance.getPitch();

      // Change the style
      mapInstance.setStyle(style.url);

      // Wait for style to load
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Style load timeout'));
        }, 10000);

        const onStyleLoad = () => {
          clearTimeout(timeout);
          mapInstance.off('style.load', onStyleLoad);
          mapInstance.off('error', onError);
          resolve();
        };

        const onError = (e) => {
          if (e.error?.message?.includes('style')) {
            clearTimeout(timeout);
            mapInstance.off('style.load', onStyleLoad);
            mapInstance.off('error', onError);
            reject(e.error);
          }
        };

        mapInstance.on('style.load', onStyleLoad);
        mapInstance.on('error', onError);
      });

      // Restore view state (style change resets it)
      mapInstance.jumpTo({ center, zoom, bearing, pitch });

      // Update state
      setCurrentStyle(styleId);
      setIsLoading(false);

      // Persist preference
      if (persist && persistPreference) {
        localStorage.setItem(STORAGE_KEYS.MAP_STYLE, styleId);
      }

      // Callback
      onStyleChange?.(styleId, style);

      return true;
    } catch (err) {
      if (err.name === 'AbortError') return false;
      
      setError(err.message || 'Failed to change style');
      setIsLoading(false);
      return false;
    }
  }, [mapInstance, availableStyles, persistPreference, onStyleChange]);

  /**
   * Toggle between light and dark modes
   */
  const toggleDarkMode = useCallback(() => {
    const isDark = currentStyle === 'dark';
    return changeStyle(isDark ? 'liberty' : 'dark');
  }, [currentStyle, changeStyle]);

  /**
   * Cycle through available styles
   */
  const cycleStyle = useCallback(() => {
    const styleIds = Object.keys(availableStyles);
    const currentIndex = styleIds.indexOf(currentStyle);
    const nextIndex = (currentIndex + 1) % styleIds.length;
    return changeStyle(styleIds[nextIndex]);
  }, [currentStyle, availableStyles, changeStyle]);

  /**
   * Get style by category
   */
  const getStylesByCategory = useCallback((category) => {
    return Object.values(availableStyles).filter(s => s.category === category);
  }, [availableStyles]);

  /**
   * Check if a style is preloaded
   */
  const isStylePreloaded = useCallback((styleId) => {
    return preloadedStyles.has(styleId);
  }, [preloadedStyles]);

  /**
   * Get current style config
   */
  const getCurrentStyleConfig = useCallback(() => {
    return availableStyles[currentStyle] || STYLE_CONFIGS.liberty;
  }, [currentStyle, availableStyles]);

  /**
   * Reset to default style
   */
  const resetToDefault = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.MAP_STYLE);
    return changeStyle(defaultStyle, false);
  }, [defaultStyle, changeStyle]);

  return {
    // State
    currentStyle,
    currentStyleConfig: getCurrentStyleConfig(),
    isLoading,
    error,
    availableStyles,
    systemPrefersDark,
    
    // Actions
    changeStyle,
    toggleDarkMode,
    cycleStyle,
    resetToDefault,
    
    // Utils
    getStylesByCategory,
    isStylePreloaded,
  };
}

export default useMapStyles;
