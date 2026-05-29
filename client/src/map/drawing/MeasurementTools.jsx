/**
 * MeasurementTools - Render measurement overlays on map
 * Phase 6: Drawing & Measurement
 */

import React, { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { useMap } from '../core/MapContainer';
import { 
  useMeasurement, 
  MEASUREMENT_TYPES, 
  formatDistance, 
  formatArea 
} from './useMeasurement';

/**
 * Layer IDs for measurements
 */
const LAYER_IDS = {
  LINE: 'measurement-line',
  LINE_DASHED: 'measurement-line-dashed',
  FILL: 'measurement-fill',
  POINTS: 'measurement-points',
  LABELS: 'measurement-labels',
};

const SOURCE_ID = 'measurement-source';

/**
 * Style configuration
 */
const MEASUREMENT_STYLE = {
  lineColor: '#3B82F6', // blue-500
  lineWidth: 3,
  fillColor: 'rgba(59, 130, 246, 0.2)',
  pointColor: '#3B82F6',
  pointRadius: 6,
  labelColor: '#1F2937',
  labelHaloColor: '#FFFFFF',
};

/**
 * MeasurementLayer - Renders measurement geometry on map
 */
export const MeasurementLayer = ({
  geoJSON,
  measurementType,
  showLabels = true,
  style = {},
}) => {
  const { map } = useMap();
  const sourceAdded = useRef(false);
  
  const mergedStyle = { ...MEASUREMENT_STYLE, ...style };
  
  // Initialize source and layers
  useEffect(() => {
    if (!map) return;
    
    // Add source
    if (!map.getSource(SOURCE_ID)) {
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      sourceAdded.current = true;
    }
    
    // Add line layer
    if (!map.getLayer(LAYER_IDS.LINE)) {
      map.addLayer({
        id: LAYER_IDS.LINE,
        type: 'line',
        source: SOURCE_ID,
        paint: {
          'line-color': mergedStyle.lineColor,
          'line-width': mergedStyle.lineWidth,
        },
        filter: ['==', '$type', 'LineString'],
      });
    }
    
    // Add fill layer (for polygons)
    if (!map.getLayer(LAYER_IDS.FILL)) {
      map.addLayer({
        id: LAYER_IDS.FILL,
        type: 'fill',
        source: SOURCE_ID,
        paint: {
          'fill-color': mergedStyle.fillColor,
          'fill-outline-color': mergedStyle.lineColor,
        },
        filter: ['==', '$type', 'Polygon'],
      });
    }
    
    // Add polygon outline
    if (!map.getLayer(LAYER_IDS.LINE_DASHED)) {
      map.addLayer({
        id: LAYER_IDS.LINE_DASHED,
        type: 'line',
        source: SOURCE_ID,
        paint: {
          'line-color': mergedStyle.lineColor,
          'line-width': mergedStyle.lineWidth,
          'line-dasharray': [2, 2],
        },
        filter: ['==', '$type', 'Polygon'],
      });
    }
    
    return () => {
      // Cleanup
      if (map && sourceAdded.current) {
        [LAYER_IDS.LINE, LAYER_IDS.FILL, LAYER_IDS.LINE_DASHED, LAYER_IDS.POINTS].forEach(id => {
          if (map.getLayer(id)) map.removeLayer(id);
        });
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
        sourceAdded.current = false;
      }
    };
  }, [map]);
  
  // Update source data
  useEffect(() => {
    if (!map || !map.getSource(SOURCE_ID)) return;
    
    const data = geoJSON 
      ? { type: 'FeatureCollection', features: [geoJSON] }
      : { type: 'FeatureCollection', features: [] };
    
    map.getSource(SOURCE_ID).setData(data);
  }, [map, geoJSON]);
  
  return null;
};

/**
 * MeasurementPoints - Render draggable point markers
 */
export const MeasurementPoints = ({
  points,
  onPointDrag,
  onPointClick,
  onPointDelete,
  activeIndex = -1,
}) => {
  const { map } = useMap();
  const markersRef = useRef([]);
  
  // Clear old markers
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
  }, []);
  
  // Create markers
  useEffect(() => {
    if (!map) return;
    
    clearMarkers();
    
    points.forEach((point, index) => {
      // Create element
      const el = document.createElement('div');
      el.className = 'measurement-point';
      el.style.cssText = `
        width: ${index === activeIndex ? 16 : 12}px;
        height: ${index === activeIndex ? 16 : 12}px;
        background: ${index === activeIndex ? '#EF4444' : '#3B82F6'};
        border: 2px solid white;
        border-radius: 50%;
        cursor: ${onPointDrag ? 'move' : 'pointer'};
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        transition: all 0.15s ease;
      `;
      
      // Hover effect
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.3)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });
      
      // Click
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onPointClick?.(index, point);
      });
      
      // Double-click to delete
      el.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        onPointDelete?.(index);
      });
      
      // Create marker
      const marker = new maplibregl.Marker({
        element: el,
        draggable: !!onPointDrag,
      })
        .setLngLat([point.lng, point.lat])
        .addTo(map);
      
      // Drag handler
      if (onPointDrag) {
        marker.on('dragend', () => {
          const lngLat = marker.getLngLat();
          onPointDrag(index, { lat: lngLat.lat, lng: lngLat.lng });
        });
      }
      
      markersRef.current.push(marker);
    });
    
    return clearMarkers;
  }, [map, points, activeIndex, onPointDrag, onPointClick, onPointDelete, clearMarkers]);
  
  return null;
};

