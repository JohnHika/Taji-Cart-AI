import React from 'react';
import { FaMicrosoft } from 'react-icons/fa';
import GoogleSignIn from './GoogleSignIn';

const SocialAuth = () => {
  // Use import.meta.env for Vite environment variables instead of process.env
  const API_URL = import.meta.env.VITE_API_URL || '/api';

  // Function to handle Microsoft login (still using Passport.js)
  const handleMicrosoftLogin = () => {
    window.location.href = `${API_URL}/auth/microsoft`;
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

      <div className="grid grid-cols-2 gap-3">
        {/* Google Sign-In with Clerk */}
        <GoogleSignIn buttonText="Google" />
        
        {/* Microsoft Sign-In with Passport.js */}
        <button
          onClick={handleMicrosoftLogin}
          className="w-full inline-flex justify-center py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
        >
          <FaMicrosoft className="text-xl mr-2 text-blue-500" />
          <span>Microsoft</span>
        </button>
      </div>
    </div>
  );
};

export default SocialAuth;