/**
 * DrawControls - Integrated drawing and measurement system
 * Phase 6: Drawing & Measurement
 * 
 * Combines toolbar, measurement, and drawing into one easy-to-use component
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useMap } from '../core/MapContainer';
import { DrawingToolbar, DRAWING_TOOLS, MeasurementDisplay, MiniDrawingToolbar } from './DrawingToolbar';
import { MeasurementTools, MeasurementLayer, MeasurementPoints, useDrawing } from './MeasurementTools';
import { useMeasurement, MEASUREMENT_TYPES, formatDistance, formatArea } from './useMeasurement';

/**
 * Map tool to measurement type
 */
const toolToMeasurement = {
  [DRAWING_TOOLS.DISTANCE]: MEASUREMENT_TYPES.DISTANCE,
  [DRAWING_TOOLS.AREA]: MEASUREMENT_TYPES.AREA,
  [DRAWING_TOOLS.RADIUS]: MEASUREMENT_TYPES.RADIUS,
};

/**
 * DrawControls - Full drawing and measurement system
 */
export const DrawControls = ({
  enabled = true,
  showToolbar = true,
  showMiniToolbar = false,
  showMeasurementDisplay = true,
  toolbarPosition = 'left',
  onFeatureComplete,
  onMeasurementChange,
  initialTool = DRAWING_TOOLS.SELECT,
  className = '',
}) => {
  const { map } = useMap();
  const [activeTool, setActiveTool] = useState(initialTool);
  const measurement = useMeasurement();
  const drawing = useDrawing();
  
  // Tool change handler
  const handleToolChange = useCallback((tool) => {
    // Stop current measurement
    if (measurement.isActive) {
      measurement.stopMeasuring();
    }
    
    setActiveTool(tool);
    
    // Start measurement if applicable
    if (toolToMeasurement[tool]) {
      measurement.startMeasuring(toolToMeasurement[tool]);
    }
  }, [measurement]);
  
  // Clear handler
  const handleClear = useCallback(() => {
    measurement.clearPoints();
    drawing.clear();
    setActiveTool(DRAWING_TOOLS.SELECT);
  }, [measurement, drawing]);
  
  // Callback when measurement changes
  useEffect(() => {
    if (measurement.isActive && onMeasurementChange) {
      onMeasurementChange({
        type: measurement.measurementType,
        points: measurement.points,
        distance: measurement.totalDistance,
        area: measurement.area,
        perimeter: measurement.perimeter,
        radius: measurement.radius,
      });
    }
  }, [
    measurement.isActive,
    measurement.measurementType,
    measurement.points,
    measurement.totalDistance,
    measurement.area,
    measurement.perimeter,
    measurement.radius,
    onMeasurementChange,
  ]);
  
  // Escape key to deselect tool
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && activeTool !== DRAWING_TOOLS.SELECT) {
        handleToolChange(DRAWING_TOOLS.SELECT);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool, handleToolChange]);
  
  if (!enabled) return null;
  
  const isMeasuring = measurement.isActive && measurement.points.length > 0;
  
  return (
    <>
      {/* Full toolbar (desktop) */}
      {showToolbar && (
        <DrawingToolbar
          activeTool={activeTool}
          onToolChange={handleToolChange}
          onUndo={drawing.undo}
          onRedo={drawing.redo}
          onClear={handleClear}
          canUndo={drawing.canUndo}
          canRedo={drawing.canRedo}
          position={toolbarPosition}
          className={className}
        />
      )}
      
      {/* Mini toolbar (mobile) */}
      {showMiniToolbar && (
        <MiniDrawingToolbar
          activeTool={activeTool}
          onToolChange={handleToolChange}
          onClear={handleClear}
        />
      )}
      
      {/* Measurement overlay */}
      {isMeasuring && (
        <MeasurementTools
          measurement={measurement}
        />
      )}
      
      {/* Measurement display */}
      {showMeasurementDisplay && isMeasuring && (
        <MeasurementDisplay
          type={measurement.measurementType}
          distance={measurement.totalDistance}
          area={measurement.area || measurement.circleArea}
          perimeter={measurement.perimeter}
          radius={measurement.radius}
          segments={measurement.segmentDistances}
          formatDistance={formatDistance}
          formatArea={formatArea}
        />
      )}
    </>
  );
};

