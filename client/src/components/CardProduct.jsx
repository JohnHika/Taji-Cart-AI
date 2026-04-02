import React from 'react'
import { FaHeart } from 'react-icons/fa'
import { Link } from 'react-router-dom'
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings'
import { pricewithDiscount } from '../utils/PriceWithDiscount'
import { valideURLConvert } from '../utils/valideURLConvert'
import AddToCartButton from './AddToCartButton'

const CardProduct = ({ data }) => {
  const discountedPrice = pricewithDiscount(data.price, data.discount)
  const hasDiscount = data.discount > 0
  const isOutOfStock = data.stock === 0

  const categoryName = data.category && data.category.length > 0
    ? (Array.isArray(data.category)
        ? (data.category[0]?.name || 'Hair')
        : (data.category?.name || 'Hair'))
    : null

  return (
    <div className={`relative group flex flex-col bg-white dark:bg-dm-card rounded-card border border-brown-100 dark:border-dm-border shadow-card hover:shadow-hover hover-lift transition-all duration-300 overflow-hidden w-[155px] sm:w-[175px] lg:w-[210px] xl:w-[230px] ${isOutOfStock ? 'opacity-75' : ''}`}>

      {/* Discount badge (absolute top-left) */}
      {hasDiscount && (
        <div className="absolute top-2 left-2 z-10 bg-gold-500 text-charcoal text-xs font-bold font-price px-2 py-0.5 rounded-pill shadow-sm">
          {data.discount}% OFF
        </div>
      )}

      {/* Wishlist heart (absolute top-right, shown on hover) */}
      <button
        onClick={(e) => e.preventDefault()}
        className="absolute top-2 right-2 z-10 w-7 h-7 bg-ivory/80 dark:bg-dm-card/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-blush-100 dark:hover:bg-dm-card-2"
        aria-label="Add to wishlist"
      >
        <FaHeart size={13} className="text-plum-300 hover:text-plum-700 transition-colors" />
      </button>

      {/* Product Image */}
      <Link
        to={`/product/${encodeURIComponent(valideURLConvert(data.name))}-${data._id}`}
        className="block"
        tabIndex={-1}
      >
        <div className="img-zoom-wrapper h-[120px] sm:h-[140px] lg:h-[170px] bg-blush-50 dark:bg-dm-card-2 flex items-center justify-center overflow-hidden">
          <img
            src={data.image[0]}
            alt={data.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://via.placeholder.com/250x250?text=No+Image';
            }}
          />
          {isOutOfStock && (
            <div className="absolute inset-0 bg-plum-900/40 flex items-center justify-center">
              <span className="bg-white/90 text-charcoal text-xs font-semibold px-3 py-1 rounded-pill">
                Out of Stock
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Card Body */}
      <div className="flex flex-col flex-1 p-2.5 sm:p-3 gap-1.5">
        {/* Category chip */}
        {categoryName && (
          <span className="text-xs w-fit bg-plum-100 dark:bg-plum-900/40 text-plum-700 dark:text-plum-200 px-2 py-0.5 rounded-pill font-medium leading-tight">
            {categoryName}
          </span>
        )}

        {/* Product name */}
        <Link
          to={`/product/${encodeURIComponent(valideURLConvert(data.name))}-${data._id}`}
          className="font-semibold text-xs sm:text-sm text-charcoal dark:text-white line-clamp-2 leading-snug hover:text-plum-700 dark:hover:text-plum-200 transition-colors"
          title={data.name}
        >
          {data.name}
        </Link>

        {/* Unit */}
        {data.unit && (
          <p className="text-xs text-brown-400 dark:text-white/40 leading-tight">
            {typeof data.unit === 'string' ? data.unit : (data.unit[0]?.name || '')}
          </p>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Price block */}
        <div className="flex flex-col gap-0.5">
          {hasDiscount && (
            <span className="text-xs text-brown-300 dark:text-white/30 line-through font-price leading-tight">
              {DisplayPriceInShillings(data.price)}
            </span>
          )}
          <span className="text-sm sm:text-base font-semibold font-price text-gold-600 dark:text-gold-300 leading-tight">
            {DisplayPriceInShillings(discountedPrice)}
          </span>
        </div>

        {/* Add to cart */}
        {!isOutOfStock ? (
          <div className="mt-1" onClick={(e) => e.preventDefault()}>
            <AddToCartButton data={data} />
          </div>
        ) : (
          <div className="mt-1 text-center text-xs text-brown-400 dark:text-white/30 py-1.5 border border-brown-100 dark:border-dm-border rounded-pill">
            Out of Stock
          </div>
        )}
      </div>
    </div>
  )
}

export default CardProduct
