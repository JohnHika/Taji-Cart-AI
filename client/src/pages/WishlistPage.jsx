import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { FiHeart } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import CardProduct from '../components/CardProduct';
import Loading from '../components/Loading';
import { fetchWishlist } from '../store/wishlistSlice';

const WishlistPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, loading } = useSelector((state) => state.wishlist);

  useEffect(() => {
    dispatch(fetchWishlist());
  }, [dispatch]);

  const wishlistedProducts = items.filter((item) => item?.name);

  return (
    <section className="min-h-screen w-full bg-ivory dark:bg-dm-surface">
      <Helmet>
        <title>My Wishlist — Nawiri Hair</title>
      </Helmet>

      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brown-600 transition-colors hover:text-plum-700 dark:text-white/60 dark:hover:text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>

        <div className="mb-6 flex items-center gap-3 sm:mb-8">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-blush-100 dark:bg-blush-500/20">
            <FiHeart className="h-5 w-5 text-blush-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-charcoal dark:text-white sm:text-3xl">My Wishlist</h1>
            <p className="text-sm text-brown-500 dark:text-white/50">
              {wishlistedProducts.length > 0
                ? `${wishlistedProducts.length} saved item${wishlistedProducts.length === 1 ? '' : 's'}`
                : 'Products you save will show up here.'}
            </p>
          </div>
        </div>

        {loading ? (
          <Loading />
        ) : wishlistedProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 lg:gap-4">
            {wishlistedProducts.map((product) => (
              <CardProduct data={product} key={product._id} />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-plum-500 dark:text-plum-300">
                Nothing saved yet
              </div>
              <p className="mb-6 text-lg font-semibold text-brown-600 dark:text-white/60">
                Tap the heart on any product to save it here
              </p>
              <Link
                to="/"
                className="inline-block rounded-lg bg-plum-700 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-plum-600 hover:shadow-xl"
              >
                Browse Products
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default WishlistPage;
