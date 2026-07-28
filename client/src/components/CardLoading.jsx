const CardLoading = () => {
  return (
    <div className="flex w-[150px] flex-col overflow-hidden rounded-lg border border-brown-200 bg-white dark:border-dm-border dark:bg-dm-card sm:w-[172px] md:w-[192px] lg:w-[212px]">
      {/* Image skeleton 3:4 ratio */}
      <div className="aspect-[3/4] w-full bg-shimmer" />

      {/* Body skeleton */}
      <div className="flex flex-col gap-2 p-2.5 sm:p-3">
        {/* Title lines */}
        <div className="h-3.5 w-full rounded bg-shimmer" />
        <div className="h-3.5 w-3/4 rounded bg-shimmer" />
        {/* Unit */}
        <div className="h-3 w-12 rounded bg-shimmer" />
        {/* Price */}
        <div className="mt-1 h-4 w-20 rounded bg-shimmer" />
        {/* Button */}
        <div className="mt-1 h-8 w-full rounded bg-shimmer" />
      </div>
    </div>
  )
}

export default CardLoading
