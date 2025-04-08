/**
 * Utility function to check if a user has admin privileges
 * This checks multiple properties to handle different admin data structures
 * 
 * @param {string|object} userOrRole - Either the user object or user role string
 * @returns {boolean} - Whether the user has admin privileges
 */
const isadmin = (userOrRole) => {
    // If we're given a string (role), check if it's 'admin' (case insensitive)
    if (typeof userOrRole === 'string') {
        return userOrRole.toLowerCase() === 'admin';
    }
    
    // If we're given an object (user), check all possible admin indicators
    if (typeof userOrRole === 'object' && userOrRole !== null) {
        return Boolean(
            userOrRole.role?.toLowerCase() === 'admin' ||
            userOrRole.isAdmin === true ||
            userOrRole.userType?.toLowerCase() === 'admin' ||
            userOrRole.type?.toLowerCase() === 'admin'
        );
    }
    
    return false;
}

export default isadmin;