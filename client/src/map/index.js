/**
 * Premium Map Experience - Module Exports
 * MapLibre GL JS + OpenFreeMap
 * 
 * Organized by feature phase:
 * - Core: Base map setup, constants, utilities
 * - Search: Geocoding, autocomplete, recent searches
 * - Location: User geolocation, accuracy, compass, follow mode
 * - UI: Fullscreen, context menu, keyboard shortcuts
 * - Styles: Theme switcher, dark mode (Phase 2)
 * - POI: Points of interest, clustering (Phase 3)
 * - Routing: OSRM directions (Phase 4)
 * - Integration: Delivery, admin, location, and store flows (Phase 7)
 * - Drawing: Measurement, annotations (Phase 6)
 * - PWA: Offline tiles, share, install prompt (Phase 8)
 */

// ============================================
// PHASE 1: Core Foundation
// ============================================

// Core
export { default as MapContainer, MapContext, useMap } from './core/MapContainer';
export { 
  MAP_STYLES, 
  DEFAULT_CENTER, 
  MAP_CONFIG, 
  API_ENDPOINTS,
  POI_CATEGORIES,
  KEYBOARD_SHORTCUTS,
  STORAGE_KEYS
} from './core/constants';
export { useMapInstance } from './core/useMapInstance';

// Search & Geocoding
export { default as SearchBox } from './search/SearchBox';
export { useGeocoding } from './search/useGeocoding';
export { useRecentSearches } from './search/useRecentSearches';

// User Location
export { default as LocationControl } from './location/LocationControl';
export { useUserLocation } from './location/useUserLocation';

// UI Polish
export { default as ContextMenu } from './ui/ContextMenu';
export { default as CoordinatesPanel } from './ui/CoordinatesPanel';
export { useKeyboardShortcuts } from './ui/useKeyboardShortcuts';

// ============================================
// PHASE 2: Map Styles & Themes
// ============================================
export { 
  useMapStyles, 
  STYLE_CONFIGS, 
  EXTRA_STYLES 
} from './styles/useMapStyles';

export { 
  StyleSwitcher, 
  StyleButton, 
  StyleSwitcherControl 
} from './styles/StyleSwitcher';

export { 
  ThemeToggleIcon, 
  ThemeToggleSwitch, 
  ThemeAutoDetect,
  default as ThemeToggle 
} from './styles/ThemeToggle';

export { 
  useTerrain,
  TerrainToggle, 
  TerrainControl, 
  SkyLayer 
} from './styles/TerrainLayer';

// ============================================
// PHASE 3: POI Layer
// ============================================
export { 
  usePOIFetch, 
  usePOICategories 
} from './poi/usePOIFetch';

export { 
  POILayer, 
  usePOIClusters 
} from './poi/POILayer';

export { 
  POIBottomSheet, 
  POICard, 
  CategoryFilters 
} from './poi/POIBottomSheet';
// export { default as POIBottomSheet } from './poi/POIBottomSheet';
// export { usePOIFetch } from './poi/usePOIFetch';

// ============================================
// PHASE 4: Routing
// ============================================
export { 
  useRouting, 
  useWaypoints, 
  PROFILES 
} from './routing/useRouting';

export { 
  RouteLayer, 
  useRouteLayer, 
  useDraggableWaypoints 
} from './routing/RouteLayer';

export { 
  DirectionsPanel, 
  DirectionsBar, 
  RouteSummary, 
  LocationInput 
} from './routing/DirectionsPanel';

// ============================================
// PHASE 5: Delivery Tracking
// ============================================
export { 
  useDeliveryTracking, 
  useSimulatedDriver, 
  DRIVER_STATUS, 
  STATUS_CONFIG 
} from './delivery/useDeliveryTracking';

export { 
  DriverMarker, 
  useDriverMarker, 
  DestinationMarker 
} from './delivery/DriverMarker';

export { 
  DeliveryRoute, 
  useDeliveryRoute, 
  formatRouteInfo 
} from './delivery/DeliveryRoute';

export { 
  TrackingPanel, 
  TrackingBar, 
  TrackingWidget, 
  StatusTimeline, 
  ETADisplay, 
  DriverCard, 
  DeliveryAddress, 
  LiveIndicator 
} from './delivery/TrackingPanel';

// ============================================
// PHASE 6: Drawing & Measurement
// ============================================
export { 
  useMeasurement, 
  haversineDistance, 
  calculateBearing, 
  calculatePolygonArea, 
  formatDistance, 
  formatArea, 
  formatBearing, 
  MEASUREMENT_TYPES 
} from './drawing/useMeasurement';

export { 
  DrawingToolbar, 
  ToolButton, 
  ToolGroup, 
  ToolSeparator, 
  MeasurementDisplay, 
  MiniDrawingToolbar, 
  DRAWING_TOOLS 
} from './drawing/DrawingToolbar';

export { 
  MeasurementLayer, 
  MeasurementPoints, 
  MeasurementLabels, 
  MeasurementTools, 
  useDrawing 
} from './drawing/MeasurementTools';

export { 
  DrawControls, 
  SimpleMeasure, 
  AreaMeasure, 
  useDrawControls 
} from './drawing/DrawControls';

// ============================================
// PHASE 7: Integration Components
// ============================================
export {
  DeliveryMap,
  DeliveryETAWidget,
  AdminMapDashboard,
  LocationPicker,
  LocationDisplay,
  StoreLocator,
  StoreLocatorMini,
} from './integration';

// ============================================
// PHASE 8: PWA Features
// ============================================
export { 
  useOfflineTiles, 
  formatCacheSize 
} from './pwa/useOfflineTiles';

export { 
  useShareLocation, 
  buildShareUrl, 
  parseShareUrl, 
  getGoogleMapsUrl, 
  getAppleMapsUrl, 
  getOSMUrl, 
  getShareButtonProps 
} from './pwa/useShareLocation';

export { 
  useURLState, 
  useHashState, 
  parseURLState, 
  buildURLState 
} from './pwa/useURLState';

export { 
  OfflineTileManager, 
  OfflineIndicator, 
  DownloadAreaButton 
} from './pwa/OfflineTileManager';
