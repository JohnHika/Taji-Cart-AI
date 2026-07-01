/**
 * CoordinatesPanel - Display current map center coordinates
 * Features: real-time update, click to copy, toggle formats
 */
import React, { useState, useEffect, useCallback } from 'react';
import { FaCopy, FaCheck, FaCompass } from 'react-icons/fa';

const CoordinatesPanel = ({
  map,
  position = 'bottom-right',
  showZoom = true,
  showBearing = false,
  className = ''
}) => {
  const [center, setCenter] = useState(null);
  const [zoom, setZoom] = useState(null);
  const [bearing, setBearing] = useState(null);
  const [copied, setCopied] = useState(false);
  const [format, setFormat] = useState('decimal'); // 'decimal' | 'dms'

  // Subscribe to map move
  useEffect(() => {
    if (!map) return;

    const updateCoords = () => {
      const mapCenter = map.getCenter();
      setCenter({ lat: mapCenter.lat, lng: mapCenter.lng });
      setZoom(map.getZoom());
      setBearing(map.getBearing());
    };

    // Initial update
    updateCoords();

    map.on('move', updateCoords);

    return () => {
      map.off('move', updateCoords);
    };
  }, [map]);

  // Format coordinates as decimal degrees
  const formatDecimal = useCallback((lat, lng) => {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }, []);

  // Format coordinates as DMS (degrees, minutes, seconds)
  const formatDMS = useCallback((lat, lng) => {
    const toDMS = (coord, isLat) => {
      const abs = Math.abs(coord);
      const deg = Math.floor(abs);
      const minFloat = (abs - deg) * 60;
      const min = Math.floor(minFloat);
      const sec = ((minFloat - min) * 60).toFixed(1);
      
      const dir = isLat 
        ? (coord >= 0 ? 'N' : 'S')
        : (coord >= 0 ? 'E' : 'W');
      
      return `${deg}°${min}'${sec}"${dir}`;
    };

    return `${toDMS(lat, true)} ${toDMS(lng, false)}`;
  }, []);

  // Get formatted string
  const formattedCoords = center
    ? format === 'decimal'
      ? formatDecimal(center.lat, center.lng)
      : formatDMS(center.lat, center.lng)
    : '--';

  // Copy coordinates
  const handleCopy = async () => {
    if (!center) return;
    
    try {
      await navigator.clipboard.writeText(formatDecimal(center.lat, center.lng));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Toggle format
  const toggleFormat = () => {
    setFormat(f => f === 'decimal' ? 'dms' : 'decimal');
  };

  // Position classes
  const positionClasses = {
    'bottom-right': 'bottom-2 right-2',
    'bottom-left': 'bottom-2 left-2',
    'top-right': 'top-2 right-2',
    'top-left': 'top-2 left-2'
  };

  return (
    <div
      className={`absolute ${positionClasses[position]} bg-white/90 backdrop-blur-sm rounded-md shadow-md px-2 py-1 text-xs font-mono flex items-center gap-2 z-10 ${className}`}
    >
      {/* Coordinates - clickable to toggle format */}
      <button
        type="button"
        onClick={toggleFormat}
        className="text-gray-700 hover:text-gray-900 transition-colors"
        title={`Click to switch to ${format === 'decimal' ? 'DMS' : 'decimal'} format`}
      >
        {formattedCoords}
      </button>

      {/* Zoom level */}
      {showZoom && zoom !== null && (
        <>
          <span className="text-gray-300">|</span>
          <span className="text-gray-500" title="Zoom level">
            z{zoom.toFixed(1)}
          </span>
        </>
      )}

      {/* Bearing */}
      {showBearing && bearing !== null && (
        <>
          <span className="text-gray-300">|</span>
          <span className="text-gray-500 flex items-center gap-1" title="Bearing">
            <FaCompass 
              className="w-3 h-3" 
              style={{ transform: `rotate(${bearing}deg)` }}
            />
            {Math.round(bearing)}°
          </span>
        </>
      )}

      {/* Copy button */}
      <button
        type="button"
        onClick={handleCopy}
        className={`p-1 rounded transition-colors ${
          copied 
            ? 'text-green-500' 
            : 'text-gray-400 hover:text-gray-600'
        }`}
        title="Copy coordinates"
        aria-label="Copy coordinates"
      >
        {copied ? (
          <FaCheck className="w-3 h-3" />
        ) : (
          <FaCopy className="w-3 h-3" />
        )}
      </button>
    </div>
  );
};

export default CoordinatesPanel;
