import dotenv from 'dotenv';
import passport from 'passport';
import { ExtractJwt, Strategy as JwtStrategy } from 'passport-jwt';
import { Strategy as MicrosoftStrategy } from 'passport-microsoft';
import LoyaltyCard from '../models/loyaltycard.model.js';
import UserModel from '../models/user.model.js';

dotenv.config();

// JWT Strategy for authenticating API requests
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
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

// NOTE: Google OAuth has been replaced with Clerk authentication.
// The Google OAuth strategy implementation has been removed.
// See the client-side Clerk implementation for Google sign-in functionality.

// Microsoft OAuth Strategy
passport.use(
  new MicrosoftStrategy(
    {
      clientID: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      callbackURL: '/api/auth/microsoft/callback',
      scope: ['user.read', 'openid', 'profile', 'email']
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists
        let user = await UserModel.findOne({ email: profile.emails[0].value });

        if (user) {
          // If user exists but was registered via email, update their Microsoft ID
          if (!user.microsoftId) {
            user.microsoftId = profile.id;
            user.avatar = user.avatar || profile._json.avatar || null;
            await user.save();
          }
        } else {
          // Create new user
          user = await new UserModel({
            name: profile.displayName || profile._json.name,
            email: profile.emails[0].value,
            microsoftId: profile.id,
            avatar: profile._json.avatar,
            verify_email: true, // Auto-verify email for Microsoft sign-ups
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
        }

        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

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