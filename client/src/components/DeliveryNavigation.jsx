import React, { useState } from 'react';
import toast from 'react-hot-toast';
import {
    FaBars,
    FaBoxOpen,
    FaHistory,
    FaMapMarkedAlt,
    FaSignOutAlt,
    FaTachometerAlt,
    FaTruck,
    FaUserCircle
} from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logoLight from '../assets/Taji_Cart_Ai.png';
import logoDark from '../assets/Taji_Cart_Ai_Light.png';
import SummaryApi from '../common/SummaryApi';
import { useTheme } from '../context/ThemeContext';
import { logout } from '../store/userSlice';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';

const DeliveryNavigation = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(state => state.user);
  const { darkMode } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Use the appropriate logo based on theme
  const currentLogo = darkMode ? logoLight : logoDark;
  
  const isActive = (path) => {
    return location.pathname === path ? 
      'bg-primary-300 text-white' : 
      'text-gray-700 hover:bg-primary-100 dark:text-gray-200 dark:hover:bg-gray-700';
  };
  
  const handleLogout = async () => {
    try {
      const response = await Axios({
        ...SummaryApi.logout
      });
      
      if(response.data.success) {
        dispatch(logout());
        localStorage.clear();
        sessionStorage.clear();
        toast.success(response.data.message);
        navigate("/");
      }
    } catch (error) {
      console.error("Logout error:", error);
      AxiosToastError(error);
    }
  };
  
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 shadow-md w-full sticky top-0 z-30">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-3">
          <div className="flex items-center">
            <Link to="/delivery/dashboard" className="flex items-center">
              <img 
                src={currentLogo} 
                alt="Taji Cart Logo" 
                className="h-auto w-auto max-h-12 object-contain" 
                style={{ maxWidth: '120px' }}
              />
              <span className="ml-2 text-xl font-bold text-primary-200 hidden md:block">Driver Portal</span>
            </Link>
            
            <nav className="hidden md:flex ml-8 space-x-1">
              <Link 
                to="/delivery/dashboard" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/delivery/dashboard')}`}
              >
                <FaTachometerAlt className="inline mr-2" /> Dashboard
              </Link>
              <Link 
                to="/delivery/active" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/delivery/active')}`}
              >
                <FaTruck className="inline mr-2" /> Active Deliveries
              </Link>
              <Link 
                to="/delivery/completed" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/delivery/completed')}`}
              >
                <FaBoxOpen className="inline mr-2" /> Completed
              </Link>
              <Link 
                to="/delivery/history" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/delivery/history')}`}
              >
                <FaHistory className="inline mr-2" /> History
              </Link>
              <Link 
                to="/delivery/map" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/delivery/map')}`}
              >
                <FaMapMarkedAlt className="inline mr-2" /> Map View
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* User info */}
            <span className="hidden md:block text-sm text-gray-700 dark:text-gray-300">
              {user.name}
            </span>
            
            {/* Desktop menu */}
            <div className="hidden md:flex items-center space-x-4">
              <Link 
                to="/dashboard/profile" 
                className="text-gray-700 hover:text-primary-200 dark:text-gray-200 dark:hover:text-primary-300"
              >
                <FaUserCircle size={20} />
              </Link>
              <button 
                onClick={handleLogout}
                className="text-gray-700 hover:text-red-500 dark:text-gray-200 dark:hover:text-red-400"
              >
                <FaSignOutAlt size={20} />
              </button>
            </div>
            
            {/* Mobile menu button */}
            <button 
              className="md:hidden text-gray-700 dark:text-gray-200 focus:outline-none" 
              onClick={toggleMobileMenu}
            >
              <FaBars size={24} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu - Only visible on small screens when toggled */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col space-y-3">
            <Link 
              to="/delivery/dashboard" 
              className={`p-2 ${isActive('/delivery/dashboard')} rounded flex items-center`}
              onClick={toggleMobileMenu}
            >
              <FaTachometerAlt className="mr-2" />
              <span>Dashboard</span>
            </Link>
            <Link 
              to="/delivery/active" 
              className={`p-2 ${isActive('/delivery/active')} rounded flex items-center`}
              onClick={toggleMobileMenu}
            >
              <FaTruck className="mr-2" />
              <span>Active Deliveries</span>
            </Link>
            <Link 
              to="/delivery/completed" 
              className={`p-2 ${isActive('/delivery/completed')} rounded flex items-center`}
              onClick={toggleMobileMenu}
            >
              <FaBoxOpen className="mr-2" />
              <span>Completed</span>
            </Link>
            <Link 
              to="/delivery/history" 
              className={`p-2 ${isActive('/delivery/history')} rounded flex items-center`}
              onClick={toggleMobileMenu}
            >
              <FaHistory className="mr-2" />
              <span>History</span>
            </Link>
            <Link 
              to="/delivery/map" 
              className={`p-2 ${isActive('/delivery/map')} rounded flex items-center`}
              onClick={toggleMobileMenu}
            >
              <FaMapMarkedAlt className="mr-2" />
              <span>Map View</span>
            </Link>
            
            <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
              <Link
                to="/dashboard/profile"
                className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center"
                onClick={toggleMobileMenu}
              >
                <FaUserCircle className="mr-2" />
                <span>My Profile</span>
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  toggleMobileMenu();
                }}
                className="w-full p-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center"
              >
                <FaSignOutAlt className="mr-2" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryNavigation;
