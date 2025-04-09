/**
 * Checks if a user has staff permissions
 * @param {Object} user - The user object from redux store
 * @returns {Boolean} - Whether the user has staff permissions
 */
const isStaff = (user) => {
  if (!user) return false;
  
  // Check for explicit staff role
  if (user.role === 'staff') return true;
  
  // Check for isStaff flag
  if (user.isStaff === true) return true;
  
  // Check if user is an admin (admins can do everything)
  if (user.role === 'admin' || user.isAdmin === true) return true;
  
  // User is not a staff member
  return false;
};

export default isStaff;
