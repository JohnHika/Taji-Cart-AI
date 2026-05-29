/**
 * Map Core Constants
 * Centralized configuration for the entire map system
 */

// Default center point (Nairobi, Kenya)
export const DEFAULT_CENTER = {
  lat: -1.286389,
  lng: 36.817223
};

// OpenFreeMap styles (all free, no API key)
export const MAP_STYLES = {
  liberty: {
    name: 'Liberty',
    url: 'https://tiles.openfreemap.org/styles/liberty',
    description: 'Default colorful style',
    preview: '/images/map-previews/liberty.png'
  },
  bright: {
    name: 'Bright',
    url: 'https://tiles.openfreemap.org/styles/bright',
    description: 'Bright and clean',
    preview: '/images/map-previews/bright.png'
  },
  positron: {
    name: 'Positron',
    url: 'https://tiles.openfreemap.org/styles/positron',
    description: 'Light minimalist style',
    preview: '/images/map-previews/positron.png'
  },
  // Stadia dark theme (free tier available)
  dark: {
    name: 'Dark Mode',
    url: 'https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json',
    description: 'Dark theme for night use',
    preview: '/images/map-previews/dark.png'
  }
};

// Default style
export const DEFAULT_STYLE = 'liberty';

// Map configuration
export const MAP_CONFIG = {
  minZoom: 2,
  maxZoom: 20,
  defaultZoom: 13,
  locationZoom: 16,
  animationDuration: 1500,
  
  // Geolocation options
  geolocation: {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 60000
  },
  
  // Search debounce
  searchDebounceMs: 400,
  minSearchLength: 3,
  maxSearchResults: 8,
  
  // POI settings
  poi: {
    clusterRadius: 50,
    clusterMaxZoom: 14,
    fetchRadius: 1000 // meters
  },
  
  // Routing
  routing: {
    profiles: ['driving', 'walking', 'cycling'],
    defaultProfile: 'driving',
    maxAlternatives: 2
  }
};

// API endpoints (all free, no keys required)
export const API_ENDPOINTS = {
  // Nominatim geocoding (OpenStreetMap)
  nominatim: {
    search: 'https://nominatim.openstreetmap.org/search',
    reverse: 'https://nominatim.openstreetmap.org/reverse'
  },
  
  // OSRM routing (free public server)
  osrm: {
    base: 'https://router.project-osrm.org',
    route: '/route/v1',
    profiles: {
      driving: 'driving',
      walking: 'foot',
      cycling: 'bike'
    }
  },
  
  // Overpass API for POIs
  overpass: 'https://overpass-api.de/api/interpreter'
};

// POI categories with icons
export const POI_CATEGORIES = {
  restaurant: {
    name: 'Restaurants',
    icon: '🍽️',
    color: '#e74c3c',
    osmTags: ['amenity=restaurant', 'amenity=fast_food', 'amenity=cafe']
  },
  hospital: {
    name: 'Hospitals',
    icon: '🏥',
    color: '#e91e63',
    osmTags: ['amenity=hospital', 'amenity=clinic', 'amenity=doctors']
  },
  school: {
    name: 'Schools',
    icon: '🏫',
    color: '#9c27b0',
    osmTags: ['amenity=school', 'amenity=university', 'amenity=college']
  },
  atm: {
    name: 'ATMs',
    icon: '🏧',
    color: '#2196f3',
    osmTags: ['amenity=atm', 'amenity=bank']
  },
  pharmacy: {
    name: 'Pharmacies',
    icon: '💊',
    color: '#4caf50',
    osmTags: ['amenity=pharmacy']
  },
  fuel: {
    name: 'Fuel Stations',
    icon: '⛽',
    color: '#ff9800',
    osmTags: ['amenity=fuel']
  },
  shopping: {
    name: 'Shopping',
    icon: '🛒',
    color: '#795548',
    osmTags: ['shop=supermarket', 'shop=mall', 'shop=convenience']
  },
  parking: {
    name: 'Parking',
    icon: '🅿️',
    color: '#607d8b',
    osmTags: ['amenity=parking']
  }
};

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  zoomIn: ['+', '='],
  zoomOut: ['-', '_'],
  panLeft: ['ArrowLeft'],
  panRight: ['ArrowRight'],
  panUp: ['ArrowUp'],
  panDown: ['ArrowDown'],
  focusSearch: ['/'],
  fullscreen: ['f', 'F'],
  myLocation: ['l', 'L'],
  escape: ['Escape']
};

// LocalStorage keys
export const STORAGE_KEYS = {
  recentSearches: 'map_recent_searches',
  preferredStyle: 'map_preferred_style',
  lastPosition: 'map_last_position',
  followMode: 'map_follow_mode'
};

// Animation easing
export const EASING = {
  smooth: [0.25, 0.1, 0.25, 1],
  bounce: [0.68, -0.55, 0.265, 1.55]
};
