/**
 * PWA Features Index
 * Phase 8: Progressive Web App Features
 * 
 * Offline capabilities, URL state sync, and sharing features.
 */

// Offline tile management
import { useOfflineTiles, formatCacheSize } from './useOfflineTiles';
import { useShareLocation, buildShareUrl, parseShareUrl, getGoogleMapsUrl, getAppleMapsUrl, getOSMUrl, getShareButtonProps } from './useShareLocation';
import { useURLState, useHashState, parseURLState, buildURLState } from './useURLState';

export { useOfflineTiles, formatCacheSize };

// Share location
export { useShareLocation, buildShareUrl, parseShareUrl, getGoogleMapsUrl, getAppleMapsUrl, getOSMUrl, getShareButtonProps };

// URL state sync
export { useURLState, useHashState, parseURLState, buildURLState };

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
