import dotenv from 'dotenv';
import express from 'express';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import LoyaltyCard from '../models/loyaltycard.model.js';
import generatedAccessToken from '../utils/generatedAccessToken.js';
import genertedRefreshToken from '../utils/generatedRefreshToken.js';

dotenv.config();
const router = express.Router();

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
    
    // Redirect to frontend with tokens as URL parameters
    // The frontend will extract these and store them in sessionStorage
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    res.redirect(`${frontendURL}/social-auth-success?accessToken=${accessToken}&refreshToken=${refreshToken}&userId=${user._id}&name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}&loyaltyPoints=${loyaltyPoints}&loyaltyClass=${encodeURIComponent(loyaltyClass)}`);
  } catch (error) {
    console.error('Social auth error:', error);
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendURL}/login?error=Authentication%20failed`);
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
  router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

  router.get(
    '/google/callback',
    passport.authenticate('google', { failureRedirect: '/login', session: false }),
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
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=oauth_not_configured`);
  });
}

export default router;