/**
 * SimpleMeasure - Just distance measurement in a simple component
 */
export const SimpleMeasure = ({
  enabled = true,
  onComplete,
  lineColor = '#3B82F6',
  className = '',
}) => {
  const { map } = useMap();
  const measurement = useMeasurement();
  const [isActive, setIsActive] = useState(false);
  
  // Toggle measurement
  const toggleMeasure = useCallback(() => {
    if (isActive) {
      measurement.stopMeasuring();
      setIsActive(false);
      onComplete?.({
        distance: measurement.totalDistance,
        points: measurement.points,
      });
    } else {
      measurement.startMeasuring(MEASUREMENT_TYPES.DISTANCE);
      setIsActive(true);
    }
  }, [isActive, measurement, onComplete]);
  
  // Handle map clicks when active
  useEffect(() => {
    if (!map || !isActive) return;
    
    const handleClick = (e) => {
      measurement.addPoint({
        lat: e.lngLat.lat,
        lng: e.lngLat.lng,
      });
    };
    
    map.on('click', handleClick);
    map.getCanvas().style.cursor = 'crosshair';
    
    return () => {
      map.off('click', handleClick);
      map.getCanvas().style.cursor = '';
    };
  }, [map, isActive, measurement.addPoint]);
  
  return (
    <>
      {/* Toggle button */}
      <button
        type="button"
        onClick={toggleMeasure}
        className={`
          absolute top-3 right-3 z-10
          w-10 h-10 flex items-center justify-center
          rounded-lg shadow-lg transition-all
          ${isActive 
            ? 'bg-blue-500 text-white' 
            : 'bg-white text-gray-700 hover:bg-gray-50'
          }
          ${className}
        `}
        title={isActive ? 'Finish measurement' : 'Measure distance'}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21.64 3.64l-1.28-1.28a1.21 1.21 0 00-1.72 0L2.36 18.64a1.21 1.21 0 000 1.72l1.28 1.28a1.21 1.21 0 001.72 0L21.64 5.36a1.21 1.21 0 000-1.72z" />
          <path d="M14 7l3 3" />
        </svg>
      </button>
      
      {/* Measurement overlay */}
      {isActive && measurement.points.length > 0 && (
        <>
          <MeasurementLayer
            geoJSON={measurement.geoJSON}
            style={{ lineColor }}
          />
          <MeasurementPoints
            points={measurement.points}
            onPointDrag={measurement.updatePoint}
          />
        </>
      )}
      
      {/* Distance display */}
      {isActive && measurement.totalDistance > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10
          bg-white/95 backdrop-blur-sm rounded-lg shadow-lg px-4 py-2">
          <div className="text-sm text-gray-500">Total distance</div>
          <div className="text-xl font-bold text-gray-900">
            {formatDistance(measurement.totalDistance)}
          </div>
        </div>
      )}
    </>
  );
};

/**
 * AreaMeasure - Just area measurement
 */
