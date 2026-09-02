const CardLoading = () => {
  // Widths match the real CardProduct exactly (154/176/196/216) so the
  // skeleton doesn't shift the row by a few px when data lands.
  return (
    <div className="flex w-[154px] flex-col overflow-hidden rounded-card border border-brown-200 bg-white dark:border-dm-border dark:bg-dm-card sm:w-[176px] md:w-[196px] lg:w-[216px]">
      {/* Compact mobile image skeleton; desktop retains the portrait ratio. */}
      <div className="aspect-square w-full bg-shimmer xs:aspect-[4/5] sm:aspect-[3/4]" />

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
        <div className="mt-1 h-11 w-full rounded bg-shimmer" />
      </div>
    </div>
  )
}

export default CardLoading
