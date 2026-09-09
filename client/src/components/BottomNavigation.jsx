import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { FaCashRegister, FaClipboardList, FaCompass, FaHeart, FaHome, FaMapMarkedAlt, FaSearch, FaShoppingCart, FaStore, FaTruck, FaUser, FaUsers } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';
import { useGlobalContext } from '../provider/GlobalProvider';
import isadmin from '../utils/isAdmin';
import isStaff from '../utils/isStaff';

const BottomNavigation = () => {
  const location = useLocation();
  const user = useSelector(state => state.user);
  const wishlistCount = useSelector(state => state.wishlist?.items?.length || 0);
  const { totalQty } = useGlobalContext();
  const isAdmin = isadmin(user);
  const isDelivery = user?.isDelivery === true || user?.role === 'delivery';
  const isUserStaff = isStaff(user) && !isAdmin;
  const reduceMotion = useReducedMotion();

  const navItems = useMemo(() => {
    if (isAdmin) {
      return [
        { label: 'Admin',   icon: FaCompass,       path: '/dashboard',                  active: location.pathname === '/dashboard' },
        { label: 'Orders',  icon: FaClipboardList,  path: '/dashboard/allorders',        active: location.pathname.includes('/dashboard/allorders') },
        { label: 'Counter', icon: FaCashRegister,   path: '/dashboard/sales-counter',    active: location.pathname.includes('/dashboard/sales-counter') || location.pathname.includes('/dashboard/staff-pos') },
        { label: 'Hub',     icon: FaStore,          path: '/dashboard/sales-hub',        active: location.pathname.includes('/dashboard/sales-hub') || location.pathname.includes('/dashboard/pos-dashboard') },
        { label: 'Users',   icon: FaUsers,          path: '/dashboard/users-admin',      active: location.pathname.includes('/dashboard/users-admin') },
        { label: 'Profile', icon: FaUser,           path: '/dashboard/profile',          active: location.pathname === '/mobile/profile' || location.pathname === '/dashboard/profile' },
      ];
    }

    if (isDelivery) {
      return [
        { label: 'Dashboard', icon: FaTruck,         path: '/delivery/dashboard', active: location.pathname.includes('/delivery/dashboard') },
        { label: 'Active',    icon: FaClipboardList, path: '/delivery/active',    active: location.pathname.includes('/delivery/active') },
        { label: 'Map',       icon: FaMapMarkedAlt,  path: '/delivery/map',       active: location.pathname.includes('/delivery/map') },
        { label: 'History',   icon: FaStore,         path: '/delivery/history',   active: location.pathname.includes('/delivery/history') },
        { label: 'Profile',   icon: FaUser,         path: '/dashboard/profile',            active: location.pathname === '/mobile/profile' || location.pathname === '/dashboard/profile' },
      ];
    }

    if (isUserStaff) {
      return [
        { label: 'Counter',  icon: FaStore,         path: '/dashboard/sales-counter',       active: location.pathname.includes('/dashboard/sales-counter') || location.pathname.includes('/dashboard/staff-pos') },
        { label: 'Sales',    icon: FaClipboardList, path: '/dashboard/sales-hub',           active: location.pathname.includes('/dashboard/sales-hub') || location.pathname.includes('/dashboard/pos-dashboard') },
        { label: 'Delivery', icon: FaTruck,         path: '/dashboard/staff/delivery',      active: location.pathname.includes('/dashboard/staff/delivery') },
        { label: 'Pickups',  icon: FaShoppingCart,  path: '/dashboard/staff/pending-pickups', active: location.pathname.includes('/dashboard/staff/pending-pickups') },
        { label: 'Profile',  icon: FaUser,          path: '/dashboard/profile',             active: location.pathname === '/mobile/profile' || location.pathname === '/dashboard/profile' },
      ];
    }

    return [
      { label: 'Home',    icon: FaHome,       path: '/',              active: location.pathname === '/' },
      { label: 'Search',  icon: FaSearch,     path: '/search',        active: location.pathname === '/search' },
      { label: 'Cart',    icon: FaShoppingCart, path: '/mobile/cart', active: location.pathname === '/mobile/cart', badge: totalQty > 0 ? totalQty : null },
      { label: 'Wishlist', icon: FaHeart,     path: '/wishlist',      active: location.pathname === '/wishlist', badge: wishlistCount > 0 ? wishlistCount : null },
      { label: user?._id ? 'Profile' : 'Login', icon: FaUser, path: user?._id ? '/dashboard/profile' : '/login', active: location.pathname === '/mobile/profile' || location.pathname === '/dashboard/profile' },
    ];
  }, [isAdmin, isDelivery, isUserStaff, location.pathname, totalQty, user?._id, wishlistCount]);

  const hiddenRoutes = ['/login', '/register', '/checkout', '/dashboard/checkout', '/dashboard/cart', '/mobile/cart', '/mobile/profile'];
  if (hiddenRoutes.includes(location.pathname)) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-brown-200 bg-white/95 lg:hidden dark:border-dm-border dark:bg-dm-card/95"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Main navigation"
    >
      <div className="shadow-[0_-4px_18px_rgba(75,30,62,0.08)]">
        <div className={`grid min-h-[4.25rem] items-center px-1 py-1.5 ${navItems.length >= 6 ? 'grid-cols-6' : 'grid-cols-5'}`}>
          {navItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link
                key={index}
                to={item.path}
                aria-current={item.active ? 'page' : undefined}
                className="press relative flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-1 text-center select-none"
              >
                {item.active && (
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-x-1 top-0 h-8 rounded-lg bg-plum-700 dark:bg-plum-600"
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                  />
                )}
                <div className={`relative flex h-8 items-center justify-center px-3 ${
                  item.active
                    ? 'text-white'
                    : 'text-brown-400 dark:text-white/45'
                }`}>
                  <Icon size={19} />

                  {/* Cart badge */}
                  {item.badge != null && (
                    <span className="absolute -top-1.5 -right-1.5 bg-gold-500 text-charcoal rounded-pill min-w-[16px] h-[16px] px-0.5 flex items-center justify-center text-[10px] font-bold leading-none shadow-sm">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>

                <span className={`relative w-full truncate leading-none transition-colors duration-200 ${
                  item.active
                    ? 'text-[10px] font-bold text-plum-700 dark:text-plum-200'
                    : 'text-[10px] font-medium text-brown-400 dark:text-white/45'
                }`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNavigation;
