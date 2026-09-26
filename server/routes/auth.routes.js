import dotenv from 'dotenv';
import express from 'express';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import LoyaltyCard from '../models/loyaltycard.model.js';
import generatedAccessToken from '../utils/generatedAccessToken.js';
import genertedRefreshToken from '../utils/generatedRefreshToken.js';
import trimTrailingSlash from '../utils/trimTrailingSlash.js';
import { hasGoogleOAuthCredentials, resolveGoogleCallbackUrl } from '../utils/googleOAuth.js';

dotenv.config();
const router = express.Router();

const LOCAL_FRONTEND_URL = 'http://localhost:5173';
const CANONICAL_FRONTEND_URL = 'https://nawirihairke.com';

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

// Mirrors the client-side check in client/src/utils/postLoginRedirect.js —
// only a same-site relative path the SPA itself generated is safe to bounce
// back to after OAuth. Anything absolute/protocol-relative could redirect
// off-site, and looping back into the auth pages themselves defeats the point.
const AUTH_PAGE_PATHS = new Set(['/', '/login', '/register', '/forgot-password', '/verification-otp', '/reset-password', '/verify-email', '/social-auth-success']);

const sanitizeReturnTo = (value) => {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return null;
  }
  const pathname = value.split(/[?#]/)[0];
  if (AUTH_PAGE_PATHS.has(pathname)) {
    return null;
  }
  return value;
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

    // The tokens travel to the frontend in the URL hash — but browsers do
    // NOT forward #fragments across HTTP redirects (e.g. www -> apex 308,
    // http -> https, or any proxy hop), which stranded users on
    // "Authentication failed. Missing token." This one-shot readable cookie
    // on the frontend's parent domain is the recovery channel: the landing
    // page reads the hash first, then falls back to this cookie, then clears
    // it. httpOnly stays false ONLY because the SPA must read it once;
    // it is deleted immediately after handoff client-side (and is
    // single-use by construction — the server never sets it again except on
    // a fresh OAuth callback).
    try {
      const frontendUrl = new URL(getFrontendBaseUrl());
      const parentDomain = frontendUrl.hostname.includes('nawirihairke.com')
        ? '.nawirihairke.com'
        : frontendUrl.hostname;
      res.cookie('oauth_handoff', JSON.stringify({
        accessToken,
        refreshToken,
        userId: String(user._id),
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'user',
        isAdmin: Boolean(user.isAdmin),
        isStaff: Boolean(user.isStaff || user.role === 'staff' || user.isAdmin),
        isDelivery: Boolean(user.isDelivery || user.role === 'delivery'),
        loyaltyPoints,
        loyaltyClass,
      }), {
        domain: parentDomain,
        httpOnly: false,
        secure: true,
        sameSite: 'Lax',
        path: '/social-auth-success',
        maxAge: 60 * 1000, // survives one landing; the page deletes it on read
      });
    } catch (cookieError) {
      console.error('oauth_handoff cookie failed:', cookieError);
      // Non-fatal — hash delivery may still work; do not block the redirect.
    }

    // The original returnTo never survives the round trip to Google as a
    // plain query param — Google's redirect back to our fixed callback URL
    // only echoes `code` and `state`, dropping any other query params we set
    // on the initial authorize redirect. It's carried instead as the OAuth
    // `state` param (set below, on the /google route) and re-validated here
    // in case /google/callback is ever hit directly with a forged state.
    const returnTo = sanitizeReturnTo(req.query.state ? decodeURIComponent(req.query.state) : null) || '/';

    // Redirect to frontend with tokens in the URL hash so edge/CDN layers do not
    // receive sensitive JWT query parameters (which can trigger 403 blocks).
    // Pass returnTo as a query parameter to redirect to the original URL after auth.
    res.redirect(
      buildFrontendRedirectUrl('/social-auth-success', {
        query: {
          returnTo,
        },
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

// Google OAuth callback URL - MUST match what's configured in Google Cloud Console
// Do NOT use dynamically generated URLs from request headers - Google will reject them
const GOOGLE_CALLBACK_URL = resolveGoogleCallbackUrl();
const buildOAuthFailureRedirect = (reason = 'Authentication failed') => buildFrontendRedirectUrl('/login', {
  query: { error: reason },
});

const authenticateGoogleCallback = (req, res, next) => passport.authenticate(
  'google',
  { session: false, callbackURL: GOOGLE_CALLBACK_URL },
  (error, user, info) => {
    if (error) {
      console.error('Google OAuth callback failed:', {
        name: error.name,
        message: error.message,
      });
      return res.redirect(buildOAuthFailureRedirect('oauth_callback_failed'));
    }

    if (!user) {
      console.warn('Google OAuth callback was rejected:', info?.message || 'No user returned');
      // `info.reason` carries a specific short code (e.g. a suspended
      // account, set in passport.js) when the strategy's verify callback
      // supplied one; otherwise fall back to the generic message.
      return res.redirect(buildOAuthFailureRedirect(info?.reason || 'Authentication failed'));
    }

    req.user = user;
    return handleSocialAuthSuccess(req, res, next);
  }
)(req, res, next);

// Google OAuth routes - Only register if credentials are available
if (hasGoogleOAuthCredentials()) {
  // Availability probe for clients using HEAD
  router.head('/google', (req, res) => res.sendStatus(200));
  router.get('/google', (req, res, next) => {
    const returnTo = sanitizeReturnTo(req.query.returnTo) || '/';

    return passport.authenticate('google', {
      scope: ['profile', 'email'],
      callbackURL: GOOGLE_CALLBACK_URL,
      // The only reliable way to carry our own data across the redirect to
      // Google and back — Google echoes `state` verbatim on the callback,
      // but drops any other query params we might have set here. Read back
      // (and re-sanitized) as req.query.state in handleSocialAuthSuccess.
      state: encodeURIComponent(returnTo),
    })(req, res, next);
  });

  router.get('/google/callback', authenticateGoogleCallback);
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
