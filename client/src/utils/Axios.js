import axios from 'axios';
import SummaryApi from '../common/SummaryApi';

// Ensure your Axios instance is properly configured
const instance = axios.create({
  baseURL: 'http://localhost:8080', // Or your API base URL
  withCredentials: true,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    // Don't add Cache-Control here as a default header
  }
});

// Flag to prevent multiple refresh token requests
let isRefreshing = false;
// Queue of requests that failed due to token expiration
let failedQueue = [];
// Set a timer for auto-refresh before token expiration
let refreshTimer = null;

// Process the queue of failed requests with new token or rejection
const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Setup a timer to auto-refresh token before it expires
const setupRefreshTimer = () => {
  // Clear any existing timer
  if (refreshTimer) clearTimeout(refreshTimer);
  
  // Set timer to refresh 1 minute before token expires (29 minutes)
  refreshTimer = setTimeout(() => {
    console.log('Auto-refreshing token before expiration');
    refreshToken().catch(err => {
      console.error('Auto-refresh failed:', err);
    });
  }, 29 * 60 * 1000); // 29 minutes in milliseconds

  console.log('Auto-refresh timer set for 29 minutes');
};

// Make the setupRefreshTimer function available globally so it can be called from Login component
if (typeof window !== 'undefined') {
  window.setupRefreshTimer = setupRefreshTimer;
}

// Function to refresh token
const refreshToken = async () => {
  try {
    const refreshToken = sessionStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    console.log('Attempting to refresh access token...');
    const response = await axios({
      ...SummaryApi.refreshToken,
      data: { refreshToken }
    });
    
    if (response.data && response.data.data) {
      const { accessToken, refreshToken: newRefreshToken } = response.data.data;
      
      // Store the new tokens
      sessionStorage.setItem('accesstoken', accessToken);
      sessionStorage.setItem('refreshToken', newRefreshToken);
      
      // Setup the refresh timer again
      setupRefreshTimer();
      
      console.log('Token refreshed successfully');
      return accessToken;
    } else {
      throw new Error('Failed to refresh token');
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
    // Clear tokens on refresh failure
    sessionStorage.removeItem('accesstoken');
    sessionStorage.removeItem('refreshToken');
    
    // Redirect to login page if we're in a browser environment
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    
    throw error;
  }
};

// Initialize timer if we have a token already
if (typeof window !== 'undefined' && sessionStorage.getItem('accesstoken')) {
  setupRefreshTimer();
}

// Response interceptor to handle token refresh
instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If the error is not 401 or the request has already been retried, reject
    if (!error.response || error.response.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }
    
    // Mark the request as retried
    originalRequest._retry = true;
    
    // If we're already refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(token => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return instance(originalRequest);
        })
        .catch(err => Promise.reject(err));
    }
    
    // Start refreshing
    isRefreshing = true;
    
    try {
      const newToken = await refreshToken();
      
      // Process queued requests
      processQueue(null, newToken);
      
      // Update the authorization header
      originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
      return instance(originalRequest);
    } catch (refreshError) {
      // Process queued requests with error
      processQueue(refreshError);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// Add a request interceptor to handle errors
instance.interceptors.request.use(
  (config) => {
    // Get the token from localStorage
    const token = localStorage.getItem('accesstoken');
    // If token exists, add to headers
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const Axios = (options) => {
  // Get token from sessionStorage
  const token = sessionStorage.getItem('accesstoken');
  
  // Add auth header if token exists in sessionStorage
  const headers = {
    ...(token && { Authorization: `Bearer ${token}` })
  };
  
  // Return axios request with merged options
  return instance({
    ...options,
    headers: {
      ...headers,
      ...options.headers
    }
  });
};

export default Axios;