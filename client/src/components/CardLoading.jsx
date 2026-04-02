import React from 'react'

const CardLoading = () => {
  return (
    <div className="flex flex-col bg-white dark:bg-dm-card rounded-card border border-brown-100 dark:border-dm-border shadow-card overflow-hidden w-[155px] sm:w-[175px] lg:w-[210px] xl:w-[230px]">
      {/* Image skeleton */}
      <div className="h-[120px] sm:h-[140px] lg:h-[170px] bg-shimmer" />

      {/* Body skeleton */}
      <div className="p-2.5 sm:p-3 flex flex-col gap-2">
        {/* Category chip */}
        <div className="h-5 w-16 bg-shimmer rounded-pill" />
        {/* Title lines */}
        <div className="h-3.5 w-full bg-shimmer rounded" />
        <div className="h-3.5 w-3/4 bg-shimmer rounded" />
        {/* Unit */}
        <div className="h-3 w-12 bg-shimmer rounded" />
        {/* Price */}
        <div className="h-4 w-20 bg-shimmer rounded mt-1" />
        {/* Button */}
        <div className="h-8 w-full bg-shimmer rounded-pill mt-1" />
      </div>
    </div>
  )
}

export default CardLoading
