import React, { useState } from 'react';
import { FaStar } from 'react-icons/fa';

const StarRating = ({ ratingData, onRate }) => {
  const [hoveredStar, setHoveredStar] = useState(null);

  const totalRatings = ratingData.reduce((sum, { count }) => sum + count, 0);
  const getPercentage = (count) => ((count / totalRatings) * 100).toFixed(1);

  return (
    <div className="flex flex-col items-start">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <div
            key={star}
            className="relative group"
            onMouseEnter={() => setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(null)}
            onClick={() => onRate(star)}
          >
            <FaStar
              className={`cursor-pointer ${
                star <= Math.round(ratingData.reduce((sum, { star, count }) => sum + star * count, 0) / totalRatings)
                  ? 'text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
            {hoveredStar === star && (
              <div className="absolute top-6 left-0 bg-white dark:bg-gray-800 text-xs p-2 rounded shadow">
                {getPercentage(ratingData[star - 1]?.count || 0)}% rated {star} star
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
        {totalRatings} user{totalRatings !== 1 ? 's' : ''} rated this product
      </p>
    </div>
  );
};

export default StarRating;
