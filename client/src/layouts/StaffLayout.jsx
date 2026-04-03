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
    <section className="bg-ivory dark:bg-dm-surface transition-colors duration-200 min-h-screen">
      <div className="container mx-auto p-3 sm:p-4 grid lg:grid-cols-[minmax(280px,300px),1fr] gap-0">
        <div className="hidden lg:flex flex-col bg-plum-900 border-r border-plum-800 rounded-l-xl lg:rounded-l-2xl min-h-[calc(100vh-1.5rem)] max-h-[calc(100vh-1.5rem)] sticky top-3 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-3 pb-4 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent]">
            <DashboardSidebar userRole="staff" isStaff={true} />
          </div>
        </div>

        <div className="bg-ivory dark:bg-dm-surface min-h-[75vh] py-2 sm:py-4 lg:pl-4">
          <Outlet />
        </div>
      </div>
    </section>
  );
};

export default StaffLayout;