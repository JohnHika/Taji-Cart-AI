# Environment Variables

This project uses .env files for configuration under `server/.env` and `client/.env`.

## MongoDB Configuration
- `MONGODB_URI`: MongoDB Atlas connection string (format: `mongodb+srv://username:password@cluster.mongodb.net/`)

## Pesapal Configuration
- `PESAPAL_CONSUMER_KEY`: Pesapal API consumer key
- `PESAPAL_CONSUMER_SECRET`: Pesapal API consumer secret
- `PESAPAL_BASE_URL`: e.g., `https://cybqa.pesapal.com/pesapalv3`
- `PESAPAL_CALLBACK_URL`: Public HTTPS callback URL (e.g., your ngrok URL `/api/pesapal/callback`)
- `PESAPAL_NOTIFICATION_ID`: Your registered IPN ID from the Pesapal dashboard
- `PESAPAL_SUCCESS_URL`: Frontend success URL
- `PESAPAL_FAILURE_URL`: Frontend failure URL

### Registering an IPN ID for Pesapal
To avoid the "InvalidIpnId" error, register an Instant Payment Notification (IPN) ID in the Pesapal dashboard:
1. Log in to https://cybqa.pesapal.com (sandbox) or your production dashboard.
2. Go to Settings → IPN Configuration.
3. Add a new IPN (provide a label). Pesapal will generate an IPN ID.
4. Set the callback URL to your public HTTPS endpoint (e.g., `https://<ngrok>.ngrok-free.app/api/pesapal/callback`).
5. Copy the IPN ID and set `PESAPAL_NOTIFICATION_ID` in `server/.env`.
6. Restart the server to apply changes.

Tip: You can verify the server sees the env with `GET /api/pesapal/health` (see below).

## Google OAuth Configuration
- `GOOGLE_CLIENT_ID`: OAuth client ID from Google Cloud Console (type: Web application)
- `GOOGLE_CLIENT_SECRET`: OAuth client secret from Google Cloud Console
- `FRONTEND_URL`: Base URL the server should redirect to after social login (e.g., `http://localhost:5173` in dev, production domain in prod)

Authorized redirect URI registered with Google must exactly match your backend callback, e.g. `http://localhost:8080/api/auth/google/callback` for local dev. For production, use your public HTTPS domain such as `https://api.your-domain.com/api/auth/google/callback`.
