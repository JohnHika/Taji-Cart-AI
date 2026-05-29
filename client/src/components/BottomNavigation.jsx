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
        { label: 'Profile', icon: FaUser, path: '/dashboard/profile', active: location.pathname === '/mobile/profile' || location.pathname === '/dashboard/profile' }
      ];
    }

    if (isDelivery) {
      return [
        { label: 'Dashboard', icon: FaTruck, path: '/dashboard/delivery/dashboard', active: location.pathname.includes('/dashboard/delivery/dashboard') || location.pathname.includes('/delivery/dashboard') },
        { label: 'Active', icon: FaClipboardList, path: '/dashboard/delivery/active', active: location.pathname.includes('/dashboard/delivery/active') || location.pathname.includes('/delivery/active') },
        { label: 'Map', icon: FaMapMarkedAlt, path: '/dashboard/delivery/map', active: location.pathname.includes('/dashboard/delivery/map') || location.pathname.includes('/delivery/map') },
        { label: 'History', icon: FaStore, path: '/dashboard/delivery/history', active: location.pathname.includes('/dashboard/delivery/history') || location.pathname.includes('/delivery/history') },
        { label: 'Profile', icon: FaUser, path: '/dashboard/profile', active: location.pathname === '/mobile/profile' || location.pathname === '/dashboard/profile' }
      ];
    }

    if (isUserStaff) {
      return [
        { label: 'Counter', icon: FaStore, path: '/dashboard/sales-counter', active: location.pathname.includes('/dashboard/sales-counter') || location.pathname.includes('/dashboard/staff-pos') },
        { label: 'Sales', icon: FaClipboardList, path: '/dashboard/sales-hub', active: location.pathname.includes('/dashboard/sales-hub') || location.pathname.includes('/dashboard/pos-dashboard') },
        { label: 'Delivery', icon: FaTruck, path: '/dashboard/staff/delivery', active: location.pathname.includes('/dashboard/staff/delivery') },
        { label: 'Pickups', icon: FaShoppingCart, path: '/dashboard/staff/pending-pickups', active: location.pathname.includes('/dashboard/staff/pending-pickups') },
        { label: 'Profile', icon: FaUser, path: '/dashboard/profile', active: location.pathname === '/mobile/profile' || location.pathname === '/dashboard/profile' }
      ];
    }

    return [
      { label: 'Home', icon: FaHome, path: '/', active: location.pathname === '/' },
      { label: 'Search', icon: FaSearch, path: '/search', active: location.pathname === '/search' },
      { label: 'Cart', icon: FaShoppingCart, path: '/mobile/cart', active: location.pathname === '/mobile/cart', badge: totalQty > 0 ? totalQty : null },
      { label: 'Wishlist', icon: FaHeart, path: '/wishlist', active: location.pathname === '/wishlist' },
      { label: user?._id ? 'Profile' : 'Login', icon: FaUser, path: user?._id ? '/dashboard/profile' : '/login', active: location.pathname === '/mobile/profile' || location.pathname === '/dashboard/profile' }
    ];
  }, [isAdmin, isDelivery, isUserStaff, location.pathname, totalQty, user?._id]);

  const hiddenRoutes = ['/login', '/register', '/checkout', '/dashboard/checkout', '/dashboard/cart', '/mobile/cart', '/mobile/profile'];
  if (hiddenRoutes.includes(location.pathname)) return null;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/97 dark:bg-dm-card/98 backdrop-blur-xl border-t border-plum-100/50 dark:border-dm-border/60 shadow-[0_-2px_24px_rgba(75,30,62,0.12)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className={`grid items-end gap-0 px-1.5 pt-2 pb-2 ${navItems.length >= 6 ? 'grid-cols-6' : 'grid-cols-5'}`}>
        {navItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <Link
              key={index}
              to={item.path}
              className="relative flex min-w-0 flex-col items-center justify-end gap-[3px] py-0.5 transition-all duration-200 active:scale-95"
            >
              <div className={`relative flex items-center justify-center rounded-xl transition-all duration-200 ${
                item.active
                  ? 'bg-gradient-to-b from-plum-700 to-plum-600 text-white shadow-[0_3px_10px_rgba(75,30,62,0.38)] px-3 py-[7px]'
                  : 'text-brown-300 dark:text-white/40 px-2.5 py-[7px] hover:bg-plum-50 dark:hover:bg-dm-card-2/50 hover:text-plum-600 dark:hover:text-plum-200'
              }`}>
                <Icon size={18} />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-1.5 bg-gold-500 text-charcoal rounded-pill min-w-[16px] h-[16px] px-0.5 flex items-center justify-center text-[10px] font-bold leading-none shadow-sm">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`w-full truncate text-center leading-none ${
                item.active
                  ? 'text-[9.5px] font-semibold text-plum-700 dark:text-plum-200'
                  : 'text-[9.5px] font-medium text-brown-300 dark:text-white/35'
              }`}>
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
