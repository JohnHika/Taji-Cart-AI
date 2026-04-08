import { createContext, useContext, useLayoutEffect, useState } from 'react';

/**
 * Matches Tailwind `lg` breakpoint: true when viewport is below 1024px
 * (same as `@media (max-width: 1023px)` / not `lg:`).
 */
const COMPACT_MEDIA_QUERY = '(max-width: 1023px)';

const StoreCompactContext = createContext(false);

function subscribeCompact(mq, handler) {
  if (typeof mq.addEventListener === 'function') {
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }
  mq.addListener(handler);
  return () => mq.removeListener(handler);
}

export function StoreLayoutProvider({ children }) {
  const [isCompact, setIsCompact] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(COMPACT_MEDIA_QUERY).matches;
  });

  useLayoutEffect(() => {
    const mq = window.matchMedia(COMPACT_MEDIA_QUERY);
    const sync = () => setIsCompact(mq.matches);
    sync();
    return subscribeCompact(mq, sync);
  }, []);

  return <StoreCompactContext.Provider value={isCompact}>{children}</StoreCompactContext.Provider>;
}

export function useStoreCompact() {
  return useContext(StoreCompactContext);
}
