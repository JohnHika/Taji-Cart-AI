import React from 'react';

const isPlaceholderImage = (url = '') =>
  !url || url.includes('product-photo-pending') || url.includes('via.placeholder');

const CategoryBannerGrid = ({ items = [], onSelect }) => {
  if (!items.length) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
      {items.map((item, index) => {
        const coverImage = item.products?.[0]?.image?.[0] || item.coverImage || item.image || '';
        const hasRealImage = !isPlaceholderImage(coverImage);
        const surface = index % 2 === 0 ? 'bg-plum-900' : 'bg-charcoal';

        return (
          <button
            key={item._id}
            type="button"
            onClick={() => onSelect?.(item)}
            className={`group relative overflow-hidden rounded-2xl sm:rounded-3xl ${surface} p-4 sm:p-6 text-left text-white shadow-[0_4px_24px_rgba(75,30,62,0.18)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_40px_rgba(75,30,62,0.28)]`}
          >
            {/* Gold ring motif — echoes the brand mark, replaces the old gradient wash */}
            <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full border border-gold-500/25 transition-colors duration-300 group-hover:border-gold-500/45 sm:-right-8 sm:-top-10 sm:h-52 sm:w-52" />
            <div className="pointer-events-none absolute -right-4 -top-6 h-24 w-24 rounded-full border border-gold-500/15 sm:h-32 sm:w-32" />

            {/* Product medallion — only when a real photo exists */}
            {hasRealImage && (
              <div className="absolute right-4 top-4 hidden h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-white shadow-lg ring-1 ring-gold-500/40 sm:flex sm:h-24 sm:w-24">
                <img
                  src={coverImage}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }}
                />
              </div>
            )}

            <div className="relative z-10 flex min-h-[150px] flex-col justify-between sm:min-h-[210px]">
              <div className="max-w-[85%]">
                <h3 className="font-display text-lg font-semibold leading-tight !text-white sm:text-2xl xl:text-3xl">
                  {item.name}
                </h3>
                <p className="mt-1 text-xs text-white/60 sm:mt-2 sm:text-sm">
                  {item.productCount} style{item.productCount === 1 ? '' : 's'}
                  <span className="hidden sm:inline"> to explore</span>
                </p>
              </div>

              <div>
                {item.subcategories?.length ? (
                  <div className="mb-3 hidden flex-wrap gap-2 sm:flex">
                    {item.subcategories.slice(0, 3).map((subCategory) => (
                      <span
                        key={subCategory._id}
                        className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-white/70"
                      >
                        {subCategory.name}
                      </span>
                    ))}
                  </div>
                ) : null}

                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold-300 transition-all duration-300 group-hover:gap-2.5 group-hover:text-gold-200 sm:text-sm">
                  <span className="sm:hidden">Shop</span>
                  <span className="hidden sm:inline">Shop collection</span>
                  <span aria-hidden="true">→</span>
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default CategoryBannerGrid;
