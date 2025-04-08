import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';
import DeliveryNavigation from '../components/DeliveryNavigation';
import Footer from '../components/Footer';

const DeliveryLayout = () => {
  const user = useSelector(state => state.user);
  
  // Check if user is logged in and has delivery role
  const isAuthenticated = user.isAuthenticated;
  const isDelivery = user.role === 'delivery';
  
  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Redirect to home if not a delivery personnel
  if (!isDelivery) {
    return <Navigate to="/" replace />;
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
      <DeliveryNavigation />
      <main className="flex-grow container mx-auto px-4 py-6">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default DeliveryLayout;
