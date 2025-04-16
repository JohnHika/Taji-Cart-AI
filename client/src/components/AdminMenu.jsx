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
import Divider from './Divider';

const AdminMenu = ({ close }) => {
  const user = useSelector(state => state.user);
  const location = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const isActive = (path) => {
    return location.pathname.includes(path) ? 'bg-orange-200 dark:bg-orange-900/30' : '';
  };

  const handleLogout = async() => {
    try {
      const response = await Axios({
         ...SummaryApi.logout
      });
      console.log("logout", response);
      if(response.data.success){
        if(close){
          close();
        }
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

  const handleClose = () => {
    if(close){
      close();
    }
  };

  return (
    <div className="dark:bg-gray-800 dark:text-gray-200">
      <div className="font-semibold dark:text-white text-lg mb-2">Admin Dashboard</div>
      <div className="text-sm flex items-center gap-2 mb-2">
        <span className="max-w-52 text-ellipsis line-clamp-1">
          {user.name || user.mobile}{" "}
          <span className="text-medium text-red-600 dark:text-red-400">
            (admin)
          </span>
        </span>
        <Link
          onClick={handleClose}
          to={"/dashboard/profile"}
          className="hover:text-primary-200 dark:hover:text-primary-300"
        >
          <HiOutlineExternalLink size={15} />
        </Link>
      </div>
      
      <Divider className="dark:border-gray-700" />
      
      <div className="text-sm grid gap-1 mt-2">
        {/* Admin Dashboard Overview */}
        <div className="mt-1 mb-1 text-xs uppercase text-gray-500 dark:text-gray-400 font-medium px-2">Dashboard</div>
        <Link
          onClick={handleClose}
          to="/dashboard"
          className={`px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1.5 flex items-center ${isActive('/dashboard')}`}
        >
          <FaTachometerAlt className="mr-2 text-blue-500" /> Dashboard Overview
        </Link>
        
        <Link
          onClick={handleClose}
          to="/dashboard/profile"
          className={`px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1.5 flex items-center ${isActive('/dashboard/profile')}`}
        >
          <FaUser className="mr-2 text-blue-400" /> My Profile
        </Link>
        
        {/* User Management Section */}
        <div className="mt-3 mb-1 text-xs uppercase text-gray-500 dark:text-gray-400 font-medium px-2">User Management</div>
        <Link
          onClick={handleClose}
          to="/dashboard/users-admin"
          className={`px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1.5 flex items-center ${isActive('/dashboard/users-admin')}`}
        >
          <FaUsers className="mr-2 text-blue-600" /> User Management
        </Link>
        
        {/* Staff Management - New section */}
        <Link
          onClick={handleClose}
          to="/dashboard/staff/dashboard"
          className={`px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1.5 flex items-center ${isActive('/dashboard/staff/dashboard')}`}
        >
          <FaUserTie className="mr-2 text-green-600" /> Staff Dashboard
        </Link>
        
        {/* Products & Categories Section */}
        <div className="mt-3 mb-1 text-xs uppercase text-gray-500 dark:text-gray-400 font-medium px-2">Products & Categories</div>
        <Link
          onClick={handleClose}
          to="/dashboard/category"
          className={`px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1.5 flex items-center ${isActive('/dashboard/category')}`}
        >
          <FaListAlt className="mr-2 text-blue-500" /> Category
        </Link>
        
        <Link
          onClick={handleClose}
          to="/dashboard/subcategory"
          className={`px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1.5 flex items-center ${isActive('/dashboard/subcategory')}`}
        >
          <FaLayerGroup className="mr-2 text-green-500" /> Sub Category
        </Link>
        
        <Link
          onClick={handleClose}
          to="/dashboard/upload-product"
          className={`px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1.5 flex items-center ${isActive('/dashboard/upload-product')}`}
        >
          <FaUpload className="mr-2 text-purple-500" /> Upload Product
        </Link>
        
        <Link
          onClick={handleClose}
          to="/dashboard/product"
          className={`px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1.5 flex items-center ${isActive('/dashboard/product')}`}
        >
          <FaBoxOpen className="mr-2 text-yellow-500" /> Product
        </Link>
        
        {/* Marketing & Community Section */}
        <div className="mt-3 mb-1 text-xs uppercase text-gray-500 dark:text-gray-400 font-medium px-2">Marketing & Community</div>
        <Link
          onClick={handleClose}
          to="/dashboard/loyalty-program-admin"
          className={`px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1.5 flex items-center ${isActive('/dashboard/loyalty-program-admin')}`}
        >
          <FaCrown className="mr-2 text-purple-500" /> Loyalty Program
        </Link>
        
        <Link
          onClick={handleClose}
          to="/dashboard/admin-community-perks"
          className={`px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1.5 flex items-center ${isActive('/dashboard/admin-community-perks')}`}
        >
          <FaGift className="mr-2 text-orange-500" /> Manage Community Perks
        </Link>
        
        <Link
          onClick={handleClose}
          to="/dashboard/community-perks"
          className={`px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1.5 flex items-center ${isActive('/dashboard/community-perks')}`}
        >
          <FaTrophy className="mr-2 text-amber-500" /> Community Perks
        </Link>
        
        <Link
          onClick={handleClose}
          to="/dashboard/active-campaigns"
          className={`px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1.5 flex items-center ${isActive('/dashboard/active-campaigns')}`}
        >
          <FaBullhorn className="mr-2 text-green-500" /> Active Campaigns
        </Link>
        
        {/* Orders & Delivery Section */}
        <div className="mt-3 mb-1 text-xs uppercase text-gray-500 dark:text-gray-400 font-medium px-2">Orders & Delivery</div>
        <Link
          onClick={handleClose}
          to="/dashboard/allorders"
          className={`px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1.5 flex items-center ${isActive('/dashboard/allorders')}`}
        >
          <FaClipboardList className="mr-2 text-teal-500" /> All Orders
        </Link>

        <Link
          onClick={handleClose}
          to="/dashboard/myorders"
          className={`px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1.5 flex items-center ${isActive('/dashboard/myorders')}`}
        >
          <FaShoppingBag className="mr-2 text-indigo-500" /> My Orders
        </Link>
        
        <Link
          onClick={handleClose}
          to="/dashboard/address"
          className={`px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1.5 flex items-center ${isActive('/dashboard/address')}`}
        >
          <FaMapMarkerAlt className="mr-2 text-red-500" /> Save Address
        </Link>
        
        {/* Staff Functions Section */}
        <div className="mt-3 mb-1 text-xs uppercase text-gray-500 dark:text-gray-400 font-medium px-2">Staff Functions</div>
        <Link
          onClick={handleClose}
          to="/dashboard/staff/pending-pickups"
          className={`px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1.5 flex items-center ${isActive('/dashboard/staff/pending-pickups')}`}
        >
          <FaStore className="mr-2 text-cyan-500" /> Pending Pickups
        </Link>
        
        <Link
          onClick={handleClose}
          to="/dashboard/staff/verify-pickup"
          className={`px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1.5 flex items-center ${isActive('/dashboard/staff/verify-pickup')}`}
        >
          <FaCheck className="mr-2 text-green-600" /> Verify Pickup
        </Link>
        
        <Link
          onClick={handleClose}
          to="/dashboard/staff/completed-verifications"
          className={`px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1.5 flex items-center ${isActive('/dashboard/staff/completed-verifications')}`}
        >
          <FaHistory className="mr-2 text-purple-600" /> Verification History
        </Link>
        
        {/* Delivery Management Section - New */}
        <Link
          onClick={handleClose}
          to="/dashboard/staff/delivery"
          className={`px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1.5 flex items-center ${isActive('/dashboard/staff/delivery')}`}
        >
          <FaCog className="mr-2 text-blue-600" /> Delivery Management
        </Link>
        
        <Divider className="my-3 dark:border-gray-700" />
        
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="text-left px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1.5 flex items-center"
        >
          <FaSignOutAlt className="mr-2 text-gray-500" /> Log Out
        </button>
      </div>
    </div>
  );
};

export default AdminMenu;