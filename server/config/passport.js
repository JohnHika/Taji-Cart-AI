import dotenv from 'dotenv';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { ExtractJwt, Strategy as JwtStrategy } from 'passport-jwt';
import LoyaltyCard from '../models/loyaltycard.model.js';
import UserModel from '../models/user.model.js';
import sendEmail from './sendEmail.js';
import welcomeEmailTemplate from '../utils/welcomeEmailTemplate.js';
import { resolveGoogleCallbackUrl } from '../utils/googleOAuth.js';

dotenv.config();

// Google OAuth callback URL - MUST be a fixed, pre-configured URL
// This URL must be added to Google Cloud Console > APIs & Services > Credentials > Authorized redirect URIs
// Do NOT use dynamically generated URLs from request headers - Google will reject them
const GOOGLE_CALLBACK_URL = resolveGoogleCallbackUrl();

if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET is not configured; passport JWT strategy will use fallback-secret.');
}

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
        callbackURL: GOOGLE_CALLBACK_URL,
        scope: ['profile', 'email']
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.find((entry) => entry?.value)?.value?.trim().toLowerCase();
          if (!email) {
            console.warn('Google OAuth profile did not include an email address.');
            return done(null, false, { message: 'Google did not provide an email address.' });
          }

          const profileName = profile.displayName || [profile.name?.givenName, profile.name?.familyName]
            .filter(Boolean)
            .join(' ') || email.split('@')[0];
          const profileAvatar = profile.photos?.[0]?.value || null;

          // Check if user already exists
          let user = await UserModel.findOne({ email });

          if (user) {
            // Update last login and Google ID if missing
            const updates = {
              last_login_date: new Date(),
              lastLogin: new Date(),
            };
            if (!user.googleId) {
              updates.googleId = profile.id;
              updates.avatar = user.avatar || profileAvatar;
              updates.authType = 'google';
            }
            await UserModel.findByIdAndUpdate(user._id, updates);
          } else {
            // Create new user
            user = await new UserModel({
              name: profileName,
              email,
              googleId: profile.id,
              authType: 'google',
              avatar: profileAvatar,
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
