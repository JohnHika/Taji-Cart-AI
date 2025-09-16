import React from 'react';
import { FaGoogle } from 'react-icons/fa';

const SocialAuth = () => {
  // Use import.meta.env for Vite environment variables instead of process.env
  const API_URL = import.meta.env.VITE_API_URL || '/api';

  // Function to handle Google login using Passport.js
  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/auth/google`;
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
          className="w-full inline-flex justify-center py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
        >
          <FaGoogle className="text-xl mr-2 text-red-500" />
          <span>Google</span>
        </button>
      </div>
    </div>
  );
};

export default SocialAuth;