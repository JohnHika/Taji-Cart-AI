/**
 * PWA Features Index
 * Phase 8: Progressive Web App Features
 * 
 * Offline capabilities, URL state sync, and sharing features.
 */

// Offline tile management
export { 
  useOfflineTiles,
  formatCacheSize,
} from './useOfflineTiles';

// Share location
export {
  useShareLocation,
  buildShareUrl,
  parseShareUrl,
  getGoogleMapsUrl,
  getAppleMapsUrl,
  getOSMUrl,
  getShareButtonProps,
} from './useShareLocation';

// URL state sync
export {
  useURLState,
  useHashState,
  parseURLState,
  buildURLState,
} from './useURLState';

// UI Components
export {
  OfflineTileManager,
  OfflineIndicator,
  DownloadAreaButton,
} from './OfflineTileManager';

export default {
  useOfflineTiles,
  useShareLocation,
  useURLState,
};
