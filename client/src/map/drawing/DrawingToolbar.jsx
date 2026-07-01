/**
 * DrawingToolbar - Drawing and measurement controls
 * Phase 6: Drawing & Measurement
 */

import React, { useState, useCallback } from 'react';
import { MEASUREMENT_TYPES } from './useMeasurement';

/**
 * Tool configurations
 */
export const DRAWING_TOOLS = {
  SELECT: 'select',
  DISTANCE: 'distance',
  AREA: 'area',
  RADIUS: 'radius',
  MARKER: 'marker',
  LINE: 'line',
  POLYGON: 'polygon',
  CIRCLE: 'circle',
  RECTANGLE: 'rectangle',
};

/**
 * Tool icons
 */
const TOOL_ICONS = {
  [DRAWING_TOOLS.SELECT]: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
      <path d="M13 13l6 6" />
    </svg>
  ),
  [DRAWING_TOOLS.DISTANCE]: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21.64 3.64l-1.28-1.28a1.21 1.21 0 00-1.72 0L2.36 18.64a1.21 1.21 0 000 1.72l1.28 1.28a1.21 1.21 0 001.72 0L21.64 5.36a1.21 1.21 0 000-1.72z" />
      <path d="M14 7l3 3" />
      <path d="M5 6v4" />
      <path d="M3 8h4" />
      <path d="M19 16v4" />
      <path d="M17 18h4" />
    </svg>
  ),
  [DRAWING_TOOLS.AREA]: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 3v18" />
    </svg>
  ),
  [DRAWING_TOOLS.RADIUS]: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 12l6.36-6.36" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  ),
  [DRAWING_TOOLS.MARKER]: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  [DRAWING_TOOLS.LINE]: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="19" x2="19" y2="5" />
      <circle cx="5" cy="19" r="2" fill="currentColor" />
      <circle cx="19" cy="5" r="2" fill="currentColor" />
    </svg>
  ),
  [DRAWING_TOOLS.POLYGON]: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" />
    </svg>
  ),
  [DRAWING_TOOLS.CIRCLE]: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
    </svg>
  ),
  [DRAWING_TOOLS.RECTANGLE]: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  ),
};

/**
 * Tool button component
 */
export const ToolButton = ({
  tool,
  active = false,
  onClick,
  disabled = false,
  tooltip,
  className = '',
}) => {
  const baseStyle = `
    w-10 h-10 flex items-center justify-center
    rounded-lg transition-all duration-200
    ${active 
      ? 'bg-blue-500 text-white shadow-md' 
      : 'bg-white/90 text-gray-700 hover:bg-gray-100'
    }
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    ${className}
  `;
  
  return (
    <button
      type="button"
      className={baseStyle}
      onClick={() => !disabled && onClick?.(tool)}
      disabled={disabled}
      title={tooltip}
      aria-label={tooltip}
    >
      <div className="w-5 h-5">
        {TOOL_ICONS[tool]}
      </div>
    </button>
  );
};

/**
 * Toolbar group with separator
 */
export const ToolGroup = ({ children, label }) => (
  <div className="flex flex-col gap-1">
    {label && (
      <span className="text-xs text-gray-500 px-1 uppercase tracking-wider">
        {label}
      </span>
    )}
    <div className="flex gap-1">
      {children}
    </div>
  </div>
);

/**
 * Vertical separator
 */
export const ToolSeparator = () => (
  <div className="w-px h-8 bg-gray-200 mx-1" />
);

/**
 * Main DrawingToolbar component
 */
export const DrawingToolbar = ({
  activeTool = DRAWING_TOOLS.SELECT,
  onToolChange,
  onUndo,
  onRedo,
  onClear,
  canUndo = false,
  canRedo = false,
  showMeasurement = true,
  showDrawing = true,
  position = 'left', // 'left' | 'right' | 'top' | 'bottom'
  className = '',
}) => {
  const isVertical = position === 'left' || position === 'right';
  
  const positionClasses = {
    left: 'left-3 top-1/2 -translate-y-1/2 flex-col',
    right: 'right-3 top-1/2 -translate-y-1/2 flex-col',
    top: 'top-3 left-1/2 -translate-x-1/2 flex-row',
    bottom: 'bottom-3 left-1/2 -translate-x-1/2 flex-row',
  };
  
  const containerStyle = `
    absolute ${positionClasses[position]}
    bg-white/95 backdrop-blur-sm rounded-xl shadow-lg
    p-2 flex gap-2 z-10
    ${className}
  `;
  
  const measurementTools = [
    { tool: DRAWING_TOOLS.DISTANCE, tooltip: 'Measure distance' },
    { tool: DRAWING_TOOLS.AREA, tooltip: 'Measure area' },
    { tool: DRAWING_TOOLS.RADIUS, tooltip: 'Measure radius' },
  ];
  
  const drawingTools = [
    { tool: DRAWING_TOOLS.MARKER, tooltip: 'Add marker' },
    { tool: DRAWING_TOOLS.LINE, tooltip: 'Draw line' },
    { tool: DRAWING_TOOLS.POLYGON, tooltip: 'Draw polygon' },
    { tool: DRAWING_TOOLS.CIRCLE, tooltip: 'Draw circle' },
    { tool: DRAWING_TOOLS.RECTANGLE, tooltip: 'Draw rectangle' },
  ];
  
  const Separator = isVertical 
    ? () => <div className="h-px w-8 bg-gray-200 my-1" />
    : () => <div className="w-px h-8 bg-gray-200 mx-1" />;
  
  return (
    <div className={containerStyle}>
      {/* Selection tool */}
      <ToolButton
        tool={DRAWING_TOOLS.SELECT}
        active={activeTool === DRAWING_TOOLS.SELECT}
        onClick={onToolChange}
        tooltip="Select (Esc)"
      />
      
      {/* Measurement tools */}
      {showMeasurement && (
        <>
          <Separator />
          {measurementTools.map(({ tool, tooltip }) => (
            <ToolButton
              key={tool}
              tool={tool}
              active={activeTool === tool}
              onClick={onToolChange}
              tooltip={tooltip}
            />
          ))}
        </>
      )}
      
      {/* Drawing tools */}
      {showDrawing && (
        <>
          <Separator />
          {drawingTools.map(({ tool, tooltip }) => (
            <ToolButton
              key={tool}
              tool={tool}
              active={activeTool === tool}
              onClick={onToolChange}
              tooltip={tooltip}
            />
          ))}
        </>
      )}
      
      {/* Undo/Redo/Clear */}
      <Separator />
      <ToolButton
        tool="undo"
        onClick={onUndo}
        disabled={!canUndo}
        tooltip="Undo (Ctrl+Z)"
      />
      <ToolButton
        tool="redo"
        onClick={onRedo}
        disabled={!canRedo}
        tooltip="Redo (Ctrl+Y)"
      />
      <ToolButton
        tool="clear"
        onClick={onClear}
        tooltip="Clear all"
      />
    </div>
  );
};

