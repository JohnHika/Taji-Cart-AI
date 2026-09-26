import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
    FaBars,
    FaBoxOpen,
    FaHistory,
    FaMapMarkedAlt,
    FaPowerOff,
    FaSignOutAlt,
    FaTachometerAlt,
    FaTruck,
    FaUserCircle
} from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import SummaryApi from '../common/SummaryApi';
import { nawiriBrand } from '../config/brand';
import { useTheme } from '../context/ThemeContext';
import { logout } from '../store/userSlice';
import Axios, { stopSessionTimers } from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import { clearAuthStorage } from '../utils/authStorage';

const DeliveryNavigation = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(state => state.user);
  const { darkMode } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [presenceLoaded, setPresenceLoaded] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [presenceUpdating, setPresenceUpdating] = useState(false);

  const isActive = (path) => {
    return location.pathname === path ?
      'bg-primary-300 text-white' :
      'text-charcoal hover:bg-primary-100 dark:text-white/70 dark:hover:bg-dm-card-2';
  };

  useEffect(() => {
    let cancelled = false;

    const fetchPresence = async () => {
      try {
        const response = await Axios({ url: '/api/delivery/stats', method: 'GET' });
        if (!cancelled && response.data.success) {
          setIsOnline(response.data.data?.isOnline === true);
        }
      } catch (error) {
        console.error('Error fetching driver presence:', error);
      } finally {
        if (!cancelled) setPresenceLoaded(true);
      }
    };

    fetchPresence();

    return () => { cancelled = true; };
  }, []);

  const handleTogglePresence = async () => {
    if (presenceUpdating) return;
    const nextOnline = !isOnline;
    setPresenceUpdating(true);

    try {
      const response = await Axios({
        url: '/api/delivery/presence',
        method: 'POST',
        data: { isOnline: nextOnline }
      });

      if (response.data?.success && typeof response.data?.data?.isOnline === 'boolean') {
        const nextPresenceState = response.data.data.isOnline;
        setIsOnline(nextPresenceState);
        toast.success(
          nextPresenceState
            ? "You're online — new orders can now be assigned to you"
            : "You're offline — you won't receive new orders"
        );
      } else {
        toast.error(response.data?.message || 'Failed to update your status');
      }
    } catch (error) {
      AxiosToastError(error);
    } finally {
      setPresenceUpdating(false);
    }
  };

  const handleLogout = async () => {
    // Local state must clear even if the server call fails (offline, a 5xx,
    // or an already-expired access token) — the old `if (success)` guard
    // left a driver looking "logged in" locally with a dead session.
    try {
      // Go offline first so staff don't keep seeing a signed-out rider as
      // available for assignment. Best effort — logout proceeds regardless.
      if (isOnline) {
        await Axios({ url: '/api/delivery/presence', method: 'POST', data: { isOnline: false } }).catch(() => {});
      }
      const response = await Axios({
        ...SummaryApi.logout
      });
      toast.success(response.data.message || 'Logged out successfully');
    } catch (error) {
      console.error("Logout error:", error);
      AxiosToastError(error);
    } finally {
      dispatch(logout());
      stopSessionTimers();
      clearAuthStorage();
      navigate("/");
    }
  };
  
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  return (
    <div className="bg-white dark:bg-dm-card shadow-md w-full sticky top-0 z-30">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-3">
          <div className="flex items-center">
            <Link to="/delivery/dashboard" className="flex items-center">
              <img 
                src={nawiriBrand.logo} 
                alt="Nawiri Hair Logo" 
                className={`h-auto w-auto max-h-12 rounded-xl object-contain ${darkMode ? 'bg-white p-1.5' : ''}`} 
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
          
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Online/offline presence toggle — visible on every driver page since
                this is the switch that makes a driver eligible for dispatch assignment. */}
            <button
              type="button"
              onClick={handleTogglePresence}
              disabled={!presenceLoaded || presenceUpdating}
              aria-pressed={isOnline}
              aria-label={isOnline ? 'Go offline and stop receiving orders' : 'Go online to receive orders'}
              title={isOnline ? 'Go offline' : 'Go online to receive orders'}
              className={`customer-touch-target min-h-[44px] min-w-[44px] gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:px-3 sm:text-sm ${
                isOnline
                  ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-900/60'
                  : 'bg-brown-100 text-brown-500 hover:bg-brown-200 dark:bg-dm-card-2 dark:text-white/50 dark:hover:bg-dm-border'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-brown-400 dark:bg-white/30'}`} />
              <FaPowerOff size={11} className="hidden xs:inline" />
              <span>{presenceUpdating ? 'Updating…' : isOnline ? 'Online' : 'Go online'}</span>
            </button>

            {/* User info */}
            <span className="hidden md:block text-sm text-charcoal dark:text-white/55">
              {user.name}
            </span>

            {/* Desktop menu */}
            <div className="hidden md:flex items-center space-x-4">
              <Link
                to="/dashboard/profile"
                className="text-charcoal hover:text-primary-200 dark:text-white/70 dark:hover:text-primary-300"
                title="Profile"
              >
                <FaUserCircle size={20} />
              </Link>
              <button
                onClick={handleLogout}
                className="text-charcoal hover:text-red-500 dark:text-white/70 dark:hover:text-red-400"
              >
                <FaSignOutAlt size={20} />
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden text-charcoal dark:text-white/70 focus:outline-none"
              onClick={toggleMobileMenu}
            >
              <FaBars size={24} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu - Only visible on small screens when toggled */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-brown-100 dark:border-dm-border p-4">
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
            
            <div className="border-t border-brown-100 dark:border-dm-border pt-2 mt-2">
              <Link
                to="/dashboard/profile"
                className="p-2 text-charcoal dark:text-white/55 hover:bg-brown-50 dark:hover:bg-dm-card-2 rounded flex items-center"
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
                className="w-full p-2 text-left text-charcoal dark:text-white/55 hover:bg-brown-50 dark:hover:bg-dm-card-2 rounded flex items-center"
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
