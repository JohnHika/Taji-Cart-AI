import React from 'react';
import { FiHeart } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toggleWishlistItem } from '../store/wishlistSlice';

/**
 * Standalone heart toggle backed by Redux + the server wishlist.
 * `variant="icon"` renders a bare circular icon button (for product cards);
 * `variant="pill"` renders a labeled pill button (for the product detail page).
 */
const WishlistButton = ({ productId, variant = 'icon', className = '' }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.user);
  const wishlistItems = useSelector((state) => state.wishlist.items);
  const isLoggedIn = !!(user?._id || user?.email);
  const isWishlisted = wishlistItems.some((item) => item._id === productId);

  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn) {
      toast.info('Please sign in to save to wishlist');
      navigate('/login');
      return;
    }

    dispatch(toggleWishlistItem(productId))
      .unwrap()
      .then(({ added }) => {
        toast.success(added ? 'Added to wishlist ❤️' : 'Removed from wishlist');
      })
      .catch(() => {
        toast.error('Failed to update wishlist');
      });
  };

  if (variant === 'pill') {
    return (
      <button
        onClick={handleToggle}
        className={`flex items-center justify-center gap-2 border rounded-pill py-2.5 px-5 text-sm font-semibold transition-colors flex-shrink-0 ${
          isWishlisted
            ? 'border-blush-500 bg-blush-50 text-blush-500 dark:bg-blush-500/10 dark:border-blush-400 dark:text-blush-300'
            : 'border-plum-200 dark:border-plum-700 text-plum-700 dark:text-plum-200 hover:bg-plum-50 dark:hover:bg-plum-900/30'
        } ${className}`}
        aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <FiHeart size={16} className={isWishlisted ? 'fill-current' : ''} />
        {isWishlisted ? 'Saved' : 'Wishlist'}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      className={`flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-brown-500 shadow-sm backdrop-blur-sm transition-colors hover:bg-white dark:bg-dm-card/90 dark:text-white/70 ${
        isWishlisted ? 'text-blush-500 dark:text-blush-400' : ''
      } ${className}`}
      aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <FiHeart size={15} className={isWishlisted ? 'fill-current' : ''} />
    </button>
  );
};

export default WishlistButton;