// Add missing icons for undo/redo/clear
TOOL_ICONS['undo'] = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 7v6h6" />
    <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
  </svg>
);

TOOL_ICONS['redo'] = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 7v6h-6" />
    <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7" />
  </svg>
);

TOOL_ICONS['clear'] = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18" />
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
    <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

/**
 * Floating measurement display
 */
export const MeasurementDisplay = ({
  type,
  distance,
  area,
  perimeter,
  radius,
  segments = [],
  formatDistance,
  formatArea,
  className = '',
}) => {
  const containerStyle = `
    absolute bottom-20 left-1/2 -translate-x-1/2
    bg-white/95 backdrop-blur-sm rounded-xl shadow-lg
    p-4 min-w-[200px] z-10
    ${className}
  `;
  
  return (
    <div className={containerStyle}>
      <div className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wider">
        {type === MEASUREMENT_TYPES.DISTANCE && 'Distance'}
        {type === MEASUREMENT_TYPES.AREA && 'Area'}
        {type === MEASUREMENT_TYPES.RADIUS && 'Radius'}
      </div>
      
      {/* Main measurement */}
      <div className="text-2xl font-bold text-gray-900">
        {type === MEASUREMENT_TYPES.DISTANCE && formatDistance(distance)}
        {type === MEASUREMENT_TYPES.AREA && formatArea(area)}
        {type === MEASUREMENT_TYPES.RADIUS && formatDistance(radius)}
      </div>
      
      {/* Secondary info */}
      {type === MEASUREMENT_TYPES.AREA && perimeter > 0 && (
        <div className="text-sm text-gray-500 mt-1">
          Perimeter: {formatDistance(perimeter)}
        </div>
      )}
      
      {type === MEASUREMENT_TYPES.RADIUS && area > 0 && (
        <div className="text-sm text-gray-500 mt-1">
          Area: {formatArea(area)}
        </div>
      )}
      
      {/* Segment breakdown */}
      {type === MEASUREMENT_TYPES.DISTANCE && segments.length > 1 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-2">Segments</div>
          <div className="space-y-1">
            {segments.map((seg, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-500">Segment {i + 1}</span>
                <span className="font-medium">{formatDistance(seg.distance)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Mini floating toolbar (for mobile)
 */
export const MiniDrawingToolbar = ({
  activeTool,
  onToolChange,
  onClear,
  className = '',
}) => {
  const [expanded, setExpanded] = useState(false);
  
  const containerStyle = `
    absolute bottom-24 right-3
    bg-white/95 backdrop-blur-sm rounded-full shadow-lg
    z-10 ${className}
  `;
  
  if (!expanded) {
    return (
      <button
        type="button"
        className={`${containerStyle} w-14 h-14 flex items-center justify-center`}
        onClick={() => setExpanded(true)}
      >
        <div className="w-6 h-6">
          {TOOL_ICONS[DRAWING_TOOLS.DISTANCE]}
        </div>
      </button>
    );
  }
  
  return (
    <div className={`${containerStyle} p-2 flex gap-2`}>
      <ToolButton
        tool={DRAWING_TOOLS.DISTANCE}
        active={activeTool === DRAWING_TOOLS.DISTANCE}
        onClick={(t) => { onToolChange(t); setExpanded(false); }}
        tooltip="Distance"
      />
      <ToolButton
        tool={DRAWING_TOOLS.AREA}
        active={activeTool === DRAWING_TOOLS.AREA}
        onClick={(t) => { onToolChange(t); setExpanded(false); }}
        tooltip="Area"
      />
      <ToolButton
        tool={DRAWING_TOOLS.MARKER}
        active={activeTool === DRAWING_TOOLS.MARKER}
        onClick={(t) => { onToolChange(t); setExpanded(false); }}
        tooltip="Marker"
      />
      <button
        type="button"
        className="w-10 h-10 flex items-center justify-center text-gray-400"
        onClick={() => setExpanded(false)}
      >
        ✕
      </button>
    </div>
  );
};

export default DrawingToolbar;
