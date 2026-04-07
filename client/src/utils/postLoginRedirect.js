import isadmin from './isAdmin';

/**
 * Default route after email/password or social login, by role.
 * @param {object} user - User payload (e.g. from API or Redux)
 * @returns {string}
 */
export function getPostLoginPath(user) {
  if (!user?._id) return '/';
  if (isadmin(user)) return '/dashboard';
  if (user.role === 'delivery' || user.isDelivery === true) {
    return '/dashboard/delivery/dashboard';
  }
  if (user.role === 'staff' || user.isStaff === true) {
    return '/dashboard/staff/dashboard';
  }
  return '/';
}
