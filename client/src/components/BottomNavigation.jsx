import React, { useMemo } from 'react';
import { FaHome, FaUser, FaShoppingBag, FaHeart, FaSearch } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';
import { useGlobalContext } from '../provider/GlobalProvider';

const BottomNavigation = () => {
  const location = useLocation();
  const user = useSelector(state => state.user);
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
      icon: FaShoppingBag,
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

  const hiddenRoutes = ['/login', '/register', '/checkout', '/mobile/cart', '/mobile/profile'];
  if (hiddenRoutes.includes(location.pathname)) return null;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-ivory dark:bg-dm-card border-t border-brown-100 dark:border-dm-border safe-area-bottom">
      <div className="flex items-center justify-around py-1.5 px-2">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <Link
              key={index}
              to={item.path}
              className={`flex flex-col items-center py-1.5 px-1 min-w-0 flex-1 relative transition-all duration-200 ${
                item.active
                  ? 'text-plum-700 dark:text-plum-200'
                  : 'text-brown-400 dark:text-white/40 hover:text-plum-500 dark:hover:text-plum-300'
              }`}
            >
              {/* Active indicator dot at top */}
              {item.active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-plum-700 dark:bg-plum-300 rounded-pill" />
              )}

              <div className={`relative mb-1 transition-transform duration-200 ${item.active ? 'scale-110' : ''}`}>
                <Icon size={20} />
                {item.badge && (
                  <span className="absolute -top-2 -right-2 bg-gold-500 text-charcoal rounded-pill min-w-[18px] h-[18px] px-0.5 flex items-center justify-center text-xs font-bold leading-none">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-xs font-medium truncate w-full text-center leading-tight ${item.active ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavigation;
