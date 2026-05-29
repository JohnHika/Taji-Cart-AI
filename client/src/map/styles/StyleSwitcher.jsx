/**
 * StyleSwitcher - Premium map style selection component
 * Google Maps-quality style picker with previews and categories
 */

import React, { useState, useRef, useEffect } from 'react';
import { useMap } from '../core/MapContainer';
import { useMapStyles, STYLE_CONFIGS } from './useMapStyles';

/**
 * Compact style button (for toolbar integration)
 */
export function StyleButton({ onClick, currentStyle, className = '' }) {
  const config = STYLE_CONFIGS[currentStyle] || STYLE_CONFIGS.liberty;
  
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-md
        border border-gray-200 hover:bg-gray-50 transition-colors
        ${className}
      `}
      title="Change map style"
      aria-label="Change map style"
    >
      <span className="text-lg">{config.icon}</span>
      <span className="text-sm font-medium text-gray-700">{config.name}</span>
      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}

/**
 * Style preview card
 */
function StyleCard({ style, isActive, onClick, isLoading, isPreloaded }) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`
        relative flex flex-col items-center p-3 rounded-xl transition-all duration-200
        ${isActive 
          ? 'bg-primary-50 border-2 border-primary-500 shadow-lg scale-105' 
          : 'bg-white border-2 border-transparent hover:border-gray-200 hover:shadow-md'
        }
        ${isLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
      `}
    >
      {/* Style preview circle */}
      <div 
        className={`
          w-14 h-14 rounded-full shadow-inner flex items-center justify-center
          text-2xl transition-transform
          ${isActive ? 'ring-2 ring-primary-400 ring-offset-2' : ''}
        `}
        style={{ backgroundColor: style.previewColor }}
      >
        {style.icon}
      </div>
      
      {/* Style name */}
      <span className={`
        mt-2 text-sm font-medium
        ${isActive ? 'text-primary-700' : 'text-gray-700'}
      `}>
        {style.name}
      </span>
      
      {/* Preloaded indicator */}
      {isPreloaded && !isActive && (
        <span className="absolute top-1 right-1 w-2 h-2 bg-green-400 rounded-full" title="Ready" />
      )}
      
      {/* Active checkmark */}
      {isActive && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </button>
  );
}

/**
 * Full style switcher dropdown/modal
 */
export function StyleSwitcher({ 
  isOpen, 
  onClose, 
  position = 'bottom-right',
  showCategories = true,
  compact = false,
}) {
  const { map } = useMap();
  const containerRef = useRef(null);
  
  const {
    currentStyle,
    availableStyles,
    isLoading,
    changeStyle,
    isStylePreloaded,
    systemPrefersDark,
    toggleDarkMode,
  } = useMapStyles(map);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose?.();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleStyleSelect = async (styleId) => {
    const success = await changeStyle(styleId);
    if (success) onClose?.();
  };

  // Group styles by category
  const categories = {
    standard: { label: 'Standard', styles: [] },
    dark: { label: 'Dark Mode', styles: [] },
    imagery: { label: 'Imagery', styles: [] },
    terrain: { label: 'Terrain', styles: [] },
  };

  Object.values(availableStyles).forEach(style => {
    const category = categories[style.category] || categories.standard;
    category.styles.push(style);
  });

  // Position classes
  const positionClasses = {
    'bottom-right': 'bottom-full right-0 mb-2',
    'bottom-left': 'bottom-full left-0 mb-2',
    'top-right': 'top-full right-0 mt-2',
    'top-left': 'top-full left-0 mt-2',
  };

  return (
    <div 
      ref={containerRef}
      className={`
        absolute ${positionClasses[position] || positionClasses['bottom-right']}
        ${compact ? 'w-64' : 'w-80'}
        bg-white rounded-xl shadow-2xl border border-gray-200
        z-50 overflow-hidden
        animate-in fade-in slide-in-from-bottom-2 duration-200
      `}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Map Style</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Quick dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          className="mt-2 w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-gray-200 hover:border-gray-300 transition-colors"
        >
          <span className="flex items-center gap-2 text-sm text-gray-700">
            {systemPrefersDark ? '🌙' : '☀️'}
            <span>Use {currentStyle === 'dark' ? 'Light' : 'Dark'} Mode</span>
          </span>
          <div className={`
            w-10 h-5 rounded-full transition-colors relative
            ${currentStyle === 'dark' ? 'bg-primary-500' : 'bg-gray-300'}
          `}>
            <div className={`
              absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform
              ${currentStyle === 'dark' ? 'translate-x-5' : 'translate-x-0.5'}
            `} />
          </div>
        </button>
      </div>

      {/* Style grid */}
      <div className="p-4 max-h-[400px] overflow-y-auto">
        {showCategories ? (
          Object.entries(categories).map(([key, category]) => {
            if (category.styles.length === 0) return null;
            
            return (
              <div key={key} className="mb-4 last:mb-0">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {category.label}
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {category.styles.map(style => (
                    <StyleCard
                      key={style.id}
                      style={style}
                      isActive={currentStyle === style.id}
                      isLoading={isLoading}
                      isPreloaded={isStylePreloaded(style.id)}
                      onClick={() => handleStyleSelect(style.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {Object.values(availableStyles).map(style => (
              <StyleCard
                key={style.id}
                style={style}
                isActive={currentStyle === style.id}
                isLoading={isLoading}
                isPreloaded={isStylePreloaded(style.id)}
                onClick={() => handleStyleSelect(style.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
          <div className="flex items-center gap-2 text-gray-600">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm">Loading style...</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Combined button + dropdown component
 */
export function StyleSwitcherControl({ position = 'bottom-right', className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const { map } = useMap();
  const { currentStyle } = useMapStyles(map);

  return (
    <div className={`relative ${className}`}>
      <StyleButton 
        currentStyle={currentStyle}
        onClick={() => setIsOpen(!isOpen)}
      />
      <StyleSwitcher 
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        position={position}
      />
    </div>
  );
}

export default StyleSwitcher;
