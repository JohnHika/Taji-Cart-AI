import { useClerk } from '@clerk/clerk-react';
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SSOCallback = () => {
  const { handleRedirectCallback } = useClerk();
  const navigate = useNavigate();

  useEffect(() => {
    async function processCallback() {
      try {
        // Process the SSO callback
        await handleRedirectCallback();
        // Once complete, redirect to home page
        navigate('/', { replace: true });
      } catch (error) {
        console.error('Error handling SSO callback:', error);
        // On error, redirect to login
        navigate('/login', { replace: true });
      }
    }

    processCallback();
  }, [handleRedirectCallback, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-200 mx-auto"></div>
        <h2 className="mt-4 text-xl font-semibold text-gray-800 dark:text-white">Processing your login...</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-300">Please wait while we complete your authentication.</p>
      </div>
    </div>
  );
};

export default SSOCallback;