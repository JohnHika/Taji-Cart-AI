import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { nawiriBrand } from '../config/brand';

// via.placeholder.com is dead (connection refused) — a remote fallback is a
// broken image waiting to happen. This inline SVG data URI is offline-safe,
// brand-tinted, and says the same thing the old placeholder did.
const FALLBACK_IMAGE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='375'><rect width='100%25' height='100%25' fill='%23FAF6F0'/><circle cx='150' cy='150' r='34' fill='none' stroke='%23C9A57A' stroke-width='2'/><path d='M150 132l6.2 12.6 13.8 2-10 9.7 2.4 13.7L150 163.6l-12.4 6.4 2.4-13.7-10-9.7 13.8-2z' fill='none' stroke='%23C9A57A' stroke-width='2'/><text x='150' y='230' text-anchor='middle' font-family='system-ui, sans-serif' font-size='15' fill='%23A78B6F'>Photo coming soon</text><text x='150' y='252' text-anchor='middle' font-family='system-ui, sans-serif' font-size='11' fill='%23C4A98A'>Nawiri Hair</text></svg>";

/**
 * Renders a product image with the Nawiri Hair logo watermarked on top.
 * Drop-in replacement for a plain <img> in product cards / galleries.
 *
 * Images load lazily and decode off the main thread by default (in-viewport
 * images still load immediately — native lazy only defers offscreen ones),
 * and fade in smoothly so a slow connection doesn't produce jarring pops.
 */
const WatermarkedImage = ({
  src,
  alt,
  className = '',
  imgClassName = '',
  fallback = FALLBACK_IMAGE,
  watermarkClassName = 'w-[22%] max-w-[64px] opacity-70 bottom-1.5 right-1.5',
  loading = 'lazy',
}) => {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef(null);

  // A cached image can finish before React attaches onLoad — check
  // completeness once on mount so the fade state never sticks at opacity-0.
  useEffect(() => {
    if (imgRef.current?.complete) {
      setLoaded(true);
    }
  }, [src]);

  return (
    <div className={`relative ${className}`}>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        className={`transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${imgClassName}`}
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = fallback;
          setLoaded(true);
        }}
      />
      <img
        src={nawiriBrand.logo}
        alt=""
        aria-hidden="true"
        draggable={false}
        className={`pointer-events-none select-none absolute object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)] ${watermarkClassName}`}
      />
    </div>
  );
};

WatermarkedImage.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string,
  className: PropTypes.string,
  imgClassName: PropTypes.string,
  fallback: PropTypes.string,
  watermarkClassName: PropTypes.string,
  loading: PropTypes.string,
};

export default WatermarkedImage;