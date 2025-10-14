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
        const token = params.get('token') || params.get('accessToken');
        const refreshToken = params.get('refreshToken');
        const userData = params.get('userData');

        if (!token) {
          toast.error('Authentication failed. Missing token.');
          navigate('/login');
          return;
        }

        // Save tokens to session storage
        sessionStorage.setItem('accesstoken', token);
        if (refreshToken) {
          sessionStorage.setItem('refreshToken', refreshToken);
        }

        // Build user object from either JSON userData or individual params
        let userObject = null;
        if (userData) {
          try {
            userObject = JSON.parse(decodeURIComponent(userData));
          } catch (parseError) {
            console.error('Error parsing user data:', parseError);
          }
        }

        if (!userObject) {
          // Fallback to constructing user data from query params
          const _id = params.get('userId');
          const name = params.get('name');
          const email = params.get('email');
          const loyaltyPoints = Number(params.get('loyaltyPoints') || 0);
          const loyaltyClass = params.get('loyaltyClass') || 'Basic';

          userObject = {
            _id,
            name,
            email,
            isAuthenticated: true,
            role: 'user',
            loyalty: {
              points: loyaltyPoints,
              class: loyaltyClass
            }
          };
        }

        // Store user in Redux
        dispatch(setUserDetails(userObject));

        // Fetch cart items after successful authentication
        dispatch(fetchCartItems());

        toast.success('Successfully logged in with social account!');
        navigate('/');
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