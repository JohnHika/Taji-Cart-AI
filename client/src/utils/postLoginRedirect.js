import isadmin from './isAdmin';
import { getEffectiveRole } from './userRole';

// Mirrors the server-side check in server/routes/auth.routes.js — only a
// same-site relative path the app itself generated (PrivateRoute's
// `state.from`, or the OAuth `returnTo` round-trip) is safe to send someone
// back to after login. Anything absolute/protocol-relative could redirect
// off-site, and looping back into the auth pages themselves would just
// bounce the user right back after they signed in.
const AUTH_PAGE_PATHS = new Set(['/', '/login', '/register', '/forgot-password', '/verification-otp', '/reset-password', '/verify-email', '/social-auth-success']);

export function sanitizeReturnTo(path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) {
    return null;
  }
  const pathname = path.split(/[?#]/)[0];
  if (AUTH_PAGE_PATHS.has(pathname)) {
    return null;
  }
  return path;
}

/**
 * Default route after email/password or social login, by role.
 * If returnTo is provided (and passes sanitizeReturnTo), it takes priority
 * over role-based routing.
 * @param {object} user - User payload (e.g. from API or Redux)
 * @param {string} returnTo - Optional return URL to redirect to
 * @returns {string}
 */
export function getPostLoginPath(user, returnTo) {
  const safeReturnTo = sanitizeReturnTo(returnTo);
  if (safeReturnTo) {
    return safeReturnTo;
  }

  if (!user?._id) return '/';
  if (isadmin(user)) return '/dashboard';
  const effectiveRole = getEffectiveRole(user);
  if (effectiveRole === 'delivery') {
    return '/dashboard/delivery/dashboard';
  }
  if (effectiveRole === 'staff') {
    return '/dashboard/staff/dashboard';
  }
  return '/';
}
