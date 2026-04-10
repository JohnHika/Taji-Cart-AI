import React from 'react';

const CategoryBannerGrid = ({ items = [], onSelect }) => {
  if (!items.length) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item, index) => {
        const fallbackImage = item.products?.[0]?.image?.[0] || item.coverImage || item.image || '';
        const accentStyles = [
          'from-plum-900 via-plum-700 to-gold-500',
          'from-charcoal via-brown-700 to-gold-500',
          'from-plum-800 via-blush-700 to-charcoal',
          'from-gold-700 via-plum-700 to-plum-900'
        ];
        const accent = accentStyles[index % accentStyles.length];

        return (
          <button
            key={item._id}
            type="button"
            onClick={() => onSelect?.(item)}
            className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${accent} p-5 text-left text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-6`}
          >
            <div className="absolute inset-0 opacity-20">
              {fallbackImage ? (
                <img
                  src={fallbackImage}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : null}
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/20 to-transparent" />

            <div className="relative z-10 flex min-h-[220px] flex-col justify-between">
              <div className="max-w-[80%]">
                <div className="mb-3 inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] backdrop-blur-sm">
                  Category banner
                </div>
                <h3 className="text-2xl font-bold leading-tight sm:text-3xl">{item.name}</h3>
                <p className="mt-2 max-w-sm text-sm text-white/80">
                  {item.productCount} product{item.productCount === 1 ? '' : 's'} ready to explore.
                </p>
              </div>

              <div>
                {item.subcategories?.length ? (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {item.subcategories.slice(0, 3).map((subCategory) => (
                      <span
                        key={subCategory._id}
                        className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm"
                      >
                        {subCategory.name}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-charcoal transition-transform duration-300 group-hover:translate-x-1">
                  Shop collection
                  <span aria-hidden="true">-&gt;</span>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default CategoryBannerGrid;