export const AreaMeasure = ({
  enabled = true,
  onComplete,
  fillColor = 'rgba(59, 130, 246, 0.2)',
  strokeColor = '#3B82F6',
  className = '',
}) => {
  const { map } = useMap();
  const measurement = useMeasurement();
  const [isActive, setIsActive] = useState(false);
  
  // Toggle measurement
  const toggleMeasure = useCallback(() => {
    if (isActive) {
      measurement.stopMeasuring();
      setIsActive(false);
      onComplete?.({
        area: measurement.area,
        perimeter: measurement.perimeter,
        points: measurement.points,
      });
    } else {
      measurement.startMeasuring(MEASUREMENT_TYPES.AREA);
      setIsActive(true);
    }
  }, [isActive, measurement, onComplete]);
  
  // Handle map clicks
  useEffect(() => {
    if (!map || !isActive) return;
    
    const handleClick = (e) => {
      measurement.addPoint({
        lat: e.lngLat.lat,
        lng: e.lngLat.lng,
      });
    };
    
    map.on('click', handleClick);
    map.getCanvas().style.cursor = 'crosshair';
    
    return () => {
      map.off('click', handleClick);
      map.getCanvas().style.cursor = '';
    };
  }, [map, isActive, measurement.addPoint]);
  
  return (
    <>
      {/* Toggle button */}
      <button
        type="button"
        onClick={toggleMeasure}
        className={`
          absolute top-3 right-16 z-10
          w-10 h-10 flex items-center justify-center
          rounded-lg shadow-lg transition-all
          ${isActive 
            ? 'bg-blue-500 text-white' 
            : 'bg-white text-gray-700 hover:bg-gray-50'
          }
          ${className}
        `}
        title={isActive ? 'Finish measurement' : 'Measure area'}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18" />
          <path d="M9 3v18" />
        </svg>
      </button>
      
      {/* Measurement overlay */}
      {isActive && measurement.points.length > 0 && (
        <>
          <MeasurementLayer
            geoJSON={measurement.geoJSON}
            style={{ fillColor, lineColor: strokeColor }}
          />
          <MeasurementPoints
            points={measurement.points}
            onPointDrag={measurement.updatePoint}
          />
        </>
      )}
      
      {/* Area display */}
      {isActive && measurement.area > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10
          bg-white/95 backdrop-blur-sm rounded-lg shadow-lg px-4 py-2">
          <div className="text-sm text-gray-500">Area</div>
          <div className="text-xl font-bold text-gray-900">
            {formatArea(measurement.area)}
          </div>
          <div className="text-sm text-gray-500">
            Perimeter: {formatDistance(measurement.perimeter)}
          </div>
        </div>
      )}
    </>
  );
};

/**
 * useDrawControls - Hook for programmatic control
 */
export const useDrawControls = () => {
  const [activeTool, setActiveTool] = useState(DRAWING_TOOLS.SELECT);
  const measurement = useMeasurement();
  const drawing = useDrawing();
  
  const startDistanceMeasure = useCallback(() => {
    setActiveTool(DRAWING_TOOLS.DISTANCE);
    measurement.startMeasuring(MEASUREMENT_TYPES.DISTANCE);
  }, [measurement]);
  
  const startAreaMeasure = useCallback(() => {
    setActiveTool(DRAWING_TOOLS.AREA);
    measurement.startMeasuring(MEASUREMENT_TYPES.AREA);
  }, [measurement]);
  
  const startRadiusMeasure = useCallback(() => {
    setActiveTool(DRAWING_TOOLS.RADIUS);
    measurement.startMeasuring(MEASUREMENT_TYPES.RADIUS);
  }, [measurement]);
  
  const stop = useCallback(() => {
    setActiveTool(DRAWING_TOOLS.SELECT);
    measurement.stopMeasuring();
  }, [measurement]);
  
  const clear = useCallback(() => {
    measurement.clearPoints();
    drawing.clear();
  }, [measurement, drawing]);
  
  return {
    // State
    activeTool,
    isActive: measurement.isActive,
    points: measurement.points,
    
    // Measurements
    distance: measurement.totalDistance,
    area: measurement.area,
    perimeter: measurement.perimeter,
    radius: measurement.radius,
    
    // Actions
    startDistanceMeasure,
    startAreaMeasure,
    startRadiusMeasure,
    stop,
    clear,
    undo: drawing.undo,
    redo: drawing.redo,
    canUndo: drawing.canUndo,
    canRedo: drawing.canRedo,
    
    // Underlying hooks
    measurement,
    drawing,
  };
};

export default DrawControls;
