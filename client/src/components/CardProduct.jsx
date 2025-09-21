import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings'
import { pricewithDiscount } from '../utils/PriceWithDiscount'
import { valideURLConvert } from '../utils/valideURLConvert'
import AddToCartButton from './AddToCartButton'

const CardProduct = ({data}) => {
  const [loading, setLoading] = useState(false)
  
  return (
    <Link 
      to={`/product/${encodeURIComponent(valideURLConvert(data.name))}-${data._id}`} 
      className='border dark:border-gray-700 p-2 sm:p-3 lg:p-4 grid grid-rows-[auto_auto_auto_1fr_auto] gap-1 sm:gap-2 lg:gap-2 
                 w-[140px] sm:w-[160px] lg:w-[200px] xl:w-[220px] h-full rounded-lg cursor-pointer 
                 bg-white dark:bg-gray-800 transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1 
                 active:scale-95 touch-manipulation'
    >
      {/* Product image with responsive height */}
      <div className='relative h-20 sm:h-24 lg:h-32 w-full rounded overflow-hidden bg-gray-50 dark:bg-gray-900'>
        <img 
          src={data.image[0]}
          alt={data.name}
          className='w-full h-full object-contain'
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://via.placeholder.com/150?text=No+Image';
          }}
        />
      </div>
      
      <div className='flex items-center gap-1 flex-wrap mt-1'>
        {/* Category display */}
        {data.category && data.category.length > 0 && (
          <div className='rounded text-xs w-fit p-[1px] px-1 sm:px-2 text-green-600 bg-green-50 dark:bg-green-900 dark:text-green-300'>
            {Array.isArray(data.category) 
              ? data.category[0].name 
              : data.category.name || 'Category'}
          </div>
        )}
      </div>
      
      {/* Product name with responsive text sizing */}
      <div className='font-medium text-xs sm:text-sm lg:text-base dark:text-white group relative'>
        <p 
          className="line-clamp-2 overflow-hidden text-ellipsis leading-tight sm:leading-normal" 
          title={data.name}
        >
          {data.name}
        </p>
        <div className="absolute left-0 w-full -bottom-12 origin-top-left scale-0 rounded bg-gray-800 dark:bg-gray-700 p-2 text-xs text-white shadow-lg transition-all duration-300 z-50 group-hover:scale-100 pointer-events-none">
          {data.name}
        </div>
      </div>
      
      {/* Unit */}
      <div className='w-fit gap-1 text-xs sm:text-sm lg:text-base dark:text-gray-300'>
        {data.unit && (
          <span className='text-gray-500 dark:text-gray-400'>
            {typeof data.unit === 'string' ? data.unit : 
             (data.unit.length > 0 ? data.unit[0].name : '')}
          </span>
        )}
      </div>

      {/* Price, discount badge and add to cart - mobile-optimized layout */}
      <div className='flex flex-col gap-2 text-xs sm:text-sm lg:text-base mt-auto'>
        {/* Price section */}
        <div className='flex flex-col'>
          {/* Always show original price */}
          <div className={`${data.discount > 0 ? 'text-gray-500 dark:text-gray-400 text-xs font-medium line-through' : 'text-xs text-gray-500 dark:text-gray-400'}`}>
            {DisplayPriceInShillings(data.price)}
          </div>
          
          {/* Discounted price (or original if no discount) */}
          <div className='font-semibold text-green-600 dark:text-green-400 text-sm sm:text-base'>
            {DisplayPriceInShillings(pricewithDiscount(data.price, data.discount))}
          </div>
        </div>
        
        {/* Bottom row with discount badge and add to cart */}
        <div className='flex items-center justify-between gap-1 w-full'>
          {/* Discount badge */}
          <div className={`text-xs font-bold px-1 sm:px-2 py-0.5 rounded-full shadow-sm flex-shrink-0 ${
            data.discount > 0 
              ? "bg-red-500 text-white" 
              : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
          }`}>
            {data.discount || 0}% off
          </div>
          
          {/* Add to cart / stock status */}
          <div className='flex-shrink-0'>
            {data.stock == 0 ? (
              <p className='text-red-500 dark:text-red-400 text-xs text-center'>Out of stock</p>
            ) : (
              <AddToCartButton data={data} />
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

export default CardProduct
