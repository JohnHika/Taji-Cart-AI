import React, { useState } from 'react';
import { FaGoogle } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

const SocialAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  // Build a proper API base: if VITE_API_URL doesn't include '/api', append it
  const RAW_API_URL = import.meta.env.VITE_API_URL || '';
  const API_URL = RAW_API_URL
    ? (RAW_API_URL.endsWith('/api') ? RAW_API_URL : `${RAW_API_URL.replace(/\/$/, '')}/api`)
    : '/api';

  // Function to handle Google login using Passport.js
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      // First check if Google OAuth is available
  const response = await fetch(`${API_URL}/auth/google`, { method: 'HEAD' });
      
      if (response.status === 503) {
        toast.error('Google login is currently not available. Please use email login.');
        setIsLoading(false);
        return;
      }
      
      // Redirect to Google OAuth
  window.location.href = `${API_URL}/auth/google`;
    } catch (error) {
      console.error('Error checking Google OAuth availability:', error);
      toast.error('Google login is currently not available. Please use email login.');
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
            Or continue with
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {/* Google Sign-In with Passport.js */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full inline-flex justify-center py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FaGoogle className="text-xl mr-2 text-red-500" />
          <span>{isLoading ? 'Connecting...' : 'Google'}</span>
        </button>
      </div>
    </div>
  );
};

export default SocialAuth;