import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiArrowRight, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings';
import { valideURLConvert } from '../utils/valideURLConvert';

const AUTOPLAY_MS = 6000;

const isPlaceholderImage = (url = '') =>
  !url || url.includes('product-photo-pending') || url.includes('via.placeholder');

const PromoBanner = ({ products = [] }) => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
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
      setDirection(1);
      setCurrent((prev) => (prev + 1) % featured.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(timerRef.current);
  }, [paused, featured.length]);

  if (!featured.length) return null;

  const prev = () => {
    setDirection(-1);
    setCurrent((c) => (c - 1 + featured.length) % featured.length);
  };
  const next = () => {
    setDirection(1);
    setCurrent((c) => (c + 1) % featured.length);
  };

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
      className="relative w-full overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-plum-900 via-plum-800 to-charcoal"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Ambient glow field — gives the scene depth without a boxed card feel */}
      <div className="pointer-events-none absolute -right-16 -top-24 h-[420px] w-[420px] rounded-full bg-gold-500/20 blur-[100px]" aria-hidden="true" />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-[320px] w-[320px] rounded-full bg-plum-400/20 blur-[90px]" aria-hidden="true" />

      <div className="relative grid min-h-[420px] grid-cols-1 sm:min-h-[440px] sm:grid-cols-12 lg:min-h-[500px]">
        {/* Text — anchored on the calm gradient side, brand/product name is the loudest element */}
        <div className="relative z-10 order-2 flex flex-col justify-center gap-3 px-6 py-8 sm:order-1 sm:col-span-5 sm:gap-4 sm:px-10 sm:py-10 lg:col-span-5 lg:px-14">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={item._id}
              custom={direction}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="flex flex-col gap-3 sm:gap-4"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-gold-300 sm:text-[11px]">
                  {categoryName || 'Featured'}
                </span>
                {item.discount > 0 && (
                  <span className="inline-flex items-center rounded-full bg-gold-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-charcoal sm:text-xs">
                    {item.discount}% off
                  </span>
                )}
              </div>

              <h2
                className="font-display text-2xl font-semibold leading-[1.08] text-white sm:text-4xl lg:text-6xl"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {item.name}
              </h2>

              <div className="flex flex-wrap items-baseline gap-2.5">
                <span className="font-price text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
                  {DisplayPriceInShillings(discountedPrice)}
                </span>
                {item.discount > 0 && (
                  <span className="font-price text-sm text-white/45 line-through sm:text-base">
                    {DisplayPriceInShillings(item.price)}
                  </span>
                )}
              </div>

              <button
                onClick={handleShopNow}
                className="mt-1 inline-flex w-fit items-center gap-2 rounded-full bg-gold-500 px-6 py-3 text-xs font-semibold text-charcoal shadow-[0_8px_24px_rgba(201,148,58,0.35)] transition-all duration-200 hover:bg-gold-400 hover:shadow-[0_10px_30px_rgba(201,148,58,0.45)] active:scale-95 sm:px-8 sm:text-sm"
              >
                Shop Now
                <FiArrowRight size={15} />
              </button>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Image — the poster. A large soft light "stage" absorbs the photo's own white background so
            it reads as spotlit product photography inside the dark scene, not a pasted white card. */}
        <div className="relative order-1 col-span-1 flex items-end justify-center overflow-hidden sm:order-2 sm:col-span-7 sm:items-center lg:col-span-7">
          <div
            className="pointer-events-none absolute h-[280px] w-[280px] rounded-full blur-md sm:h-[420px] sm:w-[420px] lg:h-[520px] lg:w-[520px]"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(253,245,228,0.45) 45%, rgba(253,245,228,0) 72%)' }}
            aria-hidden="true"
          />
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={item._id}
              custom={direction}
              initial={{ opacity: 0, scale: 1.04, x: direction * 24 }}
              animate={{ opacity: 1, scale: 1, x: 0, y: [0, -10, 0] }}
              exit={{ opacity: 0, scale: 0.98, x: direction * -24 }}
              transition={{
                opacity: { duration: 0.5, ease: 'easeOut' },
                scale: { duration: 0.5, ease: 'easeOut' },
                x: { duration: 0.5, ease: 'easeOut' },
                y: { duration: 3.4, ease: 'easeInOut', repeat: Infinity },
              }}
              className="relative z-10"
            >
              <img
                src={item.image[0]}
                alt={item.name}
                className="h-[260px] w-auto max-w-[80%] object-contain drop-shadow-[0_30px_40px_rgba(0,0,0,0.45)] sm:h-[400px] sm:max-w-[85%] lg:h-[500px] lg:max-w-none"
                style={{
                  maskImage: 'radial-gradient(ellipse 65% 75% at center, black 55%, transparent 92%)',
                  WebkitMaskImage: 'radial-gradient(ellipse 65% 75% at center, black 55%, transparent 92%)',
                }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://via.placeholder.com/400?text=Product';
                }}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation arrows — desktop only */}
      {featured.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous"
            className="absolute left-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 sm:flex"
          >
            <FiChevronLeft size={18} />
          </button>
          <button
            onClick={next}
            aria-label="Next"
            className="absolute right-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 sm:flex"
          >
            <FiChevronRight size={18} />
          </button>
        </>
      )}

      {/* Progress dashes — replaces the borrowed "card" progress bar with a lighter, poster-style indicator */}
      {featured.length > 1 && (
        <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-1.5 sm:bottom-6">
          {featured.map((product, index) => (
            <div key={product._id} className="relative h-1 w-6 overflow-hidden rounded-full bg-white/20 sm:w-8">
              {index === current && !paused && (
                <div
                  key={`progress-${current}`}
                  className="h-full origin-left rounded-full bg-gold-400"
                  style={{ animation: `promoProgress ${AUTOPLAY_MS}ms linear forwards` }}
                />
              )}
              {index === current && paused && <div className="h-full w-full rounded-full bg-gold-400" />}
              {index < current && <div className="h-full w-full rounded-full bg-white/50" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PromoBanner;
