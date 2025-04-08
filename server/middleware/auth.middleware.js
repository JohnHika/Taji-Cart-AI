import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

/**
 * Authenticate user based on JWT token from cookies
 */
export const isAuth = async (req, res, next) => {
  try {
    // Get token from cookies or authorization header
    const token = req.cookies?.token || req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please login.'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user from decoded token
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found or invalid token'
      });
    }
    
    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      message: 'Authentication failed. Invalid token.'
    });
  }
};

/**
 * Check if authenticated user is an admin
 */
export const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
};

/**
 * Make authentication optional - attach user to request if token exists
 * but continue even if no token or invalid token
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.token || req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (user) {
          req.user = user;
        }
      } catch (error) {
        // Ignore token errors - this is optional auth
        console.log('Optional auth: Invalid token');
      }
    }
    
    next();
  } catch (error) {
    next(); // Continue even if there's an error
  }
};
