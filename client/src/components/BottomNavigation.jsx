import React, { useMemo } from 'react';
import { FaHome, FaUser, FaShoppingCart, FaHeart, FaSearch } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';
import { useGlobalContext } from '../provider/GlobalProvider';

const BottomNavigation = () => {
  const location = useLocation();
  const user = useSelector(state => state.user);
  const cart = useSelector(state => state.cartItem?.cart);
  const { totalQty } = useGlobalContext();

  const navItems = useMemo(() => [
    {
      label: 'Home',
      icon: FaHome,
      path: '/',
      active: location.pathname === '/'
    },
    {
      label: 'Search',
      icon: FaSearch,
      path: '/search',
      active: location.pathname === '/search'
    },
    {
      label: 'Cart',
      icon: FaShoppingCart,
      path: '/mobile/cart',
      active: location.pathname === '/mobile/cart',
      badge: totalQty > 0 ? totalQty : null
    },
    {
      label: 'Wishlist',
      icon: FaHeart,
      path: '/wishlist',
      active: location.pathname === '/wishlist'
    },
    {
      label: user?._id ? 'Profile' : 'Login',
      icon: FaUser,
      path: user?._id ? '/mobile/profile' : '/login',
      active: location.pathname === '/mobile/profile' || location.pathname === '/dashboard/profile'
    }
  ], [location.pathname, user?._id, totalQty]);

  // Don't show bottom nav on certain pages
  const hiddenRoutes = ['/login', '/register', '/checkout', '/mobile/cart', '/mobile/profile'];
  if (hiddenRoutes.includes(location.pathname)) {
    return null;
  }

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 safe-area-bottom">
      <div className="flex items-center justify-around py-1 px-2">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <Link
              key={index}
              to={item.path}
              className={`flex flex-col items-center py-2 px-1 min-w-0 flex-1 relative transition-colors ${
                item.active
                  ? 'text-primary-200'
                  : 'text-gray-500 dark:text-gray-400 hover:text-primary-200'
              }`}
            >
              <div className="relative mb-1">
                <Icon size={20} />
                {item.badge && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold min-w-[16px]">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium truncate w-full text-center leading-tight">
                {item.label}
              </span>
              {item.active && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary-200 rounded-full"></div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavigation;