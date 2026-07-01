/**
 * TerrainLayer - 3D terrain and hillshading for MapLibre GL
 * Adds elevation data with exaggeration controls
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useMap } from '../core/MapContainer';

// Free terrain tile sources
const TERRAIN_SOURCES = {
  // MapTiler terrain (requires API key for production)
  maptiler: {
    type: 'raster-dem',
    url: 'https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=get_your_own_key',
    tileSize: 256,
    maxzoom: 14,
    requiresKey: true,
  },
  // AWS Terrain Tiles (free, hosted by Amazon)
  aws: {
    type: 'raster-dem',
    tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
    encoding: 'terrarium',
    tileSize: 256,
    maxzoom: 15,
    attribution: 'Elevation data: AWS Terrain Tiles',
  },
  // Mapzen/NextZen terrain (free tier available)
  mapzen: {
    type: 'raster-dem',
    tiles: ['https://tile.nextzen.org/tilezen/terrain/v1/256/terrarium/{z}/{x}/{y}.png'],
    encoding: 'terrarium',
    tileSize: 256,
    maxzoom: 14,
  },
};

// Hillshade layer configuration
const HILLSHADE_CONFIG = {
  'id': 'hillshade-layer',
  'type': 'hillshade',
  'source': 'terrain-source',
  'layout': { 'visibility': 'visible' },
  'paint': {
    'hillshade-exaggeration': 0.5,
    'hillshade-shadow-color': '#000000',
    'hillshade-highlight-color': '#ffffff',
    'hillshade-accent-color': '#888888',
    'hillshade-illumination-direction': 315,
  },
};

/**
 * Hook for terrain control
 */
export function useTerrain(mapInstance, options = {}) {
  const {
    source = 'aws', // Default to free AWS tiles
    exaggeration = 1.5,
    enabled = false,
    onTerrainLoad = null,
    onError = null,
  } = options;

  const [isEnabled, setIsEnabled] = useState(enabled);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentExaggeration, setCurrentExaggeration] = useState(exaggeration);

  // Add terrain source and layer
  const enableTerrain = useCallback(async () => {
    if (!mapInstance || isEnabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const terrainConfig = TERRAIN_SOURCES[source];
      if (!terrainConfig) {
        throw new Error(`Unknown terrain source: ${source}`);
      }

      if (terrainConfig.requiresKey) {
        console.warn('Terrain source requires API key. Using AWS fallback.');
        // Fall back to AWS tiles
        const awsConfig = TERRAIN_SOURCES.aws;
        
        if (!mapInstance.getSource('terrain-source')) {
          mapInstance.addSource('terrain-source', awsConfig);
        }
      } else {
        if (!mapInstance.getSource('terrain-source')) {
          mapInstance.addSource('terrain-source', terrainConfig);
        }
      }

      // Set 3D terrain
      mapInstance.setTerrain({
        source: 'terrain-source',
        exaggeration: currentExaggeration,
      });

      // Add hillshade layer for visual depth
      if (!mapInstance.getLayer('hillshade-layer')) {
        // Insert hillshade below labels for better visibility
        const layers = mapInstance.getStyle().layers;
        const labelLayerIndex = layers.findIndex(l => 
          l.type === 'symbol' && l.layout?.['text-field']
        );
        
        if (labelLayerIndex !== -1) {
          mapInstance.addLayer(HILLSHADE_CONFIG, layers[labelLayerIndex].id);
        } else {
          mapInstance.addLayer(HILLSHADE_CONFIG);
        }
      }

      setIsEnabled(true);
      setIsLoading(false);
      onTerrainLoad?.();
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
      onError?.(err);
    }
  }, [mapInstance, isEnabled, source, currentExaggeration, onTerrainLoad, onError]);

  // Remove terrain
  const disableTerrain = useCallback(() => {
    if (!mapInstance) return;

    try {
      mapInstance.setTerrain(null);
      
      if (mapInstance.getLayer('hillshade-layer')) {
        mapInstance.removeLayer('hillshade-layer');
      }
      
      // Keep source for quick re-enable
      setIsEnabled(false);
    } catch (err) {
      console.error('Error disabling terrain:', err);
    }
  }, [mapInstance]);

  // Toggle terrain
  const toggleTerrain = useCallback(() => {
    if (isEnabled) {
      disableTerrain();
    } else {
      enableTerrain();
    }
  }, [isEnabled, enableTerrain, disableTerrain]);

  // Update exaggeration
  const setExaggeration = useCallback((value) => {
    const clamped = Math.max(0, Math.min(3, value));
    setCurrentExaggeration(clamped);
    
    if (mapInstance && isEnabled) {
      mapInstance.setTerrain({
        source: 'terrain-source',
        exaggeration: clamped,
      });
    }
  }, [mapInstance, isEnabled]);

  // Update hillshade settings
  const updateHillshade = useCallback((settings) => {
    if (!mapInstance || !mapInstance.getLayer('hillshade-layer')) return;

    Object.entries(settings).forEach(([property, value]) => {
      const paintProperty = `hillshade-${property}`;
      try {
        mapInstance.setPaintProperty('hillshade-layer', paintProperty, value);
      } catch (err) {
        console.warn(`Failed to set ${paintProperty}:`, err);
      }
    });
  }, [mapInstance]);

  // Sync with map style changes
  useEffect(() => {
    if (!mapInstance) return;

    const handleStyleLoad = () => {
      if (isEnabled) {
        // Re-add terrain after style change
        enableTerrain();
      }
    };

    mapInstance.on('style.load', handleStyleLoad);
    return () => mapInstance.off('style.load', handleStyleLoad);
  }, [mapInstance, isEnabled, enableTerrain]);

  return {
    isEnabled,
    isLoading,
    error,
    exaggeration: currentExaggeration,
    enableTerrain,
    disableTerrain,
    toggleTerrain,
    setExaggeration,
    updateHillshade,
  };
}

