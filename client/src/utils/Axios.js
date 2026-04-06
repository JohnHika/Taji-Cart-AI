import axios from 'axios';
import { apiBaseUrl } from '../common/apiBaseUrl';
import SummaryApi from '../common/SummaryApi';

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
  const token =
    sessionStorage.getItem('accesstoken') ||
    localStorage.getItem('accesstoken') ||
    sessionStorage.getItem('token') ||
    localStorage.getItem('token');

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

const refreshToken = async () => {
  try {
    const storedRefreshToken = sessionStorage.getItem('refreshToken');

    if (!storedRefreshToken) {
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

      sessionStorage.setItem('accesstoken', accessToken);
      sessionStorage.setItem('refreshToken', newRefreshToken);
      setupRefreshTimer();

      console.log('Token refreshed successfully');
      return accessToken;
    }

    throw new Error('Failed to refresh token');
  } catch (error) {
    console.error('Token refresh failed:', error);
    sessionStorage.removeItem('accesstoken');
    sessionStorage.removeItem('refreshToken');

    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }

    throw error;
  }
};

if (typeof window !== 'undefined' && sessionStorage.getItem('accesstoken')) {
  setupRefreshTimer();
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

instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accesstoken');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

const Axios = (options = {}) => {
  const token = sessionStorage.getItem('accesstoken');

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
