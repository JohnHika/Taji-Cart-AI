import React from 'react';
import { FaExclamationTriangle, FaHome } from 'react-icons/fa';
import { Link, useRouteError } from 'react-router-dom';

const CategoryFallbackErrorPage = () => {
  const error = useRouteError();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center p-8 max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <FaExclamationTriangle className="mx-auto text-yellow-500 text-5xl mb-4" />
        
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Category Error
        </h1>
        
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          There was a problem loading this category or its products.
        </p>
        
        {error && (
          <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded mb-6 text-sm text-left overflow-auto max-h-32">
            <p className="text-red-500 font-mono">{error.message || "Unknown error occurred"}</p>
          </div>
        )}
        
        <div className="flex flex-col space-y-2">
          <Link 
            to="/" 
            className="flex items-center justify-center px-4 py-2 bg-primary-200 text-white rounded hover:bg-primary-300 transition"
          >
            <FaHome className="mr-2" /> Return to Home
          </Link>
          
          <Link 
            to="/categories" 
            className="flex items-center justify-center px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            Browse All Categories
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CategoryFallbackErrorPage;
