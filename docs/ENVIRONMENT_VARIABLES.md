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
- `FRONTEND_URL`: Base URL the server should redirect to after social login (e.g., `http://localhost:5173` in dev, `https://nawirihairke.com` in production)

### Setting up Google OAuth (first time)
1. Go to https://console.cloud.google.com → select your project
2. **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
3. Application type: **Web application**, Name: `Nawiri Hair Kenya`
4. **Authorized JavaScript Origins** — add all of these:
   ```
   https://nawirihairke.com
   https://www.nawirihairke.com
   https://<your-render-backend>.onrender.com
   http://localhost:5173   (dev only)
   ```
5. **Authorized Redirect URIs** — must be exact:
   ```
   https://<your-render-backend>.onrender.com/api/auth/google/callback
   http://localhost:5000/api/auth/google/callback   (dev only)
   ```
6. Click **Create** → copy Client ID and Client Secret into your Render environment variables.

> The redirect URI in step 5 must match exactly what the server receives. The path is always `/api/auth/google/callback`.

## Email / SMTP Configuration

The server uses Nodemailer and supports any SMTP provider. For production on `nawirihairke.com`, use **Resend.com** (free tier: 3,000 emails/month, custom domain support).

### Resend.com Setup (recommended for nawirihairke.com)
1. Sign up at https://resend.com
2. Go to **Domains → Add Domain** → enter `nawirihairke.com`
3. Add the DNS records Resend provides (TXT + DKIM/SPF) at your domain registrar
4. Wait for domain verification (usually under 10 minutes)
5. Go to **API Keys → Create API Key** → copy the key

**Render environment variables:**
```
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=resend
SMTP_PASS=<your-resend-api-key>
EMAIL_FROM=Nawiri Hair Kenya <noreply@nawirihairke.com>
EMAIL_REPLY_TO=nawirihairke@gmail.com
```

### Alternative: Gmail App Password (simpler, but sends from Gmail address)
1. Enable 2FA on your Google account
2. Go to https://myaccount.google.com/apppasswords → create an App Password for "Mail"
3. Use the 16-character app password as `SMTP_PASS`

```
SMTP_SERVICE=gmail
SMTP_USER=nawirihairke@gmail.com
SMTP_PASS=<16-char-app-password>
EMAIL_FROM=Nawiri Hair Kenya <nawirihairke@gmail.com>
EMAIL_REPLY_TO=nawirihairke@gmail.com
```

### Environment variable reference
| Variable | Required | Description |
|----------|----------|-------------|
| `SMTP_HOST` | If not using `SMTP_SERVICE` | SMTP server hostname (e.g. `smtp.resend.com`) |
| `SMTP_PORT` | No | Port, defaults to `587` |
| `SMTP_SECURE` | No | `true` for port 465, `false` for 587 (STARTTLS) |
| `SMTP_USER` | Yes | SMTP username (use `resend` for Resend.com) |
| `SMTP_PASS` | Yes | SMTP password or API key |
| `SMTP_SERVICE` | Alternative | Named service (e.g. `gmail`) — skips host/port config |
| `EMAIL_FROM` | No | Sender display name + address. Defaults to brand name + SMTP user |
| `EMAIL_REPLY_TO` | No | Reply-to address. Defaults to `nawirihairke@gmail.com` |

## Authentication & Security

- `JWT_SECRET`: Strong random string used to sign access tokens. **Required in production.** Generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- `SESSION_SECRET`: Strong random string for Express session signing. **Required in production.** Generate the same way as JWT_SECRET.

> Never use default/fallback values in production. Always set both secrets explicitly on Render.
