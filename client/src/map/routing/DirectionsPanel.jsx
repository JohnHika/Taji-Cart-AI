/**
 * DirectionsPanel - Turn-by-turn navigation UI
 * Profile switcher, route summary, step list
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { PROFILES } from './useRouting';

// Maneuver icons
const MANEUVER_ICONS = {
  depart: '🚀',
  arrive: '🏁',
  turn: '↩️',
  'turn-left': '⬅️',
  'turn-right': '➡️',
  'turn-slight-left': '↖️',
  'turn-slight-right': '↗️',
  'turn-sharp-left': '↰',
  'turn-sharp-right': '↱',
  continue: '⬆️',
  merge: '🔀',
  fork: '🍴',
  'fork-left': '↙️',
  'fork-right': '↘️',
  roundabout: '🔄',
  'exit roundabout': '⤴️',
  'off ramp': '⤵️',
  'on ramp': '⤴️',
  unknown: '📍',
};

const getManeuverIcon = (type, modifier) => {
  const key = modifier ? `${type}-${modifier}` : type;
  return MANEUVER_ICONS[key] || MANEUVER_ICONS[type] || MANEUVER_ICONS.unknown;
};

/**
 * Profile button component
 */
const ProfileButton = ({ profile, isActive, onClick }) => (
  <button
    onClick={() => onClick(profile.id)}
    className={`
      flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all
      ${isActive 
        ? 'bg-blue-500 text-white shadow-lg scale-105' 
        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
      }
    `}
  >
    <span className="text-xl">{profile.icon}</span>
    <span className="text-xs font-medium">{profile.name}</span>
  </button>
);

/**
 * Route summary card
 */
export const RouteSummary = ({ route, profile = 'driving', isAlternative = false, onClick }) => {
  if (!route) return null;
  
  const { formattedDuration, formattedDistance, summary } = route.properties || {};
  const profileConfig = PROFILES[profile];
  
  return (
    <div
      onClick={onClick}
      className={`
        p-4 rounded-2xl border-2 transition-all cursor-pointer
        ${isAlternative
          ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 hover:border-gray-400'
          : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg'
        }
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{profileConfig?.icon || '🚗'}</span>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formattedDuration || '--'}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {formattedDistance || '--'}
            </div>
          </div>
        </div>
        
        {isAlternative && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Alternative
          </span>
        )}
      </div>
      
      {summary && (
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 truncate">
          via {summary}
        </div>
      )}
    </div>
  );
};

/**
 * Single direction step
 */
const DirectionStep = ({ step, index, isActive, onClick }) => (
  <div
    onClick={() => onClick?.(step, index)}
    className={`
      flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all
      ${isActive 
        ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500' 
        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
      }
    `}
  >
    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-2xl">
      {getManeuverIcon(step.type, step.modifier)}
    </div>
    
    <div className="flex-1 min-w-0">
      <div className="text-sm font-medium text-gray-900 dark:text-white">
        {step.instruction}
      </div>
      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
        <span>{step.distance}</span>
        <span>•</span>
        <span>{step.duration}</span>
      </div>
    </div>
  </div>
);

/**
 * Location input field
 */
export const LocationInput = ({
  label,
  value,
  placeholder,
  icon,
  onChange,
  onClear,
  onFocus,
  suggestions = [],
  showSuggestions = false,
}) => {
  const inputRef = useRef(null);
  
  return (
    <div className="relative">
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl">
        <span className="text-lg">{icon}</span>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={onFocus}
          placeholder={placeholder}
          className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400"
        />
        {value && (
          <button
            onClick={onClear}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
          >
            ✕
          </button>
        )}
      </div>
      
      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-60 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              onClick={() => onChange?.(suggestion)}
              className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
            >
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {suggestion.name}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {suggestion.address}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Main directions panel component
 */
export const DirectionsPanel = ({
  route,
  alternatives = [],
  steps = [],
  loading = false,
  error = null,
  activeProfile = 'driving',
  origin,
  destination,
  onProfileChange,
  onOriginChange,
  onDestinationChange,
  onSwapLocations,
  onStepClick,
  onAlternativeSelect,
  onClose,
  isExpanded = true,
}) => {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  
  const handleStepClick = useCallback((step, index) => {
    setActiveStepIndex(index);
    onStepClick?.(step, index);
  }, [onStepClick]);
  
  return (
    <div className={`
      flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden
      transition-all duration-300
      ${isExpanded ? 'max-h-[80vh]' : 'max-h-32'}
    `}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Directions
        </h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
        >
          ✕
        </button>
      </div>
      
      {/* Location inputs */}
      <div className="p-4 space-y-2 border-b border-gray-100 dark:border-gray-800">
        <LocationInput
          icon="🔵"
          placeholder="Choose starting point"
          value={origin?.name || ''}
          onChange={onOriginChange}
        />
        
        <div className="flex justify-center">
          <button
            onClick={onSwapLocations}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            title="Swap locations"
          >
            ⇅
          </button>
        </div>
        
        <LocationInput
          icon="🔴"
          placeholder="Choose destination"
          value={destination?.name || ''}
          onChange={onDestinationChange}
        />
      </div>
      
      {/* Profile switcher */}
      <div className="flex justify-center gap-2 p-4 border-b border-gray-100 dark:border-gray-800">
        {Object.values(PROFILES).map(profile => (
          <ProfileButton
            key={profile.id}
            profile={profile}
            isActive={activeProfile === profile.id}
            onClick={onProfileChange}
          />
        ))}
      </div>
      
      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
        </div>
      )}
      
      {/* Error state */}
      {error && (
        <div className="p-4 m-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm">
          {error}
        </div>
      )}
      
      {/* Route summary */}
      {route && !loading && (
        <div className="p-4 space-y-2 border-b border-gray-100 dark:border-gray-800">
          <RouteSummary route={route} profile={activeProfile} />
          
          {alternatives.map((alt, index) => (
            <RouteSummary
              key={index}
              route={alt}
              profile={activeProfile}
              isAlternative
              onClick={() => onAlternativeSelect?.(alt, index)}
            />
          ))}
        </div>
      )}
      
      {/* Steps list */}
      {steps.length > 0 && !loading && (
        <div className="flex-1 overflow-y-auto p-2">
          {steps.map((step, index) => (
            <DirectionStep
              key={index}
              step={step}
              index={index}
              isActive={index === activeStepIndex}
              onClick={handleStepClick}
            />
          ))}
        </div>
      )}
      
      {/* Empty state */}
      {!route && !loading && !error && (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <span className="text-4xl mb-2">📍</span>
          <p className="text-gray-500 dark:text-gray-400">
            Enter a starting point and destination to get directions
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * Compact directions bar for mobile
 */
export const DirectionsBar = ({
  route,
  activeProfile = 'driving',
  onExpand,
}) => {
  if (!route) return null;
  
  const { formattedDuration, formattedDistance } = route.properties || {};
  const profileConfig = PROFILES[activeProfile];
  
  return (
    <div
      onClick={onExpand}
      className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-2xl shadow-lg cursor-pointer"
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">{profileConfig?.icon || '🚗'}</span>
        <span className="font-bold text-gray-900 dark:text-white">
          {formattedDuration}
        </span>
        <span className="text-gray-500">({formattedDistance})</span>
      </div>
      <span className="text-gray-400">▲</span>
    </div>
  );
};

export default DirectionsPanel;
