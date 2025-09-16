## Deploying to Render

This repo includes a Render Blueprint (`render.yaml`) that provisions:

- A Node.js Web Service for the API at `server/`
- A Static Site for the Vite React client at `client/`

### Prerequisites
- GitHub repo connected to Render
- Required secrets available (see below)

### One-time setup
1) Commit and push `render.yaml` (already present at repo root).
2) In the Render Dashboard:
	- Click New > Blueprint, connect this repo, pick your branch, and Apply.
	- When prompted for environment variables with `sync: false`, provide values for your secrets.

### Required environment variables

Backend (Web Service: `taji-cart-server`):
- MONGODB_URI (required)
- JWT_SECRET
- SECRET_KEY_ACCESS_TOKEN
- SECRET_KEY_REFRESH_TOKEN
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- RESEND_API
- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET_KEY
- MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY
- FRONTEND_URL (set after client deploy; e.g. https://taji-cart-client.onrender.com)
- BACKEND_URL (optional; if omitted, service falls back to Render’s external URL)

Frontend (Static Site: `taji-cart-client`):
- VITE_SERVER_URL (server public URL)
- VITE_BACKEND_URL (server public URL)
- VITE_API_URL (optional, defaults to /api)
- VITE_WEATHERAPI_KEY
- VITE_STRIPE_PUBLIC_KEY

### Order of operations
1) Apply Blueprint to create both services. The client can be built without VITE_* values, but API calls will fail until set.
2) After the server deploys, copy its public URL from the Dashboard and set:
	- On server: FRONTEND_URL to the client public URL (after step 3).
	- On client: VITE_SERVER_URL and VITE_BACKEND_URL to the server URL.
3) Redeploy the client to pick up the VITE_* variables.
4) Set server FRONTEND_URL to the client URL and redeploy server.

### Notes
- The server listens on `process.env.PORT` and uses CORS with `FRONTEND_URL`.
- M-Pesa callbacks use `BACKEND_URL` if set; otherwise it falls back to Render’s `RENDER_EXTERNAL_URL` or the inbound Host header.
- Static site includes SPA rewrite to `/index.html`.

### Troubleshooting
- If server health checks fail, confirm MongoDB connectivity (`MONGODB_URI`) and that the app binds to `PORT`.
- CORS errors: ensure `FRONTEND_URL` matches the client origin exactly.
- 404s on client refresh: rewrite rule is included in `render.yaml`.

