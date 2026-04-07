import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AdminDashboard from './AdminDashboard';
import StaffDashboard from './staff/Dashboard';
import isadmin from '../utils/isAdmin';
import isStaff from '../utils/isStaff';

const DashboardHome = () => {
  const user = useSelector((state) => state.user);

  if (isadmin(user)) {
    return <AdminDashboard />;
  }

  if (user?.isDelivery || user?.role === 'delivery') {
    return <Navigate to="/dashboard/delivery/dashboard" replace />;
  }

  if (isStaff(user)) {
    return <StaffDashboard />;
  }

  return <Navigate to="/dashboard/profile" replace />;
};

export default DashboardHome;
