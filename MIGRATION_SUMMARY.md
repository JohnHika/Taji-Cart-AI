# Microsoft to Google OAuth Migration Summary

## Completed Changes

### 1. Server-side Changes

#### ✅ Updated Passport Configuration (`server/config/passport.js`)
- Removed Microsoft OAuth strategy
- Added Google OAuth strategy using `passport-google-oauth20`
- Updated callback URLs and scope settings
- Maintained loyalty card creation for new Google users

#### ✅ Updated Authentication Routes (`server/routes/auth.routes.js`)
- Removed Microsoft OAuth routes (`/auth/microsoft` and `/auth/microsoft/callback`)
- Maintained Google OAuth routes (`/auth/google` and `/auth/google/callback`)
- Updated redirect URLs and token generation

#### ✅ Updated User Model (`server/models/user.model.js`)
- Removed `microsoftId` field
- Kept `googleId` field
- Updated `authType` enum to remove 'microsoft' option
- Maintained sparse indexing for Google ID

#### ✅ Updated Dependencies (`server/package.json`)
- Removed `passport-microsoft` package
- Kept `passport-google-oauth20` package
- Maintained other authentication-related packages

### 2. Client-side Changes

#### ✅ Updated Social Authentication Component (`client/src/components/SocialAuth.jsx`)
- Replaced Microsoft login button with Google login button
- Updated icon from `FaMicrosoft` to `FaGoogle`
- Changed callback URL from `/auth/microsoft` to `/auth/google`
- Updated styling to use Google brand colors

### 3. Documentation and Configuration

#### ✅ Created Environment Variables Documentation
- `ENVIRONMENT_VARIABLES.md` - Comprehensive setup guide
- `server/.env.example` - Server environment template
- `client/.env.example` - Client environment template

#### ✅ Environment Variables Required
**New (Google OAuth):**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

**Removed (Microsoft OAuth):**
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`

## Setup Instructions

### 1. Google Cloud Console Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select a project
3. Enable Google+ API or Google People API
4. Create OAuth 2.0 credentials:
   - Type: Web application
   - Authorized origins: `http://localhost:5173` (development)
   - Redirect URIs: `http://localhost:8080/api/auth/google/callback`

### 2. Environment Configuration
1. Copy `server/.env.example` to `server/.env`
2. Copy `client/.env.example` to `client/.env`
3. Add your Google OAuth credentials to `server/.env`:
   ```
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

### 3. Install Dependencies
```bash
cd server
npm install

cd ../client
npm install
```

### 4. Start the Application
```bash
# Terminal 1 - Server
cd server
npm run dev

# Terminal 2 - Client
cd client
npm run dev
```

## Testing

1. Navigate to the login page
2. Click "Google" button under "Or continue with"
3. Complete Google OAuth flow
4. Verify user is created and logged in successfully
5. Check that loyalty card is created for new users

## Files Modified

- `server/config/passport.js`
- `server/routes/auth.routes.js`
- `server/models/user.model.js`
- `server/package.json`
- `client/src/components/SocialAuth.jsx`

## Files Created

- `ENVIRONMENT_VARIABLES.md`
- `server/.env.example`
- `client/.env.example`

## Migration Notes

- All existing users with Google accounts will continue to work
- Users previously logged in via Microsoft will need to create new accounts or link their existing email-based accounts
- The `SocialAuthSuccess.jsx` component remains unchanged and will handle Google OAuth responses
- Database migration may be needed to remove `microsoftId` fields from existing users (optional cleanup)
