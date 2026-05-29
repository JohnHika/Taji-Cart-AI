/**
 * usePOIFetch - Fetch Points of Interest from Overpass API
 * Uses OSM data via Overpass Turbo - completely free, no API key
 */

import { useState, useCallback, useRef } from 'react';
import { POI_CATEGORIES, API_ENDPOINTS } from '../core/constants';

// Overpass query builder
const buildOverpassQuery = (bounds, categories) => {
  const { north, south, east, west } = bounds;
  const bbox = `${south},${west},${north},${east}`;
  
  // Build query for selected categories
  const queries = categories.flatMap(category => {
    const config = POI_CATEGORIES[category];
    if (!config?.osmTags) return [];
    
    return config.osmTags.map(tag => {
      const [key, value] = tag.split('=');
      if (value === '*') {
        return `node["${key}"](${bbox});`;
      }
      return `node["${key}"="${value}"](${bbox});`;
    });
  });
  
  return `
    [out:json][timeout:25];
    (
      ${queries.join('\n      ')}
    );
    out body;
    >;
    out skel qt;
  `;
};

// Parse Overpass response to GeoJSON
const parseOverpassResponse = (data) => {
  const features = data.elements
    .filter(el => el.type === 'node' && el.lat && el.lon)
    .map(el => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [el.lon, el.lat],
      },
      properties: {
        id: el.id,
        name: el.tags?.name || el.tags?.['name:en'] || 'Unknown',
        category: detectCategory(el.tags),
        ...el.tags,
      },
    }));
  
  return {
    type: 'FeatureCollection',
    features,
  };
};

// Detect POI category from OSM tags
const detectCategory = (tags) => {
  if (!tags) return 'other';
  
  for (const [categoryId, config] of Object.entries(POI_CATEGORIES)) {
    if (!config.osmTags) continue;
    
    for (const tag of config.osmTags) {
      const [key, value] = tag.split('=');
      if (value === '*' && tags[key]) return categoryId;
      if (tags[key] === value) return categoryId;
    }
  }
  
  return 'other';
};

// Cache for POI data
const poiCache = new Map();
const getCacheKey = (bounds, categories) => 
  `${bounds.north.toFixed(3)},${bounds.south.toFixed(3)},${bounds.east.toFixed(3)},${bounds.west.toFixed(3)}_${categories.sort().join(',')}`;

/**
 * Hook for fetching POIs from Overpass API
 */
export const usePOIFetch = () => {
  const [pois, setPois] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);
  
  const fetchPOIs = useCallback(async (bounds, categories = ['restaurant', 'cafe', 'shop']) => {
    // Validate bounds
    if (!bounds || !bounds.north || !bounds.south || !bounds.east || !bounds.west) {
      console.warn('Invalid bounds for POI fetch');
      return null;
    }
    
    // Check cache
    const cacheKey = getCacheKey(bounds, categories);
    if (poiCache.has(cacheKey)) {
      const cached = poiCache.get(cacheKey);
      setPois(cached);
      return cached;
    }
    
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setError(null);
    
    try {
      const query = buildOverpassQuery(bounds, categories);
      
      const response = await fetch(API_ENDPOINTS.overpass, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status}`);
      }
      
      const data = await response.json();
      const geojson = parseOverpassResponse(data);
      
      // Cache result
      poiCache.set(cacheKey, geojson);
      
      // Keep cache size manageable
      if (poiCache.size > 50) {
        const firstKey = poiCache.keys().next().value;
        poiCache.delete(firstKey);
      }
      
      setPois(geojson);
      setLoading(false);
      return geojson;
      
    } catch (err) {
      if (err.name === 'AbortError') {
        return null;
      }
      console.error('POI fetch error:', err);
      setError(err.message);
      setLoading(false);
      return null;
    }
  }, []);
  
  const clearCache = useCallback(() => {
    poiCache.clear();
  }, []);
  
  const cancelFetch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);
  
  return {
    pois,
    loading,
    error,
    fetchPOIs,
    clearCache,
    cancelFetch,
  };
};

/**
 * Hook for managing POI categories
 */
export const usePOICategories = (initialCategories = ['restaurant', 'cafe']) => {
  const [activeCategories, setActiveCategories] = useState(new Set(initialCategories));
  
  const toggleCategory = useCallback((category) => {
    setActiveCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);
  
  const setCategories = useCallback((categories) => {
    setActiveCategories(new Set(categories));
  }, []);
  
  const clearCategories = useCallback(() => {
    setActiveCategories(new Set());
  }, []);
  
  const selectAll = useCallback(() => {
    setActiveCategories(new Set(Object.keys(POI_CATEGORIES)));
  }, []);
  
  return {
    activeCategories: Array.from(activeCategories),
    toggleCategory,
    setCategories,
    clearCategories,
    selectAll,
    isActive: (cat) => activeCategories.has(cat),
  };
};

export default usePOIFetch;
