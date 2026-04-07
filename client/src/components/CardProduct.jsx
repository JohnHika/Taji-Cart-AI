import React from 'react';
import { Link } from 'react-router-dom';
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings';
import { pricewithDiscount } from '../utils/PriceWithDiscount';
import { valideURLConvert } from '../utils/valideURLConvert';
import AddToCartButton from './AddToCartButton';

const CardProduct = ({ data }) => {
  const discountedPrice = pricewithDiscount(data.price, data.discount);
  const hasDiscount = data.discount > 0;
  const isOutOfStock = Number(data.stock) === 0;
  const categoryName = Array.isArray(data.category)
    ? data.category[0]?.name
    : data.category?.name;
  const unitName = typeof data.unit === 'string' ? data.unit : data.unit?.[0]?.name;

  return (
    <Link
      to={`/product/${encodeURIComponent(valideURLConvert(data.name))}-${data._id}`}
      className="group grid h-full min-h-0 w-[132px] max-w-full grid-rows-[auto_auto_auto_1fr_auto] gap-2 overflow-hidden rounded-xl border border-brown-200 bg-white p-2 transition-all duration-300 hover:-translate-y-1 hover:border-plum-300 hover:shadow-xl dark:border-dm-border dark:bg-dm-card dark:hover:border-plum-600 sm:w-[156px] sm:p-3 lg:w-[200px] lg:p-4 xl:w-[220px]"
    >
      <div className="relative h-20 w-full overflow-hidden rounded-lg bg-gradient-to-br from-plum-50 to-blush-50 shadow-sm dark:from-dm-card-2 dark:to-dm-card sm:h-24 lg:h-32">
        <img
          src={data.image?.[0]}
          alt={data.name}
          className="h-full w-full object-contain"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = 'https://via.placeholder.com/150?text=Hair+Product';
          }}
        />
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-1">
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

      <div className="min-w-0 overflow-hidden">
        {data.sku && (
          <div className="mb-1 truncate rounded bg-plum-50 px-2 py-1 font-mono text-[10px] text-brown-600 dark:bg-dm-card-2 dark:text-white/50 sm:text-xs" title={`SKU: ${data.sku}`}>
            SKU: {data.sku}
          </div>
        )}

        {unitName && (
          <p className="text-xs leading-tight text-brown-400 dark:text-white/40">
            {unitName}
          </p>
        )}
      </div>

      <div className="mt-auto flex min-w-0 flex-col gap-2 overflow-hidden text-xs sm:text-sm lg:text-base">
        <div className="min-w-0 flex flex-col">
          <div className={`${hasDiscount ? 'font-medium line-through text-brown-400 dark:text-white/45' : 'text-brown-400 dark:text-white/45'} truncate text-xs`}>
            {DisplayPriceInShillings(data.price)}
          </div>
          <div className="truncate font-semibold text-green-600 dark:text-green-400 sm:text-base">
            {DisplayPriceInShillings(discountedPrice)}
          </div>
        </div>

        <div className="flex w-full min-w-0 flex-col gap-2">
          <div
            className={`w-fit max-w-full truncate rounded-full px-2 py-1 text-[11px] font-bold shadow-sm sm:px-2.5 sm:text-xs ${
              hasDiscount
                ? 'bg-gradient-to-r from-plum-700 to-plum-600 text-white'
                : 'bg-brown-100 text-brown-700 dark:bg-dm-border dark:text-white/70'
            }`}
          >
            {data.discount || 0}% off
          </div>

          <div className="w-full min-w-0 max-w-full" onClick={(e) => e.preventDefault()}>
            {isOutOfStock ? (
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
