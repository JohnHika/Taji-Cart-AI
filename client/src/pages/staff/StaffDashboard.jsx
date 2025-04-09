import React from 'react';
import { FaBoxOpen, FaHistory, FaQrcode } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const StaffDashboard = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">Staff Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link 
          to="/dashboard/staff/verify-pickup"
          className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 p-6 rounded-lg shadow flex flex-col items-center text-center transition-colors"
        >
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-3">
            <FaQrcode className="text-green-600 dark:text-green-400 text-2xl" />
          </div>
          <h2 className="text-lg font-medium mb-2 dark:text-white">Verify Pickup</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Verify customer pickup codes and complete order pickups
          </p>
        </Link>

        <Link 
          to="/dashboard/staff/pending-pickups"
          className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 p-6 rounded-lg shadow flex flex-col items-center text-center transition-colors"
        >
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-3">
            <FaBoxOpen className="text-blue-600 dark:text-blue-400 text-2xl" />
          </div>
          <h2 className="text-lg font-medium mb-2 dark:text-white">Pending Pickups</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            View and manage orders waiting for customer pickup
          </p>
        </Link>

        <Link 
          to="/dashboard/staff/completed-verifications"
          className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 p-6 rounded-lg shadow flex flex-col items-center text-center transition-colors"
        >
          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-3">
            <FaHistory className="text-purple-600 dark:text-purple-400 text-2xl" />
          </div>
          <h2 className="text-lg font-medium mb-2 dark:text-white">Verification History</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            View history of completed pickups and verifications
          </p>
        </Link>
      </div>
    </div>
  );
};

export default StaffDashboard;
