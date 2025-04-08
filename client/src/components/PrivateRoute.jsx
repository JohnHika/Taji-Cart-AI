import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * A wrapper component that redirects to login if user is not authenticated
 * 
 * @param {object} props 
 * @param {React.ReactNode} props.children - The component or elements to render when authenticated
 * @param {boolean} [props.requireAdmin=false] - Whether the route requires admin privileges
 * @returns {React.ReactNode}
 */
const PrivateRoute = ({ children, requireAdmin = false }) => {
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
  
  // Check if user is an admin if required
  const isAuthorized = requireAdmin ? isAuthenticated && isAdmin : isAuthenticated;

  if (!isAuthenticated) {
    // Redirect to login if not authenticated, saving the current location for redirect after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  if (requireAdmin && !isAdmin) {
    // Redirect to home if admin access is required but user is not an admin
    return <Navigate to="/" replace />;
  }

  // User is authenticated and authorized, render the protected component
  return children;
};

export default PrivateRoute;