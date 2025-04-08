/**
 * Security utilities for generating and verifying admin security codes
 * Used primarily for sensitive operations in the loyalty program
 */


// Time-based security codes are valid for 15 minutes
const CODE_VALIDITY_MINUTES = 15;

// Store for temporary security codes
// In production, consider using Redis or a database for persistence across server restarts
const securityCodes = new Map();

/**
 * Generate a 6-digit security code for admin operations
 * 
 * @param {string} userId - The ID of the admin requesting the code
 * @param {string} action - The action being performed (e.g., 'resetPoints', 'refreshPoints')
 * @returns {string} - The 6-digit security code
 */
export const createSecurityCode = (userId, action) => {
  // Generate a random 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Store the code with validity information
  const expiryTime = new Date(Date.now() + CODE_VALIDITY_MINUTES * 60 * 1000);
  securityCodes.set(code, {
    userId,
    action,
    expiryTime,
    createdAt: new Date()
  });
  
  // Clean up expired codes occasionally
  cleanupExpiredCodes();
  
  // Return the code to be sent to the admin via email
  return code;
};

/**
 * Verify a security code for admin operations
 * 
 * @param {string} code - The 6-digit security code to verify
 * @param {string} userId - The admin user ID
 * @param {string} action - The action being performed
 * @returns {boolean} - Whether the code is valid
 */
export const verifySecurityCode = (code, userId, action) => {
  // Look up the code in our store
  const codeData = securityCodes.get(code);
  
  // If code doesn't exist, it's invalid
  if (!codeData) {
    return false;
  }
  
  // Check if code is expired
  if (codeData.expiryTime < new Date()) {
    // Remove expired code
    securityCodes.delete(code);
    return false;
  }
  
  // Check if code matches the user and action
  if (codeData.userId !== userId || codeData.action !== action) {
    return false;
  }
  
  // Code is valid - delete it so it can't be reused
  securityCodes.delete(code);
  
  return true;
};

/**
 * Clean up expired security codes
 * Called periodically to prevent memory leaks
 */
const cleanupExpiredCodes = () => {
  const now = new Date();
  for (const [code, data] of securityCodes.entries()) {
    if (data.expiryTime < now) {
      securityCodes.delete(code);
    }
  }
};

/**
 * Generate a secure unique token
 * Useful for additional security measures if needed
 */
export const generateSecureToken = () => {
  return Buffer.from(Math.random().toString(36) + Date.now().toString(36)).toString('base64');
};

export default {
  createSecurityCode,
  verifySecurityCode,
  generateSecureToken
};