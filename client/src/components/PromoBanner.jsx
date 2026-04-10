import React, { useEffect, useRef, useState } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings';
import { valideURLConvert } from '../utils/valideURLConvert';

const AUTOPLAY_MS = 5500;

const PromoBanner = ({ products = [] }) => {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);
  const navigate = useNavigate();

  const featured = React.useMemo(() => {
    if (!products.length) return [];
    return [...products]
      .filter((p) => p.publish && p.image?.length)
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

  const handleShopNow = () => {
    navigate(`/product/${valideURLConvert(item.name)}-${item._id}`);
  };

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl sm:rounded-3xl shadow-hover"
      style={{ minHeight: 'clamp(190px, 33vw, 400px)' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background — deep plum radial */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 68% 40%, #6e2280 0%, #3d1248 40%, #1c0830 100%)' }}
      />
      {/* Warm gold shimmer on right */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-gold-500/10 via-transparent to-transparent" />
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-gold-500/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-60 w-60 rounded-full bg-plum-700/20 blur-3xl" />

      {/* ── Main grid ─────────────────────────────────────────────────── */}
      <div
        className="relative z-10 flex h-full items-stretch"
        style={{ minHeight: 'clamp(190px, 33vw, 400px)' }}
      >
        {/* LEFT — text */}
        <div className="flex w-[58%] sm:w-[56%] flex-col justify-center gap-2 sm:gap-3 lg:gap-4 pl-5 sm:pl-8 lg:pl-14 pr-2 sm:pr-3 py-6 sm:py-8 lg:py-12">
          {item.discount > 0 && (
            <span className="inline-flex w-fit items-center rounded-full bg-gold-500 px-2.5 py-0.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-charcoal shadow">
              {item.discount}% OFF
            </span>
          )}

          <h2
            className="font-display font-bold text-white leading-tight"
            style={{
              fontSize: 'clamp(1rem, 3.4vw, 2.5rem)',
              textShadow: '0 2px 16px rgba(0,0,0,0.45)',
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
              className="text-plum-200/85 leading-relaxed"
              style={{
                fontSize: 'clamp(0.68rem, 1.4vw, 0.9375rem)',
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
            <span
              className="font-price font-bold text-gold-300"
              style={{ fontSize: 'clamp(0.9rem, 2.4vw, 1.875rem)' }}
            >
              {DisplayPriceInShillings(discountedPrice)}
            </span>
            {item.discount > 0 && (
              <span
                className="font-price text-plum-300/60 line-through"
                style={{ fontSize: 'clamp(0.68rem, 1.3vw, 1.1rem)' }}
              >
                {DisplayPriceInShillings(item.price)}
              </span>
            )}
          </div>

          <button
            onClick={handleShopNow}
            className="mt-0.5 inline-flex w-fit items-center gap-1.5 rounded-full bg-gold-500 font-bold text-charcoal shadow-gold transition-all hover:bg-gold-400 hover:shadow-lg active:scale-[0.96] press"
            style={{
              fontSize: 'clamp(0.62rem, 1.3vw, 0.875rem)',
              padding: 'clamp(0.35rem, 0.75vw, 0.6rem) clamp(0.85rem, 1.8vw, 1.625rem)',
            }}
          >
            Shop Now
            <FiChevronRight size={13} />
          </button>
        </div>

        {/* RIGHT — product image */}
        <div className="relative flex w-[42%] sm:w-[44%] items-center justify-center overflow-hidden">
          {/* Soft glow halo behind product */}
          <div
            className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 rounded-full bg-gold-400/15 blur-3xl"
            style={{ width: 'clamp(100px, 22vw, 280px)', height: 'clamp(100px, 22vw, 280px)' }}
          />
          <img
            key={item._id}
            src={item.image[0]}
            alt={item.name}
            className="relative z-10 animate-fade-in object-contain drop-shadow-2xl"
            style={{
              width: '90%',
              height: '100%',
              maxHeight: 'clamp(150px, 29vw, 370px)',
              padding: 'clamp(6px, 1.8vw, 22px)',
            }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://via.placeholder.com/300?text=Product';
            }}
          />
        </div>
      </div>

      {/* ── Navigation arrows ──────────────────────────────────────────── */}
      {featured.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous"
            className="absolute left-2 top-1/2 z-20 -translate-y-1/2 flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-white/15 bg-black/20 text-white backdrop-blur-sm transition hover:bg-black/40"
          >
            <FiChevronLeft size={16} />
          </button>
          <button
            onClick={next}
            aria-label="Next"
            className="absolute right-2 top-1/2 z-20 -translate-y-1/2 flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-white/15 bg-black/20 text-white backdrop-blur-sm transition hover:bg-black/40"
          >
            <FiChevronRight size={16} />
          </button>
        </>
      )}

      {/* ── Dot indicators ─────────────────────────────────────────────── */}
      {featured.length > 1 && (
        <div className="absolute bottom-3 sm:bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
          {featured.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current ? 'w-5 sm:w-6 bg-gold-400' : 'w-1.5 bg-white/30 hover:bg-white/55'
              }`}
            />
          ))}
        </div>
      )}

      {/* ── Auto-play progress bar ──────────────────────────────────────── */}
      {featured.length > 1 && !paused && (
        <div className="absolute bottom-0 inset-x-0 z-20 h-[3px] bg-white/[0.06]">
          <div
            key={`progress-${current}`}
            className="h-full origin-left bg-gold-400/55"
            style={{ animation: `promoProgress ${AUTOPLAY_MS}ms linear forwards` }}
          />
        </div>
      )}
    </div>
  );
};

export default PromoBanner;
