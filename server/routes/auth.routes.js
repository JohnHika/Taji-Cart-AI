import dotenv from 'dotenv';
import express from 'express';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import LoyaltyCard from '../models/loyaltycard.model.js';
import generatedAccessToken from '../utils/generatedAccessToken.js';
import genertedRefreshToken from '../utils/generatedRefreshToken.js';

dotenv.config();
const router = express.Router();

const getPrimaryForwardedValue = (value = '') =>
  value
    .split(',')[0]
    .trim();

const trimTrailingSlash = (value = '') => value.replace(/\/$/, '');

const LOCAL_FRONTEND_URL = 'http://localhost:5173';
const CANONICAL_FRONTEND_URL = 'https://nawirihairke.com';

const getRequestOrigin = (req) => {
  const forwardedProto = getPrimaryForwardedValue(req.headers['x-forwarded-proto'] || '');
  const forwardedHost = getPrimaryForwardedValue(req.headers['x-forwarded-host'] || req.headers.host || '');
  const protocol = forwardedProto || req.protocol || 'https';

  if (!forwardedHost) {
    return '';
  }

  return `${protocol}://${forwardedHost}`;
};

const getGoogleCallbackUrlForRequest = (req) => {
  const requestOrigin = trimTrailingSlash(getRequestOrigin(req));
  return requestOrigin ? `${requestOrigin}/api/auth/google/callback` : undefined;
};

const getFrontendBaseUrl = () => {
  const configuredFrontendUrl = trimTrailingSlash(process.env.FRONTEND_URL || '');

  if (!configuredFrontendUrl) {
    return process.env.NODE_ENV === 'production' ? CANONICAL_FRONTEND_URL : LOCAL_FRONTEND_URL;
  }

  try {
    const parsedUrl = new URL(configuredFrontendUrl);
    const hostname = parsedUrl.hostname.toLowerCase();

    if (hostname === 'nawirihairke.com' || hostname === 'www.nawirihairke.com') {
      return CANONICAL_FRONTEND_URL;
    }

    return trimTrailingSlash(parsedUrl.origin);
  } catch {
    return configuredFrontendUrl;
  }
};

const buildFrontendRedirectUrl = (path, { query = {}, hash = {} } = {}) => {
  const frontendBaseUrl = getFrontendBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const queryParams = new URLSearchParams();
  const hashParams = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.set(key, String(value));
    }
  });

  Object.entries(hash).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      hashParams.set(key, String(value));
    }
  });

  const queryString = queryParams.toString();
  const hashString = hashParams.toString();

  return `${frontendBaseUrl}${normalizedPath}${queryString ? `?${queryString}` : ''}${hashString ? `#${hashString}` : ''}`;
};

// Helper function to generate tokens and create response
const handleSocialAuthSuccess = async (req, res) => {
  try {
    const user = req.user;
    const accessToken = await generatedAccessToken(user._id);
    const refreshToken = await genertedRefreshToken(user._id);

    // Update last login timestamp (Passport strategy only does this for existing users;
    // this ensures new OAuth users also get it stamped after token generation)
    await user.constructor.findByIdAndUpdate(user._id, {
      last_login_date: new Date(),
      lastLogin: new Date(),
    }).catch(() => {}); // non-blocking, best-effort
    
    // Set cookies for security (same as in regular login)
    const cookiesOption = {
      httpOnly: true,
      secure: true,
      sameSite: "None"
    };
    
    res.cookie('accessToken', accessToken, cookiesOption);
    res.cookie('refreshToken', refreshToken, cookiesOption);
    
    // Fetch loyalty card info if available
    const loyaltyCard = await LoyaltyCard.findOne({ userId: user._id });
    const loyaltyPoints = loyaltyCard?.points || 0;
    const loyaltyClass = loyaltyCard?.tier || "Basic";

    // Redirect to frontend with tokens in the URL hash so edge/CDN layers do not
    // receive sensitive JWT query parameters (which can trigger 403 blocks).
    res.redirect(
      buildFrontendRedirectUrl('/social-auth-success', {
        hash: {
          accessToken,
          refreshToken,
          userId: user._id,
          name: user.name,
          email: user.email,
          role: user.role || 'user',
          isAdmin: Boolean(user.isAdmin),
          isStaff: Boolean(user.isStaff || user.role === 'staff' || user.isAdmin),
          isDelivery: Boolean(user.isDelivery || user.role === 'delivery'),
          loyaltyPoints,
          loyaltyClass,
        },
      })
    );
  } catch (error) {
    console.error('Social auth error:', error);
    res.redirect(
      buildFrontendRedirectUrl('/login', {
        query: {
          error: 'Authentication failed',
        },
      })
    );
  }
};

// Helper function to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: '1d' }
  );
};

// Google OAuth routes - Only register if credentials are available
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  // Availability probe for clients using HEAD
  router.head('/google', (req, res) => res.sendStatus(200));
  router.get('/google', (req, res, next) => {
    const callbackURL = getGoogleCallbackUrlForRequest(req);

    return passport.authenticate('google', {
      scope: ['profile', 'email'],
      ...(callbackURL ? { callbackURL } : {}),
    })(req, res, next);
  });

  router.get(
    '/google/callback',
    (req, res, next) => {
      const callbackURL = getGoogleCallbackUrlForRequest(req);

      return passport.authenticate('google', {
        failureRedirect: buildFrontendRedirectUrl('/login', {
          query: {
            error: 'Authentication failed',
          },
        }),
        session: false,
        ...(callbackURL ? { callbackURL } : {}),
      })(req, res, next);
    },
    // Use the unified success handler that generates tokens with the correct secrets
    handleSocialAuthSuccess
  );
} else {
  // Fallback routes when Google OAuth is not configured
  router.head('/google', (req, res) => res.sendStatus(503));
  router.get('/google', (req, res) => {
    res.status(503).json({
      error: true,
      message: 'Google OAuth is not configured on this server. Please contact the administrator.'
    });
  });
  
  router.get('/google/callback', (req, res) => {
    res.redirect(
      buildFrontendRedirectUrl('/login', {
        query: {
          error: 'oauth_not_configured',
        },
      })
    );
  });
}

export default router;