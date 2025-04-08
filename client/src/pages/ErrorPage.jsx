import React from 'react';
import { FaArrowLeft, FaExclamationTriangle, FaHome } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';

const ErrorPage = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1); // Go back to the previous page
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-lg w-full text-center">
        <div className="mb-8">
          <FaExclamationTriangle className="mx-auto text-red-500 dark:text-red-400 text-6xl" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Something went wrong
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
          We couldn't find the page you're looking for or an unexpected error occurred.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleGoBack}
            className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
          >
            <FaArrowLeft className="mr-2" />
            Go Back
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-white dark:bg-gray-800 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
          >
            <FaHome className="mr-2" />
            Home Page
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;