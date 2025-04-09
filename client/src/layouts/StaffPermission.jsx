import React from 'react';
import { useSelector } from 'react-redux';
import isAdmin from '../utils/isAdmin';
import isStaff from '../utils/isStaff';

const StaffPermission = ({ children }) => {
  const user = useSelector(state => state.user);
  
  // Allow both staff and admin to access staff functionality
  const hasPermission = isStaff(user) || isAdmin(user.role);

  if (!hasPermission) {
    return (
      <div className='p-6'>
        <div className='text-red-600 bg-red-100 p-4 rounded-lg dark:bg-red-900/30 dark:text-red-300'>
          <h2 className="text-lg font-bold mb-2">Access Denied</h2>
          <p>You don't have permission to access this feature. Staff privileges are required.</p>
        </div>
      </div>
    );
  }

  return children;
};

export default StaffPermission;
