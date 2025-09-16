# Environment Variables Configuration

This document outlines the required environment variables for the Taji Cart AI application.

## Server Environment Variables (.env)

### Database Configuration
```
MONGODB_URI=your_mongodb_connection_string
```

### JWT Configuration
```
SECRET_KEY_ACCESS_TOKEN=your_jwt_access_token_secret
SECRET_KEY_REFRESH_TOKEN=your_jwt_refresh_token_secret
JWT_SECRET=your_general_jwt_secret
```

### Google OAuth Configuration
To set up Google OAuth authentication, you need to:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Create OAuth 2.0 credentials
5. Add your domain to authorized domains
6. Set the redirect URI to: `https://yourdomain.com/api/auth/google/callback`

```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Frontend URL
```
FRONTEND_URL=http://localhost:5173
```

### Email Configuration
```
EMAIL_HOST=your_email_host
EMAIL_PORT=587
EMAIL_USER=your_email_user
EMAIL_PASS=your_email_password
```

### Other Services
```
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

## Client Environment Variables (.env)

```
VITE_SERVER_URL=http://localhost:8080
VITE_BACKEND_URL=http://localhost:8080
VITE_API_URL=http://localhost:8080
```

## Migration Notes

### Removed Microsoft OAuth
The following environment variables are no longer needed and should be removed:
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`

### Added Google OAuth
The following environment variables have been added:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

### Google OAuth Setup Steps

1. **Create Google Cloud Project**:
   - Visit [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable the "Google+ API" or "Google People API"

2. **Create OAuth 2.0 Credentials**:
   - Go to "Credentials" in the left sidebar
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized JavaScript origins: `http://localhost:5173` (for development)
   - Add authorized redirect URIs: `http://localhost:8080/api/auth/google/callback`

3. **Configure Environment Variables**:
   - Copy the Client ID and Client Secret to your `.env` file
   - Ensure `FRONTEND_URL` points to your frontend URL

4. **Test the Integration**:
   - Start both server and client
   - Try logging in with Google from the login page
   - Verify that user data is properly stored and sessions work correctly

## Security Notes

- Never commit `.env` files to version control
- Use different credentials for development and production
- Regularly rotate secrets and API keys
- Ensure HTTPS is enabled in production for OAuth callbacks
