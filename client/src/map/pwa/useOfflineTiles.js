/**
 * useOfflineTiles - IndexedDB tile caching for offline map access
 * Phase 8: PWA Features
 * 
 * Caches map tiles locally for offline viewing.
 * Uses IndexedDB for persistent storage.
 */

import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * IndexedDB configuration
 */
const DB_NAME = 'taji-map-tiles';
const DB_VERSION = 1;
const TILE_STORE = 'tiles';
const REGION_STORE = 'regions';

/**
 * Open IndexedDB
 */
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Tiles store
      if (!db.objectStoreNames.contains(TILE_STORE)) {
        const tileStore = db.createObjectStore(TILE_STORE, { keyPath: 'key' });
        tileStore.createIndex('region', 'region', { unique: false });
        tileStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      // Regions store (saved areas)
      if (!db.objectStoreNames.contains(REGION_STORE)) {
        db.createObjectStore(REGION_STORE, { keyPath: 'id' });
      }
    };
  });
};

/**
 * Generate tile key
 */
const getTileKey = (z, x, y, style) => `${style}/${z}/${x}/${y}`;

/**
 * Calculate tiles in a bounding box at multiple zoom levels
 */
const calculateTilesInBounds = (bounds, minZoom, maxZoom) => {
  const tiles = [];
  
  for (let z = minZoom; z <= maxZoom; z++) {
    const n = Math.pow(2, z);
    
    // Convert bounds to tile coordinates
    const x1 = Math.floor((bounds.west + 180) / 360 * n);
    const x2 = Math.floor((bounds.east + 180) / 360 * n);
    const y1 = Math.floor((1 - Math.log(Math.tan(bounds.north * Math.PI / 180) + 
      1 / Math.cos(bounds.north * Math.PI / 180)) / Math.PI) / 2 * n);
    const y2 = Math.floor((1 - Math.log(Math.tan(bounds.south * Math.PI / 180) + 
      1 / Math.cos(bounds.south * Math.PI / 180)) / Math.PI) / 2 * n);
    
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
      for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
        tiles.push({ z, x: ((x % n) + n) % n, y });
      }
    }
  }
  
  return tiles;
};

/**
 * Estimate storage size for tiles
 */
