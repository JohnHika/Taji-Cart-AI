import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

const DeliveryManagement = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  
  // Define tabs for the delivery management interface
  const tabs = [
    { name: 'Pending Orders', path: '/dashboard/staff/delivery/pending', icon: 'clock' },
    { name: 'Dispatched', path: '/dashboard/staff/delivery/dispatched', icon: 'truck' },
    { name: 'Active Deliveries', path: '/dashboard/staff/delivery/active', icon: 'route' },
    { name: 'Completed', path: '/dashboard/staff/delivery/completed', icon: 'check-circle' },
    { name: 'Drivers', path: '/dashboard/staff/delivery/drivers', icon: 'users' }
  ];
  
  // Render the appropriate icon based on the name
  const renderIcon = (iconName) => {
    switch(iconName) {
      case 'clock':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        );
      case 'truck':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"></path>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"></path>
          </svg>
        );
      case 'route':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
          </svg>
        );
      case 'check-circle':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        );
      case 'users':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Header section */}
      <header className="bg-blue-600 text-white p-6">
        <div className="container mx-auto">
          <h1 className="text-2xl font-semibold">Delivery Management</h1>
          <p className="mt-2 text-blue-100">
            Monitor and manage all delivery operations from this dashboard
          </p>
        </div>
      </header>
      
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <div className="container mx-auto">
          <nav className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={({ isActive }) => 
                  `flex items-center px-4 py-3 font-medium text-sm border-b-2 whitespace-nowrap ${
                    isActive || currentPath === tab.path
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`
                }
              >
                <span className="mr-2">{renderIcon(tab.icon)}</span>
                {tab.name}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
      
      {/* Main content area */}
      <main className="container mx-auto py-6 px-4">
        {/* The child routes will be rendered here */}
        <Outlet />
      </main>
    </div>
  );
};

export default DeliveryManagement;