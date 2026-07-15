import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { nawiriBrand } from '../config/brand';
import { valideURLConvert } from '../utils/valideURLConvert';

const isRealImage = (url = '') =>
  url && !url.includes('product-photo-pending') && !url.includes('via.placeholder');

const HeroBanner = ({ bestSellers = [], bannerProducts = [] }) => {
  const products = bannerProducts.length > 0 ? bannerProducts : bestSellers;
  const visibleProducts = products.filter((p) => isRealImage(p.image?.[0])).slice(0, 6);

  const firstProduct = bestSellers[0];
  const shopNowTo = firstProduct?._id
    ? `/product/${encodeURIComponent(valideURLConvert(firstProduct.name))}-${firstProduct._id}`
    : '/collections';

  return (
    <section className="relative w-full overflow-hidden bg-ivory dark:bg-dm-surface">
      {/* Subtle brand background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-r from-plum-50 via-ivory to-gold-50 dark:from-plum-900/20 dark:via-dm-surface dark:to-plum-800/10" />
      </div>

      <div className="container relative z-10 mx-auto px-3 py-4 sm:px-4 lg:px-8 lg:py-10">
        {/* Mobile: product-first compact banner */}
        <div className="flex flex-col gap-3 md:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-xl font-semibold leading-[1.15] text-charcoal dark:text-white">
                Find hair that feels like you.
              </h1>
              <p className="mt-1 text-xs text-brown-600 dark:text-white/60">
                Premium hair delivered across Kenya.
              </p>
            </div>
            <Link
              to={shopNowTo}
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-plum-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-plum-600 active:scale-[0.98] dark:bg-plum-600 dark:hover:bg-plum-500"
            >
              Shop now
            </Link>
          </div>

          {visibleProducts.length > 0 && (
            <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 scrollbar-hide sm:-mx-4 sm:px-4">
              {visibleProducts.map((product, idx) => {
                const productUrl = `/product/${encodeURIComponent(valideURLConvert(product.name))}-${product._id}`;
                return (
                  <Link
                    key={product._id}
                    to={productUrl}
                    className="relative shrink-0 overflow-hidden rounded-lg border border-brown-200 bg-white shadow-sm dark:border-dm-border dark:bg-dm-card"
                    style={{ width: '120px', height: idx === 0 ? '150px' : '120px' }}
                  >
                    <img
                      src={product.image[0]}
                      alt={product.name}
                      className="h-full w-full object-cover"
                      loading={idx === 0 ? 'eager' : 'lazy'}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-charcoal/60 to-transparent px-2 py-1.5">
                      <p className="line-clamp-1 text-[10px] font-semibold text-white">{product.name}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Tablet/Desktop: 2-column editorial layout */}
        <div className="hidden items-center gap-8 md:grid md:grid-cols-2 lg:gap-12">
          <div className="max-w-xl">
            <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.22em] text-gold-600 dark:text-gold-300">
              Premium hair · Delivered across Kenya
            </span>

            <h1 className="font-display text-4xl font-semibold leading-[1.1] text-charcoal dark:text-white sm:text-5xl lg:text-6xl">
              Find the hair that feels like you.
            </h1>

            <p className="mt-4 max-w-md text-base leading-relaxed text-brown-600 dark:text-white/70">
              Shop wigs, weaves, braids and extensions designed for everyday confidence.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to={shopNowTo}
                className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-plum-700 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-plum-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500 active:scale-[0.98] dark:bg-plum-600 dark:hover:bg-plum-500"
              >
                Shop best sellers
              </Link>
              <Link
                to="/collections"
                className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-charcoal/20 bg-white/80 px-7 py-3 text-sm font-semibold text-charcoal backdrop-blur-sm transition-colors hover:border-charcoal/40 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600 active:scale-[0.98] dark:border-white/20 dark:bg-dm-card/80 dark:text-white dark:hover:bg-dm-card"
              >
                Browse collections
              </Link>
            </div>

            <p className="mt-5 text-xs italic text-brown-500 dark:text-white/50">
              {nawiriBrand.motto}
            </p>
          </div>

          <div className="flex items-center justify-center">
            {visibleProducts.length > 0 ? (
              <div className="grid w-full max-w-md grid-cols-3 gap-3 lg:max-w-lg lg:gap-4">
                {visibleProducts.slice(0, 3).map((product, index) => {
                  const productUrl = `/product/${encodeURIComponent(valideURLConvert(product.name))}-${product._id}`;
                  const isTall = index === 0;
                  return (
                    <Link
                      key={product._id}
                      to={productUrl}
                      className={`group relative overflow-hidden rounded-lg border border-brown-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-dm-border dark:bg-dm-card ${
                        isTall ? 'col-span-1 row-span-2' : ''
                      }`}
                    >
                      <img
                        src={product.image[0]}
                        alt={product.name}
                        className={`w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                          isTall ? 'aspect-[3/4]' : 'aspect-square'
                        }`}
                        loading={index === 0 ? 'eager' : 'lazy'}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-charcoal/70 to-transparent p-2">
                        <p className="line-clamp-1 text-[11px] font-semibold text-white">
                          {product.name}
                        </p>
                      </div>
                    </Link>
                  );
                })}
                {visibleProducts.length >= 4 && (
                  <Link
                    to="/collections"
                    className="group relative flex items-center justify-center overflow-hidden rounded-lg border border-brown-200 bg-plum-50 shadow-sm transition-colors hover:bg-plum-100 dark:border-dm-border dark:bg-plum-900/20 dark:hover:bg-plum-900/30"
                  >
                    <span className="text-center text-sm font-semibold text-plum-700 dark:text-plum-200">
                      View all
                      <br />
                      styles
                    </span>
                  </Link>
                )}
              </div>
            ) : (
              <div className="flex h-48 w-full max-w-md items-center justify-center rounded-lg border border-dashed border-brown-300 bg-white/80 dark:border-dm-border dark:bg-dm-card">
                <span className="text-sm text-brown-500 dark:text-white/50">New arrivals loading…</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

HeroBanner.propTypes = {
  bestSellers: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string,
      name: PropTypes.string,
      image: PropTypes.arrayOf(PropTypes.string),
    })
  ),
  bannerProducts: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string,
      name: PropTypes.string,
      image: PropTypes.arrayOf(PropTypes.string),
    })
  ),
};

export default HeroBanner;
