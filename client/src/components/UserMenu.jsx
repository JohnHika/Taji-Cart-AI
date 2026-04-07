import React from 'react';
import toast from 'react-hot-toast';
import {
  FaBoxes,
  FaBullhorn,
  FaCog,
  FaClipboardCheck,
  FaCreditCard,
  FaCrown,
  FaGift,
  FaHistory,
  FaMapMarkedAlt,
  FaMapMarkerAlt,
  FaQrcode,
  FaShoppingBag,
  FaShoppingCart,
  FaSignOutAlt,
  FaStar,
  FaTachometerAlt,
  FaTruck,
  FaUser,
  FaUserTie
} from 'react-icons/fa';
import { HiOutlineExternalLink } from 'react-icons/hi';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import SummaryApi from '../common/SummaryApi';
import { nawiriBrand } from '../config/brand';
import { logout } from '../store/userSlice';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import isadmin from '../utils/isAdmin';
import isStaff from '../utils/isStaff';

const UserMenu = ({ close, variant = 'dropdown' }) => {
  const user = useSelector((state) => state.user);
  const location = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isAdmin = isadmin(user);
  const isDelivery = user?.role === 'delivery' || user?.isDelivery === true;
  const showStaffFunctions = isStaff(user) && !isAdmin;
  const isSidebar = variant === 'sidebar';

  const sectionClass = 'min-w-0 px-4 py-1 mt-3 mb-0.5 text-xs font-semibold uppercase tracking-[0.14em] leading-tight text-brown-500 dark:text-white/45 whitespace-normal break-words';

  const linkBase = 'mx-2 flex min-w-0 max-w-full items-center gap-2.5 overflow-hidden rounded-pill border border-transparent px-4 py-2.5 text-sm font-medium text-charcoal transition-all hover:bg-plum-50 hover:text-plum-700 dark:text-white/80 dark:hover:bg-plum-900/30 dark:hover:text-plum-200';

  const linkActive = 'bg-plum-100 dark:bg-plum-900/40 text-plum-800 dark:text-plum-200 border-plum-200 dark:border-plum-700';

  const iconClass = 'text-plum-500 dark:text-plum-400 flex-shrink-0';

  const dividerClass = 'my-3 border-t border-brown-100 dark:border-dm-border';

  const titleClass = 'font-semibold text-charcoal dark:text-white text-base mb-1';

  const metaClass = 'text-sm flex items-center gap-2 mb-2 text-brown-600 dark:text-white/70';

  const isLinkActive = (to, exact = false) => {
    const [pathPart, hashPart] = to.split('#');
    const base = pathPart || to;

    if (hashPart) {
      return (
        location.pathname === base &&
        (location.hash === `#${hashPart}` || (hashPart === 'royal' && location.hash === '#royal'))
      );
    }

    if (exact) {
      return location.pathname === base || location.pathname === `${base}/`;
    }

    return location.pathname === base || location.pathname.startsWith(`${base}/`);
  };

  const MenuLink = ({ to, icon: Icon, label, exact = false }) => {
    const active = isLinkActive(to, exact);

    return (
      <Link
        onClick={() => close?.()}
        to={to}
        className={`${linkBase} ${active ? linkActive : ''}`}
      >
        <Icon size={15} className={iconClass} />
        <span className="min-w-0 flex-1 truncate">{label}</span>
      </Link>
    );
  };

  const handleLogout = async () => {
    try {
      const response = await Axios({ ...SummaryApi.logout });

      if (response.data.success) {
        close?.();
        dispatch(logout());
        localStorage.clear();
        toast.success(response.data.message);
        navigate('/');
      }
    } catch (error) {
      AxiosToastError(error);
    }
  };

  return (
    <div className={isSidebar ? 'min-w-0 max-w-full overflow-x-hidden' : 'min-w-0 max-w-full overflow-x-hidden rounded-2xl bg-white p-1 dark:bg-gray-800 dark:text-gray-200 sm:p-2'}>
      {isSidebar && (
        <div className="mb-4 px-2">
          <Link
            to="/"
            onClick={() => close?.()}
            className="flex items-center gap-3 rounded-xl border border-brown-100 bg-white/80 px-3 py-2.5 transition hover:border-plum-200 hover:bg-plum-50/80 dark:border-dm-border dark:bg-dm-card-2 dark:hover:border-plum-700 dark:hover:bg-plum-900/20"
          >
            <img
              src={nawiriBrand.logo}
              alt=""
              className="h-9 w-9 shrink-0 rounded-lg object-contain"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-charcoal dark:text-white">{nawiriBrand.shortName}</p>
              <p className="truncate text-xs text-brown-500 dark:text-white/45">Back to store</p>
            </div>
          </Link>
        </div>
      )}

      <div className={`${titleClass} truncate`}>My account</div>
      <div className={metaClass}>
        <span className="min-w-0 max-w-full flex-1 truncate">
          {user?.name || user?.mobile}{' '}
          {isDelivery && <span className="text-plum-600 dark:text-plum-300">(delivery)</span>}
          {showStaffFunctions && <span className="text-emerald-500 dark:text-emerald-400">(staff)</span>}
        </span>
        <Link
          onClick={() => close?.()}
          to="/dashboard/profile"
          className='text-plum-600 dark:text-plum-300 hover:text-plum-700 shrink-0'
        >
          <HiOutlineExternalLink size={15} />
        </Link>
      </div>

      <div className={dividerClass} />

      <nav className="mt-2 flex min-w-0 flex-col gap-0.5 overflow-x-hidden text-sm">
        <p className={sectionClass}>Shop</p>
        <MenuLink to="/dashboard/cart" icon={FaShoppingCart} label="Cart" />
        <MenuLink to="/dashboard/checkout" icon={FaCreditCard} label="Checkout" />

        <p className={sectionClass}>Account</p>
        <MenuLink to="/dashboard/profile" icon={FaUser} label="My profile" />
        <MenuLink to="/dashboard/myorders" icon={FaShoppingBag} label="My orders" />
        <MenuLink to="/dashboard/address" icon={FaMapMarkerAlt} label="My addresses" />
        <MenuLink to="/dashboard/settings" icon={FaCog} label="Settings" />

        <p className={sectionClass}>Rewards & community</p>
        <MenuLink to="/dashboard/loyalty-program" icon={FaCrown} label="Loyalty program" />
        <MenuLink to="/dashboard/community-perks" icon={FaGift} label="Community perks" />
        <MenuLink to="/dashboard/active-campaigns" icon={FaBullhorn} label="Active campaigns" />
        <MenuLink to="/dashboard/profile#royal" icon={FaStar} label="Royal card" />

        {showStaffFunctions && (
          <>
            <p className={sectionClass}>Staff functions</p>
            <MenuLink to="/dashboard/staff/dashboard" icon={FaUserTie} label="Staff dashboard" />
            <MenuLink to="/dashboard/sales-counter" icon={FaShoppingBag} label="Sales counter" />
            <MenuLink to="/dashboard/sales-history" icon={FaHistory} label="Sales history" />
            <MenuLink to="/dashboard/staff/verify-pickup" icon={FaQrcode} label="Verify pickup" />
            <MenuLink to="/dashboard/staff/pending-pickups" icon={FaBoxes} label="Pending pickups" />
            <MenuLink to="/dashboard/staff/completed-verifications" icon={FaClipboardCheck} label="Verification history" />
          </>
        )}

        {isDelivery && (
          <>
            <p className={sectionClass}>Delivery</p>
            <MenuLink to="/dashboard/delivery/dashboard" icon={FaTachometerAlt} label="Delivery dashboard" />
            <MenuLink to="/dashboard/delivery/active" icon={FaTruck} label="Active deliveries" />
            <MenuLink to="/dashboard/delivery/completed" icon={FaShoppingBag} label="Completed deliveries" />
            <MenuLink to="/dashboard/delivery/history" icon={FaHistory} label="Delivery history" />
            <MenuLink to="/dashboard/delivery/map" icon={FaMapMarkedAlt} label="Map view" />
          </>
        )}

        <div className={dividerClass} />

        <button
          type="button"
          onClick={handleLogout}
          className={`${linkBase} mb-2 w-full text-left text-brown-600 dark:text-white/70`}
        >
          <FaSignOutAlt size={15} className={iconClass} />
          Log out
        </button>
      </nav>
    </div>
  );
};

export default UserMenu;
