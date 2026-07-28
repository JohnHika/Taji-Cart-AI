import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { nawiriBrand } from '../config/brand';
import { valideURLConvert } from '../utils/valideURLConvert';

const isRealImage = (url = '') =>
  url && !url.includes('product-photo-pending') && !url.includes('via.placeholder');

const HeroBanner = ({ bestSellers = [], bannerProducts = [] }) => {
  const products = bannerProducts.length > 0 ? bannerProducts : bestSellers;
  const visibleProducts = products.filter((p) => isRealImage(p.image?.[0]));
  const featured = visibleProducts[0];

  const shopNowTo = featured?._id
    ? `/product/${encodeURIComponent(valideURLConvert(featured.name))}-${featured._id}`
    : '/collections';

  const backgroundImage = featured?.image?.[0];

  return (
    <section className="relative w-full overflow-hidden">
      {/* Background product image with dark gradient for readability */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-charcoal/85 via-charcoal/60 to-transparent dark:from-charcoal/90 dark:via-charcoal/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-transparent to-charcoal/20" />
      </div>

      <div className="container relative z-10 mx-auto px-4 py-8 sm:py-10 md:py-14 lg:py-20">
        <div className="flex min-h-[220px] flex-col justify-center sm:min-h-[260px] md:min-h-[320px] md:max-w-[55%] lg:max-w-[50%]">
          <span className="mb-2 inline-block text-[10px] font-bold uppercase tracking-[0.22em] text-gold-300 sm:text-xs">
            {nawiriBrand.motto}
          </span>

          <h1 className="font-display text-3xl font-semibold leading-[1.08] text-white sm:text-4xl md:text-5xl lg:text-6xl">
            Premium hair, your way.
          </h1>

          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/80 sm:text-base">
            Wigs, braids, weaves and extensions curated for every Kenyan woman. Shop
            top-rated styles and discover your next look.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              to={shopNowTo}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-gold-500 px-6 py-2.5 text-sm font-bold text-charcoal transition-transform hover:bg-gold-400 active:scale-[0.98]"
            >
              Shop featured
            </Link>
            <Link
              to="/collections"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/30 bg-white/10 px-6 py-2.5 text-sm font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              Browse collections
            </Link>
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
