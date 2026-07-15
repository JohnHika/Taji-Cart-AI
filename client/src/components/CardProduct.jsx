import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings';
import { pricewithDiscount } from '../utils/PriceWithDiscount';
import { valideURLConvert } from '../utils/valideURLConvert';
import AddToCartButton from './AddToCartButton';
import WatermarkedImage from './WatermarkedImage';
import WishlistButton from './WishlistButton';

const CardProduct = ({ data }) => {
  const hasValidPrice = Number.isFinite(Number(data.price));
  const discountedPrice = hasValidPrice ? pricewithDiscount(data.price, data.discount) : null;
  const hasDiscount = data.discount > 0;
  const isOutOfStock = Number(data.stock) === 0;
  const unitName = typeof data.unit === 'string' ? data.unit : data.unit?.[0]?.name;

  return (
    <Link
      to={`/product/${encodeURIComponent(valideURLConvert(data.name))}-${data._id}`}
      className="group flex h-full w-[150px] flex-col overflow-hidden rounded-lg border border-brown-200 bg-white transition-shadow duration-200 hover:shadow-md dark:border-dm-border dark:bg-dm-card sm:w-[172px] md:w-[192px] lg:w-[212px]"
    >
      <div className="relative">
        <WatermarkedImage
          src={data.image?.[0]}
          alt={data.name}
          className="aspect-[3/4] w-full overflow-hidden bg-ivory dark:bg-dm-card-2"
          imgClassName="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          watermarkClassName="w-[18%] max-w-[44px] opacity-70 bottom-1.5 right-1.5"
        />
        <WishlistButton productId={data._id} className="absolute right-1.5 top-1.5 sm:right-2 sm:top-2" />
      </div>

      <div className="flex flex-1 flex-col p-2.5 sm:p-3">
        <p
          className="line-clamp-2 min-h-[2.4em] text-xs font-semibold leading-snug text-charcoal group-hover:text-plum-700 dark:text-white dark:group-hover:text-plum-200 sm:text-sm"
          title={data.name}
        >
          {data.name}
        </p>

        {unitName && (
          <p className="mt-0.5 hidden text-xs text-brown-400 dark:text-white/40 sm:block">
            {unitName}
          </p>
        )}

        <div className="mt-auto pt-2">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            {hasValidPrice ? (
              <>
                <span className="font-price text-sm font-semibold text-charcoal dark:text-white sm:text-base">
                  {DisplayPriceInShillings(hasDiscount ? discountedPrice : data.price)}
                </span>
                {hasDiscount && (
                  <span className="text-xs text-brown-400 line-through dark:text-white/45">
                    {DisplayPriceInShillings(data.price)}
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs font-medium text-brown-500 dark:text-white/55">
                Price coming soon
              </span>
            )}
          </div>

          {hasDiscount && hasValidPrice && (
            <span className="mt-1 inline-block text-[11px] font-semibold text-gold-600 dark:text-gold-300">
              {data.discount}% off
            </span>
          )}

          <div className="mt-2 w-full" onClick={(e) => e.preventDefault()}>
            {!hasValidPrice ? null : isOutOfStock ? (
              <p className="text-left text-[11px] font-medium text-red-500 dark:text-red-400">
                Out of stock
              </p>
            ) : (
              <AddToCartButton data={data} />
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

CardProduct.propTypes = {
  data: PropTypes.object.isRequired,
};

export default CardProduct;
