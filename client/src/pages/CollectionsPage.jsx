import React from 'react';
import { FiArrowRight, FiSearch } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const CollectionsPage = () => {
  return (
    <section className="bg-ivory dark:bg-dm-surface min-h-screen transition-colors duration-200">
      {/* Hero */}
      <div className="bg-gradient-to-br from-plum-900 via-plum-800 to-charcoal py-16 sm:py-20 px-4 text-center">
        <p className="font-display italic text-gold-300 text-sm sm:text-base mb-2">
          Nawiri Hair
        </p>
        <h1 className="font-display font-bold text-white text-3xl sm:text-4xl lg:text-5xl mb-4">
          Curated Collections
        </h1>
        <p className="text-white/60 text-sm sm:text-base max-w-md mx-auto">
          Handpicked bundles and themed sets built for every look — coming soon.
        </p>
      </div>

      {/* Body */}
      <div className="container mx-auto px-4 py-14 sm:py-20 text-center">
        <div className="max-w-lg mx-auto bg-white dark:bg-dm-card rounded-card border border-brown-100 dark:border-dm-border shadow-card p-8 sm:p-10">
          <div className="w-16 h-16 rounded-full bg-plum-50 dark:bg-plum-900/20 flex items-center justify-center mx-auto mb-5">
            <span className="text-3xl">✨</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-charcoal dark:text-white mb-3">
            Collections launching soon
          </h2>
          <p className="text-sm text-brown-400 dark:text-white/50 leading-relaxed mb-8">
            We're curating something special — bundles, themed sets, and seasonal picks tailored to your style.
            In the meantime, explore everything we have in store.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-charcoal font-semibold px-5 py-2.5 rounded-pill text-sm transition-all duration-200 press shadow-sm hover:shadow-gold"
            >
              Shop by Category <FiArrowRight size={14} />
            </Link>
            <Link
              to="/search"
              className="flex items-center gap-2 border border-plum-200 dark:border-plum-700 text-plum-700 dark:text-plum-200 hover:bg-plum-50 dark:hover:bg-plum-900/30 font-medium px-5 py-2.5 rounded-pill text-sm transition-all duration-200"
            >
              <FiSearch size={14} /> Search Products
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CollectionsPage;
