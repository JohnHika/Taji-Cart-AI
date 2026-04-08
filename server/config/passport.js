import dotenv from 'dotenv';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { ExtractJwt, Strategy as JwtStrategy } from 'passport-jwt';
import LoyaltyCard from '../models/loyaltycard.model.js';
import UserModel from '../models/user.model.js';
import sendEmail from './sendEmail.js';
import welcomeEmailTemplate from '../utils/welcomeEmailTemplate.js';

dotenv.config();

// Debug: Check if JWT_SECRET is loaded
console.log('JWT_SECRET in passport config:', process.env.JWT_SECRET);

// JWT Strategy for authenticating API requests
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET || 'fallback-secret'
};

passport.use(
  new JwtStrategy(jwtOptions, async (payload, done) => {
    try {
      const user = await UserModel.findById(payload.id).select('-password');
      if (!user) {
        return done(null, false);
      }
      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  })
);

// Google OAuth Strategy - Only initialize if credentials are available
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  console.log('Initializing Google OAuth strategy');
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || `${(process.env.SERVER_URL || '').replace(/\/$/, '')}/api/auth/google/callback`,
        scope: ['profile', 'email']
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user already exists
          let user = await UserModel.findOne({ email: profile.emails[0].value });

          if (user) {
            // If user exists but was registered via email, update their Google ID
            if (!user.googleId) {
              user.googleId = profile.id;
              user.avatar = user.avatar || profile.photos[0]?.value || null;
              await user.save();
            }
          } else {
            // Create new user
            user = await new UserModel({
              name: profile.displayName || profile.name?.givenName + ' ' + profile.name?.familyName,
              email: profile.emails[0].value,
              googleId: profile.id,
              avatar: profile.photos[0]?.value,
              verify_email: true, // Auto-verify email for Google sign-ups
              status: 'Active'
            }).save();

            // Create loyalty card for new user
            try {
              const loyaltyCard = new LoyaltyCard({
                userId: user._id,
                cardNumber: `NAWIRI${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000)}`,
                tier: 'Basic',
                points: 100, // Welcome points
                transactionHistory: [{
                  type: 'signup_bonus',
                  amount: 100,
                  description: 'Welcome bonus for signing up'
                }]
              });
              await loyaltyCard.save();
            } catch (loyaltyError) {
              console.error('Error creating loyalty card:', loyaltyError);
              // Continue with auth flow even if loyalty card creation fails
            }

            // Send welcome email to new Google sign-up (non-blocking)
            sendEmail({
              sendTo: user.email,
              subject: 'Welcome to Nawiri Hair Kenya!',
              html: welcomeEmailTemplate({ name: user.name }),
            }).catch((err) => console.error('Welcome email failed:', err.message));
          }

          return done(null, user);
        } catch (error) {
          return done(error, false);
        }
      }
    )
  );
} else {
  console.warn('⚠️  Google OAuth credentials not found. Google authentication will be disabled.');
  console.log('To enable Google OAuth, set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await UserModel.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;