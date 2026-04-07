import React from 'react';
import { FaBullhorn, FaCrown, FaGift, FaShoppingBag, FaTrophy } from 'react-icons/fa';
import { FiArrowRight } from 'react-icons/fi';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { nawiriBrand } from '../config/brand';

const tiles = [
  {
    to: '/dashboard/loyalty-program',
    icon: FaCrown,
    title: 'Loyalty program',
    text: 'Track your Royal Card tier, points, and member-only perks on every purchase.',
    accent: 'from-gold-500/20 to-gold-600/5 border-gold-500/30'
  },
  {
    to: '/dashboard/community-perks',
    icon: FaGift,
    title: 'Community perks',
    text: 'Unlock campaign rewards, discounts, and extras when the community hits its goals.',
    accent: 'from-plum-500/15 to-plum-700/5 border-plum-400/25'
  },
  {
    to: '/dashboard/active-campaigns',
    icon: FaBullhorn,
    title: 'Active challenges',
    text: 'See live campaigns and how close we are to the next community milestone.',
    accent: 'from-blush-200/30 to-plum-800/10 border-blush-300/30'
  },
  {
    to: '/dashboard/profile#royal',
    icon: FaTrophy,
    title: 'Royal card',
    text: 'Your in-store code and tier — same card as under My profile.',
    accent: 'from-plum-800/40 to-charcoal/20 border-plum-600/35'
  }
];

const CustomerDashboard = () => {
  const user = useSelector((s) => s.user);
  const loyaltyPoints = useSelector((s) => s.product?.loyaltyPoints ?? 0);
  const loyaltyClass = useSelector((s) => s.product?.loyaltyClass ?? 'Member');

  const firstName = (user?.name || 'there').trim().split(/\s+/)[0];

  return (
    <div className="min-h-full w-full max-w-full overflow-x-hidden bg-ivory px-3 py-5 dark:bg-dm-surface sm:px-5 sm:py-7 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 overflow-hidden rounded-2xl border border-plum-200/60 bg-gradient-to-br from-plum-900 via-plum-800 to-charcoal p-6 text-white shadow-lg dark:border-plum-800 sm:p-8">
          <p className="font-display text-sm italic text-gold-300/90">{nawiriBrand.shortName}</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Welcome back, {firstName}</h1>
          <p className="mt-2 max-w-lg text-sm text-white/75 sm:text-base">
            Your hub for orders, rewards, and community benefits — minimal, clear, and all in one place.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm backdrop-blur-sm">
              <span className="text-white/60">Loyalty · </span>
              <span className="font-semibold text-gold-200">{loyaltyClass}</span>
              <span className="mx-2 text-white/30">|</span>
              <span className="text-white/80">{loyaltyPoints} pts</span>
            </div>
            <Link
              to="/dashboard/myorders"
              className="inline-flex items-center gap-2 rounded-full bg-gold-500 px-4 py-2 text-sm font-semibold text-charcoal transition hover:bg-gold-400"
            >
              <FaShoppingBag size={14} />
              My orders
            </Link>
          </div>
        </div>

        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-brown-500 dark:text-white/45">
          Rewards & community
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {tiles.map(({ to, icon: Icon, title, text, accent }) => (
            <Link
              key={to}
              to={to}
              className={`group flex flex-col rounded-2xl border bg-gradient-to-br p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-dm-card ${accent}`}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-plum-800 shadow-sm dark:bg-plum-900/60 dark:text-gold-300">
                <Icon size={18} />
              </div>
              <h3 className="text-base font-semibold text-charcoal dark:text-white">{title}</h3>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-brown-600 dark:text-white/55">{text}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-gold-600 dark:text-gold-300">
                Open
                <FiArrowRight className="transition group-hover:translate-x-0.5" size={16} />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-brown-100 bg-white p-5 dark:border-dm-border dark:bg-dm-card sm:p-6">
          <h3 className="text-sm font-semibold text-charcoal dark:text-white">Quick links</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/dashboard/profile"
              className="rounded-full border border-brown-200 px-3 py-1.5 text-xs font-medium text-charcoal transition hover:border-plum-300 hover:bg-plum-50 dark:border-dm-border dark:text-white/80 dark:hover:bg-plum-900/30"
            >
              Profile
            </Link>
            <Link
              to="/dashboard/address"
              className="rounded-full border border-brown-200 px-3 py-1.5 text-xs font-medium text-charcoal transition hover:border-plum-300 hover:bg-plum-50 dark:border-dm-border dark:text-white/80 dark:hover:bg-plum-900/30"
            >
              Addresses
            </Link>
            <Link
              to="/dashboard/cart"
              className="rounded-full border border-brown-200 px-3 py-1.5 text-xs font-medium text-charcoal transition hover:border-plum-300 hover:bg-plum-50 dark:border-dm-border dark:text-white/80 dark:hover:bg-plum-900/30"
            >
              Cart
            </Link>
            <Link
              to="/dashboard/settings"
              className="rounded-full border border-brown-200 px-3 py-1.5 text-xs font-medium text-charcoal transition hover:border-plum-300 hover:bg-plum-50 dark:border-dm-border dark:text-white/80 dark:hover:bg-plum-900/30"
            >
              Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
