import React, { useMemo } from 'react';
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
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Main navigation"
    >
      {/* Brand accent line — plum → gold gradient */}
      <div className="h-[2px] w-full bg-gradient-to-r from-plum-800 via-plum-500 to-gold-400 opacity-75" />

      {/* Nav body */}
      <div className="bg-white/98 dark:bg-dm-card/99 backdrop-blur-xl shadow-[0_-8px_48px_rgba(75,30,62,0.18)]">
        <div className={`grid items-stretch px-2 pt-2.5 pb-3 ${navItems.length >= 6 ? 'grid-cols-6' : 'grid-cols-5'}`}>
          {navItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link
                key={index}
                to={item.path}
                aria-current={item.active ? 'page' : undefined}
                className="relative flex min-w-0 flex-col items-center gap-[3px] select-none transition-all duration-200 active:scale-90"
              >
                {/* Icon pill */}
                <div className={`relative flex items-center justify-center rounded-xl transition-all duration-300 ${
                  item.active
                    ? 'bg-gradient-to-b from-plum-700 to-plum-600 text-white shadow-[0_6px_20px_rgba(75,30,62,0.45)] px-4 py-[9px]'
                    : 'text-brown-300 dark:text-white/38 px-3 py-[9px] hover:bg-plum-50 dark:hover:bg-dm-card-2/60 hover:text-plum-600 dark:hover:text-plum-300'
                }`}>
                  <Icon size={item.active ? 20 : 19} />

                  {/* Cart badge */}
                  {item.badge != null && (
                    <span className="absolute -top-1.5 -right-1.5 bg-gold-500 text-charcoal rounded-pill min-w-[16px] h-[16px] px-0.5 flex items-center justify-center text-[10px] font-bold leading-none shadow-sm">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span className={`w-full truncate text-center leading-none transition-all duration-200 ${
                  item.active
                    ? 'text-[10px] font-bold text-plum-700 dark:text-plum-200'
                    : 'text-[9.5px] font-medium text-brown-300/80 dark:text-white/28'
                }`}>
                  {item.label}
                </span>

                {/* Gold glow dot — always in DOM for layout stability; only visible when active */}
                <span className={`w-[4.5px] h-[4.5px] rounded-full transition-all duration-300 ${
                  item.active
                    ? 'bg-gold-500 shadow-[0_0_8px_rgba(201,148,58,0.9)] scale-100 opacity-100'
                    : 'bg-transparent scale-0 opacity-0'
                }`} />
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNavigation;
