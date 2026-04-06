# Vercel deployment plan for Nawiri Hair

## Recommended production setup

- Frontend: Vercel
- Backend API + Socket.IO: Render or Railway
- Main domain: `nawirihairke.com`
- Optional API subdomain: `api.nawirihairke.com`

This project's `client` is a Vite SPA and is a good fit for Vercel.

The current `server` is not a clean Vercel fit because it runs a long-lived Express server with Socket.IO. Vercel supports Express, but Vercel Functions do not support acting as a WebSocket server, so delivery tracking and other realtime features would break if the current backend moved there unchanged.

## What is already prepared in this repo

- Root [vercel.json](../vercel.json) builds and deploys the `client` app from the repo root
- [client/vercel.json](../client/vercel.json) enables SPA deep-link routing on Vercel
- [client/.env.example](../client/.env.example) shows the frontend production API variable
- [server/.env.example](../server/.env.example) shows the production frontend/backend URLs the API should use

## Production URLs to use

- Frontend production URL: `https://nawirihairke.com`
- Frontend redirect URL: `https://www.nawirihairke.com`
- Backend API URL: `https://api.nawirihairke.com`

## 1. Deploy the backend first

Deploy the `server` folder to a host that supports a long-running Node server and WebSockets.

Good options:

- Render
- Railway
- Fly.io

Use these service settings on the backend host:

- Root directory: `server`
- Build command: `npm install`
- Start command: `npm start`

Set these environment variables on the backend host:

- `NODE_ENV=production`
- `PORT` provided by the host
- `MONGODB_URI`
- `JWT_SECRET`
- `SECRET_KEY_ACCESS_TOKEN`
- `SECRET_KEY_REFRESH_TOKEN`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_ENPOINT_WEBHOOK_SECRET_KEY` if your Stripe webhook flow still relies on that legacy variable
- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_PASSKEY`
- `MPESA_SHORTCODE`
- `PESAPAL_CONSUMER_KEY`
- `PESAPAL_CONSUMER_SECRET`
- `PESAPAL_BASE_URL`
- `PESAPAL_CALLBACK_URL=https://api.nawirihairke.com/api/pesapal/callback`
- `PESAPAL_SUCCESS_URL=https://nawirihairke.com/order-success`
- `PESAPAL_FAILURE_URL=https://nawirihairke.com/checkout`
- `PESAPAL_NOTIFICATION_ID`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `RESEND_API`
- `EMAIL_FROM`
- `EMAIL_REPLY_TO`
- `FRONTEND_URL=https://nawirihairke.com`
- `BACKEND_URL=https://api.nawirihairke.com`

If you use Google login, add this production callback in Google Cloud:

- `https://api.nawirihairke.com/api/auth/google/callback`

Recommended Google OAuth origins:

- `https://nawirihairke.com`
- `https://www.nawirihairke.com`
- `https://api.nawirihairke.com`

Once that backend is live, test:

- `GET /`
- `GET /api/category/get`
- Google login redirect
- one authenticated login request
- one Socket.IO-powered delivery or pickup screen

## 2. Deploy the frontend to Vercel

### Option A: Vercel dashboard

1. Import the Git repository into Vercel
2. Keep the project root as the repo root
3. Vercel will use the root `vercel.json`
4. Add frontend environment variables:
   - `VITE_SERVER_URL=https://api.nawirihairke.com`
   - `VITE_BACKEND_URL=https://api.nawirihairke.com`
5. Deploy

### Option B: Vercel CLI

From the repository root:

```bash
npm i -g vercel
vercel login
vercel
vercel --prod
```

Then add the same frontend environment variables in the Vercel project and redeploy if needed.

## 3. Connect your Porkbun domain

On Vercel:

1. Add `nawirihairke.com` to the project
2. Add `www.nawirihairke.com` too
3. Make one redirect to the other, usually `www` -> apex or apex -> `www`

At Porkbun, if you keep Porkbun DNS, open `Domain Management` -> `Edit DNS Records` and add:

- Apex `@` A record -> `76.76.21.21`
- `www` CNAME -> `cname.vercel-dns-0.com`

Important:

- Vercel may show project-specific DNS values after you add the domain
- Always trust the values Vercel shows in the project domain screen if they differ

For the API subdomain on your backend host:

- `api` CNAME -> the hostname your backend provider gives you

Example:

- if Render gives you `nawiri-hair-api.onrender.com`, set `api` -> `nawiri-hair-api.onrender.com`
- if Railway gives you `nawiri-hair-api.up.railway.app`, set `api` -> `nawiri-hair-api.up.railway.app`

## 4. Final production checklist

- Frontend loads on `nawirihairke.com`
- API requests go to `api.nawirihairke.com`
- CORS allows the frontend domain
- Google OAuth callback returns to the frontend domain
- Cloudinary uploads work
- Stripe/M-Pesa callbacks point to the backend domain
- Socket.IO delivery pages connect successfully
- Google login works with the production callback URL
- Transactional email sends from the verified brand identity

## 5. Branded email after the domain is live

To make your account, order, dispatch, and verification emails look fully professional:

1. Verify `nawirihairke.com` in your email provider, such as Resend
2. Add the DNS records that email provider gives you in Porkbun
3. Set:
   - `EMAIL_FROM=Nawiri Hair Kenya <noreply@nawirihairke.com>`
   - `EMAIL_REPLY_TO=nawirihairke@gmail.com`

Until the sending domain is verified, keep using the currently working sender identity to avoid email delivery failures.

## Official references

- Vercel custom domains: https://vercel.com/docs/domains/set-up-custom-domain
- Vercel Vite SPA rewrites: https://vercel.com/docs/frameworks/frontend/vite
- Express on Vercel: https://vercel.com/docs/frameworks/backend/express
- WebSocket limitation on Vercel Functions: https://vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections
