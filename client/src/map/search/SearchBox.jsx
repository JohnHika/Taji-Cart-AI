/**
 * SearchBox - Premium geocoding autocomplete component
 * Features: debounced search, keyboard navigation, recent searches, reverse geocode
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaSearch, FaTimes, FaHistory, FaMapMarkerAlt, FaCrosshairs } from 'react-icons/fa';
import { useGeocoding } from './useGeocoding';
import { useRecentSearches } from './useRecentSearches';

const SearchBox = ({
  onSelect,
  onLocationRequest,
  placeholder = 'Search for a location...',
  className = '',
  initialValue = '',
  showRecentSearches = true,
  showLocationButton = true,
  autoFocus = false,
  countryCode = 'ke'
}) => {
  const {
    query,
    results,
    isSearching,
    error,
    debouncedSearch,
    selectResult,
    reverseGeocode,
    clearSearch,
    setQuery
  } = useGeocoding({ countryCode });

  const { recentSearches, addSearch, removeSearch } = useRecentSearches();

  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Set initial value
  useEffect(() => {
    if (initialValue) {
      setQuery(initialValue);
    }
  }, [initialValue, setQuery]);

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    debouncedSearch(value);
    setHighlightedIndex(-1);
    setShowDropdown(true);
  };

  // Handle result selection
  const handleSelect = useCallback((result) => {
    selectResult(result);
    addSearch(result);
    setShowDropdown(false);
    setHighlightedIndex(-1);
    if (onSelect) {
      onSelect(result);
    }
  }, [selectResult, addSearch, onSelect]);

  // Handle recent search selection
  const handleRecentSelect = useCallback((recent) => {
    const result = {
      ...recent,
      displayName: recent.displayName,
      shortName: recent.shortName
    };
    handleSelect(result);
  }, [handleSelect]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    const items = results.length > 0 ? results : (showRecentSearches ? recentSearches : []);
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => Math.min(prev + 1, items.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < items.length) {
          const item = items[highlightedIndex];
          if (results.length > 0) {
            handleSelect(item);
          } else {
            handleRecentSelect(item);
          }
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle focus
  const handleFocus = () => {
    setIsFocused(true);
    setShowDropdown(true);
  };

  // Handle blur (with delay to allow click on dropdown)
  const handleBlur = () => {
    setTimeout(() => {
      setIsFocused(false);
      setShowDropdown(false);
      setHighlightedIndex(-1);
    }, 200);
  };

  // Handle clear
  const handleClear = () => {
    clearSearch();
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  // Handle location request (GPS)
  const handleLocationRequest = async () => {
    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      return;
    }

    setIsLocating(true);

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      const { latitude: lat, longitude: lng } = position.coords;

      // Reverse geocode to get address
      const result = await reverseGeocode(lat, lng);
      
      if (result) {
        addSearch(result);
        if (onSelect) onSelect(result);
      }

      if (onLocationRequest) {
        onLocationRequest({ lat, lng, result });
      }
    } catch (err) {
      console.error('Geolocation error:', err);
    } finally {
      setIsLocating(false);
    }
  };

  // Determine what to show in dropdown
  const showResults = results.length > 0;
  const showRecent = !showResults && showRecentSearches && recentSearches.length > 0 && query.length < 3;
  const showEmpty = !showResults && !showRecent && query.length >= 3 && !isSearching;

  return (
    <div className={`relative ${className}`}>
      {/* Search input with buttons */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          {/* Search icon */}
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          
          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-200 focus:outline-none transition-all min-h-[44px]"
            aria-label="Search location"
            aria-expanded={showDropdown}
            aria-controls="search-dropdown"
            aria-activedescendant={highlightedIndex >= 0 ? `search-result-${highlightedIndex}` : undefined}
            role="combobox"
            autoComplete="off"
          />

          {/* Loading / Clear button */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isSearching ? (
              <div className="w-4 h-4 border-2 border-primary-200 border-t-transparent rounded-full animate-spin" />
            ) : query.length > 0 ? (
              <button
                type="button"
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-600 p-1"
                aria-label="Clear search"
              >
                <FaTimes className="w-3 h-3" />
              </button>
            ) : null}
          </div>
        </div>

        {/* GPS button */}
        {showLocationButton && (
          <button
            type="button"
            onClick={handleLocationRequest}
            disabled={isLocating}
            className="flex items-center gap-2 px-4 py-3 bg-primary-200 text-white rounded-lg hover:bg-primary-100 disabled:opacity-50 transition-colors min-h-[44px] whitespace-nowrap"
            aria-label={isLocating ? 'Finding location...' : 'Use my location'}
          >
            <FaCrosshairs className={isLocating ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{isLocating ? 'Finding...' : 'Use GPS'}</span>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (showResults || showRecent || showEmpty) && (
        <div
          ref={dropdownRef}
          id="search-dropdown"
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-auto"
          role="listbox"
        >
          {/* Recent searches header */}
          {showRecent && (
            <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100 flex items-center gap-2">
              <FaHistory className="w-3 h-3" />
              Recent Searches
            </div>
          )}

          {/* Search results */}
          {showResults && results.map((result, index) => (
            <button
              key={result.id}
              id={`search-result-${index}`}
              type="button"
              onClick={() => handleSelect(result)}
              className={`w-full text-left px-3 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-b-0 transition-colors ${
                highlightedIndex === index ? 'bg-primary-50' : ''
              }`}
              role="option"
              aria-selected={highlightedIndex === index}
            >
              <div className="flex items-start gap-2">
                <FaMapMarkerAlt className="text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">
                    {result.shortName}
                  </div>
                  <div className="text-xs text-gray-500 truncate mt-0.5">
                    {result.displayName}
                  </div>
                </div>
              </div>
            </button>
          ))}

          {/* Recent searches */}
          {showRecent && recentSearches.map((recent, index) => (
            <button
              key={recent.id}
              id={`search-result-${index}`}
              type="button"
              onClick={() => handleRecentSelect(recent)}
              className={`w-full text-left px-3 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-b-0 transition-colors group ${
                highlightedIndex === index ? 'bg-primary-50' : ''
              }`}
              role="option"
              aria-selected={highlightedIndex === index}
            >
              <div className="flex items-center gap-2">
                <FaHistory className="text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-700 truncate">{recent.shortName}</div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSearch(recent.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-1 transition-opacity"
                  aria-label="Remove from recent"
                >
                  <FaTimes className="w-3 h-3" />
                </button>
              </div>
            </button>
          ))}

          {/* No results */}
          {showEmpty && (
            <div className="px-3 py-4 text-center text-gray-500 text-sm">
              {error ? (
                <span className="text-red-500">Error: {error}</span>
              ) : (
                'No locations found. Try a different search.'
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBox;
