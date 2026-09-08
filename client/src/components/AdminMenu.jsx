import React, { useState } from 'react';
import toast from 'react-hot-toast';
import {
  FaBoxOpen,
  FaBullhorn,
  FaBrain,
  FaCashRegister,
  FaChartLine,
  FaCheck,
  FaChevronDown,
  FaClipboardList,
  FaCog,
  FaCrown,
  FaEyeSlash,
  FaExclamationCircle,
  FaGift,
  FaHistory,
  FaIdCard,
  FaLayerGroup,
  FaListAlt,
  FaMagic,
  FaMapMarkerAlt,
  FaRoute,
  FaRocket,
  FaShoppingBag,
  FaSignOutAlt,
  FaStore,
  FaTachometerAlt,
  FaTrophy,
  FaTruck,
  FaUndo,
  FaUpload,
  FaUser,
  FaUsers,
  FaUserTie,
  FaWarehouse
} from 'react-icons/fa';
import { HiOutlineExternalLink } from 'react-icons/hi';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import SummaryApi from '../common/SummaryApi';
import { nawiriBrand } from '../config/brand';
import { logout } from '../store/userSlice';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import { clearAuthStorage } from '../utils/authStorage';
import ReportIssueModal from './modals/ReportIssueModal';

const AdminMenu = ({ close, forLightPanel = false }) => {
  const user = useSelector((state) => state.user);
  const location = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [reportIssueOpen, setReportIssueOpen] = useState(false);

  const isLinkActive = (to, exact = false) => {
    if (exact) {
      return location.pathname === to || location.pathname === `${to}/`;
    }

    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  const sectionClass = forLightPanel
    ? 'min-w-0 px-4 py-1 mt-3 mb-0.5 text-xs font-semibold uppercase tracking-[0.14em] leading-tight text-brown-500 dark:text-white/45 whitespace-normal break-words'
    : 'min-w-0 px-4 py-2 mt-3 mb-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] leading-tight text-white/45 whitespace-normal break-words';

  const linkBase = forLightPanel
    ? 'mx-2 flex min-w-0 max-w-full items-center gap-2.5 overflow-hidden rounded-pill border border-transparent px-4 py-2.5 text-sm font-medium text-charcoal transition-all hover:bg-plum-50 hover:text-plum-700 dark:text-white/80 dark:hover:bg-plum-900/30 dark:hover:text-plum-200'
    : 'mx-2 flex min-w-0 max-w-full items-center gap-2.5 overflow-hidden rounded-pill border border-transparent px-4 py-2.5 text-sm font-medium text-white/75 transition-all hover:border-plum-600 hover:bg-plum-800/95 hover:text-white';

  const linkActive = forLightPanel
    ? 'bg-plum-100 dark:bg-plum-900/40 text-plum-800 dark:text-plum-200 border-plum-200 dark:border-plum-700'
    : 'bg-plum-700 text-white border-gold-500/55 shadow-inner ring-1 ring-gold-400/25';

  const iconMuted = forLightPanel
    ? 'text-plum-500 dark:text-plum-400 flex-shrink-0'
    : 'text-gold-400/90 flex-shrink-0';

  const dividerClass = forLightPanel
    ? 'my-3 border-t border-brown-100 dark:border-dm-border'
    : 'my-3 border-t border-plum-700';

  const titleClass = forLightPanel
    ? 'font-semibold text-charcoal dark:text-white text-base mb-1'
    : 'font-semibold text-white text-base mb-1';

  const metaClass = forLightPanel
    ? 'text-sm flex items-center gap-2 mb-2 text-brown-600 dark:text-white/70'
    : 'text-sm flex items-center gap-2 mb-2 text-white/70';

  const MenuLink = ({ to, icon: Icon, label, exact = false }) => {
    const active = isLinkActive(to, exact);

    return (
      <Link
        onClick={() => close?.()}
        to={to}
        className={`${linkBase} ${active ? linkActive : ''}`}
      >
        <Icon size={15} className={iconMuted} />
        <span className="min-w-0 flex-1 truncate">{label}</span>
      </Link>
    );
  };

  const MenuGroup = ({ label, icon: Icon, routes, children }) => {
    const isActive = routes.some((route) => isLinkActive(route));

    return (
      <details open={isActive} className="group mx-2 mt-1 rounded-xl">
        <summary
          className={`flex cursor-pointer list-none items-center gap-2.5 rounded-pill px-4 py-2.5 text-sm font-semibold transition-colors [&::-webkit-details-marker]:hidden ${
            forLightPanel
              ? 'text-brown-700 hover:bg-plum-50 hover:text-plum-700 dark:text-white/80 dark:hover:bg-plum-900/30 dark:hover:text-plum-200'
              : 'text-white/80 hover:bg-plum-800/75 hover:text-white'
          }`}
        >
          <Icon size={15} className={iconMuted} />
          <span className="min-w-0 flex-1 truncate">{label}</span>
          <FaChevronDown size={12} className="shrink-0 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-0.5 space-y-0.5 pb-1">
          {children}
        </div>
      </details>
    );
  };

  const handleLogout = async () => {
    try {
      const response = await Axios({ ...SummaryApi.logout });

      if (response.data.success) {
        close?.();
        dispatch(logout());
        clearAuthStorage();
        toast.success(response.data.message);
        navigate('/');
      }
    } catch (error) {
      AxiosToastError(error);
    }
  };

  const backToStoreCardClass = forLightPanel
    ? 'flex items-center gap-3 rounded-xl border border-brown-100 bg-white/80 px-3 py-2.5 transition hover:border-plum-200 hover:bg-plum-50/80 dark:border-dm-border dark:bg-dm-card-2 dark:hover:border-plum-700 dark:hover:bg-plum-900/20'
    : 'flex items-center gap-3 rounded-xl border border-plum-600/50 bg-plum-800/40 px-3 py-2.5 transition hover:border-plum-500 hover:bg-plum-800/70';

  return (
    <div className={forLightPanel ? 'min-w-0 max-w-full overflow-x-hidden' : 'min-w-0 max-w-full overflow-x-hidden text-white'}>
      <div className="mb-4 px-2">
        <Link onClick={() => close?.()} to="/" className={backToStoreCardClass}>
          <img src={nawiriBrand.logo} alt="" className="h-9 w-9 shrink-0 rounded-lg object-contain" />
          <div className="min-w-0">
            <p
              className={`truncate text-sm font-semibold ${
                forLightPanel ? 'text-charcoal dark:text-white' : 'text-white'
              }`}
            >
              {nawiriBrand.shortName}
            </p>
            <p
              className={`truncate text-xs ${
                forLightPanel ? 'text-brown-500 dark:text-white/45' : 'text-white/55'
              }`}
            >
              Back to store
            </p>
          </div>
        </Link>
      </div>

      <div className={`${titleClass} truncate`}>Admin dashboard</div>
      <div className={metaClass}>
        <span className="min-w-0 max-w-full flex-1 truncate">
          {user?.name || user?.mobile}{' '}
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

      <nav className="mt-2 flex min-w-0 flex-col gap-0.5 overflow-x-hidden text-sm">
        <p className={sectionClass}>Owner workspace</p>
        <MenuLink to="/dashboard/admin-control-center" icon={FaTachometerAlt} label="Command center" />
        <MenuLink to="/dashboard/admin-ai-insights" icon={FaBrain} label="AI Operations Copilot" />
        <MenuLink to="/dashboard/sales-hub" icon={FaStore} label="Sales hub" />
        <MenuLink to="/dashboard/sales-counter" icon={FaCashRegister} label="Sales counter" />

        <MenuGroup
          label="Sales & orders"
          icon={FaClipboardList}
          routes={['/dashboard/allorders', '/dashboard/sales-history', '/dashboard/returns-exchanges', '/dashboard/eod-reports']}
        >
          <MenuLink to="/dashboard/allorders" icon={FaClipboardList} label="All orders" />
          <MenuLink to="/dashboard/sales-history" icon={FaHistory} label="Sales history" />
          <MenuLink to="/dashboard/returns-exchanges" icon={FaUndo} label="Returns & exchanges" />
          <MenuLink to="/dashboard/eod-reports" icon={FaChartLine} label="Weekly/monthly reports" />
        </MenuGroup>

        <MenuGroup
          label="Catalog & inventory"
          icon={FaBoxOpen}
          routes={['/dashboard/category', '/dashboard/subcategory', '/dashboard/upload-product', '/dashboard/product', '/dashboard/catalog-quality', '/dashboard/stock-value']}
        >
          <MenuLink to="/dashboard/upload-product" icon={FaUpload} label="Add a product" />
          <MenuLink to="/dashboard/product" icon={FaBoxOpen} label="Products" />
          <MenuLink to="/dashboard/catalog-quality" icon={FaEyeSlash} label="Catalog quality" />
          <MenuLink to="/dashboard/stock-value" icon={FaWarehouse} label="Stock value" />
          <MenuLink to="/dashboard/category" icon={FaListAlt} label="Categories" />
          <MenuLink to="/dashboard/subcategory" icon={FaLayerGroup} label="Subcategories" />
        </MenuGroup>

        <MenuGroup
          label="Customers & growth"
          icon={FaUsers}
          routes={['/dashboard/users-admin', '/dashboard/staff/dashboard', '/dashboard/loyalty-program-admin', '/dashboard/admin-community-perks', '/dashboard/community-perks', '/dashboard/active-campaigns']}
        >
          <MenuLink to="/dashboard/users-admin" icon={FaUsers} label="Customers & staff" />
          <MenuLink to="/dashboard/staff/dashboard" icon={FaUserTie} label="Staff dashboard" />
          <MenuLink to="/dashboard/loyalty-program-admin" icon={FaCrown} label="Loyalty program" />
          <MenuLink to="/dashboard/admin-community-perks" icon={FaGift} label="Manage community perks" />
          <MenuLink to="/dashboard/community-perks" icon={FaTrophy} label="Community perks" />
          <MenuLink to="/dashboard/active-campaigns" icon={FaBullhorn} label="Active campaigns" />
        </MenuGroup>

        <MenuGroup
          label="Delivery & fulfilment"
          icon={FaTruck}
          routes={['/dashboard/delivery-zones', '/dashboard/driver-verification', '/dashboard/staff/pending-pickups', '/dashboard/staff/delivery/pending', '/dashboard/staff/verify-pickup', '/dashboard/staff/completed-verifications', '/dashboard/staff/delivery', '/dashboard/staff/counter-fulfillment']}
        >
          <MenuLink to="/dashboard/delivery-zones" icon={FaRoute} label="Delivery zones" />
          <MenuLink to="/dashboard/driver-verification" icon={FaIdCard} label="Driver verification" />
          <MenuLink to="/dashboard/staff/pending-pickups" icon={FaStore} label="Pending pickups" />
          <MenuLink to="/dashboard/staff/delivery/pending" icon={FaTruck} label="Pending deliveries" />
          <MenuLink to="/dashboard/staff/verify-pickup" icon={FaCheck} label="Verify pickup" />
          <MenuLink to="/dashboard/staff/completed-verifications" icon={FaHistory} label="Verification history" />
          <MenuLink to="/dashboard/staff/delivery" icon={FaCog} label="Delivery management" />
          <MenuLink to="/dashboard/staff/counter-fulfillment" icon={FaTruck} label="Counter deliveries" />
        </MenuGroup>

        <MenuGroup
          label="Experiments & settings"
          icon={FaRocket}
          routes={['/dashboard/feature-releases', '/dashboard/ai-style-tryon', '/dashboard/profile', '/dashboard/myorders', '/dashboard/address']}
        >
          <MenuLink to="/dashboard/feature-releases" icon={FaRocket} label="Feature releases" />
          <MenuLink to="/dashboard/ai-style-tryon" icon={FaMagic} label="AI Try-On" />
          <MenuLink to="/dashboard/profile" icon={FaUser} label="My profile" />
          <MenuLink to="/dashboard/myorders" icon={FaShoppingBag} label="My orders" />
          <MenuLink to="/dashboard/address" icon={FaMapMarkerAlt} label="Saved addresses" />
        </MenuGroup>

        <button
          type="button"
          onClick={() => setReportIssueOpen(true)}
          className={`${linkBase} mt-1 w-full text-left`}
        >
          <FaExclamationCircle size={15} className={iconMuted} />
          <span className="min-w-0 flex-1 truncate">Report an issue</span>
        </button>

        <div className={dividerClass} />

        <button
          type="button"
          onClick={handleLogout}
          className={`${linkBase} mb-2 w-full text-left ${forLightPanel ? 'text-brown-600 dark:text-white/70' : 'text-white/60 hover:text-white'}`}
        >
          <FaSignOutAlt size={15} className={iconMuted} />
          Log out
        </button>
      </nav>

      <ReportIssueModal isOpen={reportIssueOpen} onClose={() => setReportIssueOpen(false)} />
    </div>
  );
};

export default AdminMenu;
