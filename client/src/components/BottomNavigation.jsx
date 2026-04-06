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
  const { totalQty } = useGlobalContext();
  const isAdmin = isadmin(user);
  const isDelivery = user?.isDelivery === true || user?.role === 'delivery';
  const isUserStaff = isStaff(user) && !isAdmin;

  const navItems = useMemo(() => {
    if (isAdmin) {
      return [
        { label: 'Admin', icon: FaCompass, path: '/dashboard', active: location.pathname === '/dashboard' },
        { label: 'Orders', icon: FaClipboardList, path: '/dashboard/allorders', active: location.pathname.includes('/dashboard/allorders') },
        { label: 'Counter', icon: FaCashRegister, path: '/dashboard/sales-counter', active: location.pathname.includes('/dashboard/sales-counter') || location.pathname.includes('/dashboard/staff-pos') },
        { label: 'Hub', icon: FaStore, path: '/dashboard/sales-hub', active: location.pathname.includes('/dashboard/sales-hub') || location.pathname.includes('/dashboard/pos-dashboard') },
        { label: 'Users', icon: FaUsers, path: '/dashboard/users-admin', active: location.pathname.includes('/dashboard/users-admin') },
        { label: 'Profile', icon: FaUser, path: '/mobile/profile', active: location.pathname === '/mobile/profile' || location.pathname === '/dashboard/profile' }
      ];
    }

    if (isDelivery) {
      return [
        { label: 'Dashboard', icon: FaTruck, path: '/dashboard/delivery/dashboard', active: location.pathname.includes('/dashboard/delivery/dashboard') || location.pathname.includes('/delivery/dashboard') },
        { label: 'Active', icon: FaClipboardList, path: '/dashboard/delivery/active', active: location.pathname.includes('/dashboard/delivery/active') || location.pathname.includes('/delivery/active') },
        { label: 'Map', icon: FaMapMarkedAlt, path: '/dashboard/delivery/map', active: location.pathname.includes('/dashboard/delivery/map') || location.pathname.includes('/delivery/map') },
        { label: 'History', icon: FaStore, path: '/dashboard/delivery/history', active: location.pathname.includes('/dashboard/delivery/history') || location.pathname.includes('/delivery/history') },
        { label: 'Profile', icon: FaUser, path: '/mobile/profile', active: location.pathname === '/mobile/profile' || location.pathname === '/dashboard/profile' }
      ];
    }

    if (isUserStaff) {
      return [
        { label: 'Counter', icon: FaStore, path: '/dashboard/sales-counter', active: location.pathname.includes('/dashboard/sales-counter') || location.pathname.includes('/dashboard/staff-pos') },
        { label: 'Sales', icon: FaClipboardList, path: '/dashboard/sales-hub', active: location.pathname.includes('/dashboard/sales-hub') || location.pathname.includes('/dashboard/pos-dashboard') },
        { label: 'Delivery', icon: FaTruck, path: '/dashboard/staff/delivery', active: location.pathname.includes('/dashboard/staff/delivery') },
        { label: 'Pickups', icon: FaShoppingCart, path: '/dashboard/staff/pending-pickups', active: location.pathname.includes('/dashboard/staff/pending-pickups') },
        { label: 'Profile', icon: FaUser, path: '/mobile/profile', active: location.pathname === '/mobile/profile' || location.pathname === '/dashboard/profile' }
      ];
    }

    return [
      { label: 'Home', icon: FaHome, path: '/', active: location.pathname === '/' },
      { label: 'Search', icon: FaSearch, path: '/search', active: location.pathname === '/search' },
      { label: 'Cart', icon: FaShoppingCart, path: '/mobile/cart', active: location.pathname === '/mobile/cart', badge: totalQty > 0 ? totalQty : null },
      { label: 'Wishlist', icon: FaHeart, path: '/wishlist', active: location.pathname === '/wishlist' },
      { label: user?._id ? 'Profile' : 'Login', icon: FaUser, path: user?._id ? '/mobile/profile' : '/login', active: location.pathname === '/mobile/profile' || location.pathname === '/dashboard/profile' }
    ];
  }, [isAdmin, isDelivery, isUserStaff, location.pathname, totalQty, user?._id]);

  const hiddenRoutes = ['/login', '/register', '/checkout', '/mobile/cart', '/mobile/profile'];
  if (hiddenRoutes.includes(location.pathname)) return null;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200/80 bg-white/95 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur dark:border-gray-700/80 dark:bg-gray-800/95 safe-area-bottom">
      <div className={`grid items-center gap-0.5 px-1 py-1.5 ${navItems.length >= 6 ? 'grid-cols-6' : 'grid-cols-5'}`}>
        {navItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <Link
              key={index}
              to={item.path}
              className={`relative flex min-w-0 flex-col items-center justify-center rounded-2xl px-0.5 py-2 transition-all ${
                item.active
                  ? 'bg-primary-50 text-primary-200 dark:bg-primary-900/20'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 hover:text-primary-200 dark:hover:bg-gray-700/60'
              }`}
            >
              <div className="relative mb-1">
                <Icon size={18} />
                {item.badge && (
                  <span className="absolute -top-2 -right-2 bg-gold-500 text-charcoal rounded-pill min-w-[18px] h-[18px] px-0.5 flex items-center justify-center text-xs font-bold leading-none">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="w-full truncate text-center text-[10px] font-medium leading-tight sm:text-[11px]">
                {item.label}
              </span>
              {item.active && (
                <div className="absolute top-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary-200"></div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavigation;
