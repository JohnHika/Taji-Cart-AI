import React, { useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { FaSpinner } from 'react-icons/fa';
import { useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchCartItems } from '../store/cartProduct';
import { setUserDetails } from '../store/userSlice';
import fetchUserDetails from '../utils/fetchUserDetails';
import { getPostLoginPath } from '../utils/postLoginRedirect';
import { getRememberMe, saveTokens } from '../utils/authStorage';

const createParamsFromSource = (rawValue = '') => {
  if (!rawValue) {
    return new URLSearchParams();
  }

  const normalizedValue = rawValue.startsWith('?') || rawValue.startsWith('#')
    ? rawValue.slice(1)
    : rawValue;

  return new URLSearchParams(normalizedValue);
};

const getAuthParams = (location) => {
  const mergedParams = new URLSearchParams();
  const paramSources = [location.hash, location.search];

  paramSources.forEach((source) => {
    const params = createParamsFromSource(source);

    params.forEach((value, key) => {
      if (!mergedParams.has(key)) {
        mergedParams.set(key, value);
      }
    });
  });

  return mergedParams;
};

// Recovery channel for the case where the URL hash was stripped by a
// redirect hop (www -> apex 308, http -> https, proxy) on the way here:
// the API's OAuth callback also drops a one-shot readable oauth_handoff
// cookie on the parent domain. Read it, use it, delete it — never log it.
const readHandoffCookie = () => {
  if (typeof document === 'undefined') return null;
  const prefix = 'oauth_handoff=';
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(prefix));
  if (!match) return null;
  try {
    let raw = decodeURIComponent(match.substring(prefix.length));
    // express tags object-valued cookies with a "j:" prefix; we send a plain
    // JSON string but strip the tag anyway in case of any intermediary.
    if (raw.startsWith('j:')) raw = raw.slice(2);
    const payload = JSON.parse(raw);
    // Single-use: clear the moment it's read.
    document.cookie = `oauth_handoff=; Max-Age=0; path=/social-auth-success; secure`;
    document.cookie = `oauth_handoff=; Max-Age=0; path=/; secure`;
    return payload || null;
  } catch {
    return null;
  }
};

const SocialAuthSuccess = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // The handoff must fire exactly once. After success we navigate (changing
  // the location) — without this guard the effect re-runs against the clean
  // URL, finds no token, and toasts "Authentication failed. Missing token."
  // even though the login actually succeeded.
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const handleAuthSuccess = async () => {
      try {
        // Get token and user details from either hash or query parameters.
        // Hash parameters are preferred because they do not hit the server.
        const params = getAuthParams(location);
        let token = params.get('token') || params.get('accessToken');
        let refreshToken = params.get('refreshToken');
        let userData = params.get('userData');

        // Hash stripped by a redirect hop (www -> apex, http -> https)?
        // Fall back to the one-shot handoff cookie the API's callback set
        // on the parent domain. If that works too, the user never sees an
        // error at all.
        if (!token) {
          const handoff = readHandoffCookie();
          if (handoff?.accessToken) {
            token = handoff.accessToken;
            refreshToken = refreshToken || handoff.refreshToken || undefined;
            userData = userData || (handoff.userData ? JSON.stringify(handoff.userData) : null);
            if (!userData && handoff.userId) {
              // Re-shape the flat cookie payload into the individual params
              // the fallback constructor below already understands.
              params.set('userId', handoff.userId);
              params.set('name', handoff.name || '');
              params.set('email', handoff.email || '');
              params.set('role', handoff.role || 'user');
              params.set('isAdmin', handoff.isAdmin ? 'true' : 'false');
              params.set('isStaff', handoff.isStaff ? 'true' : 'false');
              params.set('isDelivery', handoff.isDelivery ? 'true' : 'false');
              params.set('loyaltyPoints', String(handoff.loyaltyPoints ?? 0));
              params.set('loyaltyClass', handoff.loyaltyClass || 'Basic');
            }
          }
        }

        if (!token) {
          toast.error('Authentication failed. Missing token.');
          navigate('/login');
          return;
        }

        // Remove sensitive auth payloads from the visible URL as soon as they are read.
        const hasSensitiveAuthParams = ['token', 'accessToken', 'refreshToken', 'userData', 'userId', 'email', 'name']
          .some((key) => params.has(key));

        if (hasSensitiveAuthParams && typeof window !== 'undefined') {
          window.history.replaceState(null, document.title, location.pathname);
        }

        // Save tokens respecting the user's previous "Keep me signed in" choice.
        const rememberMe = getRememberMe();
        saveTokens({ accessToken: token, refreshToken, rememberMe });

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
          const role = params.get('role') || 'user';
          const isAdmin = params.get('isAdmin') === 'true';
          const isStaff = params.get('isStaff') === 'true' || role === 'staff';
          const isDelivery = params.get('isDelivery') === 'true' || role === 'delivery';
          const loyaltyPoints = Number(params.get('loyaltyPoints') || 0);
          const loyaltyClass = params.get('loyaltyClass') || 'Basic';

          userObject = {
            _id,
            name,
            email,
            isAuthenticated: true,
            role,
            isAdmin,
            isStaff,
            isDelivery,
            loyalty: {
              points: loyaltyPoints,
              class: loyaltyClass
            }
          };
        }

        // Always fetch a fresh backend user payload so role/flags (e.g. staff) reflect immediately.
        try {
          const userDetailsResponse = await fetchUserDetails();
          if (userDetailsResponse?.success && userDetailsResponse?.data) {
            userObject = {
              ...userObject,
              ...userDetailsResponse.data,
            };
          }
        } catch (detailsError) {
          console.error('Failed to refresh user details after social auth:', detailsError);
        }

        // Store user in Redux
        dispatch(setUserDetails(userObject));

        // Fetch cart items after successful authentication
        dispatch(fetchCartItems());

        // Check for returnTo parameter in hash or search params
        const returnTo = params.get('returnTo');
        
        toast.success('Successfully logged in with social account!');
        
        if (returnTo) {
          // Redirect to the stored returnTo URL
          navigate(returnTo);
        } else {
          // Fallback to role-based redirect
          navigate(getPostLoginPath(userObject));
        }
      } catch (error) {
        console.error('Social authentication error:', error);
        toast.error('Authentication failed. Please try again.');
        navigate('/login');
      }
    };

    handleAuthSuccess();
  }, [dispatch, navigate, location]);

  return (
    <div className="h-screen flex flex-col items-center justify-center">
      <div className="text-center">
        <FaSpinner className="animate-spin text-6xl text-primary-200 mx-auto mb-4" />
        <h1 className="text-2xl font-semibold mb-2 dark:text-white">Logging you in...</h1>
        <p className="text-brown-500 dark:text-white/55">Please wait while we complete your authentication.</p>
      </div>
    </div>
  );
};

export default SocialAuthSuccess;
