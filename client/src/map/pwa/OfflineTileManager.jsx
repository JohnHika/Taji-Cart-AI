/**
 * OfflineTileManager - UI for managing offline map tiles
 * Phase 8: PWA Features
 * 
 * Provides interface for downloading, viewing, and managing
 * offline map regions.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useOfflineTiles, formatCacheSize } from './useOfflineTiles';

/**
 * Download icon
 */
const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

/**
 * Trash icon
 */
const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

/**
 * Map icon
 */
const MapIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </svg>
);

/**
 * Storage icon
 */
const StorageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

/**
 * Progress bar component
 */
const ProgressBar = ({ current, total, label }) => {
  const percent = total > 0 ? (current / total) * 100 : 0;
  
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{label}</span>
          <span>{current} / {total} tiles</span>
        </div>
      )}
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

/**
 * Region card component
 */
const RegionCard = ({ region, onDelete, isDeleting }) => {
  const createdDate = new Date(region.createdAt).toLocaleDateString();
  const tileCount = region.tileCount || 0;
  
  return (
    <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
        <div className="w-5 h-5">
          <MapIcon />
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 dark:text-white truncate">
          {region.name}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {tileCount} tiles • {formatCacheSize(region.size || 0)} • {createdDate}
        </p>
      </div>
      
      <button
        onClick={() => onDelete(region.id)}
        disabled={isDeleting}
        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50"
        title="Delete region"
      >
        <div className="w-4 h-4">
          <TrashIcon />
        </div>
      </button>
    </div>
  );
};

/**
 * Download region form
 */
const DownloadForm = ({ map, onDownload, isLoading }) => {
  const [name, setName] = useState('');
  const [minZoom, setMinZoom] = useState(10);
  const [maxZoom, setMaxZoom] = useState(16);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!map || !name.trim()) return;
    
    const bounds = map.getBounds();
    onDownload({
      name: name.trim(),
      bounds: {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      },
      minZoom,
      maxZoom,
    });
  };
  
  // Estimate tile count
  const estimatedTiles = useMemo(() => {
    if (!map) return 0;
    
    const bounds = map.getBounds();
    let count = 0;
    
    for (let z = minZoom; z <= maxZoom; z++) {
      const n = Math.pow(2, z);
      const x1 = Math.floor((bounds.getWest() + 180) / 360 * n);
      const x2 = Math.floor((bounds.getEast() + 180) / 360 * n);
      const y1 = Math.floor((1 - Math.log(Math.tan(bounds.getNorth() * Math.PI / 180) + 
        1 / Math.cos(bounds.getNorth() * Math.PI / 180)) / Math.PI) / 2 * n);
      const y2 = Math.floor((1 - Math.log(Math.tan(bounds.getSouth() * Math.PI / 180) + 
        1 / Math.cos(bounds.getSouth() * Math.PI / 180)) / Math.PI) / 2 * n);
      
      count += (Math.abs(x2 - x1) + 1) * (Math.abs(y2 - y1) + 1);
    }
    
    return count;
  }, [map, minZoom, maxZoom]);
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Region Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Nairobi Downtown"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
          required
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Min Zoom
          </label>
          <input
            type="number"
            value={minZoom}
            onChange={(e) => setMinZoom(Number(e.target.value))}
            min={1}
            max={18}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Max Zoom
          </label>
          <input
            type="number"
            value={maxZoom}
            onChange={(e) => setMaxZoom(Number(e.target.value))}
            min={1}
            max={18}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>
      
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <p className="text-sm text-blue-600 dark:text-blue-400">
          <strong>{estimatedTiles.toLocaleString()}</strong> tiles
          <span className="mx-1">•</span>
          Estimated <strong>{formatCacheSize(estimatedTiles * 15000)}</strong>
        </p>
        <p className="text-xs text-blue-500 dark:text-blue-500 mt-1">
          Downloads current visible area at zoom levels {minZoom}-{maxZoom}
        </p>
      </div>
      
      <button
        type="submit"
        disabled={isLoading || !name.trim()}
        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg flex items-center justify-center gap-2"
      >
        <div className="w-5 h-5">
          <DownloadIcon />
        </div>
        {isLoading ? 'Downloading...' : 'Download for Offline'}
      </button>
    </form>
  );
};

/**
 * Main offline tile manager component
 */
