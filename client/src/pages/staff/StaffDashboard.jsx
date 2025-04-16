import React from 'react';
import { FaBoxOpen, FaChartBar, FaClock, FaCog, FaHistory, FaQrcode, FaShippingFast, FaStore, FaTruck, FaUserCog, FaUsers } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const StaffDashboard = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-gray-800 dark:text-white">Staff Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage store operations and delivery services</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Link 
            to="/dashboard/staff/delivery"
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md flex items-center transition-colors duration-200"
          >
            <FaCog className="mr-2" /> 
            Delivery Management
          </Link>
        </div>
      </div>
      
      {/* Dashboard Sections */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-6 text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2">
          Pickup Management
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link 
            to="/dashboard/staff/verify-pickup"
            className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 p-6 rounded-lg shadow-md hover:shadow-lg transition-all flex flex-col items-center text-center border border-gray-100 dark:border-gray-700"
          >
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <FaQrcode className="text-green-600 dark:text-green-400 text-2xl" />
            </div>
            <h2 className="text-lg font-medium mb-2 text-gray-800 dark:text-white">Verify Pickup</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Scan QR codes and verify customer pickup orders
            </p>
          </Link>

          <Link 
            to="/dashboard/staff/pending-pickups"
            className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 p-6 rounded-lg shadow-md hover:shadow-lg transition-all flex flex-col items-center text-center border border-gray-100 dark:border-gray-700"
          >
            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-4">
              <FaBoxOpen className="text-orange-600 dark:text-orange-400 text-2xl" />
            </div>
            <h2 className="text-lg font-medium mb-2 text-gray-800 dark:text-white">Pending Pickups</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              View and manage orders waiting for customer pickup
            </p>
          </Link>

          <Link 
            to="/dashboard/staff/completed-verifications"
            className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 p-6 rounded-lg shadow-md hover:shadow-lg transition-all flex flex-col items-center text-center border border-gray-100 dark:border-gray-700"
          >
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-4">
              <FaHistory className="text-purple-600 dark:text-purple-400 text-2xl" />
            </div>
            <h2 className="text-lg font-medium mb-2 text-gray-800 dark:text-white">Verification History</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              View history of completed pickups and verifications
            </p>
          </Link>
        </div>
      </div>
      
      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-6 text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2">
          Delivery Management
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link 
            to="/dashboard/staff/delivery/pending"
            className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 p-6 rounded-lg shadow-md hover:shadow-lg transition-all flex flex-col items-center text-center border border-gray-100 dark:border-gray-700"
          >
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
              <FaClock className="text-blue-600 dark:text-blue-400 text-2xl" />
            </div>
            <h2 className="text-lg font-medium mb-2 text-gray-800 dark:text-white">Pending Orders</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Process and dispatch orders waiting for delivery
            </p>
          </Link>

          <Link 
            to="/dashboard/staff/delivery/active"
            className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 p-6 rounded-lg shadow-md hover:shadow-lg transition-all flex flex-col items-center text-center border border-gray-100 dark:border-gray-700"
          >
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mb-4">
              <FaTruck className="text-yellow-600 dark:text-yellow-400 text-2xl" />
            </div>
            <h2 className="text-lg font-medium mb-2 text-gray-800 dark:text-white">Active Deliveries</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Track and manage deliveries currently in progress
            </p>
          </Link>

          <Link 
            to="/dashboard/staff/delivery/drivers"
            className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 p-6 rounded-lg shadow-md hover:shadow-lg transition-all flex flex-col items-center text-center border border-gray-100 dark:border-gray-700"
          >
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4">
              <FaUsers className="text-indigo-600 dark:text-indigo-400 text-2xl" />
            </div>
            <h2 className="text-lg font-medium mb-2 text-gray-800 dark:text-white">Drivers Management</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Manage delivery personnel assignments and status
            </p>
          </Link>
        </div>
      </div>
      
      <div>
        <h2 className="text-xl font-semibold mb-6 text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2">
          Quick Access
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link 
            to="/dashboard/staff/delivery/dispatched"
            className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center border border-gray-100 dark:border-gray-700"
          >
            <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center mr-3">
              <FaShippingFast className="text-teal-600 dark:text-teal-400" />
            </div>
            <span className="text-gray-800 dark:text-white font-medium">Dispatched Orders</span>
          </Link>
          
          <Link 
            to="/dashboard/staff/delivery/completed"
            className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center border border-gray-100 dark:border-gray-700"
          >
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mr-3">
              <FaStore className="text-green-600 dark:text-green-400" />
            </div>
            <span className="text-gray-800 dark:text-white font-medium">Completed Orders</span>
          </Link>
          
          <Link 
            to="/dashboard"
            className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center border border-gray-100 dark:border-gray-700"
          >
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mr-3">
              <FaChartBar className="text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-gray-800 dark:text-white font-medium">Dashboard Overview</span>
          </Link>
          
          <Link 
            to="/dashboard/users-admin"
            className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center border border-gray-100 dark:border-gray-700"
          >
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mr-3">
              <FaUserCog className="text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-gray-800 dark:text-white font-medium">Users Management</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
