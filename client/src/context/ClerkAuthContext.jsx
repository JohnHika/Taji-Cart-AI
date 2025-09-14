import { ClerkProvider, useAuth, useUser } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { CLERK_PUBLISHABLE_KEY, clerkAppearance, transformClerkUser } from '../config/clerk';
import { setUserDetails, logout } from '../store/userSlice';
import { fetchCartItems } from '../redux/slice/cartSlice';
import Axios from '../utils/Axios';

// Clerk Auth Provider
export function ClerkAuthProvider({ children }) {
  if (!CLERK_PUBLISHABLE_KEY) {
    console.error('Missing Clerk publishable key');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="p-4 bg-red-100 text-red-700 rounded-md">
          Missing Clerk publishable key. Please set it in src/config/clerk.js
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider 
      publishableKey={CLERK_PUBLISHABLE_KEY}
      appearance={clerkAppearance}
    >
      <ClerkUserSync />
      {children}
    </ClerkProvider>
  );
}

// Component to sync Clerk user with app state
function ClerkUserSync() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const dispatch = useDispatch();

  useEffect(() => {
    // Only try to sync if Clerk has loaded
    if (!isLoaded) return;

    const syncUserWithBackend = async () => {
      if (isSignedIn && user) {
        try {
          // Transform Clerk user to your app format
          const transformedUser = transformClerkUser(user);
          
          // Get JWT token from Clerk
          const token = await getToken();
          
          // Store token in localStorage/sessionStorage
          sessionStorage.setItem('accesstoken', token);
          
          // Register/login user with your backend
          const response = await Axios({
            url: '/api/user/clerk-auth',
            method: 'POST',
            data: transformedUser,
            headers: {
              Authorization: `Bearer ${token}`
            }
          });

          if (response.data.success) {
            // Set user details in Redux store
            dispatch(setUserDetails({
              ...response.data.data,
              // Include additional info if needed
              accountType: response.data.data.role || 'customer'
            }));
            
            // Fetch cart items
            dispatch(fetchCartItems());
            
            toast.success('Signed in successfully');
          }
        } catch (error) {
          console.error('Error syncing user:', error);
          toast.error(error.response?.data?.message || 'Failed to sync user data');
        }
      } else if (!isSignedIn) {
        // User signed out of Clerk
        dispatch(logout());
        sessionStorage.removeItem('accesstoken');
        sessionStorage.removeItem('refreshToken');
      }
    };

    syncUserWithBackend();
  }, [isLoaded, isSignedIn, user, getToken, dispatch]);

  return null;
}

export default ClerkAuthProvider;