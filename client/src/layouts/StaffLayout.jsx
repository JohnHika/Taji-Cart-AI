import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';
import DashboardSidebar from '../components/DashboardSidebar';
import isStaff from '../utils/isStaff';

const StaffLayout = () => {
  const user = useSelector(state => state.user);
  
  // Check if user is logged in and has staff role
  const isAuthenticated = user.isAuthenticated;
  const isUserStaff = isStaff(user);
  
  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Redirect to dashboard if not staff
  if (!isUserStaff) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return (
    <section className='bg-white dark:bg-gray-900 transition-colors duration-200'>
      <div className='container mx-auto p-3 grid lg:grid-cols-[250px,1fr]'>
        {/* Left sidebar for menu */}
        <div className='py-4 sticky top-24 max-h-[calc(100vh-96px)] overflow-y-auto hidden lg:block border-r dark:border-gray-700'>
          <DashboardSidebar userRole="staff" isStaff={true} />
        </div>

        {/* Right content area */}
        <div className='bg-white dark:bg-gray-900 min-h-[75vh]'>
          <Outlet />
        </div>
      </div>
    </section>
  );
};

export default StaffLayout;