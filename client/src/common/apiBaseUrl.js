const DEFAULT_API_PORT = import.meta.env.VITE_API_PORT || '3001';

const trimTrailingSlash = (value = '') => value.replace(/\/+$/, '');

const isLoopbackHost = (host = '') =>
  host === 'localhost' || host === '127.0.0.1' || host === '[::1]';

const isPrivateIpv4 = (host = '') =>
  /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})$/.test(
    host
  );

const configuredApiBaseUrl = trimTrailingSlash(
  import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_BACKEND_URL || ''
);

const getBrowserHostApiBaseUrl = () => {
  if (typeof window === 'undefined') {
    return `http://localhost:${DEFAULT_API_PORT}`;
  }
  // In dev, send requests to the Vite server origin so the proxy forwards them to
  // the backend. This works from any device (localhost or phone on LAN).
  if (import.meta.env.DEV) {
    return window.location.origin;
  }
  return window.location.origin;
};

const shouldPreferBrowserHostInDev = () => {
  if (!import.meta.env.DEV || !configuredApiBaseUrl || typeof window === 'undefined') {
    return false;
  }

  try {
    const configuredHost = new URL(configuredApiBaseUrl).hostname;
    const browserHost = window.location.hostname;
    const configuredIsLocalNetwork = isLoopbackHost(configuredHost) || isPrivateIpv4(configuredHost);
    const browserIsLocalNetwork = isLoopbackHost(browserHost) || isPrivateIpv4(browserHost);

    return configuredIsLocalNetwork && browserIsLocalNetwork && configuredHost !== browserHost;
  } catch {
    return false;
  }
};

export const apiBaseUrl = trimTrailingSlash(
  shouldPreferBrowserHostInDev()
    ? getBrowserHostApiBaseUrl()
    : configuredApiBaseUrl || getBrowserHostApiBaseUrl()
);

export const socketBaseUrl = apiBaseUrl;

export const buildApiUrl = (path = '') => {
  if (!path) {
    return apiBaseUrl;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${apiBaseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
};
