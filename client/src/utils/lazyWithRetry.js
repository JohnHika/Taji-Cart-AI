import React from 'react';

const RELOAD_FLAG_KEY = 'chunk-reload-attempted';

// Wraps React.lazy so that a stale chunk (old hashed filename no longer on
// the server after a new deploy) triggers one automatic page reload to pick
// up the new build, instead of dead-ending on an error screen.
const lazyWithRetry = (importer) =>
  React.lazy(async () => {
    try {
      const module = await importer();
      sessionStorage.removeItem(RELOAD_FLAG_KEY);
      return module;
    } catch (error) {
      const isChunkLoadError =
        /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
          error?.message || ''
        );

      if (isChunkLoadError && !sessionStorage.getItem(RELOAD_FLAG_KEY)) {
        sessionStorage.setItem(RELOAD_FLAG_KEY, '1');
        window.location.reload();
        // Never resolves — the reload takes over before React needs this.
        return new Promise(() => {});
      }

      throw error;
    }
  });

export default lazyWithRetry;