/**
 * Terrain toggle button component
 */
export function TerrainToggle({ className = '' }) {
  const { map } = useMap();
  const { isEnabled, isLoading, toggleTerrain } = useTerrain(map);

  return (
    <button
      onClick={toggleTerrain}
      disabled={isLoading}
      className={`
        relative w-10 h-10 rounded-full bg-white shadow-md border border-gray-200
        flex items-center justify-center
        hover:bg-gray-50 hover:shadow-lg
        disabled:opacity-50 disabled:cursor-wait
        transition-all duration-200
        ${isEnabled ? 'ring-2 ring-primary-400' : ''}
        ${className}
      `}
      title={isEnabled ? 'Disable 3D terrain' : 'Enable 3D terrain'}
      aria-label={isEnabled ? 'Disable 3D terrain' : 'Enable 3D terrain'}
    >
      <span className="text-lg">⛰️</span>
      
      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-full">
          <svg className="w-5 h-5 animate-spin text-gray-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {/* Active indicator */}
      {isEnabled && !isLoading && (
        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
      )}
    </button>
  );
}

/**
 * Terrain control panel with exaggeration slider
 */
export function TerrainControl({ className = '' }) {
  const { map } = useMap();
  const {
    isEnabled,
    isLoading,
    error,
    exaggeration,
    toggleTerrain,
    setExaggeration,
  } = useTerrain(map);

  return (
    <div className={`bg-white rounded-xl shadow-lg p-4 min-w-[200px] ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-medium text-gray-800 flex items-center gap-2">
          <span>⛰️</span>
          3D Terrain
        </span>
        
        <button
          onClick={toggleTerrain}
          disabled={isLoading}
          className={`
            relative w-11 h-6 rounded-full transition-colors
            ${isEnabled ? 'bg-primary-500' : 'bg-gray-300'}
            disabled:opacity-50
          `}
          role="switch"
          aria-checked={isEnabled}
        >
          <div className={`
            absolute top-0.5 w-5 h-5 rounded-full bg-white shadow
            transition-transform
            ${isEnabled ? 'translate-x-5' : 'translate-x-0.5'}
          `}>
            {isLoading && (
              <svg className="w-4 h-4 m-0.5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
          </div>
        </button>
      </div>

      {/* Exaggeration slider (only show when enabled) */}
      {isEnabled && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Exaggeration</span>
            <span className="text-gray-800 font-medium">{exaggeration.toFixed(1)}x</span>
          </div>
          
          <input
            type="range"
            min="0"
            max="3"
            step="0.1"
            value={exaggeration}
            onChange={(e) => setExaggeration(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
          />
          
          <div className="flex justify-between text-xs text-gray-400">
            <span>Flat</span>
            <span>Normal</span>
            <span>Extreme</span>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-2 text-xs text-red-500">
          {error}
        </div>
      )}
    </div>
  );
}

/**
 * Sky layer for realistic 3D atmosphere (works with terrain)
 */
export function SkyLayer() {
  const { map } = useMap();
  
  useEffect(() => {
    if (!map) return;

    const addSky = () => {
      if (!map.getLayer('sky-layer')) {
        map.addLayer({
          id: 'sky-layer',
          type: 'sky',
          paint: {
            'sky-type': 'atmosphere',
            'sky-atmosphere-sun': [0.0, 90.0],
            'sky-atmosphere-sun-intensity': 15,
          },
        });
      }
    };

    // Add sky when style loads
    if (map.isStyleLoaded()) {
      addSky();
    } else {
      map.on('style.load', addSky);
    }

    return () => {
      if (map.getLayer('sky-layer')) {
        map.removeLayer('sky-layer');
      }
    };
  }, [map]);

  return null;
}

export default TerrainControl;
