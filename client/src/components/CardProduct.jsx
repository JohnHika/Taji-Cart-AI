import PropTypes from 'prop-types';
import { motion, useReducedMotion } from 'framer-motion';
import { FaStar } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings';
import { pricewithDiscount } from '../utils/PriceWithDiscount';
import { getRatingSummary, getStockPresentation } from '../utils/productCardPresentation';
import { getProductNavigationOptions } from '../utils/productRouteScroll';
import { valideURLConvert } from '../utils/valideURLConvert';
import AddToCartButton from './AddToCartButton';
import WatermarkedImage from './WatermarkedImage';
import WishlistButton from './WishlistButton';
import WhatsAppOrderButton from './WhatsAppOrderButton';

const CardProduct = ({ data }) => {
  const reduceMotion = useReducedMotion();
  const hasValidPrice = Number.isFinite(Number(data.price));
  const discountedPrice = hasValidPrice ? pricewithDiscount(data.price, data.discount) : null;
  const hasDiscount = data.discount > 0;
  const stock = getStockPresentation(data.stock);
  const rating = getRatingSummary(data);
  const unitName = typeof data.unit === 'string' ? data.unit : data.unit?.[0]?.name;
  const productUrl = `/product/${encodeURIComponent(valideURLConvert(data.name))}-${data._id}`;

  const stockTone = {
    available: 'text-emerald-700 dark:text-emerald-300',
    low: 'text-gold-600 dark:text-gold-300',
    unavailable: 'text-red-600 dark:text-red-400',
  }[stock.tone];

  return (
    <motion.article
      className="group relative flex w-[154px] flex-col overflow-hidden rounded-card border border-brown-200 bg-white shadow-sm dark:border-dm-border dark:bg-dm-card sm:w-[176px] md:w-[196px] lg:w-[216px]"
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      whileHover={reduceMotion ? undefined : { y: -3 }}
    >
      <Link to={productUrl} {...getProductNavigationOptions()} className="block" aria-label={`View ${data.name}`}>
        <WatermarkedImage
          src={data.image?.[0]}
          alt={data.name}
          className="aspect-square w-full overflow-hidden bg-ivory dark:bg-dm-card-2 xs:aspect-[4/5] sm:aspect-[3/4]"
          imgClassName={`h-full w-full object-cover ${reduceMotion ? '' : 'transition-transform duration-300 group-hover:scale-[1.03]'}`}
          watermarkClassName="bottom-1.5 right-1.5 w-[18%] max-w-[44px] opacity-70"
        />
      </Link>
      <WishlistButton
        productId={data._id}
        className="absolute right-2 top-2 h-9 w-9 border border-brown-100/80 dark:border-dm-border"
      />

      <div className="p-2 sm:p-3">
        <Link
          to={productUrl}
          {...getProductNavigationOptions()}
          className="line-clamp-2 min-h-[2.4em] text-[11px] font-semibold leading-snug text-charcoal transition-colors hover:text-plum-700 dark:text-white dark:hover:text-plum-200 sm:text-sm"
          title={data.name}
        >
          {data.name}
        </Link>

        <div className="mt-1 flex min-h-4 items-center">
          {rating ? (
            <span className="inline-flex min-w-0 items-center gap-1 text-[11px] text-brown-500 dark:text-white/55" title={rating.label}>
              <FaStar className="shrink-0 text-gold-500" size={12} aria-hidden="true" />
              <span className="font-semibold text-charcoal dark:text-white">{rating.average}</span>
              <span className="truncate">({rating.count})</span>
            </span>
          ) : (
            <span className="text-[11px] text-brown-400 dark:text-white/40">No ratings yet</span>
          )}
        </div>

        <div className="mt-0.5 flex min-h-4 items-center justify-between gap-2 text-[10px] sm:text-[11px]">
          <span className="truncate text-brown-400 dark:text-white/40">{unitName || 'Hair product'}</span>
          <span className={`shrink-0 font-semibold ${stockTone}`}>{stock.label}</span>
        </div>

        <div className="mt-1.5 border-t border-brown-100 pt-1.5 dark:border-dm-border sm:mt-2 sm:pt-2">
          <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
            {hasValidPrice ? (
              <div className="min-w-0">
                <span className="font-price text-sm font-semibold text-charcoal dark:text-white sm:text-base">
                  {DisplayPriceInShillings(hasDiscount ? discountedPrice : data.price)}
                </span>
                {hasDiscount && (
                  <span className="ml-1.5 text-[11px] text-brown-400 line-through dark:text-white/45">
                    {DisplayPriceInShillings(data.price)}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs font-medium text-brown-500 dark:text-white/55">Price coming soon</span>
            )}
            {hasDiscount && hasValidPrice && (
              <span className="text-[11px] font-semibold text-gold-600 dark:text-gold-300">{data.discount}% off</span>
            )}
          </div>

          {hasValidPrice && stock.tone !== 'unavailable' ? (
            <div className="mt-1.5 flex w-full gap-1.5 sm:mt-2 sm:gap-2">
              <div className="min-w-0 flex-1">
                <AddToCartButton data={data} className="min-h-10" />
              </div>
              <WhatsAppOrderButton product={data} className="h-10 w-10 shrink-0 rounded-lg" />
            </div>
          ) : hasValidPrice ? (
            <p className="mt-2 text-left text-[11px] font-semibold text-red-600 dark:text-red-400">This style is currently unavailable</p>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
};

CardProduct.propTypes = {
  data: PropTypes.object.isRequired,
};

export default CardProduct;
