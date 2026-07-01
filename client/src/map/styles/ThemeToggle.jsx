/**
 * ThemeToggle - Compact light/dark mode toggle for maps
 * Google Maps-quality toggle with smooth animations
 */

import React from 'react';
import { useMap } from '../core/MapContainer';
import { useMapStyles } from './useMapStyles';

/**
 * Minimal icon-only toggle button
 */
export function ThemeToggleIcon({ className = '' }) {
  const { map } = useMap();
  const { currentStyle, toggleDarkMode, isLoading } = useMapStyles(map);
  
  const isDark = currentStyle === 'dark';

  return (
    <button
      onClick={toggleDarkMode}
      disabled={isLoading}
      className={`
        relative w-10 h-10 rounded-full bg-white shadow-md border border-gray-200
        flex items-center justify-center
        hover:bg-gray-50 hover:shadow-lg
        disabled:opacity-50 disabled:cursor-wait
        transition-all duration-200
        ${className}
      `}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div className="relative w-6 h-6">
        {/* Sun icon */}
        <svg
          className={`
            absolute inset-0 w-6 h-6 text-amber-500
            transition-all duration-300 transform
            ${isDark ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'}
          `}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
            clipRule="evenodd"
          />
        </svg>
        
        {/* Moon icon */}
        <svg
          className={`
            absolute inset-0 w-6 h-6 text-indigo-500
            transition-all duration-300 transform
            ${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}
          `}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      </div>

      {/* Loading spinner overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-full">
          <svg className="w-5 h-5 animate-spin text-gray-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      )}
    </button>
  );
}

/**
 * Full switch toggle with label
 */
export function ThemeToggleSwitch({ showLabel = true, className = '' }) {
  const { map } = useMap();
  const { currentStyle, toggleDarkMode, isLoading, systemPrefersDark } = useMapStyles(map);
  
  const isDark = currentStyle === 'dark';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {showLabel && (
        <span className="text-sm text-gray-600 flex items-center gap-1">
          <span>{isDark ? '🌙' : '☀️'}</span>
          <span>{isDark ? 'Dark' : 'Light'}</span>
        </span>
      )}
      
      <button
        onClick={toggleDarkMode}
        disabled={isLoading}
        className={`
          relative w-14 h-7 rounded-full transition-colors duration-300
          disabled:opacity-50 disabled:cursor-wait
          ${isDark ? 'bg-indigo-600' : 'bg-amber-400'}
        `}
        role="switch"
        aria-checked={isDark}
        aria-label="Toggle dark mode"
      >
        {/* Switch track decorations */}
        <div className="absolute inset-0 flex items-center justify-between px-1.5">
          <svg className={`w-4 h-4 text-amber-200 ${isDark ? 'opacity-30' : 'opacity-70'}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <svg className={`w-4 h-4 text-indigo-200 ${isDark ? 'opacity-70' : 'opacity-30'}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        </div>
        
        {/* Switch thumb */}
        <div
          className={`
            absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md
            flex items-center justify-center
            transition-transform duration-300
            ${isDark ? 'translate-x-7' : 'translate-x-0.5'}
          `}
        >
          {isLoading ? (
            <svg className="w-4 h-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : isDark ? (
            <svg className="w-4 h-4 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </button>

      {/* System preference indicator */}
      {systemPrefersDark !== isDark && (
        <span className="text-xs text-gray-400" title={`System prefers ${systemPrefersDark ? 'dark' : 'light'}`}>
          (custom)
        </span>
      )}
    </div>
  );
}

/**
 * Auto-detect system theme component (invisible, for auto-switching)
 */
export function ThemeAutoDetect({ onChange }) {
  const { map } = useMap();
  const { systemPrefersDark, currentStyle, changeStyle } = useMapStyles(map);
  
  React.useEffect(() => {
    const targetStyle = systemPrefersDark ? 'dark' : 'liberty';
    if (currentStyle !== targetStyle) {
      changeStyle(targetStyle, false);
      onChange?.(targetStyle);
    }
  }, [systemPrefersDark]);
  
  return null;
}

export default ThemeToggleIcon;