const estimateStorageSize = (tileCount, avgTileSize = 15000) => {
  const bytes = tileCount * avgTileSize;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Offline tile hook
 */
export const useOfflineTiles = ({
  styleUrl = 'https://tiles.openfreemap.org/styles/liberty',
  tileUrlPattern = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  maxCacheAge = 7 * 24 * 60 * 60 * 1000, // 7 days
} = {}) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState(null);
  const [regions, setRegions] = useState([]);
  const [cacheSize, setCacheSize] = useState(0);
  const dbRef = useRef(null);
  const abortRef = useRef(null);
  
  // Check IndexedDB support
  useEffect(() => {
    setIsSupported('indexedDB' in window);
    
    // Initialize DB
    if ('indexedDB' in window) {
      openDB()
        .then(db => {
          dbRef.current = db;
          loadRegions();
          calculateCacheSize();
        })
        .catch(err => {
          console.error('Failed to open offline DB:', err);
          setError(err.message);
        });
    }
    
    return () => {
      if (dbRef.current) {
        dbRef.current.close();
      }
    };
  }, []);
  
  // Load saved regions
  const loadRegions = useCallback(async () => {
    if (!dbRef.current) return;
    
    const tx = dbRef.current.transaction(REGION_STORE, 'readonly');
    const store = tx.objectStore(REGION_STORE);
    const request = store.getAll();
    
    request.onsuccess = () => {
      setRegions(request.result || []);
    };
  }, []);
  
  // Calculate cache size
  const calculateCacheSize = useCallback(async () => {
    if (!dbRef.current) return;
    
    const tx = dbRef.current.transaction(TILE_STORE, 'readonly');
    const store = tx.objectStore(TILE_STORE);
    const request = store.count();
    
    request.onsuccess = () => {
      // Rough estimate: average tile is ~15KB
      setCacheSize(request.result * 15000);
    };
  }, []);
  
  // Download tiles for a region
  const downloadRegion = useCallback(async ({
    name,
    bounds,
    minZoom = 10,
    maxZoom = 16,
  }) => {
    if (!dbRef.current) {
      setError('Offline storage not available');
      return false;
    }
    
    setIsLoading(true);
    setError(null);
    abortRef.current = new AbortController();
    
    try {
      // Calculate tiles
      const tiles = calculateTilesInBounds(bounds, minZoom, maxZoom);
      setProgress({ current: 0, total: tiles.length });
      
      const regionId = `region_${Date.now()}`;
      let downloaded = 0;
      let failed = 0;
      
      // Download in batches
      const batchSize = 10;
      for (let i = 0; i < tiles.length; i += batchSize) {
        if (abortRef.current?.signal.aborted) {
          throw new Error('Download cancelled');
        }
        
        const batch = tiles.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async ({ z, x, y }) => {
          const url = tileUrlPattern
            .replace('{z}', z)
            .replace('{x}', x)
            .replace('{y}', y);
          
          try {
            const response = await fetch(url, {
              signal: abortRef.current?.signal,
            });
            
            if (!response.ok) throw new Error('Fetch failed');
            
            const blob = await response.blob();
            const key = getTileKey(z, x, y, 'osm');
            
            // Store in IndexedDB
            const tx = dbRef.current.transaction(TILE_STORE, 'readwrite');
            const store = tx.objectStore(TILE_STORE);
            
            await new Promise((resolve, reject) => {
              const request = store.put({
                key,
                z,
                x,
                y,
                region: regionId,
                blob,
                timestamp: Date.now(),
              });
              request.onsuccess = resolve;
              request.onerror = reject;
            });
            
            downloaded++;
          } catch (err) {
            failed++;
            console.warn(`Failed to cache tile ${z}/${x}/${y}:`, err);
          }
        }));
        
        setProgress({ current: i + batch.length, total: tiles.length });
      }
      
      // Save region metadata
      const region = {
        id: regionId,
        name,
        bounds,
        minZoom,
        maxZoom,
        tileCount: downloaded,
        failedCount: failed,
        createdAt: Date.now(),
        size: downloaded * 15000, // Rough estimate
      };
      
      const tx = dbRef.current.transaction(REGION_STORE, 'readwrite');
      const store = tx.objectStore(REGION_STORE);
      
      await new Promise((resolve, reject) => {
        const request = store.put(region);
        request.onsuccess = resolve;
        request.onerror = reject;
      });
      
      await loadRegions();
      await calculateCacheSize();
      
      setIsLoading(false);
      return { downloaded, failed, regionId };
      
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
      return false;
    }
  }, [tileUrlPattern, loadRegions, calculateCacheSize]);
  
  // Cancel download
  const cancelDownload = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  }, []);
  
  // Delete a region's tiles
  const deleteRegion = useCallback(async (regionId) => {
    if (!dbRef.current) return;
    
    setIsLoading(true);
    
    try {
      // Delete tiles
      const tx = dbRef.current.transaction(TILE_STORE, 'readwrite');
      const store = tx.objectStore(TILE_STORE);
      const index = store.index('region');
      const request = index.openCursor(IDBKeyRange.only(regionId));
      
      await new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = reject;
      });
      
      // Delete region metadata
      const tx2 = dbRef.current.transaction(REGION_STORE, 'readwrite');
      const store2 = tx2.objectStore(REGION_STORE);
      
      await new Promise((resolve, reject) => {
        const request = store2.delete(regionId);
        request.onsuccess = resolve;
        request.onerror = reject;
      });
      
      await loadRegions();
      await calculateCacheSize();
      
    } catch (err) {
      setError(err.message);
    }
    
    setIsLoading(false);
  }, [loadRegions, calculateCacheSize]);
  
  // Clear all cached tiles
  const clearCache = useCallback(async () => {
    if (!dbRef.current) return;
    
    setIsLoading(true);
    
    try {
      // Clear tiles
      const tx = dbRef.current.transaction(TILE_STORE, 'readwrite');
      const store = tx.objectStore(TILE_STORE);
      
      await new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = resolve;
        request.onerror = reject;
      });
      
      // Clear regions
      const tx2 = dbRef.current.transaction(REGION_STORE, 'readwrite');
      const store2 = tx2.objectStore(REGION_STORE);
      
      await new Promise((resolve, reject) => {
        const request = store2.clear();
        request.onsuccess = resolve;
        request.onerror = reject;
      });
      
      setRegions([]);
      setCacheSize(0);
      
    } catch (err) {
      setError(err.message);
    }
    
    setIsLoading(false);
  }, []);
  
  // Clear expired tiles
  const clearExpired = useCallback(async () => {
    if (!dbRef.current) return;
    
    const expireTime = Date.now() - maxCacheAge;
    
    const tx = dbRef.current.transaction(TILE_STORE, 'readwrite');
    const store = tx.objectStore(TILE_STORE);
    const index = store.index('timestamp');
    const range = IDBKeyRange.upperBound(expireTime);
    const request = index.openCursor(range);
    
    let deleted = 0;
    
    await new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          deleted++;
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = reject;
    });
    
    await calculateCacheSize();
    return deleted;
  }, [maxCacheAge, calculateCacheSize]);
  
  // Get cached tile
  const getTile = useCallback(async (z, x, y, style = 'osm') => {
    if (!dbRef.current) return null;
    
    const key = getTileKey(z, x, y, style);
    
    const tx = dbRef.current.transaction(TILE_STORE, 'readonly');
    const store = tx.objectStore(TILE_STORE);
    
    return new Promise((resolve) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        if (result?.blob) {
          resolve(URL.createObjectURL(result.blob));
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  }, []);
  
  return {
    // State
    isSupported,
    isLoading,
    progress,
    error,
    regions,
    cacheSize,
    cacheSizeFormatted: estimateStorageSize(cacheSize / 15000),
    
    // Actions
    downloadRegion,
    cancelDownload,
    deleteRegion,
    clearCache,
    clearExpired,
    getTile,
    
    // Utilities
    calculateTilesInBounds,
    estimateStorageSize,
  };
};

/**
 * Format cache size for display
 */
export const formatCacheSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

export default useOfflineTiles;
