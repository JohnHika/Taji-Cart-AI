import React from 'react';
import toast from 'react-hot-toast';
import {
    FaBoxes,
    FaBoxOpen,
    FaBullhorn,
    FaClipboardCheck,
    FaClipboardList,
    FaCog,
    FaCrown,
    FaGift,
    FaHistory,
    FaLayerGroup,
    FaListAlt,
    FaMapMarkedAlt,
    FaMapMarkerAlt,
    FaQrcode,
    FaShoppingBag,
    FaSignOutAlt,
    FaStore,
    FaTachometerAlt,
    FaTrophy,
    FaTruck,
    FaUpload,
    FaUser,
    FaUsers,
    FaUserTie
} from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import SummaryApi from '../common/SummaryApi';
import { logout } from '../store/userSlice';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';

const DashboardSidebar = ({ userRole, isStaff }) => {
  const user = useSelector(state => state.user);
  const location = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const isAdmin = userRole === 'admin';
  const isDelivery = userRole === 'delivery';

  const handleLogout = async () => {
    try {
      const response = await Axios({ ...SummaryApi.logout });
      if (response.data.success) {
        dispatch(logout());
        localStorage.clear();
        toast.success(response.data.message);
        navigate("/");
      }
    } catch (error) {
      AxiosToastError(error);
    }
  };

  const isActive = (path) =>
    location.pathname === path || location.pathname.includes(path);

  const MenuItem = ({ to, icon: Icon, label }) => {
    const active = isActive(to);
    return (
      <Link
        to={to}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg mx-2 mb-0.5 text-sm font-medium transition-all duration-200 group ${
          active
            ? 'bg-plum-700 border-l-4 border-gold-500 text-white'
            : 'text-white/60 hover:bg-plum-800 hover:text-white border-l-4 border-transparent'
        }`}
      >
        <Icon size={16} className={active ? 'text-gold-400' : 'text-white/40 group-hover:text-white/70'} />
        <span className="truncate">{label}</span>
      </Link>
    );
  };

  const SectionLabel = ({ title }) => (
    <div className="text-xs font-semibold uppercase tracking-widest text-blush-400/70 px-6 py-1 mt-4 mb-1">
      {title}
    </div>
  );

  const roleBadge = isAdmin
    ? { label: 'Administrator', color: 'bg-gold-500/20 text-gold-300' }
    : isDelivery
      ? { label: 'Delivery', color: 'bg-plum-600/30 text-plum-200' }
      : isStaff
        ? { label: 'Staff', color: 'bg-blush-400/20 text-blush-300' }
        : null;

  return (
    <div className="flex flex-col h-full text-white">
      {/* User info */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-pill bg-plum-600 flex items-center justify-center flex-shrink-0 text-sm font-bold text-gold-300 border border-plum-500">
            {(user.name || 'U')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-white truncate">{user.name || user.mobile}</p>
            <p className="text-xs text-white/40 truncate">{user.email || "No email"}</p>
          </div>
        </div>
        {roleBadge && (
          <div className={`mt-2 ml-12 text-xs font-medium px-2.5 py-0.5 rounded-pill w-fit ${roleBadge.color}`}>
            {roleBadge.label}
          </div>
        )}
      </div>

      <div className="mx-4 h-px bg-plum-700 mb-2" />

      {/* Nav items */}
      <nav className="flex-1 py-2">
        <SectionLabel title="Account" />
        <MenuItem to="/dashboard/profile" icon={FaUser} label="My Profile" />
        <MenuItem to="/dashboard/myorders" icon={FaShoppingBag} label="My Orders" />
        <MenuItem to="/dashboard/address" icon={FaMapMarkerAlt} label="My Addresses" />
        <MenuItem to="/dashboard/loyalty-card" icon={FaCrown} label="Loyalty Card" />
        <MenuItem to="/dashboard/community-perks" icon={FaTrophy} label="Community Perks" />
        <MenuItem to="/dashboard/active-campaigns" icon={FaBullhorn} label="Active Campaigns" />

        {isAdmin && (
          <>
            <SectionLabel title="Admin" />
            <MenuItem to="/dashboard/allorders" icon={FaClipboardList} label="All Orders" />
            <MenuItem to="/dashboard/users-admin" icon={FaUsers} label="User Management" />
            <MenuItem to="/dashboard/staff/dashboard" icon={FaUserTie} label="Staff Dashboard" />
            <MenuItem to="/dashboard/category" icon={FaListAlt} label="Category" />
            <MenuItem to="/dashboard/subcategory" icon={FaLayerGroup} label="Sub Category" />
            <MenuItem to="/dashboard/upload-product" icon={FaUpload} label="Upload Product" />
            <MenuItem to="/dashboard/product" icon={FaBoxOpen} label="Products" />
            <MenuItem to="/dashboard/loyalty-program-admin" icon={FaCrown} label="Loyalty Program" />
            <MenuItem to="/dashboard/admin-community-perks" icon={FaGift} label="Manage Perks" />
            <MenuItem to="/dashboard/pickup-management" icon={FaStore} label="Pickup Management" />
            <MenuItem to="/dashboard/staff/delivery" icon={FaCog} label="Delivery Management" />
          </>
        )}

        {isStaff && (
          <>
            <SectionLabel title="Staff" />
            <MenuItem to="/dashboard/staff/verify-pickup" icon={FaQrcode} label="Verify Pickup" />
            <MenuItem to="/dashboard/staff/pending-pickups" icon={FaBoxes} label="Pending Pickups" />
            <MenuItem to="/dashboard/staff/completed-verifications" icon={FaClipboardCheck} label="Verification History" />
          </>
        )}

        {isDelivery && (
          <>
            <SectionLabel title="Delivery" />
            <MenuItem to="/dashboard/delivery/dashboard" icon={FaTachometerAlt} label="Delivery Dashboard" />
            <MenuItem to="/dashboard/delivery/active" icon={FaTruck} label="Active Deliveries" />
            <MenuItem to="/dashboard/delivery/completed" icon={FaBoxOpen} label="Completed Deliveries" />
            <MenuItem to="/dashboard/delivery/history" icon={FaHistory} label="Delivery History" />
            <MenuItem to="/dashboard/delivery/map" icon={FaMapMarkedAlt} label="Map View" />
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="mx-4 h-px bg-plum-700 mb-2" />
      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-6 py-3 text-sm font-medium text-white/50 hover:text-blush-300 hover:bg-plum-800/50 transition-all duration-200 rounded-lg mx-2 mb-3"
      >
        <FaSignOutAlt size={15} />
        Log Out
      </button>
    </div>
  );
};

export default DashboardSidebar;
