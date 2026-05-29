/**
 * Map Styles Module - Phase 2
 * Style management, theme switching, and 3D terrain
 */

// Hooks
export { useMapStyles, STYLE_CONFIGS, EXTRA_STYLES } from './useMapStyles';
export { useTerrain } from './TerrainLayer';

// Components
export { 
  StyleSwitcher, 
  StyleButton, 
  StyleSwitcherControl 
} from './StyleSwitcher';

export { 
  ThemeToggleIcon, 
  ThemeToggleSwitch, 
  ThemeAutoDetect,
  default as ThemeToggle 
} from './ThemeToggle';

export { 
  TerrainToggle, 
  TerrainControl, 
  SkyLayer,
  default as Terrain 
} from './TerrainLayer';
