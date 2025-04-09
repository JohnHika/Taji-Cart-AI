import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * A wrapper component that redirects to login if user is not authenticated
 * 
 * @param {object} props 
 * @param {React.ReactNode} props.children - The component or elements to render when authenticated
 * @param {boolean} [props.requireAdmin=false] - Whether the route requires admin privileges
 * @param {boolean} [props.requireStaff=false] - Whether the route requires staff privileges
 * @returns {React.ReactNode}
 */
const PrivateRoute = ({ children, requireAdmin = false, requireStaff = false }) => {
  const user = useSelector(state => state.user);
  const location = useLocation();
  
  // Check if user is authenticated
  const isAuthenticated = user && user._id;
  
  // Check for admin status in multiple ways to be more robust
  const isAdmin = 
    user?.role === 'admin' || 
    user?.role === 'Admin' || 
    user?.isAdmin === true || 
    user?.userType === 'admin' ||
    user?.type === 'admin';
    
  // Check for staff status
  const isStaff = 
    user?.role === 'staff' || 
    user?.isStaff === true || 
    isAdmin; // Admins can do everything staff can do
  
  // Check if logged in
  if (!isAuthenticated) {
    console.log('User not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Check if admin is required but user is not admin
  if (requireAdmin && !isAdmin) {
    console.log('Admin required but user is not admin, redirecting');
    return <Navigate to="/dashboard/profile" replace />;
  }
  
  // Check if staff is required but user is not staff
  if (requireStaff && !isStaff) {
    console.log('Staff required but user is not staff, redirecting');
    return <Navigate to="/dashboard/profile" replace />;
  }

  // User is authenticated and authorized, render the protected component
  return children;
};

export default PrivateRoute;