export const OfflineTileManager = ({ 
  map, 
  isOpen = true, 
  onClose,
  className = '' 
}) => {
  const [showDownloadForm, setShowDownloadForm] = useState(false);
  const offlineTiles = useOfflineTiles();
  
  const handleDownload = useCallback(async (config) => {
    const result = await offlineTiles.downloadRegion(config);
    if (result) {
      setShowDownloadForm(false);
    }
  }, [offlineTiles]);
  
  const handleDelete = useCallback(async (regionId) => {
    if (window.confirm('Delete this offline region? This cannot be undone.')) {
      await offlineTiles.deleteRegion(regionId);
    }
  }, [offlineTiles]);
  
  const handleClearAll = useCallback(async () => {
    if (window.confirm('Delete all offline maps? This cannot be undone.')) {
      await offlineTiles.clearCache();
    }
  }, [offlineTiles]);
  
  if (!isOpen) return null;
  
  return (
    <div className={`
      w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700
      ${className}
    `}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 text-blue-600 dark:text-blue-400">
            <StorageIcon />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Offline Maps
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
        {/* Support check */}
        {!offlineTiles.isSupported && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-lg text-sm">
            Offline maps are not supported in this browser.
          </div>
        )}
        
        {/* Error */}
        {offlineTiles.error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
            {offlineTiles.error}
          </div>
        )}
        
        {/* Progress */}
        {offlineTiles.isLoading && offlineTiles.progress.total > 0 && (
          <ProgressBar 
            current={offlineTiles.progress.current}
            total={offlineTiles.progress.total}
            label="Downloading tiles..."
          />
        )}
        
        {/* Storage info */}
        {offlineTiles.isSupported && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Cached: <strong>{offlineTiles.cacheSizeFormatted}</strong>
            </span>
            {offlineTiles.cacheSize > 0 && (
              <button
                onClick={handleClearAll}
                className="text-red-500 hover:text-red-600 text-xs"
              >
                Clear All
              </button>
            )}
          </div>
        )}
        
        {/* Download form toggle */}
        {offlineTiles.isSupported && !showDownloadForm && (
          <button
            onClick={() => setShowDownloadForm(true)}
            className="w-full py-2 px-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium rounded-lg flex items-center justify-center gap-2"
          >
            <div className="w-5 h-5">
              <DownloadIcon />
            </div>
            Save Current Area
          </button>
        )}
        
        {/* Download form */}
        {showDownloadForm && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900 dark:text-white">
                Download Region
              </h4>
              <button
                onClick={() => setShowDownloadForm(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
            <DownloadForm 
              map={map}
              onDownload={handleDownload}
              isLoading={offlineTiles.isLoading}
            />
            {offlineTiles.isLoading && (
              <button
                onClick={offlineTiles.cancelDownload}
                className="w-full py-2 text-red-500 text-sm"
              >
                Cancel Download
              </button>
            )}
          </div>
        )}
        
        {/* Saved regions */}
        {offlineTiles.regions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Saved Regions
            </h4>
            {offlineTiles.regions.map(region => (
              <RegionCard
                key={region.id}
                region={region}
                onDelete={handleDelete}
                isDeleting={offlineTiles.isLoading}
              />
            ))}
          </div>
        )}
        
        {/* Empty state */}
        {offlineTiles.isSupported && offlineTiles.regions.length === 0 && !showDownloadForm && (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
            <div className="w-12 h-12 mx-auto mb-3 opacity-50">
              <MapIcon />
            </div>
            <p className="text-sm">No offline maps saved</p>
            <p className="text-xs mt-1">
              Navigate to an area and save it for offline use
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Compact offline indicator
 */
export const OfflineIndicator = ({ onClick }) => {
  const offlineTiles = useOfflineTiles();
  const isOnline = navigator.onLine;
  
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
        ${isOnline
          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
          : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
        }
      `}
    >
      <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-yellow-500'}`} />
      {isOnline ? 'Online' : 'Offline'}
      {offlineTiles.regions.length > 0 && (
        <span className="text-xs opacity-70">
          ({offlineTiles.regions.length} saved)
        </span>
      )}
    </button>
  );
};

/**
 * Download current view button
 */
export const DownloadAreaButton = ({ map, className = '' }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const offlineTiles = useOfflineTiles();
  
  const handleQuickDownload = async () => {
    if (!map || isDownloading) return;
    
    setIsDownloading(true);
    
    const bounds = map.getBounds();
    const center = map.getCenter();
    const zoom = Math.round(map.getZoom());
    
    await offlineTiles.downloadRegion({
      name: `Area at ${center.lat.toFixed(3)}, ${center.lng.toFixed(3)}`,
      bounds: {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      },
      minZoom: Math.max(zoom - 2, 8),
      maxZoom: Math.min(zoom + 2, 18),
    });
    
    setIsDownloading(false);
  };
  
  if (!offlineTiles.isSupported) return null;
  
  return (
    <button
      onClick={handleQuickDownload}
      disabled={isDownloading}
      className={`
        p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700
        hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50
        ${className}
      `}
      title="Save for offline"
    >
      {isDownloading ? (
        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        <div className="w-5 h-5">
          <DownloadIcon />
        </div>
      )}
    </button>
  );
};

export default OfflineTileManager;
