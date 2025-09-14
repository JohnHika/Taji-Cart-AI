import React, { useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FaSpinner } from 'react-icons/fa';
import { useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchCartItems } from '../redux/slice/cartSlice';
import { setUserDetails } from '../store/userSlice';

const SocialAuthSuccess = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleAuthSuccess = async () => {
      try {
        // Get token and user details from URL parameters
        const params = new URLSearchParams(location.search);
        const token = params.get('token');
        const userData = params.get('userData');
        
        if (!token || !userData) {
          toast.error('Authentication failed. Missing authentication data.');
          navigate('/login');
          return;
        }
        
        // Save token to session storage
        sessionStorage.setItem('accesstoken', token);
        
        // Parse and store user details
        try {
          const userObject = JSON.parse(decodeURIComponent(userData));
          dispatch(setUserDetails(userObject));
          
          // Fetch cart items after successful authentication
          dispatch(fetchCartItems());
          
          toast.success('Successfully logged in with social account!');
          navigate('/');
        } catch (parseError) {
          console.error('Error parsing user data:', parseError);
          toast.error('Authentication error: Invalid user data format');
          navigate('/login');
        }
      } catch (error) {
        console.error('Social authentication error:', error);
        toast.error('Authentication failed. Please try again.');
        navigate('/login');
      }
    };

    handleAuthSuccess();
  }, [dispatch, navigate, location.search]);

  return (
    <div className="h-screen flex flex-col items-center justify-center">
      <div className="text-center">
        <FaSpinner className="animate-spin text-6xl text-primary-200 mx-auto mb-4" />
        <h1 className="text-2xl font-semibold mb-2 dark:text-white">Logging you in...</h1>
        <p className="text-gray-600 dark:text-gray-300">Please wait while we complete your authentication.</p>
      </div>
    </div>
  );
};

export default SocialAuthSuccess;