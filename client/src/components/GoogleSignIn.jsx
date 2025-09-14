import { useSignIn } from '@clerk/clerk-react';
import React, { useState } from 'react';
import { FaGoogle } from 'react-icons/fa';
import toast from 'react-hot-toast';

const GoogleSignIn = ({ buttonText = 'Sign in with Google' }) => {
  const { isLoaded, signIn } = useSignIn();
  const [isSigningIn, setIsSigningIn] = useState(false);

  if (!isLoaded) {
    return (
      <button 
        disabled 
        className="w-full flex items-center justify-center gap-2 py-2 border border-gray-300 dark:border-gray-600 rounded text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <span className="animate-pulse">Loading...</span>
      </button>
    );
  }

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/"
      });
      
    } catch (error) {
      console.error('Google sign in error:', error);
      toast.error('Failed to sign in with Google');
      setIsSigningIn(false);
    }
  };

  return (
    <button 
      onClick={handleGoogleSignIn}
      disabled={isSigningIn}
      className="w-full flex items-center justify-center gap-2 py-2 border border-gray-300 dark:border-gray-600 rounded text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <FaGoogle className="text-red-500" />
      {isSigningIn ? 'Signing in...' : buttonText}
    </button>
  );
};

export default GoogleSignIn;