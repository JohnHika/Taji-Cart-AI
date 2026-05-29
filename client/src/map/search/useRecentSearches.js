/**
 * useRecentSearches - Hook for managing recent search history
 * Persists to localStorage with deduplication
 */
import { useState, useCallback, useEffect } from 'react';
import { STORAGE_KEYS } from '../core/constants';

const MAX_RECENT_SEARCHES = 10;

export function useRecentSearches(maxItems = MAX_RECENT_SEARCHES) {
  const [recentSearches, setRecentSearches] = useState([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.recentSearches);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed.slice(0, maxItems));
        }
      }
    } catch (e) {
      console.warn('Failed to load recent searches:', e);
    }
  }, [maxItems]);

  // Save to localStorage
  const saveToStorage = useCallback((searches) => {
    try {
      localStorage.setItem(STORAGE_KEYS.recentSearches, JSON.stringify(searches));
    } catch (e) {
      console.warn('Failed to save recent searches:', e);
    }
  }, []);

  // Add a new search
  const addSearch = useCallback((result) => {
    if (!result || !result.lat || !result.lng) return;

    const searchItem = {
      id: result.id || `${result.lat}-${result.lng}`,
      lat: result.lat,
      lng: result.lng,
      displayName: result.displayName,
      shortName: result.shortName || result.displayName.split(',')[0],
      timestamp: Date.now()
    };

    setRecentSearches(prev => {
      // Remove duplicates (same coordinates)
      const filtered = prev.filter(
        s => !(Math.abs(s.lat - searchItem.lat) < 0.0001 && Math.abs(s.lng - searchItem.lng) < 0.0001)
      );

      // Add to front, limit to maxItems
      const updated = [searchItem, ...filtered].slice(0, maxItems);
      saveToStorage(updated);
      return updated;
    });
  }, [maxItems, saveToStorage]);

  // Remove a specific search
  const removeSearch = useCallback((id) => {
    setRecentSearches(prev => {
      const updated = prev.filter(s => s.id !== id);
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  // Clear all recent searches
  const clearAll = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(STORAGE_KEYS.recentSearches);
    } catch (e) {
      console.warn('Failed to clear recent searches:', e);
    }
  }, []);

  return {
    recentSearches,
    addSearch,
    removeSearch,
    clearAll
  };
}

export default useRecentSearches;
