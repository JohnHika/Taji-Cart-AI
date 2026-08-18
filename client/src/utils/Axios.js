import axios from 'axios';
import { apiBaseUrl } from '../common/apiBaseUrl';
import SummaryApi from '../common/SummaryApi';
import { clearAuthStorage, getRememberMe, getStoredAccessToken, getStoredRefreshToken, isAuthSessionError, saveTokens } from './authStorage';

const inFlightMutationRequests = new Map();

const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === '[object Object]';

const sortObjectDeep = (value) => {
  if (Array.isArray(value)) {
    return value.map(sortObjectDeep);
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.keys(value)
    .sort()
    .reduce((acc, key) => {
      acc[key] = sortObjectDeep(value[key]);
      return acc;
    }, {});
};

const stableSerialize = (value) => {
  if (value === undefined) return '';
  return JSON.stringify(sortObjectDeep(value));
};

const isMultipartRequest = (headers = {}, data) => {
  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    return true;
  }

  const contentType =
    headers?.['Content-Type'] ||
    headers?.['content-type'] ||
    headers?.common?.['Content-Type'] ||
    '';

  return typeof contentType === 'string' && contentType.includes('multipart/form-data');
};

const getRequestLockKey = (config = {}) => {
  if (config.allowConcurrent || config.skipRequestLock) {
    return null;
  }

  if (typeof config.requestLockKey === 'string' && config.requestLockKey.trim()) {
    return config.requestLockKey.trim();
  }

  const method = (config.method || 'GET').toUpperCase();

  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return null;
  }

  if (isMultipartRequest(config.headers, config.data)) {
    return null;
  }

  return `${method}::${config.url || ''}::${stableSerialize(config.params)}::${stableSerialize(config.data)}`;
};

const instance = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

instance.interceptors.request.use((config) => {
  const token = getStoredAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

let isRefreshing = false;
let failedQueue = [];
let refreshTimer = null;

const processQueue = (error, token = null) => {
  failedQueue.forEach((promiseHandlers) => {
    if (error) {
      promiseHandlers.reject(error);
    } else {
      promiseHandlers.resolve(token);
    }
  });

  failedQueue = [];
};

const setupRefreshTimer = () => {
  if (refreshTimer) clearTimeout(refreshTimer);

  refreshTimer = setTimeout(() => {
    console.log('Auto-refreshing token before expiration');
    refreshToken().catch((error) => {
      console.error('Auto-refresh failed:', error);
    });
  }, 29 * 60 * 1000);

  console.log('Auto-refresh timer set for 29 minutes');
};

if (typeof window !== 'undefined') {
  window.setupRefreshTimer = setupRefreshTimer;
}

let hasGracefullyLoggedOut = false;

// Clears the (unrecoverable) session and sends the user back to login with a
// clear reason, instead of leaving a UI that looks logged in but silently
// fails every subsequent request. Guarded so a burst of simultaneously
// failing requests only triggers one redirect, not a storm of them.
const gracefulLogout = (reason = 'Your session has expired. Please sign in again.') => {
  if (hasGracefullyLoggedOut || typeof window === 'undefined') return;
  hasGracefullyLoggedOut = true;

  clearAuthStorage();
  if (refreshTimer) clearTimeout(refreshTimer);

  try {
    sessionStorage.setItem('nawiri:logoutReason', reason);
  } catch {
    // sessionStorage unavailable — the login page just won't have a reason to show.
  }

  window.dispatchEvent(new CustomEvent('nawiri:session-expired', { detail: { reason } }));

  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
};

const refreshToken = async () => {
  try {
    const storedRefreshToken = getStoredRefreshToken();

    if (!storedRefreshToken) {
      // Nothing to refresh with — the session is unrecoverable (storage was
      // cleared, expired past its stored copy, or never existed). There's no
      // server round-trip to confirm this against, so grace-logout locally
      // right away instead of leaving the user stuck with a UI that looks
      // logged in but silently fails every request from here on.
      gracefulLogout();
      throw new Error('No refresh token available');
    }

    console.log('Attempting to refresh access token...');
    const response = await instance({
      ...SummaryApi.refreshToken,
      data: { refreshToken: storedRefreshToken }
    });

    if (response.data && response.data.data) {
      const {
        accessToken,
        refreshToken: newRefreshToken
      } = response.data.data;

      saveTokens({
        accessToken,
        refreshToken: newRefreshToken,
        rememberMe: getRememberMe(),
      });
      setupRefreshTimer();

      // Lets App.jsx re-fetch the user's own record (role/staffPermissions
      // can change server-side at any time, e.g. an admin grants a new
      // permission) without needing to import Redux into this transport
      // module — a plain DOM event keeps the layers decoupled.
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('nawiri:token-refreshed'));
      }

      console.log('Token refreshed successfully');
      return accessToken;
    }

    throw new Error('Failed to refresh token');
  } catch (error) {
    console.error('Token refresh failed:', error);

    // Only clear the session for actual auth failures, not transient network errors.
    const isAuthError = isAuthSessionError(error);
    if (isAuthError) {
      gracefulLogout();
    }

    throw error;
  }
};

if (typeof window !== 'undefined' && (sessionStorage.getItem('accesstoken') || localStorage.getItem('accesstoken'))) {
  setupRefreshTimer();
}

// Proactively refresh on app focus if the access token might be stale and a
// refresh token exists. This mimics Amazon/Jumia-style long-lived sessions.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  let lastFocusRefresh = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    const now = Date.now();
    if (now - lastFocusRefresh < 60 * 1000) return;
    const accessToken = getStoredAccessToken();
    const refreshToken = getStoredRefreshToken();
    if (!accessToken || !refreshToken) return;

    // Decode the access token expiry without pulling in jwt-decode.
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      const expiresAt = (payload.exp || 0) * 1000;
      // Refresh if it expires in the next 5 minutes or already expired
      if (expiresAt - now < 5 * 60 * 1000) {
        lastFocusRefresh = now;
        refreshToken().catch(() => {});
      }
    } catch {
      // Ignore malformed token
    }
  });
}

instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!error.response || error.response.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return instance(originalRequest);
        })
        .catch((refreshError) => Promise.reject(refreshError));
    }

    isRefreshing = true;

    try {
      const newToken = await refreshToken();
      processQueue(null, newToken);
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return instance(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// Duplicate request interceptor removed — auth header is already set by the
// interceptor registered at line 78.

const Axios = (options = {}) => {
  const token = getStoredAccessToken();

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const requestConfig = {
    ...options,
    headers: {
      ...headers,
      ...options.headers
    }
  };

  const requestLockKey = getRequestLockKey(requestConfig);

  if (requestLockKey && inFlightMutationRequests.has(requestLockKey)) {
    return inFlightMutationRequests.get(requestLockKey);
  }

  const requestPromise = instance(requestConfig).finally(() => {
    if (requestLockKey) {
      inFlightMutationRequests.delete(requestLockKey);
    }
  });

  if (requestLockKey) {
    inFlightMutationRequests.set(requestLockKey, requestPromise);
  }

  return requestPromise;
};

export default Axios;
