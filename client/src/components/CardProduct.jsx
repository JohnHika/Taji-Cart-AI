import React from 'react';
import { Link } from 'react-router-dom';
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings';
import { pricewithDiscount } from '../utils/PriceWithDiscount';
import { valideURLConvert } from '../utils/valideURLConvert';
import AddToCartButton from './AddToCartButton';
import WatermarkedImage from './WatermarkedImage';

const CardProduct = ({ data }) => {
  const hasValidPrice = Number.isFinite(Number(data.price));
  const discountedPrice = hasValidPrice ? pricewithDiscount(data.price, data.discount) : null;
  const hasDiscount = data.discount > 0;
  const isOutOfStock = Number(data.stock) === 0;
  const categoryName = Array.isArray(data.category)
    ? data.category[0]?.name
    : data.category?.name;
  const unitName = typeof data.unit === 'string' ? data.unit : data.unit?.[0]?.name;

  return (
    <Link
      to={`/product/${encodeURIComponent(valideURLConvert(data.name))}-${data._id}`}
      className="group grid h-full min-h-0 w-[140px] max-w-full grid-rows-[auto_auto_auto_1fr_auto] gap-1.5 overflow-hidden rounded-xl border border-brown-200 bg-white p-2 transition-all duration-300 hover:-translate-y-1 hover:border-plum-300 hover:shadow-xl dark:border-dm-border dark:bg-dm-card dark:hover:border-plum-600 xs:w-[156px] sm:w-[172px] sm:gap-2 sm:p-3 md:w-[192px] lg:w-[212px] lg:p-4 xl:w-[232px]"
    >
      <WatermarkedImage
        src={data.image?.[0]}
        alt={data.name}
        className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-blush-50 dark:bg-dm-card-2 shadow-sm sm:aspect-square"
        imgClassName="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />

      <div className="mt-0.5 flex flex-wrap items-center gap-1 sm:mt-1">
        {categoryName && (
          <div className="w-fit rounded-full bg-plum-100 px-2 py-1 text-xs font-semibold text-plum-800 dark:bg-plum-900/50 dark:text-plum-200 sm:px-3">
            {categoryName}
          </div>
        )}
      </div>

      <div className="relative min-w-0 overflow-hidden">
        <p
          className="line-clamp-2 break-words text-xs font-semibold leading-snug text-charcoal transition-colors group-hover:text-plum-700 dark:text-white dark:group-hover:text-plum-200 sm:text-sm"
          title={data.name}
        >
          {data.name}
        </p>
      </div>

      <div className="hidden min-w-0 overflow-hidden sm:block">
        {unitName && (
          <p className="text-xs leading-tight text-brown-400 dark:text-white/40">
            {unitName}
          </p>
        )}
      </div>

      <div className="mt-auto flex min-w-0 flex-col gap-2 overflow-hidden text-xs sm:text-sm lg:text-base">
        <div className="min-w-0 flex flex-col">
          {hasValidPrice ? (
            hasDiscount ? (
              <>
                <div className="truncate text-xs font-medium line-through text-brown-400 dark:text-white/45">
                  {DisplayPriceInShillings(data.price)}
                </div>
                <div className="truncate font-semibold text-green-600 dark:text-green-400 sm:text-base">
                  {DisplayPriceInShillings(discountedPrice)}
                </div>
              </>
            ) : (
              <div className="truncate font-semibold text-charcoal dark:text-white sm:text-base">
                {DisplayPriceInShillings(data.price)}
              </div>
            )
          ) : (
            <>
              <div className="truncate text-xs text-brown-400 dark:text-white/45">
                Price pending
              </div>
              <div className="truncate font-semibold text-charcoal dark:text-white sm:text-base">
                Pricing coming soon
              </div>
            </>
          )}
        </div>

        <div className="flex w-full min-w-0 flex-col gap-2">
          {hasValidPrice && hasDiscount ? (
            <div
              className="w-fit max-w-full truncate rounded-full bg-gradient-to-r from-plum-700 to-plum-600 px-2 py-1 text-[11px] font-bold text-white shadow-sm sm:px-2.5 sm:text-xs"
            >
              {data.discount}% off
            </div>
          ) : !hasValidPrice ? (
            <div className="w-fit max-w-full truncate rounded-full bg-brown-100 px-2 py-1 text-[11px] font-bold text-brown-700 shadow-sm dark:bg-dm-border dark:text-white/70 sm:px-2.5 sm:text-xs">
              Catalog preview
            </div>
          ) : null}

          <div className="w-full min-w-0 max-w-full" onClick={(e) => e.preventDefault()}>
            {!hasValidPrice ? (
              <p className="text-left text-[11px] text-brown-500 dark:text-white/55">
                Awaiting price update
              </p>
            ) : isOutOfStock ? (
              <p className="text-left text-[11px] text-red-500 dark:text-red-400">
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

export default CardProduct;
