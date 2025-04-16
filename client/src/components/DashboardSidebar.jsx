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
import Divider from './Divider';

const DashboardSidebar = ({ userRole, isStaff }) => {
  const user = useSelector(state => state.user);
  const location = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const isAdmin = userRole === 'admin';
  const isDelivery = userRole === 'delivery';
  
  const isActive = (path) => {
    return location.pathname === path || location.pathname.includes(path) 
      ? 'bg-orange-200 dark:bg-orange-900/30 font-medium' 
      : '';
  };
  
  const handleLogout = async() => {
    try {
      const response = await Axios({
         ...SummaryApi.logout
      });
      
      if(response.data.success){
        dispatch(logout());
        localStorage.clear();
        toast.success(response.data.message);
        navigate("/");
      }
    } catch (error) {
      console.log(error);
      AxiosToastError(error);
    }
  };
  
  // Menu Item Component
  const MenuItem = ({ to, icon: Icon, label, color = "text-blue-500" }) => (
    <Link
      to={to}
      className={`px-3 py-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white flex items-center rounded mb-1 ${isActive(to)}`}
    >
      <Icon className={`mr-2 ${color}`} size={18} /> {label}
    </Link>
  );

  // Section Label Component
  const SectionLabel = ({ title }) => (
    <div className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400 px-3 py-1 mt-4 mb-1">
      {title}
    </div>
  );

  return (
    <div className="dashboard-sidebar dark:text-gray-200">
      {/* User info at the top */}
      <div className="px-3 py-2 mb-4">
        <div className="font-medium text-gray-800 dark:text-white">{user.name || user.mobile}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{user.email || "No email provided"}</div>
        {isAdmin && <div className="text-xs font-medium text-red-600 dark:text-red-400 mt-1">Administrator</div>}
        {isDelivery && <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-1">Delivery Personnel</div>}
        {isStaff && <div className="text-xs font-medium text-green-600 dark:text-green-400 mt-1">Staff Member</div>}
      </div>
      
      <Divider className="mb-4 dark:border-gray-700" />

      {/* Main menu items - no sub-sections, just a flat list */}
      <div className="space-y-0.5">
        <MenuItem 
          to="/dashboard/profile" 
          icon={FaUser} 
          label="My Profile" 
        />
        
        <MenuItem 
          to="/dashboard/myorders" 
          icon={FaShoppingBag} 
          label="My Orders" 
          color="text-indigo-500"
        />
        
        <MenuItem 
          to="/dashboard/address" 
          icon={FaMapMarkerAlt} 
          label="My Addresses" 
          color="text-red-500"
        />
        
        <MenuItem 
          to="/dashboard/loyalty-card" 
          icon={FaCrown} 
          label="Loyalty Card" 
          color="text-purple-500"
        />
        
        <MenuItem 
          to="/dashboard/community-perks" 
          icon={FaTrophy} 
          label="Community Perks" 
          color="text-amber-500"
        />
        
        <MenuItem 
          to="/dashboard/active-campaigns" 
          icon={FaBullhorn} 
          label="Active Campaigns" 
          color="text-green-500"
        />
        
        {/* Admin menu items */}
        {isAdmin && (
          <>
            <Divider className="my-2 dark:border-gray-700" />
            <SectionLabel title="Admin" />
            
            <MenuItem 
              to="/dashboard/allorders" 
              icon={FaClipboardList} 
              label="All Orders" 
              color="text-teal-500"
            />
            
            <MenuItem 
              to="/dashboard/users-admin" 
              icon={FaUsers} 
              label="User Management" 
              color="text-blue-600"
            />
            
            <MenuItem 
              to="/dashboard/staff/dashboard" 
              icon={FaUserTie} 
              label="Staff Dashboard" 
              color="text-green-600"
            />
            
            <MenuItem 
              to="/dashboard/category" 
              icon={FaListAlt} 
              label="Category" 
              color="text-blue-500"
            />
            
            <MenuItem 
              to="/dashboard/subcategory" 
              icon={FaLayerGroup} 
              label="Sub Category" 
              color="text-green-500"
            />
            
            <MenuItem 
              to="/dashboard/upload-product" 
              icon={FaUpload} 
              label="Upload Product" 
              color="text-purple-500"
            />
            
            <MenuItem 
              to="/dashboard/product" 
              icon={FaBoxOpen} 
              label="Products" 
              color="text-yellow-500"
            />
            
            <MenuItem 
              to="/dashboard/loyalty-program-admin" 
              icon={FaCrown} 
              label="Loyalty Program" 
              color="text-purple-500"
            />
            
            <MenuItem 
              to="/dashboard/admin-community-perks" 
              icon={FaGift} 
              label="Manage Perks" 
              color="text-orange-500"
            />
            
            <MenuItem 
              to="/dashboard/pickup-management" 
              icon={FaStore} 
              label="Pickup Management" 
              color="text-cyan-500"
            />
            
            <MenuItem 
              to="/dashboard/staff/delivery" 
              icon={FaCog} 
              label="Delivery Management" 
              color="text-blue-600"
            />
          </>
        )}
        
        {/* Staff menu items */}
        {isStaff && (
          <>
            <Divider className="my-2 dark:border-gray-700" />
            <SectionLabel title="Staff" />
            
            <MenuItem 
              to="/dashboard/staff/verify-pickup" 
              icon={FaQrcode} 
              label="Verify Pickup" 
              color="text-green-500"
            />
            
            <MenuItem 
              to="/dashboard/staff/pending-pickups" 
              icon={FaBoxes} 
              label="Pending Pickups" 
              color="text-orange-500"
            />
            
            <MenuItem 
              to="/dashboard/staff/completed-verifications" 
              icon={FaClipboardCheck} 
              label="Verification History" 
              color="text-blue-500"
            />
          </>
        )}
        
        {/* Delivery menu items */}
        {isDelivery && (
          <>
            <Divider className="my-2 dark:border-gray-700" />
            <SectionLabel title="Delivery" />
            
            <MenuItem 
              to="/dashboard/delivery/dashboard" 
              icon={FaTachometerAlt} 
              label="Delivery Dashboard" 
              color="text-green-500"
            />
            
            <MenuItem 
              to="/dashboard/delivery/active" 
              icon={FaTruck} 
              label="Active Deliveries" 
              color="text-yellow-500"
            />
            
            <MenuItem 
              to="/dashboard/delivery/completed" 
              icon={FaBoxOpen} 
              label="Completed Deliveries" 
              color="text-indigo-500"
            />
            
            <MenuItem 
              to="/dashboard/delivery/history" 
              icon={FaHistory} 
              label="Delivery History" 
              color="text-amber-500"
            />
            
            <MenuItem 
              to="/dashboard/delivery/map" 
              icon={FaMapMarkedAlt} 
              label="Map View" 
              color="text-red-500"
            />
          </>
        )}
      </div>
      
      <Divider className="my-4 dark:border-gray-700" />
      
      {/* Logout button at the bottom */}
      <button
        onClick={handleLogout}
        className="w-full text-left px-3 py-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white flex items-center rounded"
      >
        <FaSignOutAlt className="mr-2 text-gray-500" /> Log Out
      </button>
    </div>
  );
};

export default DashboardSidebar;