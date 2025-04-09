import React from 'react';
import toast from 'react-hot-toast';
import {
    FaBoxOpen,
    FaHistory,
    FaMapMarkedAlt,
    FaSignOutAlt,
    FaTachometerAlt,
    FaTruck,
    FaUser
} from 'react-icons/fa';
import { HiOutlineExternalLink } from "react-icons/hi";
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import SummaryApi from '../common/SummaryApi';
import { logout } from '../store/userSlice';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import Divider from './Divider';

const DeliveryMenu = ({ close }) => {
  const user = useSelector(state => state.user);
  const location = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  if (user.role === 'staff') {
    return null; // Prevent staff from accessing delivery menus
  }

  const isActive = (path) => {
    return location.pathname.includes(path) ? 'bg-orange-200 dark:bg-orange-900/30' : '';
  };

  const handleLogout = async() => {
    try {
      const response = await Axios({
         ...SummaryApi.logout
      });
      if(response.data.success){
        if(close){
          close();
        }
        dispatch(logout());
        localStorage.clear();
        sessionStorage.clear();
        toast.success(response.data.message);
        navigate("/");
      }
    } catch (error) {
      console.error(error);
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
      <div className="font-semibold dark:text-white">Delivery Dashboard</div>
      <div className="text-sm flex items-center gap-2">
        <span className="max-w-52 text-ellipsis line-clamp-1">
          {user.name || user.mobile}{" "}
          <span className="text-medium text-blue-600 dark:text-blue-400">
            (delivery)
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
      
      <Divider />
      
      <div className="text-sm grid gap-1">
        <Link
          onClick={handleClose}
          to="/dashboard/profile"
          className={`px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1 flex items-center ${isActive('/dashboard/profile')}`}
        >
          <FaUser className="mr-2 text-blue-400" /> My Profile
        </Link>
        
        <Link
          onClick={handleClose}
          to="/delivery/dashboard"
          className={`px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1 flex items-center ${isActive('/delivery/dashboard')}`}
        >
          <FaTachometerAlt className="mr-2 text-green-500" /> Delivery Dashboard
        </Link>
        
        <Link
          onClick={handleClose}
          to="/delivery/active"
          className={`px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1 flex items-center ${isActive('/delivery/active')}`}
        >
          <FaTruck className="mr-2 text-yellow-500" /> Active Deliveries
        </Link>
        
        <Link
          onClick={handleClose}
          to="/delivery/completed"
          className={`px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1 flex items-center ${isActive('/delivery/completed')}`}
        >
          <FaBoxOpen className="mr-2 text-indigo-500" /> Completed Deliveries
        </Link>
        
        <Link
          onClick={handleClose}
          to="/delivery/history"
          className={`px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1 flex items-center ${isActive('/delivery/history')}`}
        >
          <FaHistory className="mr-2 text-amber-500" /> Delivery History
        </Link>
        
        <Link
          onClick={handleClose}
          to="/delivery/map"
          className={`px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1 flex items-center ${isActive('/delivery/map')}`}
        >
          <FaMapMarkedAlt className="mr-2 text-red-500" /> Map View
        </Link>
        
        <button
          onClick={handleLogout}
          className="text-left px-2 hover:bg-orange-200 dark:hover:bg-orange-900/30 dark:hover:text-white py-1 flex items-center"
        >
          <FaSignOutAlt className="mr-2 text-gray-500" /> Log Out
        </button>
      </div>
    </div>
  );
};

export default DeliveryMenu;
