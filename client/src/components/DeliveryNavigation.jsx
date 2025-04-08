import React from 'react';
import {
    FaBoxOpen,
    FaHistory,
    FaMapMarkedAlt,
    FaSignOutAlt,
    FaTachometerAlt,
    FaTruck,
    FaUserCircle
} from 'react-icons/fa';
import { useDispatch } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';
import { logout } from '../store/userSlice';

const DeliveryNavigation = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  
  const isActive = (path) => {
    return location.pathname === path ? 
      'bg-primary-300 text-white' : 
      'text-gray-700 hover:bg-primary-100 dark:text-gray-200 dark:hover:bg-gray-700';
  };
  
  const handleLogout = () => {
    dispatch(logout());
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 shadow-md w-full">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-3">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-primary-200 mr-8">Taji Driver</h1>
            <nav className="hidden md:flex space-x-1">
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
            <Link 
              to="/profile" 
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
        </div>
      </div>
      
      {/* Mobile menu - Only visible on small screens */}
      <div className="md:hidden border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-5 text-center">
          <Link 
            to="/delivery/dashboard" 
            className={`p-2 ${location.pathname === '/delivery/dashboard' ? 'text-primary-200' : 'text-gray-600 dark:text-gray-400'}`}
          >
            <FaTachometerAlt className="mx-auto" />
            <span className="text-xs">Dashboard</span>
          </Link>
          <Link 
            to="/delivery/active" 
            className={`p-2 ${location.pathname === '/delivery/active' ? 'text-primary-200' : 'text-gray-600 dark:text-gray-400'}`}
          >
            <FaTruck className="mx-auto" />
            <span className="text-xs">Active</span>
          </Link>
          <Link 
            to="/delivery/completed" 
            className={`p-2 ${location.pathname === '/delivery/completed' ? 'text-primary-200' : 'text-gray-600 dark:text-gray-400'}`}
          >
            <FaBoxOpen className="mx-auto" />
            <span className="text-xs">Completed</span>
          </Link>
          <Link 
            to="/delivery/history" 
            className={`p-2 ${location.pathname === '/delivery/history' ? 'text-primary-200' : 'text-gray-600 dark:text-gray-400'}`}
          >
            <FaHistory className="mx-auto" />
            <span className="text-xs">History</span>
          </Link>
          <Link 
            to="/delivery/map" 
            className={`p-2 ${location.pathname === '/delivery/map' ? 'text-primary-200' : 'text-gray-600 dark:text-gray-400'}`}
          >
            <FaMapMarkedAlt className="mx-auto" />
            <span className="text-xs">Map</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DeliveryNavigation;
