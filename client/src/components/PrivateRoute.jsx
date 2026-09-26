import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import CriteriaGateModal from './CriteriaGateModal';
import { evaluateCriteria, getRouteGateTaskKey } from '../utils/criteriaGates';
import fetchUserDetails from '../utils/fetchUserDetails';

/**
 * A wrapper component that redirects to login if user is not authenticated
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - The component or elements to render when authenticated
 * @param {boolean} [props.requireAdmin=false] - Whether the route requires admin privileges
 * @param {boolean} [props.requireStaff=false] - Whether the route requires staff privileges
 * @param {boolean} [props.requireDelivery=false] - Whether the route requires delivery privileges
 * @returns {React.ReactNode}
 */
const PrivateRoute = ({ children, requireAdmin = false, requireStaff = false, requireDelivery = false }) => {
  const user = useSelector(state => state.user);
  const location = useLocation();

  // Check if user is authenticated
  const isAuthenticated = user && user._id;

  // App.jsx's session-restore attempt (see userSlice.js): 'loading' while it
  // runs, 'ready'/'none' once it resolves either way. Waiting on this instead
  // of a fixed timeout means a slow-but-successful restore is never mistaken
  // for "not logged in" and bounced to /login, while a genuinely resolved
  // "no session" still redirects immediately rather than spinning forever.
  const sessionStatus = user?.sessionStatus;
  const isSessionResolved = sessionStatus === 'ready' || sessionStatus === 'none';

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

  const isDelivery =
    user?.role === 'delivery' ||
    user?.isDelivery === true;

  // Check if logged in
  if (!isAuthenticated) {
    if (!isSessionResolved) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center text-sm text-brown-400 dark:text-white/40">
          Restoring your session...
        </div>
      );
    }
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

  // Check if delivery role is required but user is not a delivery driver
  if (requireDelivery && !isDelivery) {
    console.log('Delivery role required but user is not delivery, redirecting');
    if (isStaff) {
      return <Navigate to="/dashboard/staff/delivery" replace />;
    }
    return <Navigate to="/dashboard/profile" replace />;
  }

  const routeGateTaskKey = getRouteGateTaskKey({ requireAdmin, requireStaff, requireDelivery });
  const routeGateEvaluation = routeGateTaskKey ? evaluateCriteria(user, routeGateTaskKey) : null;

  if (routeGateEvaluation && !routeGateEvaluation.allowed) {
    return (
      <>
        <div className="min-h-[50vh] flex flex-col items-center justify-center px-4 py-10 text-center">
          <h2 className="text-xl font-semibold text-charcoal dark:text-white">A few details still need attention</h2>
          <p className="mt-2 max-w-lg text-sm text-brown-500 dark:text-white/50">
            Complete the required account details to continue to this workspace.
          </p>
        </div>
        <CriteriaGateModal
          isOpen
          evaluation={routeGateEvaluation}
          onClose={() => {}}
          onRefreshUser={fetchUserDetails}
          blocking
        />
      </>
    );
  }

  // User is authenticated and authorized, render the protected component
  return children;
};

export default PrivateRoute;
