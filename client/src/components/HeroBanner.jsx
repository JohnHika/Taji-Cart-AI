import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { nawiriBrand } from '../config/brand';
import { valideURLConvert } from '../utils/valideURLConvert';

const HeroBanner = ({ bestSellers = [] }) => {
  const firstProduct = bestSellers[0];
  const shopNowTo = firstProduct?._id
    ? `/product/${encodeURIComponent(valideURLConvert(firstProduct.name))}-${firstProduct._id}`
    : '/collections';

  return (
    <section className="relative w-full overflow-hidden bg-ivory dark:bg-dm-surface">
      {/* Premium brand-led background — abstract, no photography needed */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-plum-50 via-ivory to-gold-50 dark:from-plum-900/30 dark:via-dm-surface dark:to-plum-800/20" />
        <div
          className="absolute -right-1/4 -top-1/4 h-[80vw] w-[80vw] rounded-full opacity-40 blur-3xl md:h-[60vw] md:w-[60vw] dark:opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(201,148,58,0.28) 0%, rgba(201,148,58,0) 70%)' }}
        />
        <div
          className="absolute -bottom-1/4 -left-1/4 h-[70vw] w-[70vw] rounded-full opacity-30 blur-3xl md:h-[50vw] md:w-[50vw] dark:opacity-15"
          style={{ background: 'radial-gradient(circle, rgba(75,30,62,0.22) 0%, rgba(75,30,62,0) 70%)' }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(250,248,245,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(250,248,245,0.2)_1px,transparent_1px)] bg-[size:3rem_3rem] dark:bg-[linear-gradient(rgba(28,16,24,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(28,16,24,0.15)_1px,transparent_1px)]" />
      </div>

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[420px] flex-col items-center justify-center py-12 text-center md:min-h-[520px] md:py-16 lg:min-h-[600px] lg:py-20">
          <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.22em] text-gold-600 dark:text-gold-300">
            Premium hair · Delivered across Kenya
          </span>

          <h1 className="max-w-4xl font-display text-4xl font-semibold leading-[1.08] text-charcoal dark:text-white sm:text-5xl md:text-6xl lg:text-7xl">
            Find the hair that feels like you.
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-brown-600 dark:text-white/70 sm:text-lg md:mt-6">
            Shop carefully selected wigs, weaves, braids and extensions designed for everyday confidence.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
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
              Browse all collections
            </Link>
          </div>

          <p className="mt-6 text-xs italic text-brown-500 dark:text-white/50">
            {nawiriBrand.motto}
          </p>
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
    })
  ),
};

export default HeroBanner;
