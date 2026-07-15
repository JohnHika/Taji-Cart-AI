import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { nawiriBrand } from '../config/brand';
import { valideURLConvert } from '../utils/valideURLConvert';

const isRealImage = (url = '') =>
  url && !url.includes('product-photo-pending') && !url.includes('via.placeholder');

const HeroBanner = ({ bestSellers = [], bannerProducts = [] }) => {
  const products = bannerProducts.length > 0 ? bannerProducts : bestSellers;
  const visibleProducts = products.filter((p) => isRealImage(p.image?.[0])).slice(0, 4);

  const firstProduct = bestSellers[0];
  const shopNowTo = firstProduct?._id
    ? `/product/${encodeURIComponent(valideURLConvert(firstProduct.name))}-${firstProduct._id}`
    : '/collections';

  return (
    <section className="relative w-full overflow-hidden bg-ivory dark:bg-dm-surface">
      {/* Subtle brand background that doesn't compete with product images */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-plum-50 via-ivory to-gold-50 dark:from-plum-900/20 dark:via-dm-surface dark:to-plum-800/10" />
        <div
          className="absolute -right-1/4 -top-1/4 h-[70vw] w-[70vw] rounded-full opacity-30 blur-3xl dark:opacity-15"
          style={{ background: 'radial-gradient(circle, rgba(201,148,58,0.22) 0%, rgba(201,148,58,0) 70%)' }}
        />
      </div>

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid min-h-[300px] grid-cols-1 items-center gap-6 py-8 md:min-h-[380px] md:grid-cols-2 md:py-10 lg:min-h-[420px]">
          {/* Text block */}
          <div className="order-1 max-w-xl md:order-1">
            <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.22em] text-gold-600 dark:text-gold-300">
              Premium hair · Delivered across Kenya
            </span>

            <h1 className="font-display text-3xl font-semibold leading-[1.1] text-charcoal dark:text-white sm:text-4xl md:text-5xl lg:text-[3.5rem]">
              Find the hair that feels like you.
            </h1>

            <p className="mt-3 max-w-md text-sm leading-relaxed text-brown-600 dark:text-white/70 md:mt-4">
              Shop wigs, weaves, braids and extensions designed for everyday confidence.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                to={shopNowTo}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-plum-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-plum-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500 active:scale-[0.98] dark:bg-plum-600 dark:hover:bg-plum-500"
              >
                Shop best sellers
              </Link>
              <Link
                to="/collections"
                className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-charcoal/20 bg-white/80 px-5 py-2.5 text-sm font-semibold text-charcoal backdrop-blur-sm transition-colors hover:border-charcoal/40 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum-600 active:scale-[0.98] dark:border-white/20 dark:bg-dm-card/80 dark:text-white dark:hover:bg-dm-card"
              >
                Browse collections
              </Link>
            </div>

            <p className="mt-4 text-xs italic text-brown-500 dark:text-white/50">
              {nawiriBrand.motto}
            </p>
          </div>

          {/* Product image block */}
          <div className="order-2 flex items-center justify-center md:order-2">
            {visibleProducts.length > 0 ? (
              <div className="grid w-full max-w-sm grid-cols-3 gap-2 sm:max-w-md sm:gap-3 md:max-w-lg lg:gap-4">
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
                        <p className="line-clamp-1 text-[11px] font-semibold text-white sm:text-xs">
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
              <div className="flex h-48 w-full max-w-sm items-center justify-center rounded-lg border border-dashed border-brown-300 bg-white/80 dark:border-dm-border dark:bg-dm-card">
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
