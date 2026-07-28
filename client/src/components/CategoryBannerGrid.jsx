import PropTypes from 'prop-types';
import { FiArrowRight } from 'react-icons/fi';

const isPlaceholderImage = (url = '') =>
  !url || url.includes('product-photo-pending') || url.includes('via.placeholder');

const CategoryBannerGrid = ({ items = [], onSelect }) => {
  if (!items.length) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => {
        const coverImage = item.products?.[0]?.image?.[0] || item.coverImage || item.image || '';
        const hasRealImage = !isPlaceholderImage(coverImage);

        return (
          <button
            key={item._id}
            type="button"
            onClick={() => onSelect?.(item)}
            className="group relative aspect-[4/5] overflow-hidden rounded-lg text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
          >
            <div className="absolute inset-0 bg-brown-200 dark:bg-dm-card">
              {hasRealImage ? (
                <img
                  src={coverImage}
                  alt={item.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : null}
            </div>

            {/* Readable overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/20 to-transparent" />

            <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
              <h3 className="font-display text-lg font-semibold leading-tight text-white sm:text-xl lg:text-2xl">
                {item.name}
              </h3>
              <p className="mt-0.5 text-xs text-white/70 sm:mt-1 sm:text-sm">
                {item.productCount} style{item.productCount === 1 ? '' : 's'}
              </p>
              <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-gold-300 transition-colors group-hover:text-gold-200 sm:text-sm">
                Shop
                <FiArrowRight size={14} aria-hidden="true" />
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

CategoryBannerGrid.propTypes = {
  items: PropTypes.arrayOf(PropTypes.object),
  onSelect: PropTypes.func,
};

export default CategoryBannerGrid;
