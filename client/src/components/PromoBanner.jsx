import React, { useEffect, useRef, useState } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings';
import { valideURLConvert } from '../utils/valideURLConvert';

const AUTOPLAY_MS = 5000;

const PromoBanner = ({ products = [] }) => {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);
  const navigate = useNavigate();

  // Pick top products to feature (discounted first, then highest-rated)
  const featured = React.useMemo(() => {
    if (!products.length) return [];
    const sorted = [...products]
      .filter((p) => p.publish && p.image?.length)
      .sort((a, b) => (b.discount || 0) - (a.discount || 0) || (b.averageRating || 0) - (a.averageRating || 0));
    return sorted.slice(0, 6);
  }, [products]);

  // Auto-advance
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

  const handleShopNow = () => {
    const url = `/product/${valideURLConvert(item.name)}-${item._id}`;
    navigate(url);
  };

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-plum-800 via-plum-700 to-plum-900 shadow-hover"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Content */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 items-center gap-4 p-5 sm:p-8 lg:p-12 min-h-[280px] sm:min-h-[340px]">
        {/* Text side */}
        <div className="flex flex-col gap-3 sm:gap-4 order-2 md:order-1 text-center md:text-left">
          {item.discount > 0 && (
            <span className="inline-flex self-center md:self-start items-center gap-1 rounded-pill bg-gold-500/90 px-3 py-1 text-xs font-bold text-charcoal uppercase tracking-wide shadow-sm w-fit">
              {item.discount}% OFF
            </span>
          )}
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight line-clamp-2">
            {item.name}
          </h2>
          {item.description && (
            <p className="text-sm sm:text-base text-plum-200 line-clamp-2 max-w-md mx-auto md:mx-0">
              {item.description}
            </p>
          )}
          <div className="flex items-center gap-3 justify-center md:justify-start">
            <span className="font-price text-2xl sm:text-3xl font-bold text-gold-300">
              {DisplayPriceInShillings(discountedPrice)}
            </span>
            {item.discount > 0 && (
              <span className="font-price text-base sm:text-lg text-plum-300 line-through">
                {DisplayPriceInShillings(item.price)}
              </span>
            )}
          </div>
          <button
            onClick={handleShopNow}
            className="mt-1 inline-flex self-center md:self-start items-center gap-2 rounded-pill bg-gold-500 px-6 py-2.5 text-sm font-bold text-charcoal shadow-gold transition-all hover:bg-gold-400 hover:shadow-lg active:scale-[0.97] w-fit"
          >
            Shop Now
            <FiChevronRight className="text-lg" />
          </button>
        </div>

        {/* Image side */}
        <div className="relative flex items-center justify-center order-1 md:order-2">
          <div className="relative h-44 w-44 sm:h-56 sm:w-56 lg:h-72 lg:w-72">
            {/* Glow ring */}
            <div className="absolute inset-0 rounded-full bg-gold-400/10 blur-2xl" />
            <img
              key={item._id}
              src={item.image[0]}
              alt={item.name}
              className="relative h-full w-full rounded-2xl object-contain drop-shadow-2xl animate-fade-in"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://via.placeholder.com/300?text=Product';
              }}
            />
          </div>
        </div>
      </div>

      {/* Navigation arrows */}
      {featured.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous product"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            <FiChevronLeft size={20} />
          </button>
          <button
            onClick={next}
            aria-label="Next product"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            <FiChevronRight size={20} />
          </button>
        </>
      )}

      {/* Dots */}
      {featured.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
          {featured.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current
                  ? 'w-6 bg-gold-400'
                  : 'w-2 bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}

      {/* Decorative shapes */}
      <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-gold-500/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-plum-500/10 blur-3xl" />
    </div>
  );
};

export default PromoBanner;
