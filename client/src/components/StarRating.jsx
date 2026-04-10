import React, { useState } from 'react';
import { FaStar } from 'react-icons/fa';

/**
 * StarRating — works with the raw ratings array stored in the product doc:
 *   ratingData: Array<{ userId, rating, ... }>
 *   userRating: number (0 = not rated)
 *   onRate:     (star: number) => void
 */
const StarRating = ({ ratingData = [], onRate, userRating = 0, disabled = false }) => {
  const [hovered, setHovered] = useState(0);

  const totalRatings = ratingData.length;
  const avgRating =
    totalRatings > 0
      ? ratingData.reduce((s, r) => s + (r.rating || 0), 0) / totalRatings
      : 0;

  const active = hovered || userRating;

  return (
    <div className="flex flex-col gap-2">
      {/* Interactive stars */}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onRate?.(star)}
            onMouseEnter={() => !disabled && setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
            className={`transition-transform duration-100 ${disabled ? 'cursor-default' : 'cursor-pointer hover:scale-125 active:scale-110'}`}
          >
            <FaStar
              size={22}
              className={`transition-colors duration-100 ${
                star <= active
                  ? 'text-gold-500 drop-shadow-sm'
                  : 'text-brown-200 dark:text-white/20'
              }`}
            />
          </button>
        ))}
        {active > 0 && (
          <span className="ml-2 text-sm font-semibold text-gold-600 dark:text-gold-300">
            {active}.0
          </span>
        )}
      </div>

      {/* Average + count summary */}
      {totalRatings > 0 && (
        <div className="flex items-center gap-2 text-xs text-brown-400 dark:text-white/45">
          <span className="font-semibold text-charcoal dark:text-white/80">
            {avgRating.toFixed(1)}
          </span>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <FaStar
                key={s}
                size={10}
                className={s <= Math.round(avgRating) ? 'text-gold-500' : 'text-brown-200 dark:text-white/20'}
              />
            ))}
          </div>
          <span>
            {totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'}
          </span>
        </div>
      )}
    </div>
  );
};

export default StarRating;
