import Axios from './Axios';
import { buildApiUrl } from '../common/apiBaseUrl';
import { clearAuthStorage, getStoredAccessToken } from './authStorage';

export const STORE_PORTAL_SESSION_KEY = 'nawiriStorePortalUnlocked';

const configuredStoreOrigin = import.meta.env.VITE_STORE_PORTAL_URL?.replace(/\/$/, '');

export const getStorePortalOrigin = () => configuredStoreOrigin || 'https://store.nawirihairke.com';

export const isStorePortalHost = () => {
  if (typeof window === 'undefined') return false;
  const configuredHost = configuredStoreOrigin ? new URL(configuredStoreOrigin).hostname : 'store.nawirihairke.com';
  return window.location.hostname === configuredHost;
};

export const hasStorePortalAccess = () =>
  typeof window !== 'undefined' &&
  sessionStorage.getItem(STORE_PORTAL_SESSION_KEY) === '1' &&
  Boolean(getStoredAccessToken());

export const launchStorePortal = async () => {
  const response = await Axios({ method: 'POST', url: '/api/admin/store-portal/launch' });
  const handoff = response.data?.data?.handoff;
  if (!handoff) throw new Error('Store access could not be prepared.');

  // The fragment never travels to the server or Vercel logs. The Store app
  // immediately exchanges and removes it, leaving no grant in browser history.
  window.location.assign(`${getStorePortalOrigin()}/#handoff=${encodeURIComponent(handoff)}`);
};

export const hasStorePortalHandoff = () =>
  typeof window !== 'undefined' && new URLSearchParams(window.location.hash.slice(1)).has('handoff');

export const consumeStorePortalHandoff = async () => {
  const handoff = new URLSearchParams(window.location.hash.slice(1)).get('handoff');
  if (!handoff) return { ok: false, message: 'No store access handoff was supplied.' };

  const response = await fetch(buildApiUrl('/api/admin/store-portal/exchange'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ handoff }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.data?.accessToken) {
    return { ok: false, message: payload?.message || 'Store access link is invalid or expired.' };
  }

  // Store Management is intentionally a session-only destination. Do not save
  // a refresh token or persistent credential on this privileged subdomain.
  clearAuthStorage();
  sessionStorage.setItem('accesstoken', payload.data.accessToken);
  sessionStorage.setItem(STORE_PORTAL_SESSION_KEY, '1');
  window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
  return { ok: true, user: payload.data.user };
};

export const leaveStorePortal = () => {
  clearAuthStorage();
  sessionStorage.removeItem(STORE_PORTAL_SESSION_KEY);
  window.location.assign('https://nawirihairke.com/');
};
