/**
 * POIBottomSheet - Mobile-friendly bottom sheet for POI details
 * Includes category filters and POI information display
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { POI_CATEGORIES } from '../core/constants';
import { usePOICategories } from './usePOIFetch';

/**
 * Category filter chips component
 */
export const CategoryFilters = ({ 
  activeCategories, 
  onToggle,
  onSelectAll,
  onClearAll,
  compact = false,
}) => {
  const categories = Object.entries(POI_CATEGORIES);
  
  return (
    <div className={`poi-category-filters ${compact ? 'compact' : ''}`}>
      <div className="category-header">
        <span className="category-title">Categories</span>
        <div className="category-actions">
          <button 
            className="category-action-btn"
            onClick={onSelectAll}
          >
            All
          </button>
          <button 
            className="category-action-btn"
            onClick={onClearAll}
          >
            Clear
          </button>
        </div>
      </div>
      
      <div className="category-chips">
        {categories.map(([id, config]) => (
          <button
            key={id}
            className={`category-chip ${activeCategories.includes(id) ? 'active' : ''}`}
            onClick={() => onToggle(id)}
            style={{
              '--category-color': config.color,
            }}
          >
            <span className="chip-icon">{config.icon}</span>
            {!compact && <span className="chip-name">{config.name}</span>}
          </button>
        ))}
      </div>
      
      <style>{`
        .poi-category-filters {
          padding: 12px;
          background: white;
          border-radius: 12px;
        }
        
        .category-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        
        .category-title {
          font-weight: 600;
          font-size: 14px;
          color: #333;
        }
        
        .category-actions {
          display: flex;
          gap: 8px;
        }
        
        .category-action-btn {
          background: none;
          border: none;
          color: #6366f1;
          font-size: 12px;
          cursor: pointer;
          padding: 4px 8px;
        }
        
        .category-action-btn:hover {
          text-decoration: underline;
        }
        
        .category-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .category-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border: 2px solid #e5e7eb;
          border-radius: 20px;
          background: white;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s ease;
        }
        
        .category-chip:hover {
          border-color: var(--category-color);
          background: color-mix(in srgb, var(--category-color) 10%, white);
        }
        
        .category-chip.active {
          border-color: var(--category-color);
          background: var(--category-color);
          color: white;
        }
        
        .chip-icon {
          font-size: 16px;
        }
        
        .poi-category-filters.compact .category-chip {
          padding: 4px 8px;
        }
        
        .poi-category-filters.compact .chip-name {
          display: none;
        }
      `}</style>
    </div>
  );
};

/**
 * POI details card component
 */
export const POICard = ({ poi, onClose, onNavigate }) => {
  if (!poi) return null;
  
  const props = poi.properties || {};
  const category = POI_CATEGORIES[props.category] || {};
  const [lat, lng] = poi.geometry?.coordinates || [];
  
  // Extract useful properties
  const phone = props.phone || props['contact:phone'];
  const website = props.website || props['contact:website'];
  const hours = props.opening_hours;
  const address = [props['addr:street'], props['addr:housenumber']]
    .filter(Boolean)
    .join(' ') || props['addr:full'];
  
  return (
    <div className="poi-card">
      <div className="poi-card-header">
        <div className="poi-category-badge" style={{ background: category.color || '#888' }}>
          {category.icon || '📍'}
        </div>
        <div className="poi-title-section">
          <h3 className="poi-name">{props.name || 'Unknown Place'}</h3>
          <span className="poi-category-name">{category.name || 'Point of Interest'}</span>
        </div>
        <button className="poi-close-btn" onClick={onClose}>×</button>
      </div>
      
      <div className="poi-card-body">
        {address && (
          <div className="poi-info-row">
            <span className="info-icon">📍</span>
            <span>{address}</span>
          </div>
        )}
        
        {phone && (
          <div className="poi-info-row">
            <span className="info-icon">📞</span>
            <a href={`tel:${phone}`}>{phone}</a>
          </div>
        )}
        
        {website && (
          <div className="poi-info-row">
            <span className="info-icon">🌐</span>
            <a href={website} target="_blank" rel="noopener noreferrer">
              {new URL(website).hostname}
            </a>
          </div>
        )}
        
        {hours && (
          <div className="poi-info-row">
            <span className="info-icon">🕐</span>
            <span className="opening-hours">{hours}</span>
          </div>
        )}
        
        <div className="poi-coords">
          {lng?.toFixed(6)}, {lat?.toFixed(6)}
        </div>
      </div>
      
      <div className="poi-card-actions">
        <button 
          className="poi-action-btn primary"
          onClick={() => onNavigate?.([lng, lat])}
        >
          <span>🧭</span> Directions
        </button>
        <button 
          className="poi-action-btn"
          onClick={() => {
            navigator.clipboard?.writeText(`${lat}, ${lng}`);
          }}
        >
          <span>📋</span> Copy
        </button>
      </div>
      
      <style>{`
        .poi-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          overflow: hidden;
        }
        
        .poi-card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .poi-category-badge {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }
        
        .poi-title-section {
          flex: 1;
          min-width: 0;
        }
        
        .poi-name {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .poi-category-name {
          font-size: 12px;
          color: #6b7280;
        }
        
        .poi-close-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: #f3f4f6;
          border-radius: 8px;
          font-size: 20px;
          color: #6b7280;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .poi-close-btn:hover {
          background: #e5e7eb;
        }
        
        .poi-card-body {
          padding: 16px;
        }
        
        .poi-info-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 14px;
          color: #374151;
        }
        
        .poi-info-row a {
          color: #6366f1;
          text-decoration: none;
        }
        
        .poi-info-row a:hover {
          text-decoration: underline;
        }
        
        .info-icon {
          width: 20px;
          text-align: center;
        }
        
        .opening-hours {
          font-size: 12px;
          font-family: monospace;
        }
        
        .poi-coords {
          font-size: 11px;
          color: #9ca3af;
          font-family: monospace;
          margin-top: 12px;
        }
        
        .poi-card-actions {
          display: flex;
          gap: 8px;
          padding: 16px;
          border-top: 1px solid #f0f0f0;
        }
        
        .poi-action-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          background: white;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .poi-action-btn:hover {
          background: #f9fafb;
        }
        
        .poi-action-btn.primary {
          background: #6366f1;
          border-color: #6366f1;
          color: white;
        }
        
        .poi-action-btn.primary:hover {
          background: #4f46e5;
        }
      `}</style>
    </div>
  );
};

