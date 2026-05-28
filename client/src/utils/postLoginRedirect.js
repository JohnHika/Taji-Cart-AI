import isadmin from './isAdmin';
import { getEffectiveRole } from './userRole';

/**
 * Default route after email/password or social login, by role.
 * @param {object} user - User payload (e.g. from API or Redux)
 * @returns {string}
 */
export function getPostLoginPath(user) {
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
