import React from 'react';
import { Navigate } from 'react-router-dom';
import DeliveryLayout from '../components/DeliveryLayout';
import DeliveryDashboard from '../pages/delivery/Dashboard';
// Import other delivery pages as needed

const routes = [
  // ...existing routes...
  {
    path: '/delivery',
    element: <DeliveryLayout />,
    children: [
      { path: '', element: <Navigate to="/delivery/dashboard" replace /> },
      { path: 'dashboard', element: <DeliveryDashboard /> },
      // Add other delivery routes as needed
      { path: 'active', element: <h1 className="p-8 text-xl">Active Deliveries</h1> },
      { path: 'completed', element: <h1 className="p-8 text-xl">Completed Deliveries</h1> },
      { path: 'history', element: <h1 className="p-8 text-xl">Delivery History</h1> },
      { path: 'map', element: <h1 className="p-8 text-xl">Delivery Map View</h1> }
    ]
  }
  // ...existing routes...
];

export default routes;