/**
 * ContextMenu - Right-click context menu for map
 * Features: coordinate display, copy, directions, what's here
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { FaCopy, FaRoute, FaMapPin, FaSearchLocation, FaTimes } from 'react-icons/fa';
import { useGeocoding } from '../search/useGeocoding';

const ContextMenu = ({
  map,
  onDirectionsFrom,
  onDirectionsTo,
  onDropPin,
  onCopyCoordinates,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [lngLat, setLngLat] = useState(null);
  const [address, setAddress] = useState(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  
  const menuRef = useRef(null);
  const { reverseGeocode } = useGeocoding();

  // Handle context menu event
  useEffect(() => {
    if (!map) return;

    const handleContextMenu = (e) => {
      e.preventDefault();
      
      const { point, lngLat: clickLngLat } = e;
      
      // Position menu near click, but keep within viewport
      const menuWidth = 200;
      const menuHeight = 200;
      const padding = 10;
      
      let x = point.x;
      let y = point.y;
      
      const container = map.getContainer();
      const containerRect = container.getBoundingClientRect();
      
      if (x + menuWidth + padding > containerRect.width) {
        x = x - menuWidth;
      }
      
      if (y + menuHeight + padding > containerRect.height) {
        y = y - menuHeight;
      }
      
      setPosition({ x, y });
      setLngLat(clickLngLat);
      setAddress(null);
      setIsOpen(true);
      
      // Reverse geocode to get address
      setIsLoadingAddress(true);
      reverseGeocode(clickLngLat.lat, clickLngLat.lng)
        .then((result) => {
          if (result) {
            setAddress(result.shortName || result.displayName.split(',')[0]);
          }
        })
        .finally(() => {
          setIsLoadingAddress(false);
        });
    };

    const handleClick = () => {
      setIsOpen(false);
    };

    const handleMoveStart = () => {
      setIsOpen(false);
    };

    map.on('contextmenu', handleContextMenu);
    map.on('click', handleClick);
    map.on('movestart', handleMoveStart);

    return () => {
      map.off('contextmenu', handleContextMenu);
      map.off('click', handleClick);
      map.off('movestart', handleMoveStart);
    };
  }, [map, reverseGeocode]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Format coordinates for display
  const formatCoords = useCallback((lngLat) => {
    if (!lngLat) return '';
    return `${lngLat.lat.toFixed(6)}, ${lngLat.lng.toFixed(6)}`;
  }, []);

  // Copy coordinates to clipboard
  const handleCopy = useCallback(async () => {
    if (!lngLat) return;
    
    const coords = formatCoords(lngLat);
    
    try {
      await navigator.clipboard.writeText(coords);
      if (onCopyCoordinates) onCopyCoordinates(lngLat, coords);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
    
    setIsOpen(false);
  }, [lngLat, formatCoords, onCopyCoordinates]);

  // Handle directions from here
  const handleDirectionsFrom = useCallback(() => {
    if (!lngLat) return;
    if (onDirectionsFrom) onDirectionsFrom(lngLat, address);
    setIsOpen(false);
  }, [lngLat, address, onDirectionsFrom]);

  // Handle directions to here
  const handleDirectionsTo = useCallback(() => {
    if (!lngLat) return;
    if (onDirectionsTo) onDirectionsTo(lngLat, address);
    setIsOpen(false);
  }, [lngLat, address, onDirectionsTo]);

  // Handle drop pin
  const handleDropPin = useCallback(() => {
    if (!lngLat) return;
    if (onDropPin) onDropPin(lngLat, address);
    setIsOpen(false);
  }, [lngLat, address, onDropPin]);

  if (!isOpen || !lngLat) return null;

  return (
    <div
      ref={menuRef}
      className={`absolute z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[200px] ${className}`}
      style={{ left: position.x, top: position.y }}
      role="menu"
      aria-label="Map context menu"
    >
      {/* Coordinates header */}
      <div className="px-3 py-2 border-b border-gray-100">
        <div className="text-xs text-gray-500 mb-1">
          {isLoadingAddress ? (
            <span className="animate-pulse">Finding address...</span>
          ) : address ? (
            <span className="font-medium text-gray-700">{address}</span>
          ) : (
            'Coordinates'
          )}
        </div>
        <div className="text-sm font-mono text-gray-600">
          {formatCoords(lngLat)}
        </div>
      </div>

      {/* Menu items */}
      <div className="py-1">
        {/* Copy coordinates */}
        <button
          type="button"
          onClick={handleCopy}
          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          role="menuitem"
        >
          <FaCopy className="w-4 h-4 text-gray-400" />
          Copy coordinates
        </button>

        {/* Directions from */}
        {onDirectionsFrom && (
          <button
            type="button"
            onClick={handleDirectionsFrom}
            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            role="menuitem"
          >
            <FaRoute className="w-4 h-4 text-gray-400" />
            Directions from here
          </button>
        )}

        {/* Directions to */}
        {onDirectionsTo && (
          <button
            type="button"
            onClick={handleDirectionsTo}
            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            role="menuitem"
          >
            <FaRoute className="w-4 h-4 text-gray-400" />
            Directions to here
          </button>
        )}

        {/* Drop pin */}
        {onDropPin && (
          <button
            type="button"
            onClick={handleDropPin}
            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            role="menuitem"
          >
            <FaMapPin className="w-4 h-4 text-gray-400" />
            Drop a pin here
          </button>
        )}
      </div>
    </div>
  );
};

export default ContextMenu;
