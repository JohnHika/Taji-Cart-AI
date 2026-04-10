import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { FaAngleLeft, FaAngleRight } from 'react-icons/fa6';
import CardLoading from './CardLoading';
import CardProduct from './CardProduct';

const HomeProductShelf = ({
  title,
  subtitle,
  products = [],
  loading = false,
  viewAllTo = '',
  viewAllState,
  viewAllLabel = 'See All',
}) => {
  const containerRef = useRef(null);

  if (!loading && products.length === 0) {
    return null;
  }

  const scrollByAmount = (amount) => {
    if (!containerRef.current) return;
    containerRef.current.scrollLeft += amount;
  };

  return (
    <section className="mb-8 sm:mb-10">
      <div className="mb-4 flex items-end justify-between gap-3 sm:mb-5">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-charcoal dark:text-white sm:text-2xl">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-sm text-brown-600 dark:text-white/60">{subtitle}</p>
          )}
        </div>

        {viewAllTo ? (
          <Link
            to={viewAllTo}
            state={viewAllState}
            className="shrink-0 text-sm font-semibold text-gold-600 underline underline-offset-2 transition-colors hover:text-gold-500 dark:text-gold-300 dark:hover:text-gold-200"
          >
            {viewAllLabel}
          </Link>
        ) : null}
      </div>

      <div className="relative">
        {/* Right-edge fade cue visible on mobile/tablet to hint at horizontal scroll */}
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-ivory dark:from-dm-surface lg:hidden" />

        <div
          ref={containerRef}
          className="flex gap-3 overflow-x-auto scroll-smooth pb-2 scrollbar-hide sm:gap-4"
        >
          {(loading ? Array.from({ length: 6 }) : products).map((item, index) => (
            <div key={loading ? `shelf-loading-${title}-${index}` : item._id} className="flex-shrink-0">
              {loading ? <CardLoading /> : <CardProduct data={item} />}
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute inset-y-0 left-0 hidden items-center lg:flex">
          <button
            type="button"
            onClick={() => scrollByAmount(-260)}
            className="pointer-events-auto -ml-3 rounded-full border border-brown-200 bg-white p-2 text-plum-700 shadow-md transition-colors hover:bg-plum-50 dark:border-dm-border dark:bg-dm-card dark:text-plum-200 dark:hover:bg-plum-900/30"
            aria-label={`Scroll ${title} left`}
          >
            <FaAngleLeft />
          </button>
        </div>

        <div className="pointer-events-none absolute inset-y-0 right-0 hidden items-center lg:flex">
          <button
            type="button"
            onClick={() => scrollByAmount(260)}
            className="pointer-events-auto -mr-3 rounded-full border border-brown-200 bg-white p-2 text-plum-700 shadow-md transition-colors hover:bg-plum-50 dark:border-dm-border dark:bg-dm-card dark:text-plum-200 dark:hover:bg-plum-900/30"
            aria-label={`Scroll ${title} right`}
          >
            <FaAngleRight />
          </button>
        </div>
      </div>
    </section>
  );
};

export default HomeProductShelf;