/**
 * MeasurementLabels - Show distance/area labels
 */
export const MeasurementLabels = ({
  segments,
  area,
  measurementType,
  showSegments = true,
}) => {
  const { map } = useMap();
  const markersRef = useRef([]);
  
  // Clear labels
  const clearLabels = useCallback(() => {
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
  }, []);
  
  useEffect(() => {
    if (!map) return;
    
    clearLabels();
    
    // Segment labels (midpoint of each segment)
    if (showSegments && segments.length > 0) {
      segments.forEach((seg, i) => {
        const midLat = (seg.from.lat + seg.to.lat) / 2;
        const midLng = (seg.from.lng + seg.to.lng) / 2;
        
        const el = document.createElement('div');
        el.className = 'measurement-label';
        el.style.cssText = `
          background: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          color: #1F2937;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          pointer-events: none;
          white-space: nowrap;
        `;
        el.textContent = formatDistance(seg.distance);
        
        const marker = new maplibregl.Marker({
          element: el,
          anchor: 'center',
        })
          .setLngLat([midLng, midLat])
          .addTo(map);
        
        markersRef.current.push(marker);
      });
    }
    
    return clearLabels;
  }, [map, segments, showSegments, clearLabels]);
  
  return null;
};

/**
 * Combined MeasurementTools component
 */
export const MeasurementTools = ({
  measurement, // From useMeasurement hook
  onMapClick,
  showToolbar = true,
  style = {},
}) => {
  const { map } = useMap();
  
  // Handle map clicks
  useEffect(() => {
    if (!map || !measurement.isActive) return;
    
    const handleClick = (e) => {
      const { lat, lng } = e.lngLat;
      measurement.addPoint({ lat, lng });
    };
    
    map.on('click', handleClick);
    
    // Change cursor
    map.getCanvas().style.cursor = 'crosshair';
    
    return () => {
      map.off('click', handleClick);
      map.getCanvas().style.cursor = '';
    };
  }, [map, measurement.isActive, measurement.addPoint]);
  
  // Keyboard shortcuts
  useEffect(() => {
    if (!measurement.isActive) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        measurement.stopMeasuring();
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        measurement.removeLastPoint();
      } else if (e.key === 'Enter') {
        measurement.stopMeasuring();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [measurement.isActive, measurement.stopMeasuring, measurement.removeLastPoint]);
  
  return (
    <>
      {/* Measurement geometry */}
      <MeasurementLayer
        geoJSON={measurement.geoJSON}
        measurementType={measurement.measurementType}
        style={style}
      />
      
      {/* Point markers */}
      <MeasurementPoints
        points={measurement.points}
        onPointDrag={measurement.updatePoint}
        onPointDelete={(index) => {
          // Remove point by filtering
          const newPoints = measurement.points.filter((_, i) => i !== index);
          measurement.clearPoints();
          newPoints.forEach(p => measurement.addPoint(p));
        }}
      />
      
      {/* Labels */}
      <MeasurementLabels
        segments={measurement.segmentDistances}
        area={measurement.area}
        measurementType={measurement.measurementType}
      />
    </>
  );
};

/**
 * useDrawing hook - Manages drawing state with undo/redo
 */
export const useDrawing = () => {
  const [history, setHistory] = React.useState([]);
  const [historyIndex, setHistoryIndex] = React.useState(-1);
  const [features, setFeatures] = React.useState([]);
  
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  
  // Add to history
  const addToHistory = useCallback((newFeatures) => {
    setHistory(prev => [...prev.slice(0, historyIndex + 1), newFeatures]);
    setHistoryIndex(prev => prev + 1);
    setFeatures(newFeatures);
  }, [historyIndex]);
  
  // Undo
  const undo = useCallback(() => {
    if (canUndo) {
      setHistoryIndex(prev => prev - 1);
      setFeatures(history[historyIndex - 1]);
    }
  }, [canUndo, historyIndex, history]);
  
  // Redo
  const redo = useCallback(() => {
    if (canRedo) {
      setHistoryIndex(prev => prev + 1);
      setFeatures(history[historyIndex + 1]);
    }
  }, [canRedo, historyIndex, history]);
  
  // Clear
  const clear = useCallback(() => {
    addToHistory([]);
  }, [addToHistory]);
  
  // Add feature
  const addFeature = useCallback((feature) => {
    const newFeatures = [...features, { ...feature, id: Date.now() }];
    addToHistory(newFeatures);
  }, [features, addToHistory]);
  
  // Remove feature
  const removeFeature = useCallback((id) => {
    const newFeatures = features.filter(f => f.id !== id);
    addToHistory(newFeatures);
  }, [features, addToHistory]);
  
  return {
    features,
    canUndo,
    canRedo,
    undo,
    redo,
    clear,
    addFeature,
    removeFeature,
  };
};

export default MeasurementTools;
