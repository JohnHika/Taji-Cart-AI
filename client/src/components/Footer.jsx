import React, { useEffect, useState } from 'react';
import { FaEnvelope, FaInstagram, FaPhoneAlt, FaWhatsapp } from 'react-icons/fa';
import { FaLocationDot, FaTiktok, FaTruckFast } from 'react-icons/fa6';
import { FiChevronRight } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';
import { Link } from 'react-router-dom';
import { nawiriBrand } from '../config/brand';

/* ─── Animated CTA banner that cycles through business highlights ─── */
const FooterBanner = () => {
  const bannerSlides = [
    {
      icon: <HiSparkles className="text-2xl sm:text-3xl" />,
      title: 'Retail & Wholesale',
      subtitle: 'Premium hair for individuals and businesses alike',
      cta: 'Shop Now',
      link: '/',
      accent: 'from-plum-800 via-plum-700 to-plum-900',
      glow: 'bg-gold-500/15',
    },
    {
      icon: <FaTruckFast className="text-2xl sm:text-3xl" />,
      title: 'We Deliver Across East Africa',
      subtitle: 'Countrywide delivery in Kenya & across the region',
      cta: 'Browse Products',
      link: '/',
      accent: 'from-charcoal via-plum-900 to-plum-800',
      glow: 'bg-plum-500/15',
    },
    {
      icon: <FaWhatsapp className="text-2xl sm:text-3xl" />,
      title: 'DM or Call Us Anytime',
      subtitle: `Reach us on ${nawiriBrand.phoneDisplay} or WhatsApp`,
      cta: 'Chat on WhatsApp',
      link: nawiriBrand.whatsappUrl,
      external: true,
      accent: 'from-plum-900 via-charcoal to-plum-800',
      glow: 'bg-green-500/10',
    },
  ];

  const [current, setCurrent] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % bannerSlides.length);
        setIsAnimating(false);
      }, 400);
    }, 5000);
    return () => clearInterval(timer);
  }, [bannerSlides.length]);

  const slide = bannerSlides[current];

  const LinkWrapper = slide.external
    ? ({ children, className }) => (
        <a href={slide.link} target="_blank" rel="noopener noreferrer" className={className}>
          {children}
        </a>
      )
    : ({ children, className }) => (
        <Link to={slide.link} className={className}>
          {children}
        </Link>
      );

  return (
    <div className="container mx-auto px-4 pb-2">
      <div
        className={`relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r ${slide.accent} shadow-hover transition-all duration-500`}
      >
        {/* Decorative blobs */}
        <div className={`pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full ${slide.glow} blur-3xl transition-all duration-700`} />
        <div className="pointer-events-none absolute -bottom-20 -left-12 h-52 w-52 rounded-full bg-gold-500/8 blur-3xl" />
        {/* Shimmer sweep */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent animate-shimmer bg-[length:200%_100%]" />

        <div className="relative z-10 flex items-center justify-between gap-4 px-5 py-5 sm:px-8 sm:py-7 lg:px-12 lg:py-8">
          <div
            className={`flex items-center gap-3 sm:gap-5 transition-all duration-400 ${
              isAnimating ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'
            }`}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-gold-400 backdrop-blur-sm sm:h-14 sm:w-14">
              {slide.icon}
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-white sm:text-xl lg:text-2xl">
                {slide.title}
              </h3>
              <p className="mt-0.5 text-xs text-plum-200/80 sm:text-sm">{slide.subtitle}</p>
            </div>
          </div>

          <LinkWrapper className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-gold-500 px-4 py-2 text-xs font-bold text-charcoal shadow-gold transition-all hover:bg-gold-400 hover:shadow-lg active:scale-[0.96] sm:px-5 sm:py-2.5 sm:text-sm">
            {slide.cta}
            <FiChevronRight size={14} />
          </LinkWrapper>
        </div>

        {/* Dot indicators */}
        <div className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 gap-1.5 sm:bottom-3">
          {bannerSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => { setIsAnimating(true); setTimeout(() => { setCurrent(i); setIsAnimating(false); }, 300); }}
              aria-label={`Slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current ? 'w-5 bg-gold-400' : 'w-1.5 bg-white/25 hover:bg-white/50'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─── Main Footer ─── */
const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-brown-200/80 bg-gradient-to-br from-ivory via-white to-blush-50 pb-20 lg:pb-0 transition-colors dark:border-dm-border dark:from-dm-surface dark:via-dm-card dark:to-dm-card-2">
      {/* ── Animated CTA Banner ── */}
      <div className="pt-8 sm:pt-10">
        <FooterBanner />
      </div>

      <div className="container mx-auto px-4 py-10 sm:py-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_0.8fr_0.8fr_1fr]">
          {/* ── Brand column ── */}
          <div className="space-y-4">
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="rounded-2xl bg-white p-2 shadow-sm ring-1 ring-gold-200 dark:bg-white">
                <img src={nawiriBrand.logo} alt={nawiriBrand.shortName} className="h-16 w-auto object-contain" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-charcoal dark:text-white">{nawiriBrand.shortName}</h3>
                <p className="text-xs uppercase tracking-[0.2em] text-gold-700 dark:text-gold-300">Kenya</p>
              </div>
            </Link>
            <p className="max-w-md text-sm leading-6 text-brown-600 dark:text-white/70">
              {nawiriBrand.motto} Premium hair, polished service, and a customer experience that feels as refined as the styles we deliver.
            </p>

            {/* Business highlights pills */}
            <div className="flex flex-wrap gap-2">
              {nawiriBrand.highlights.map((hl) => (
                <span
                  key={hl}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gold-200/80 bg-gold-100/60 px-3 py-1 text-[11px] font-semibold text-gold-600 dark:border-gold-500/20 dark:bg-gold-500/10 dark:text-gold-300"
                >
                  <span className="text-gold-500">&#10038;</span>
                  {hl}
                </span>
              ))}
            </div>

            <div className="grid gap-3 text-sm text-brown-700 dark:text-white/75">
              <a href={`tel:${nawiriBrand.phoneDial}`} className="flex items-start gap-3 hover:text-plum-700 dark:hover:text-plum-200">
                <FaPhoneAlt className="mt-1 text-gold-600" />
                <span>{nawiriBrand.phoneDisplay}</span>
              </a>
              <a href={`mailto:${nawiriBrand.email}`} className="flex items-start gap-3 hover:text-plum-700 dark:hover:text-plum-200">
                <FaEnvelope className="mt-1 text-gold-600" />
                <span>{nawiriBrand.email}</span>
              </a>
              <div className="flex items-start gap-3">
                <FaLocationDot className="mt-1 shrink-0 text-gold-600" />
                <span>{nawiriBrand.location}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-2xl">
              <a
                href={nawiriBrand.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full p-1.5 text-green-600 transition-all hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-900/20"
                aria-label="WhatsApp"
              >
                <FaWhatsapp />
              </a>
              <a
                href={nawiriBrand.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full p-1.5 text-plum-600 transition-all hover:bg-plum-50 hover:text-plum-500 dark:text-plum-400 dark:hover:bg-plum-900/30 dark:hover:text-plum-300"
                aria-label="Instagram"
              >
                <FaInstagram />
              </a>
              <a
                href={nawiriBrand.tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-charcoal transition-colors hover:text-charcoal dark:text-white"
                aria-label="TikTok"
              >
                <FaTiktok />
              </a>
            </div>
          </div>

          {/* ── Shop links ── */}
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-charcoal dark:text-white">Shop</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="text-brown-600 transition-colors hover:text-plum-700 dark:text-white/60 dark:hover:text-plum-300">Home</Link></li>
              <li><Link to="/" className="text-brown-600 transition-colors hover:text-plum-700 dark:text-white/60 dark:hover:text-plum-300">All Products</Link></li>
              <li><Link to="/dashboard/community-perks" className="text-brown-600 transition-colors hover:text-plum-700 dark:text-white/60 dark:hover:text-plum-300">Community Perks</Link></li>
              <li><Link to="/dashboard/active-campaigns" className="text-brown-600 transition-colors hover:text-plum-700 dark:text-white/60 dark:hover:text-plum-300">Active Campaigns</Link></li>
            </ul>
          </div>

          {/* ── Customer care links ── */}
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider text-charcoal dark:text-white">Customer Care</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/dashboard/myorders" className="text-brown-600 transition-colors hover:text-plum-700 dark:text-white/60 dark:hover:text-plum-300">My Orders</Link></li>
              <li><Link to="/dashboard/address" className="text-brown-600 transition-colors hover:text-plum-700 dark:text-white/60 dark:hover:text-plum-300">Saved Addresses</Link></li>
              <li><a href={`mailto:${nawiriBrand.email}`} className="text-brown-600 transition-colors hover:text-plum-700 dark:text-white/60 dark:hover:text-plum-300">Email Support</a></li>
              <li><a href={nawiriBrand.whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-brown-600 transition-colors hover:text-plum-700 dark:text-white/60 dark:hover:text-plum-300">WhatsApp Support</a></li>
            </ul>
          </div>

          {/* ── Find Us card ── */}
          <div className="rounded-3xl border border-gold-200/80 bg-white/80 p-5 shadow-sm dark:border-gold-500/20 dark:bg-dm-card/90">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold-700 dark:text-gold-300">Find Us</p>
            <p className="mt-3 text-sm font-medium leading-relaxed text-charcoal dark:text-white">
              {nawiriBrand.location}
            </p>
            <div className="mt-3 space-y-1.5">
              <p className="text-sm text-brown-600 dark:text-white/70">
                Instagram{' '}
                <a
                  href={nawiriBrand.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-plum-600 hover:underline dark:text-plum-300"
                >
                  {nawiriBrand.instagramHandle}
                </a>
              </p>
              <p className="text-sm text-brown-600 dark:text-white/70">
                TikTok{' '}
                <a
                  href={nawiriBrand.tiktokUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-charcoal hover:underline dark:text-white"
                >
                  {nawiriBrand.tiktokHandle}
                </a>
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={nawiriBrand.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-500"
              >
                <FaWhatsapp size={14} />
                WhatsApp
              </a>
              <a
                href={nawiriBrand.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-full bg-plum-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-plum-600"
              >
                Visit Website
              </a>
            </div>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="mt-8 border-t border-brown-200/80 pt-6 dark:border-dm-border">
          <div className="flex flex-col gap-3 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
            <p className="text-sm text-brown-600 dark:text-white/50">
              &copy; {year} {nawiriBrand.companyName}. All rights reserved.
            </p>
            <div className="flex items-center justify-center gap-4 text-sm sm:justify-end">
              <Link to="/" className="text-brown-600 transition-colors hover:text-plum-700 dark:text-white/50 dark:hover:text-plum-300">Privacy</Link>
              <Link to="/" className="text-brown-600 transition-colors hover:text-plum-700 dark:text-white/50 dark:hover:text-plum-300">Terms</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
