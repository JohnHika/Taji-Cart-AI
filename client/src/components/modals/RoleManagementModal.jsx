import React, { useEffect, useState } from 'react';
import { FaTimes, FaTruck, FaUser, FaUserShield } from 'react-icons/fa';

const RoleManagementModal = ({ isOpen, onClose, user, onSave }) => {
  const [role, setRole] = useState('customer');
  
  useEffect(() => {
    if (user) {
      if (user.isAdmin) {
        setRole('admin');
      } else if (user.isDelivery || user.role === 'delivery') {
        setRole('driver');
      } else if (user.isStaff || user.role === 'staff') {
        setRole('staff');
      } else {
        setRole('customer');
      }
    }
  }, [user]);
  
  if (!isOpen || !user) return null;
  
  const handleSubmit = (e) => {
    e.preventDefault();
    const isAdmin = role === 'admin';
    const isDelivery = role === 'driver';
    const isStaff = role === 'staff';
    onSave(user._id, isAdmin, isDelivery, isStaff);
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md mx-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            Manage User Role
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
          >
            <FaTimes size={18} />
          </button>
        </div>
        
        <div className="mb-4">
          <p className="text-gray-600 dark:text-gray-300">
            User: <span className="font-medium">{user?.name || 'Unknown'}</span>
          </p>
          <p className="text-gray-600 dark:text-gray-300">
            Email: <span className="font-medium">{user?.email || 'Unknown'}</span>
          </p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">Select Role:</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700">
                <input
                  type="radio"
                  name="role"
                  value="customer"
                  checked={role === 'customer'}
                  onChange={() => setRole('customer')}
                  className="h-5 w-5 text-blue-600"
                />
                <span className="flex items-center">
                  <FaUser className="mr-2 text-gray-500 dark:text-gray-400" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">Customer</span>
                </span>
              </label>
              
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700">
                <input
                  type="radio"
                  name="role"
                  value="staff"
                  checked={role === 'staff'}
                  onChange={() => setRole('staff')}
                  className="h-5 w-5 text-blue-600"
                />
                <span className="flex items-center">
                  <FaUser className="mr-2 text-gray-500 dark:text-gray-400" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">Staff</span>
                </span>
              </label>
              
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700">
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  checked={role === 'admin'}
                  onChange={() => setRole('admin')}
                  className="h-5 w-5 text-blue-600"
                />
                <span className="flex items-center">
                  <FaUserShield className="mr-2 text-purple-500" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">Admin</span>
                </span>
              </label>
              
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700">
                <input
                  type="radio"
                  name="role"
                  value="driver"
                  checked={role === 'driver'}
                  onChange={() => setRole('driver')}
                  className="h-5 w-5 text-blue-600"
                />
                <span className="flex items-center">
                  <FaTruck className="mr-2 text-blue-500" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">Driver</span>
                </span>
              </label>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoleManagementModal;