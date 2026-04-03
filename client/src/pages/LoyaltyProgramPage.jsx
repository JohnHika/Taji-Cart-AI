import React from 'react';
import { FaCrown, FaGift, FaPercent, FaStar } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import RoyalCard from '../components/RoyalCard';

const perks = [
  { icon: FaPercent, title: 'Tier rewards', text: 'Earn points on every purchase and unlock Bronze, Silver, Gold, and Platinum benefits.' },
  { icon: FaGift, title: 'Member exclusives', text: 'Early access to drops and special offers reserved for loyalty members.' },
  { icon: FaStar, title: 'Stack with community perks', text: 'Pair your card with community campaigns for even more value at checkout.' }
];

const LoyaltyProgramPage = () => {
  return (
    <section className="bg-ivory dark:bg-dm-surface min-h-screen transition-colors duration-200">
      <div className="bg-gradient-to-br from-plum-900 via-plum-700 to-charcoal py-10 sm:py-14 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <p className="font-display italic text-gold-300 text-sm sm:text-base mb-1">Nawiri Hair</p>
          <h1 className="font-display font-bold text-white text-3xl sm:text-4xl lg:text-5xl flex items-center justify-center gap-3 flex-wrap">
            <FaCrown className="text-gold-400 shrink-0" aria-hidden />
            Loyalty program
          </h1>
          <p className="text-white/65 text-sm sm:text-base mt-4 max-w-xl mx-auto leading-relaxed">
            Your Royal Card keeps every point in one place. Show your code in store, track your tier, and see how close you are to the next level.
          </p>
          <Link
            to="/dashboard/community-perks"
            className="inline-flex items-center gap-2 mt-6 text-sm font-semibold text-gold-300 hover:text-gold-200 underline underline-offset-4 transition-colors"
          >
            View community perks & campaigns
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 sm:py-10 max-w-4xl">
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {perks.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="rounded-card border border-brown-100 dark:border-dm-border bg-white dark:bg-dm-card p-4 sm:p-5 shadow-hover"
            >
              <div className="w-10 h-10 rounded-pill bg-plum-100 dark:bg-plum-900/40 flex items-center justify-center text-plum-700 dark:text-plum-300 mb-3">
                <Icon size={18} />
              </div>
              <h2 className="font-semibold text-charcoal dark:text-white text-sm sm:text-base mb-1">{title}</h2>
              <p className="text-xs sm:text-sm text-brown-600 dark:text-white/55 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        <div className="rounded-card border border-plum-200 dark:border-plum-800 overflow-hidden shadow-hover bg-white dark:bg-dm-card">
          <div className="border-b border-brown-100 dark:border-dm-border px-4 py-3 sm:px-6 bg-plum-50/50 dark:bg-plum-900/20">
            <h2 className="text-lg font-semibold text-charcoal dark:text-white">Your Royal Card</h2>
            <p className="text-sm text-brown-600 dark:text-white/50 mt-0.5">
              Scan at checkout or add to your wallet — same card as in My Profile → Royal Card.
            </p>
          </div>
          <div className="p-4 sm:p-6">
            <RoyalCard />
          </div>
        </div>
      </div>
    </section>
  );
};

export default LoyaltyProgramPage;
