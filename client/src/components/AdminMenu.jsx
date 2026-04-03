import React from 'react';
import toast from 'react-hot-toast';
import {
  FaBoxOpen,
  FaBullhorn,
  FaCheck,
  FaClipboardList,
  FaCog,
  FaCrown,
  FaGift,
  FaHistory,
  FaLayerGroup,
  FaListAlt,
  FaMapMarkerAlt,
  FaShoppingBag,
  FaSignOutAlt,
  FaStore,
  FaTachometerAlt,
  FaTrophy,
  FaUpload,
  FaUser,
  FaUsers,
  FaUserTie
} from 'react-icons/fa';
import { HiOutlineExternalLink } from 'react-icons/hi';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import SummaryApi from '../common/SummaryApi';
import { logout } from '../store/userSlice';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';

const AdminMenu = ({ close, forLightPanel = false }) => {
  const user = useSelector(state => state.user);
  const location = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const isLinkActive = (to, exact) => {
    if (exact) {
      return location.pathname === to || location.pathname === `${to}/`;
    }
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  const sectionClass = forLightPanel
    ? 'text-xs font-semibold uppercase tracking-widest text-brown-300 dark:text-white/30 px-4 py-1 mt-3 mb-0.5'
    : 'text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-white/45 px-4 py-2 mt-3 mb-0.5';

  const linkBase = forLightPanel
    ? 'px-4 py-2.5 rounded-pill mx-2 flex items-center gap-2.5 text-sm font-medium text-charcoal dark:text-white/80 hover:bg-plum-50 dark:hover:bg-plum-900/30 hover:text-plum-700 dark:hover:text-plum-200 transition-all border border-transparent'
    : 'px-4 py-2.5 rounded-pill mx-2 flex items-center gap-2.5 text-sm font-medium text-white/75 border border-transparent hover:bg-plum-800/95 hover:text-white hover:border-plum-600 transition-all';

  const linkActive = forLightPanel
    ? 'bg-plum-100 dark:bg-plum-900/40 text-plum-800 dark:text-plum-200 border-plum-200 dark:border-plum-700'
    : 'bg-plum-700 text-white border-gold-500/55 shadow-inner ring-1 ring-gold-400/25';

  const iconMuted = forLightPanel
    ? 'text-plum-500 dark:text-plum-400 flex-shrink-0'
    : 'text-gold-400/90 flex-shrink-0';

  const MenuLink = ({ to, icon: Icon, label, exact }) => {
    const active = isLinkActive(to, exact);
    return (
      <Link
        onClick={() => close?.()}
        to={to}
        className={`${linkBase} ${active ? linkActive : ''}`}
      >
        <Icon size={15} className={iconMuted} />
        <span className="truncate">{label}</span>
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

  const dividerClass = forLightPanel
    ? 'my-3 border-t border-brown-100 dark:border-dm-border'
    : 'my-3 border-t border-plum-700';

  const titleClass = forLightPanel
    ? 'font-semibold text-charcoal dark:text-white text-base mb-1'
    : 'font-semibold text-white text-base mb-1';

  const metaClass = forLightPanel
    ? 'text-sm flex items-center gap-2 mb-2 text-brown-600 dark:text-white/70'
    : 'text-sm flex items-center gap-2 mb-2 text-white/70';

  return (
    <div className={forLightPanel ? '' : 'text-white'}>
      <div className={titleClass}>Admin dashboard</div>
      <div className={metaClass}>
        <span className="max-w-52 truncate">
          {user.name || user.mobile}{' '}
          <span className={forLightPanel ? 'text-gold-600 dark:text-gold-400 font-medium' : 'text-gold-300 font-medium'}>
            (admin)
          </span>
        </span>
        <Link
          onClick={() => close?.()}
          to="/dashboard/profile"
          className={
            forLightPanel
              ? 'text-plum-600 dark:text-plum-300 hover:text-plum-700 shrink-0'
              : 'text-white/60 hover:text-white shrink-0'
          }
        >
          <HiOutlineExternalLink size={15} />
        </Link>
      </div>

      <div className={dividerClass} />

      <nav className="text-sm flex flex-col gap-0.5 mt-2">
        <p className={sectionClass}>Dashboard</p>
        <MenuLink to="/dashboard" icon={FaTachometerAlt} label="Dashboard overview" exact />
        <MenuLink to="/dashboard/profile" icon={FaUser} label="My profile" />

        <p className={sectionClass}>User management</p>
        <MenuLink to="/dashboard/users-admin" icon={FaUsers} label="User management" />
        <MenuLink to="/dashboard/staff/dashboard" icon={FaUserTie} label="Staff dashboard" />

        <p className={sectionClass}>Products & categories</p>
        <MenuLink to="/dashboard/category" icon={FaListAlt} label="Category" />
        <MenuLink to="/dashboard/subcategory" icon={FaLayerGroup} label="Sub category" />
        <MenuLink to="/dashboard/upload-product" icon={FaUpload} label="Upload product" />
        <MenuLink to="/dashboard/product" icon={FaBoxOpen} label="Product" />

        <p className={sectionClass}>Marketing & community</p>
        <MenuLink to="/dashboard/loyalty-program-admin" icon={FaCrown} label="Loyalty program" />
        <MenuLink to="/dashboard/admin-community-perks" icon={FaGift} label="Manage community perks" />
        <MenuLink to="/dashboard/community-perks" icon={FaTrophy} label="Community perks" />
        <MenuLink to="/dashboard/active-campaigns" icon={FaBullhorn} label="Active campaigns" />

        <p className={sectionClass}>Orders & delivery</p>
        <MenuLink to="/dashboard/allorders" icon={FaClipboardList} label="All orders" />
        <MenuLink to="/dashboard/myorders" icon={FaShoppingBag} label="My orders" />
        <MenuLink to="/dashboard/address" icon={FaMapMarkerAlt} label="Save address" />

        <p className={sectionClass}>Staff functions</p>
        <MenuLink to="/dashboard/staff/pending-pickups" icon={FaStore} label="Pending pickups" />
        <MenuLink to="/dashboard/staff/verify-pickup" icon={FaCheck} label="Verify pickup" />
        <MenuLink to="/dashboard/staff/completed-verifications" icon={FaHistory} label="Verification history" />
        <MenuLink to="/dashboard/staff/delivery" icon={FaCog} label="Delivery management" />

        <div className={dividerClass} />

        <button
          type="button"
          onClick={handleLogout}
          className={`${linkBase} w-full text-left mb-2 ${forLightPanel ? 'text-brown-600 dark:text-white/70' : 'text-white/60 hover:text-white'}`}
        >
          <FaSignOutAlt size={15} className={iconMuted} />
          Log out
        </button>
      </nav>
    </div>
  );
};

export default AdminMenu;
