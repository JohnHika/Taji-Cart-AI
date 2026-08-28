import isAdmin from './isAdmin';

/**
 * Mirrors server/utils/staffPermissions.js's hasStaffPermission — a client-side
 * visibility check only (not a security boundary; the server enforces the real
 * gate). Used to show/hide staff-permission-gated UI without a round-trip.
 *
 * @param {object} user - The user object (e.g. from Redux state.user)
 * @param {string} permission - A permission id, e.g. 'catalog.manage'
 * @returns {boolean}
 */
const hasStaffPermission = (user, permission) => {
    if (isAdmin(user)) return true;
    if (!(user?.isStaff || user?.role === 'staff')) return false;
    return Array.isArray(user?.staffPermissions) && user.staffPermissions.includes(permission);
};

export default hasStaffPermission;
