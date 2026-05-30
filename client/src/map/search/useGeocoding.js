/**
 * useGeocoding - Hook for Nominatim geocoding with debounce
 * Handles forward geocoding (text → coordinates) and reverse geocoding (coordinates → text)
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { API_ENDPOINTS, MAP_CONFIG } from '../core/constants';

/**
 * @param {Object} options
 * @param {number} options.debounceMs - Debounce delay in ms (default: 400)
 * @param {number} options.minLength - Minimum query length (default: 3)
 * @param {number} options.maxResults - Maximum results to fetch (default: 8)
 * @param {string} options.countryCode - Limit to country (default: 'ke' for Kenya)
 * @param {Array} options.viewbox - Bounding box [minLng, minLat, maxLng, maxLat]
 */
export function useGeocoding({
  debounceMs = MAP_CONFIG.searchDebounceMs,
  minLength = MAP_CONFIG.minSearchLength,
  maxResults = MAP_CONFIG.maxSearchResults,
  countryCode = 'ke',
  viewbox = null
} = {}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  
  const timeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Forward geocoding (search text → locations)
  const search = useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.length < minLength) {
      setResults([]);
      return [];
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsSearching(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        format: 'json',
        addressdetails: 1,
        limit: maxResults,
        'accept-language': 'en'
      });

      if (countryCode) {
        params.append('countrycodes', countryCode);
      }

      if (viewbox) {
        params.append('viewbox', viewbox.join(','));
        params.append('bounded', 1);
      }

      const response = await fetch(
        `${API_ENDPOINTS.nominatim.search}?${params}`,
        {
          signal: abortControllerRef.current.signal,
          headers: {
            'Accept': 'application/json'
            // User-Agent cannot be set by browser fetch — browsers block/ignore it
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform results to consistent format
      const transformedResults = data.map((item, index) => ({
        id: item.place_id || index,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        displayName: item.display_name,
        shortName: formatShortName(item),
        type: item.type,
        category: item.category,
        address: item.address,
        importance: item.importance,
        boundingBox: item.boundingbox?.map(parseFloat)
      }));

      setResults(transformedResults);
      setIsSearching(false);
      return transformedResults;
    } catch (err) {
      if (err.name === 'AbortError') {
        // Request was cancelled, ignore
        return [];
      }
      setError(err.message);
      setIsSearching(false);
      return [];
    }
  }, [minLength, maxResults, countryCode, viewbox]);

  // Debounced search
  const debouncedSearch = useCallback((searchQuery) => {
    setQuery(searchQuery);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!searchQuery || searchQuery.length < minLength) {
      setResults([]);
      return;
    }

    timeoutRef.current = setTimeout(() => {
      search(searchQuery);
    }, debounceMs);
  }, [search, minLength, debounceMs]);

  // Reverse geocoding (coordinates → address)
  const reverseGeocode = useCallback(async (lat, lng) => {
    setIsSearching(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lng.toString(),
        format: 'json',
        addressdetails: 1,
        zoom: 18,
        'accept-language': 'en'
      });

      const response = await fetch(
        `${API_ENDPOINTS.nominatim.reverse}?${params}`,
        {
          headers: {
            'Accept': 'application/json'
            // User-Agent cannot be set by browser fetch — browsers block/ignore it
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Reverse geocode failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      const result = {
        id: data.place_id,
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lon),
        displayName: data.display_name,
        shortName: formatShortName(data),
        type: data.type,
        category: data.category,
        address: data.address
      };

      setSelectedResult(result);
      setIsSearching(false);
      return result;
    } catch (err) {
      setError(err.message);
      setIsSearching(false);
      return null;
    }
  }, []);

  // Select a result
  const selectResult = useCallback((result) => {
    setSelectedResult(result);
    setQuery(result.shortName || result.displayName.split(',')[0]);
    setResults([]);
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setSelectedResult(null);
    setError(null);
  }, []);

  return {
    query,
    results,
    isSearching,
    error,
    selectedResult,
    search,
    debouncedSearch,
    reverseGeocode,
    selectResult,
    clearSearch,
    setQuery
  };
}

// Helper to format short location name
function formatShortName(item) {
  const address = item.address || {};
  
  // Priority: suburb, neighbourhood, road, city
  const parts = [];
  
  if (address.road) parts.push(address.road);
  if (address.suburb) parts.push(address.suburb);
  else if (address.neighbourhood) parts.push(address.neighbourhood);
  else if (address.city) parts.push(address.city);
  else if (address.town) parts.push(address.town);
  else if (address.village) parts.push(address.village);
  
  if (parts.length === 0) {
    return item.display_name.split(',')[0];
  }
  
  return parts.slice(0, 2).join(', ');
}

export default useGeocoding;