/**
 * POI Bottom Sheet component
 */
export const POIBottomSheet = ({
  selectedPOI,
  onClose,
  onNavigate,
  categories,
  onCategoryToggle,
  onSelectAll,
  onClearAll,
  loading = false,
  poiCount = 0,
}) => {
  const [sheetHeight, setSheetHeight] = useState('peek'); // 'peek', 'half', 'full'
  const sheetRef = useRef(null);
  const dragStartY = useRef(0);
  const currentHeight = useRef(0);
  
  // Handle drag
  const handleDragStart = useCallback((e) => {
    dragStartY.current = e.touches?.[0]?.clientY || e.clientY;
    currentHeight.current = sheetRef.current?.offsetHeight || 0;
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleDragMove);
    document.addEventListener('touchend', handleDragEnd);
  }, []);
  
  const handleDragMove = useCallback((e) => {
    const currentY = e.touches?.[0]?.clientY || e.clientY;
    const delta = dragStartY.current - currentY;
    const newHeight = currentHeight.current + delta;
    
    if (sheetRef.current) {
      const maxHeight = window.innerHeight * 0.85;
      const minHeight = 120;
      const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
      sheetRef.current.style.height = `${clampedHeight}px`;
    }
  }, []);
  
  const handleDragEnd = useCallback(() => {
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    document.removeEventListener('touchmove', handleDragMove);
    document.removeEventListener('touchend', handleDragEnd);
    
    // Snap to nearest height
    if (sheetRef.current) {
      const height = sheetRef.current.offsetHeight;
      const windowHeight = window.innerHeight;
      
      if (height < 200) {
        setSheetHeight('peek');
      } else if (height < windowHeight * 0.5) {
        setSheetHeight('half');
      } else {
        setSheetHeight('full');
      }
      sheetRef.current.style.height = '';
    }
  }, []);
  
  const sheetStyles = {
    peek: '160px',
    half: '50vh',
    full: '85vh',
  };
  
  return (
    <div 
      ref={sheetRef}
      className={`poi-bottom-sheet ${sheetHeight}`}
      style={{ height: sheetStyles[sheetHeight] }}
    >
      {/* Drag handle */}
      <div 
        className="sheet-handle"
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
      >
        <div className="handle-bar" />
      </div>
      
      {/* Status bar */}
      <div className="sheet-status">
        <span className="poi-count">
          {loading ? 'Loading...' : `${poiCount} places found`}
        </span>
      </div>
      
      {/* Content */}
      <div className="sheet-content">
        {selectedPOI ? (
          <POICard 
            poi={selectedPOI}
            onClose={onClose}
            onNavigate={onNavigate}
          />
        ) : (
          <CategoryFilters
            activeCategories={categories}
            onToggle={onCategoryToggle}
            onSelectAll={onSelectAll}
            onClearAll={onClearAll}
          />
        )}
      </div>
      
      <style>{`
        .poi-bottom-sheet {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: #f9fafb;
          border-radius: 20px 20px 0 0;
          box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
          z-index: 1000;
          transition: height 0.3s ease;
          display: flex;
          flex-direction: column;
        }
        
        .sheet-handle {
          padding: 12px;
          cursor: grab;
          display: flex;
          justify-content: center;
        }
        
        .sheet-handle:active {
          cursor: grabbing;
        }
        
        .handle-bar {
          width: 36px;
          height: 4px;
          background: #d1d5db;
          border-radius: 2px;
        }
        
        .sheet-status {
          padding: 0 16px 8px;
        }
        
        .poi-count {
          font-size: 12px;
          color: #6b7280;
        }
        
        .sheet-content {
          flex: 1;
          overflow-y: auto;
          padding: 0 12px 12px;
        }
      `}</style>
    </div>
  );
};

export default POIBottomSheet;
