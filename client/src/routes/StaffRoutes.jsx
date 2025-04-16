import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Route, Routes } from 'react-router-dom';

// Staff Dashboard Components
import StaffDashboard from '../pages/staff/Dashboard';
import DispatchedOrders from '../pages/staff/DeliveryManagement/DispatchedOrders';
import DriversManagement from '../pages/staff/DeliveryManagement/DriversManagement';
import DeliveryManagement from '../pages/staff/DeliveryManagement/index';
import PendingDispatch from '../pages/staff/DeliveryManagement/PendingDispatch';

// Staff Auth Guard component
const StaffRoute = ({ children }) => {
  const { user, loading } = useSelector((state) => state.auth);
  
  // If authentication is still loading, show a spinner
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900"></div>
      </div>
    );
  }
  
  // If user is not logged in or doesn't have staff/admin privileges, redirect to login
  if (!user || (!user.isStaff && !user.isAdmin && user.role !== 'staff' && user.role !== 'admin')) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

const StaffRoutes = () => {
  return (
    <Routes>
      <Route 
        path="/dashboard/staff/dashboard" 
        element={
          <StaffRoute>
            <StaffDashboard />
          </StaffRoute>
        } 
      />
      
      {/* Delivery Management Routes */}
      <Route 
        path="/dashboard/staff/delivery" 
        element={
          <StaffRoute>
            <DeliveryManagement />
          </StaffRoute>
        }
      >
        <Route path="" element={<Navigate to="pending" replace />} />
        <Route path="pending" element={<PendingDispatch />} />
        <Route path="dispatched" element={<DispatchedOrders />} />
        <Route path="active" element={<div>Active Deliveries</div>} /> {/* Placeholder - we'll implement this later */}
        <Route path="completed" element={<div>Completed Deliveries</div>} /> {/* Placeholder - we'll implement this later */}
        <Route path="drivers" element={<DriversManagement />} />
      </Route>
      
      {/* Redirect from staff root to dashboard */}
      <Route path="/dashboard/staff" element={<Navigate to="/dashboard/staff/dashboard" replace />} />
    </Routes>
  );
};

export default StaffRoutes;