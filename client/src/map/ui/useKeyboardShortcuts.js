/**
 * useKeyboardShortcuts - Keyboard shortcuts for map navigation
 * Features: pan, zoom, rotate, reset, search focus
 */
import { useEffect, useCallback, useRef } from 'react';
import { KEYBOARD_SHORTCUTS, MAP_CONFIG } from '../core/constants';

export function useKeyboardShortcuts({
  map,
  enabled = true,
  onSearchFocus,
  onEscape,
  customShortcuts = {}
}) {
  const isEnabledRef = useRef(enabled);

  // Keep ref in sync
  useEffect(() => {
    isEnabledRef.current = enabled;
  }, [enabled]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e) => {
    if (!isEnabledRef.current || !map) return;

    // Don't handle if in input/textarea/contenteditable
    const target = e.target;
    const isInputFocused = 
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable;

    // Allow Escape even in inputs
    if (e.key === 'Escape') {
      e.preventDefault();
      target.blur();
      if (onEscape) onEscape();
      return;
    }

    // Skip other shortcuts if in input
    if (isInputFocused) return;

    // Check for matching shortcut
    const shortcut = findMatchingShortcut(e, {
      ...KEYBOARD_SHORTCUTS,
      ...customShortcuts
    });

    if (!shortcut) return;

    e.preventDefault();

    // Execute shortcut action
    switch (shortcut.action) {
      // Zoom
      case 'zoomIn':
        map.zoomIn({ duration: MAP_CONFIG.animationDuration });
        break;
      case 'zoomOut':
        map.zoomOut({ duration: MAP_CONFIG.animationDuration });
        break;

      // Pan
      case 'panUp':
        map.panBy([0, -100], { duration: 200 });
        break;
      case 'panDown':
        map.panBy([0, 100], { duration: 200 });
        break;
      case 'panLeft':
        map.panBy([-100, 0], { duration: 200 });
        break;
      case 'panRight':
        map.panBy([100, 0], { duration: 200 });
        break;

      // Rotate
      case 'rotateLeft':
        map.rotateTo(map.getBearing() - 15, { duration: 200 });
        break;
      case 'rotateRight':
        map.rotateTo(map.getBearing() + 15, { duration: 200 });
        break;

      // Reset
      case 'resetNorth':
        map.resetNorth({ duration: MAP_CONFIG.animationDuration });
        break;
      case 'resetPitch':
        map.setPitch(0, { duration: MAP_CONFIG.animationDuration });
        break;
      case 'resetView':
        map.resetNorthPitch({ duration: MAP_CONFIG.animationDuration });
        break;

      // Search
      case 'focusSearch':
        if (onSearchFocus) onSearchFocus();
        break;

      // Fullscreen
      case 'toggleFullscreen':
        toggleFullscreen(map.getContainer());
        break;

      // Custom action
      default:
        if (shortcut.handler) {
          shortcut.handler(map, e);
        }
    }
  }, [map, onSearchFocus, onEscape, customShortcuts]);

  // Attach/detach listener
  useEffect(() => {
    if (!map) return;

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [map, handleKeyDown]);

  return null; // This hook doesn't render anything
}

// Find matching shortcut from key event
function findMatchingShortcut(event, shortcuts) {
  const pressedKey = event.key.toLowerCase();
  const pressedCode = event.code;

  for (const [name, config] of Object.entries(shortcuts)) {
    if (!config.key && !config.code) continue;

    const keyMatch = config.key?.toLowerCase() === pressedKey;
    const codeMatch = config.code === pressedCode;

    if (!keyMatch && !codeMatch) continue;

    // Check modifiers
    const ctrlMatch = !!config.ctrl === (event.ctrlKey || event.metaKey);
    const shiftMatch = !!config.shift === event.shiftKey;
    const altMatch = !!config.alt === event.altKey;

    if (ctrlMatch && shiftMatch && altMatch) {
      return { ...config, name };
    }
  }

  return null;
}

// Toggle fullscreen
function toggleFullscreen(element) {
  if (!document.fullscreenElement) {
    element.requestFullscreen?.() ||
    element.webkitRequestFullscreen?.() ||
    element.mozRequestFullScreen?.();
  } else {
    document.exitFullscreen?.() ||
    document.webkitExitFullscreen?.() ||
    document.mozCancelFullScreen?.();
  }
}

export default useKeyboardShortcuts;
