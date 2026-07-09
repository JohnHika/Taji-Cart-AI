import React, { useEffect, useRef, useState } from 'react';
import { FiArrowRight, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings';
import { valideURLConvert } from '../utils/valideURLConvert';

const AUTOPLAY_MS = 5500;

const isPlaceholderImage = (url = '') =>
  !url || url.includes('product-photo-pending') || url.includes('via.placeholder');

const PromoBanner = ({ products = [] }) => {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);
  const navigate = useNavigate();

  const featured = React.useMemo(() => {
    if (!products.length) return [];
    return [...products]
      .filter((p) => p.publish && !isPlaceholderImage(p.image?.[0]) && Number(p.price) > 0)
      .sort((a, b) => (b.discount || 0) - (a.discount || 0) || (b.averageRating || 0) - (a.averageRating || 0))
      .slice(0, 6);
  }, [products]);

  useEffect(() => {
    if (paused || featured.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % featured.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(timerRef.current);
  }, [paused, featured.length]);

  if (!featured.length) return null;

  const prev = () => setCurrent((c) => (c - 1 + featured.length) % featured.length);
  const next = () => setCurrent((c) => (c + 1) % featured.length);

  const item = featured[current];
  const discountedPrice = item.discount
    ? Math.round(item.price * (1 - item.discount / 100))
    : item.price;
  const categoryName = Array.isArray(item.category)
    ? item.category[0]?.name
    : item.category?.name;

  const handleShopNow = () => {
    navigate(`/product/${valideURLConvert(item.name)}-${item._id}`);
  };

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl sm:rounded-3xl bg-white border border-brown-100 dark:border-dm-border shadow-[0_4px_24px_rgba(75,30,62,0.10)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative flex flex-col sm:flex-row sm:items-stretch">
        {/* Image — white-background product photos blend seamlessly into the white banner */}
        <div className="relative order-first sm:order-last flex sm:w-[42%] items-center justify-center pt-6 pb-2 sm:py-8">
          <img
            key={item._id}
            src={item.image[0]}
            alt={item.name}
            className="animate-fade-in h-[200px] w-auto max-w-[86%] object-contain sm:h-[300px] lg:h-[380px]"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://via.placeholder.com/300?text=Product';
            }}
          />
        </div>

        {/* Text */}
        <div className="order-last sm:order-first flex sm:w-[58%] flex-col justify-center gap-2.5 sm:gap-3.5 px-5 pb-8 pt-2 sm:py-12 sm:pl-10 lg:gap-4 lg:py-16 lg:pl-14">
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.3em] text-gold-600">
              {categoryName || 'Featured'}
            </span>
            {item.discount > 0 && (
              <span className="inline-flex items-center rounded-full bg-gold-500 px-2.5 py-0.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-charcoal">
                {item.discount}% off
              </span>
            )}
          </div>

          <h2
            className="font-display text-2xl font-semibold leading-tight text-charcoal sm:text-3xl lg:text-5xl"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {item.name}
          </h2>

          {item.description && (
            <p
              className="max-w-md text-xs leading-relaxed text-brown-500 sm:text-sm lg:text-base"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {item.description}
            </p>
          )}

          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-price text-xl font-bold text-plum-700 sm:text-2xl lg:text-3xl">
              {DisplayPriceInShillings(discountedPrice)}
            </span>
            {item.discount > 0 && (
              <span className="font-price text-xs text-brown-300 line-through sm:text-sm lg:text-base">
                {DisplayPriceInShillings(item.price)}
              </span>
            )}
          </div>

          <button
            onClick={handleShopNow}
            className="mt-1 inline-flex w-fit items-center gap-2 rounded-full bg-gradient-to-r from-plum-700 to-plum-600 px-5 py-2.5 text-xs font-semibold text-white shadow-[0_4px_14px_rgba(75,30,62,0.35)] transition-all duration-200 hover:from-plum-800 hover:to-plum-700 hover:shadow-[0_6px_18px_rgba(75,30,62,0.45)] active:scale-95 sm:px-7 sm:text-sm"
          >
            Shop Now
            <FiArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Navigation arrows — desktop only */}
      {featured.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous"
            className="absolute left-3 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-brown-200 bg-white/90 text-plum-700 shadow-sm backdrop-blur-sm transition hover:bg-plum-50 sm:flex"
          >
            <FiChevronLeft size={16} />
          </button>
          <button
            onClick={next}
            aria-label="Next"
            className="absolute right-3 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-brown-200 bg-white/90 text-plum-700 shadow-sm backdrop-blur-sm transition hover:bg-plum-50 sm:flex"
          >
            <FiChevronRight size={16} />
          </button>
        </>
      )}

      {/* Brand accent line — doubles as the autoplay progress track */}
      <div className="absolute inset-x-0 bottom-0 z-20 h-[3px] bg-plum-100/60">
        {featured.length > 1 && !paused && (
          <div
            key={`progress-${current}`}
            className="h-full origin-left bg-gradient-to-r from-plum-700 via-plum-500 to-gold-400"
            style={{ animation: `promoProgress ${AUTOPLAY_MS}ms linear forwards` }}
          />
        )}
      </div>
    </div>
  );
};

export default PromoBanner;
