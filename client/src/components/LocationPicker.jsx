import React, { useState, useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import toast from 'react-hot-toast';
import { searchAddress, reverseGeocode } from '../map/search/fuzzySearch';

const NAIROBI = { lat: -1.286389, lng: 36.817223 };
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/bright'; // Switched to bright for better visuals
const BRAND = '#6B0F1A';

// Local storage key for recent searches
const RECENT_SEARCHES_KEY = 'taji_recent_locations';
const MAX_RECENT_SEARCHES = 5;

/* ─────────────────────────────────────────────────────────────
   SEARCH: Uses 3-layer architecture from fuzzySearch.js
   Layer 1: Local Nairobi gazetteer (instant, curated)
   Layer 2: Nominatim fallback (single query, rate-limited)
   Layer 3: Strict relevance gate (filters garbage)
───────────────────────────────────────────────────────────── */

/**
 * Bold-highlight query words inside a result name.
 * Splits on the matched tokens to preserve case.
 */
function HighlightedText({ text, query }) {
  if (!query || !query.trim()) return <span>{text}</span>;
  const words = query.trim().split(/\s+/).filter(w => w.length > 1);
  if (!words.length) return <span>{text}</span>;
  const escaped = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts   = text.split(pattern);
  const matchSet = new Set(words.map(w => w.toLowerCase()));
  return (
    <span>
      {parts.map((part, i) =>
        matchSet.has(part.toLowerCase())
          ? <strong key={i} style={{ color: BRAND, fontWeight: 700 }}>{part}</strong>
          : <span key={i}>{part}</span>
      )}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   RECENT SEARCHES - localStorage persistence
───────────────────────────────────────────────────────────── */

function getRecentSearches() {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addRecentSearch(item) {
  try {
    const recent = getRecentSearches();
    // Remove duplicates (same name)
    const filtered = recent.filter(r => r.name.toLowerCase() !== item.name.toLowerCase());
    // Add to front, limit
    const updated = [item, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

/* ───────────────────────────────────────────────────────────── */

/** Custom SVG teardrop marker in brand maroon */
function createMarkerEl() {
  const el = document.createElement('div');
  el.style.cssText = 'width:34px;height:44px;cursor:grab;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.28))';
  el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 44" fill="none">
    <path d="M17 2C10.373 2 5 7.373 5 14c0 9.25 12 28 12 28S29 23.25 29 14C29 7.373 23.627 2 17 2z"
      fill="${BRAND}" stroke="white" stroke-width="1.5"/>
    <circle cx="17" cy="14" r="5.5" fill="white" opacity="0.92"/>
  </svg>`;
  return el;
}

/**
 * LocationPicker - Premium map experience with GPS auto-fill
 * 
 * @param {Function} onLocationSelect - Callback when location is selected (coords, displayName)
 * @param {Function} onAddressDataReady - NEW: Callback with structured address data for form auto-fill
 * @param {Object} initialPosition - Initial map center {lat, lng}
 * @param {string} className - Additional CSS classes
 */
const LocationPicker = ({ 
  onLocationSelect, 
  onAddressDataReady,  // NEW: structured address callback
  initialPosition = null, 
  className = '' 
}) => {
  const [position, setPosition]           = useState(initialPosition);
  const [gpsLoading, setGpsLoading]       = useState(false);
  const [reverseLoading, setReverseLoading] = useState(false); // NEW: reverse geocode loading
  const [searchQuery, setSearchQuery]     = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown]   = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError]     = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const [inputFocused, setInputFocused]   = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);

  const debounceTimer  = useRef(null);
  const mapContainerRef = useRef(null);
  const mapRef         = useRef(null);
  const markerRef      = useRef(null);
  const geolocateRef   = useRef(null); // NEW: GeolocateControl ref
  const dropdownRef    = useRef(null);
  const inputRef       = useRef(null);

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  /* ── Reverse geocode and notify parent ── */
  const handleReverseGeocode = useCallback(async (lat, lng, source = 'unknown') => {
    if (!onAddressDataReady) return; // No callback, skip reverse geocoding
    
    setReverseLoading(true);
    try {
      const addressData = await reverseGeocode(lat, lng);
      if (addressData) {
        onAddressDataReady(addressData, source);
        console.log(`[LocationPicker] Reverse geocoded (${source}):`, addressData.addressLine);
      }
    } catch (error) {
      console.warn('[LocationPicker] Reverse geocode failed:', error);
    } finally {
      setReverseLoading(false);
    }
  }, [onAddressDataReady]);

  /* ── Place / replace custom marker (draggable) ── */
  const placeMarker = useCallback((lat, lng, options = {}) => {
    if (!mapRef.current) return;
    if (markerRef.current) markerRef.current.remove();
    
    const draggable = options.draggable !== false; // Default draggable
    
    markerRef.current = new maplibregl.Marker({ 
      element: createMarkerEl(), 
      anchor: 'bottom',
      draggable: draggable
    })
      .setLngLat([lng, lat])
      .addTo(mapRef.current);
    
    // Handle drag end - reverse geocode new position
    if (draggable) {
      markerRef.current.on('dragend', async () => {
        const lngLat = markerRef.current.getLngLat();
        const newPos = { lat: lngLat.lat, lng: lngLat.lng };
        setPosition(newPos);
        if (onLocationSelect) onLocationSelect(newPos);
        
        // Reverse geocode dragged position
        await handleReverseGeocode(newPos.lat, newPos.lng, 'marker-drag');
        toast.success('📍 Location updated');
      });
    }
  }, [onLocationSelect, handleReverseGeocode]);

  /* ── Map init with GeolocateControl ── */
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const center = position || NAIROBI;
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE,
      center: [center.lng, center.lat],
      zoom: position ? 16 : 13,
    });
    
    // Navigation controls (top-right)
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    
    // GeolocateControl with pulsing blue dot (bottom-right)
    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true,
      showAccuracyCircle: true
    });
    map.addControl(geolocate, 'bottom-right');
    geolocateRef.current = geolocate;
    
    // Handle geolocate event (when user clicks the blue dot button)
    geolocate.on('geolocate', async (e) => {
      const newPos = { lat: e.coords.latitude, lng: e.coords.longitude };
      setPosition(newPos);
      if (onLocationSelect) onLocationSelect(newPos);
      placeMarker(newPos.lat, newPos.lng);
      
      // Reverse geocode GPS position
      await handleReverseGeocode(newPos.lat, newPos.lng, 'geolocate-control');
      toast.success('📍 Address auto-filled from your location');
    });
    
    // Handle click on map - place marker and reverse geocode
    map.on('click', async (e) => {
      const { lng, lat } = e.lngLat;
      const newPos = { lat, lng };
      setPosition(newPos);
      if (onLocationSelect) onLocationSelect(newPos);
      placeMarker(lat, lng);
      
      // Reverse geocode clicked position
      await handleReverseGeocode(lat, lng, 'map-click');
    });
    
    mapRef.current = map;
    if (position) placeMarker(position.lat, position.lng);
    
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Fly + re-mark on external position change ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !position) return;
    map.flyTo({ center: [position.lng, position.lat], zoom: 16, duration: 1200 });
    placeMarker(position.lat, position.lng);
  }, [position, placeMarker]);

  /* ── Close dropdown on outside click ── */
  useEffect(() => {
    const onDown = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  /* ── GPS button handler ── */
  const handleGPS = async () => {
    if (!('geolocation' in navigator)) { 
      toast.error('Geolocation not supported by your browser'); 
      return; 
    }
    setGpsLoading(true);
    
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(newPos);
        if (onLocationSelect) onLocationSelect(newPos);
        placeMarker(newPos.lat, newPos.lng);
        
        // Reverse geocode and auto-fill
        await handleReverseGeocode(newPos.lat, newPos.lng, 'gps-button');
        
        setGpsLoading(false);
        toast.success('📍 Address auto-filled from your location');
      },
      (error) => {
        let message = 'Could not get your location.';
        if (error.code === error.PERMISSION_DENIED) {
          message = 'Location access denied. Please enable location in your browser settings.';
        } else if (error.code === error.TIMEOUT) {
          message = 'Location request timed out. Please try again.';
        }
        toast.error(message);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  };

  /* ── Fuzzy search pipeline (3-layer architecture) ── */
  const doSearch = async (query) => {
    if (!query || query.trim().length < 2) { 
      setSearchResults([]); 
      // Show recent searches if query is empty
      if (!query.trim() && recentSearches.length > 0) {
        setShowDropdown(true);
      } else {
        setShowDropdown(false); 
      }
      return; 
    }
    setSearchLoading(true);
    setSearchError(false);
    try {
      const results = await searchAddress(query, { limit: 8 });
      // Map to expected format (lat/lon for compatibility)
      const mapped = results.map((r, i) => ({
        place_id: r.raw?.place_id || `local_${i}`,
        display_name: r.displayName || r.name,
        lat: r.lat,
        lon: r.lng, // Map lng to lon for compatibility
        name: r.name,
        source: r.source,
        score: r.score,
      }));
      setSearchResults(mapped);
      setShowDropdown(true);
      setHighlightedIdx(-1);
    } catch {
      setSearchError(true);
      setShowDropdown(true);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => doSearch(val), 350);
  };

  const handleInputFocus = () => {
    setInputFocused(true);
    // Show recent searches when focused and empty
    if (!searchQuery.trim() && recentSearches.length > 0) {
      setShowDropdown(true);
    } else if (searchResults.length > 0) {
      setShowDropdown(true);
    }
  };

  const selectResult = async (result) => {
    const newPos = { lat: parseFloat(result.lat), lng: parseFloat(result.lon || result.lng) };
    setPosition(newPos);
    setSearchQuery(getResultName(result));
    setShowDropdown(false);
    setHighlightedIdx(-1);
    
    // Add to recent searches
    const updated = addRecentSearch({
      name: getResultName(result),
      displayName: result.display_name,
      lat: newPos.lat,
      lng: newPos.lng,
    });
    setRecentSearches(updated);
    
    if (onLocationSelect) onLocationSelect(newPos, result.display_name);
    
    // Reverse geocode for full address data
    await handleReverseGeocode(newPos.lat, newPos.lng, 'search-select');
  };

  const selectRecentSearch = async (recent) => {
    const newPos = { lat: recent.lat, lng: recent.lng };
    setPosition(newPos);
    setSearchQuery(recent.name);
    setShowDropdown(false);
    
    if (onLocationSelect) onLocationSelect(newPos, recent.displayName);
    
    // Reverse geocode for full address data
    await handleReverseGeocode(newPos.lat, newPos.lng, 'recent-search');
  };

  const handleKeyDown = (e) => {
    if (!showDropdown) return;
    const items = searchQuery.trim() ? searchResults : recentSearches;
    if (e.key === 'ArrowDown')  { e.preventDefault(); setHighlightedIdx((i) => Math.min(i + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlightedIdx((i) => Math.max(i - 1, -1)); }
    else if (e.key === 'Enter' && highlightedIdx >= 0) { 
      e.preventDefault(); 
      if (searchQuery.trim()) {
        selectResult(items[highlightedIdx]); 
      } else {
        selectRecentSearch(items[highlightedIdx]);
      }
    }
    else if (e.key === 'Escape') { setShowDropdown(false); }
  };

  /* ── Result label helpers ── */
  const getResultName = (result) => {
    // Use name from new search module if available
    if (result.name) return result.name;
    const a = result.address;
    return a?.road || a?.neighbourhood || a?.suburb || a?.city_district || a?.town || a?.village || result.display_name.split(',')[0];
  };
  const getResultSub = (result) => {
    // Handle both local (no sub-address) and Nominatim results
    const parts = result.display_name?.split(',') || [];
    return parts.slice(1, 4).join(',').trim() || (result.source === 'local' ? 'Nairobi, Kenya' : '');
  };

  // Show recent searches or search results
  const showingRecent = !searchQuery.trim() && recentSearches.length > 0;
  const displayItems = showingRecent ? recentSearches : searchResults;

  return (
    <div className={`relative ${className}`}>

      {/* ── Search row: stacked on mobile ── */}
      <div className="relative mb-3" ref={dropdownRef}>
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Search input */}
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" width="14" height="14"
              viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2.2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search for a location in Kenya…"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={handleInputFocus}
              onBlur={() => setInputFocused(false)}
              onKeyDown={handleKeyDown}
              style={{
                width: '100%', minHeight: 44, paddingLeft: 38, paddingRight: 12,
                paddingTop: 11, paddingBottom: 11, fontSize: 14,
                border: `1.5px solid ${inputFocused ? BRAND : '#e2d5c8'}`,
                borderRadius: 8, background: '#FDFAF7', color: '#1A0A0A',
                outline: 'none', boxSizing: 'border-box',
                boxShadow: inputFocused ? '0 0 0 3px rgba(107,15,26,0.12)' : 'none',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
            />

            {/* Dropdown */}
            {showDropdown && (
              <div style={{
                position: 'absolute', zIndex: 1000, top: '100%', left: 0, right: 0,
                marginTop: 4, background: 'white', border: '1px solid #e2d5c8',
                borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                maxHeight: 280, overflowY: 'auto',
              }}>
                {/* Recent searches header */}
                {showingRecent && (
                  <div style={{ padding: '10px 14px 6px', fontSize: 11, fontWeight: 600, color: '#6b5c5c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Recent searches
                  </div>
                )}
                
                {searchLoading && (
                  <div style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 8, color: '#6b5c5c', fontSize: 13 }}>
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.2"/><path d="M12 2a10 10 0 0 1 10 10"/>
                    </svg>
                    Searching…
                  </div>
                )}
                {!searchLoading && searchError && !showingRecent && (
                  <div style={{ padding: '13px 16px', color: '#6b5c5c', fontSize: 13, textAlign: 'center' }}>
                    Search unavailable. Please try again.
                  </div>
                )}
                {!searchLoading && !searchError && displayItems.length === 0 && !showingRecent && (
                  <div style={{ padding: '13px 16px', color: '#6b5c5c', fontSize: 13, textAlign: 'center' }}>
                    {searchQuery.trim()
                      ? `No results for "${searchQuery}" — try a shorter word`
                      : 'Start typing to search…'}
                  </div>
                )}
                {!searchLoading && !searchError && displayItems.map((item, i) => (
                  <button
                    key={item.place_id || item.name || i}
                    type="button"
                    onMouseDown={(e) => { 
                      e.preventDefault(); 
                      showingRecent ? selectRecentSearch(item) : selectResult(item); 
                    }}
                    onMouseEnter={() => setHighlightedIdx(i)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%',
                      textAlign: 'left', padding: '10px 14px', minHeight: 44, border: 'none',
                      borderBottom: i < displayItems.length - 1 ? '1px solid #f5ece8' : 'none',
                      borderLeft: `3px solid ${i === highlightedIdx ? BRAND : 'transparent'}`,
                      background: i === highlightedIdx ? '#fdf3f0' : 'transparent',
                      cursor: 'pointer', transition: 'background 0.1s',
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill={showingRecent ? '#6b5c5c' : BRAND} style={{ marginTop: 3, flexShrink: 0 }}>
                      {showingRecent ? (
                        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" fill="none"/>
                      ) : (
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                      )}
                    </svg>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#1A0A0A', lineHeight: '1.3' }}>
                        {showingRecent ? item.name : <HighlightedText text={getResultName(item)} query={searchQuery} />}
                      </div>
                      <div style={{ fontSize: 11, color: '#6b5c5c', marginTop: 2, lineHeight: '1.3' }}>
                        {showingRecent ? (item.displayName?.split(',').slice(1, 3).join(',') || 'Nairobi, Kenya') : getResultSub(item)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* GPS button - full width on mobile with visible label */}
          <button
            type="button"
            onClick={handleGPS}
            disabled={gpsLoading || reverseLoading}
            className="gps-location-button"
            style={{
              background: 'linear-gradient(135deg, #6B0F1A, #9B1428)',
              color: 'white', border: 'none', borderRadius: 10,
              padding: '12px 16px', minHeight: 48, flexShrink: 0,
              cursor: (gpsLoading || reverseLoading) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap',
              opacity: (gpsLoading || reverseLoading) ? 0.72 : 1,
              transition: 'opacity 0.15s, transform 0.1s, background 0.15s',
              width: '100%',  // Full width on mobile (stacked)
            }}
          >
            {gpsLoading ? (
              <>
                {/* Spinner */}
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                  <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                </svg>
                <span>Locating…</span>
              </>
            ) : (
              <>
                {/* Crosshair/target icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                </svg>
                <span>Use My Location</span>
              </>
            )}
          </button>
        </div>
        
        {/* Hint text under search/GPS - helps users understand the GPS option */}
        <p style={{
          fontSize: 12, color: '#8a7050', textAlign: 'center',
          margin: '10px 0 0', lineHeight: 1.4,
        }}>
          📍 Tap "Use My Location" to auto-fill your address, or search above
        </p>
      </div>

      {/* ── Map: shorter on mobile (200px) for less scroll ── */}
      <div
        className="h-[200px] sm:h-[300px]"
        style={{
          position: 'relative', borderRadius: 10, overflow: 'hidden',
          border: '1px solid #e8d5c4', boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
        }}
      >
        <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
        
        {/* Reverse geocode loading indicator */}
        {reverseLoading && (
          <div style={{
            position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(255,255,255,0.95)', padding: '6px 14px',
            borderRadius: 20, fontSize: 12, fontWeight: 500, color: BRAND,
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)', zIndex: 10,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.2"/><path d="M12 2a10 10 0 0 1 10 10"/>
            </svg>
            Getting address…
          </div>
        )}
        
        {!position && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'center', pointerEvents: 'none', zIndex: 1,
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.93)', padding: '10px 18px',
              borderRadius: 8, textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill={BRAND} style={{ margin: '0 auto 4px', display: 'block' }}>
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              <p style={{ fontSize: 13, color: '#1A0A0A', fontWeight: 600, margin: 0 }}>Tap to select delivery location</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Location Confirmed card ── */}
      {position && (
        <div style={{
          marginTop: 12, padding: '11px 14px', background: '#f0fdf4',
          border: '1px solid #bbf7d0', borderLeft: '4px solid #15803d',
          borderRadius: '0 8px 8px 0',
        }}>
          <p style={{ fontWeight: 700, fontSize: 13, color: '#166534', margin: '0 0 3px', display: 'flex', alignItems: 'center', gap: 6 }}>
            📍 Location Confirmed
            {reverseLoading && <span style={{ fontSize: 11, fontWeight: 500, color: '#15803d' }}>(updating address...)</span>}
          </p>
          <p style={{ fontSize: 11, color: '#15803d', fontFamily: 'ui-monospace, monospace', margin: 0 }}>
            {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
          </p>
          <p style={{ fontSize: 11, color: '#166534', marginTop: 4, fontStyle: 'italic' }}>
            💡 Drag the marker to adjust your exact location
          </p>
        </div>
      )}
    </div>
  );
};

export default LocationPicker;
