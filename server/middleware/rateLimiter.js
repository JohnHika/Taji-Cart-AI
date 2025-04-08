// filepath: c:\projects\EL ROI ONE HARDWARE AND ACCERSSORIES\server\middleware\rateLimiter.js
import rateLimit from 'express-rate-limit';

// Create rate limiters with different limits for authenticated users vs guests
export const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: (req) => {
    // Higher limit for authenticated users, lower for guests
    return req.userId ? 20 : 5; // 20 requests per minute for logged in users, 5 for guests
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID for authenticated users, IP for guests
    return req.userId || req.ip;
  },
  handler: (req, res) => {
    // Custom response for rate limited requests
    const isGuest = !req.userId;
    
    return res.status(429).json({
      success: false,
      message: isGuest 
        ? `Rate limit exceeded. Please try again in 60 seconds or log in for a higher limit.`
        : `Rate limit exceeded. Please try again in 60 seconds.`
    });
  }
});

// More aggressive rate limiting for streaming endpoint (which can be more resource-intensive)
export const streamRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: (req) => {
    // Stricter limits for streaming endpoint
    return req.userId ? 10 : 3; // 10 requests per minute for logged in users, 3 for guests
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID for authenticated users, IP for guests
    return (req.userId ? 'stream-' : 'guest-stream-') + (req.userId || req.ip);
  },
  handler: (req, res) => {
    // Custom response for rate limited requests
    const isGuest = !req.userId;
    
    return res.status(429).json({
      success: false,
      message: isGuest 
        ? `Stream rate limit exceeded. Please try again in 60 seconds or log in for a higher limit.`
        : `Stream rate limit exceeded. Please try again in 60 seconds.`
    });
  }
});

// Rate limiter specifically for message endpoints
export const messageRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: (req) => {
    // Higher limit for authenticated users, lower for guests
    return req.userId ? 30 : 8; // 30 messages per minute for logged in users, 8 for guests
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID for authenticated users, IP for guests
    return (req.userId ? 'message-' : 'guest-message-') + (req.userId || req.ip);
  },
  handler: (req, res) => {
    // Custom response for rate limited requests
    const isGuest = !req.userId;
    
    return res.status(429).json({
      success: false,
      message: isGuest 
        ? `Message rate limit exceeded. Please try again in 60 seconds or log in for a higher limit.`
        : `Message rate limit exceeded. Please try again in 60 seconds.`
    });
  }
});

// Optional: middleware to extract user ID before rate limiting
export const extractUser = (req, res, next) => {
  // Extract user ID from authenticated requests
  if (req.user && req.user._id) {
    req.userId = req.user._id.toString();
  }
  next();
};