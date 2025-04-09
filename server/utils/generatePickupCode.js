/**
 * Generate a unique pickup code for in-store pickups
 * 
 * @returns {string} A unique pickup code
 */
const generatePickupCode = () => {
  const prefix = 'PICK';
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `${prefix}${timestamp}${random}`;
};

export default generatePickupCode;
