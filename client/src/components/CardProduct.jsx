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
      className="group grid h-full w-[132px] grid-rows-[auto_auto_auto_1fr_auto] gap-2 rounded-xl border border-gray-200 bg-white p-2 transition-all duration-300 hover:-translate-y-1 hover:border-pink-300 hover:shadow-xl dark:border-gray-700 dark:bg-gray-800 dark:hover:border-pink-600 sm:w-[156px] sm:p-3 lg:w-[200px] lg:p-4 xl:w-[220px]"
    >
      <div className="relative h-20 w-full overflow-hidden rounded-lg bg-gradient-to-br from-pink-50 to-rose-50 shadow-sm dark:from-gray-900 dark:to-gray-800 sm:h-24 lg:h-32">
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
          <div className="w-fit rounded-full bg-pink-100 px-2 py-1 text-xs font-semibold text-pink-700 dark:bg-pink-900/50 dark:text-pink-300 sm:px-3">
            {categoryName}
          </div>
        )}
      </div>

      <div className="relative min-w-0">
        <p
          className="line-clamp-2 text-xs font-semibold leading-snug text-charcoal transition-colors group-hover:text-plum-700 dark:text-white dark:group-hover:text-plum-200 sm:text-sm"
          title={data.name}
        >
          {data.name}
        </p>
        <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 hidden w-full rounded bg-gray-800 p-2 text-xs text-white shadow-lg group-hover:block dark:bg-gray-700">
          {data.name}
        </div>
      </div>

      <div className="min-w-0">
        {data.sku && (
          <div className="mb-1 rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">
            SKU: {data.sku}
          </div>
        )}

        {unitName && (
          <p className="text-xs leading-tight text-brown-400 dark:text-white/40">
            {unitName}
          </p>
        )}
      </div>

      <div className="mt-auto flex min-w-0 flex-col gap-2 text-xs sm:text-sm lg:text-base">
        <div className="flex flex-col">
          <div className={`${hasDiscount ? 'font-medium line-through text-gray-500 dark:text-gray-400' : 'text-gray-500 dark:text-gray-400'} text-xs`}>
            {DisplayPriceInShillings(data.price)}
          </div>
          <div className="font-semibold text-green-600 dark:text-green-400 sm:text-base">
            {DisplayPriceInShillings(discountedPrice)}
          </div>
        </div>

        <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div
            className={`w-fit flex-shrink-0 rounded-full px-2 py-1 text-[11px] font-bold shadow-sm sm:px-2.5 sm:text-xs ${
              hasDiscount
                ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            {data.discount || 0}% off
          </div>

          <div className="w-full sm:w-auto sm:flex-shrink-0" onClick={(e) => e.preventDefault()}>
            {isOutOfStock ? (
              <p className="text-left text-[11px] text-red-500 dark:text-red-400 sm:text-center">
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
