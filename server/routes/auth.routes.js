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
    process.env.JWT_SECRET || 'your-jwt-secret',
    { expiresIn: '1d' }
  );
};

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  (req, res) => {
    // Create JWT token
    const token = generateToken(req.user);
    
    // Create a sanitized version of the user object for the frontend
    const userData = {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      mobile: req.user.mobile || '',
      avatar: req.user.avatar || '',
      isAuthenticated: true,
      role: req.user.role || 'user',
    };
    
    // Redirect to the frontend with token and user data
    res.redirect(
      `${process.env.FRONTEND_URL || 'http://localhost:5173'}/social-auth-success?token=${token}&userData=${encodeURIComponent(JSON.stringify(userData))}`
    );
  }
);

export default router;