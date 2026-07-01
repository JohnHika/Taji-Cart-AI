import isadmin from './isAdmin';
import { getEffectiveRole } from './userRole';

/**
 * Default route after email/password or social login, by role.
 * If returnTo is provided, it takes priority over role-based routing.
 * @param {object} user - User payload (e.g. from API or Redux)
 * @param {string} returnTo - Optional return URL to redirect to
 * @returns {string}
 */
export function getPostLoginPath(user, returnTo) {
  // If returnTo is provided, use it (if not the default social-auth-success path)
  if (returnTo && returnTo !== '/social-auth-success' && returnTo !== '/') {
    return returnTo;
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
