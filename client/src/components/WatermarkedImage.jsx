import React from 'react';
import { nawiriBrand } from '../config/brand';

/**
 * Renders a product image with the Nawiri Hair logo watermarked on top.
 * Drop-in replacement for a plain <img> in product cards / galleries.
 */
const WatermarkedImage = ({
  src,
  alt,
  className = '',
  imgClassName = '',
  fallback = 'https://via.placeholder.com/150?text=Hair+Product',
  watermarkClassName = 'w-[22%] max-w-[64px] opacity-70 bottom-1.5 right-1.5',
}) => {
  return (
    <div className={`relative ${className}`}>
      <img
        src={src}
        alt={alt}
        className={imgClassName}
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = fallback;
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

export default WatermarkedImage;
