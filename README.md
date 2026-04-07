# Taji Cart AI

Full-stack e-commerce and retail platform with an AI-assisted shopping experience. It combines a React storefront, a Node.js API, MongoDB, real-time features, and optional Python-based recommendations.

## What’s included

- **Storefront**: Product catalog, categories, cart, checkout, delivery tracking, maps, and weather-aware delivery UI (optional API key).
- **Accounts & auth**: JWT-based sessions, refresh tokens, and optional Google OAuth when configured.
- **Payments**: Stripe, M-Pesa (Safaricom), and Pesapal integrations (each needs its own credentials and webhook/callback setup).
- **Operations**: Point-of-sale (`/api/pos`), loyalty program (tiers, cards, admin tools), community campaigns, and file uploads (Cloudinary).
- **AI & chat**: Chat API with optional RAG (retrieval-augmented generation) using OpenAI and/or Hugging Face embeddings, plus optional reasoning via Ollama or other providers when enabled.
- **Realtime**: Socket.IO for live updates when the server is running with WebSocket support (Vite dev server proxies `/socket.io` to the backend).

For deeper documentation on the hybrid recommendation stack (LightFM, data collection, training), see [docs/server/recommendation/README.md](docs/server/recommendation/README.md).

## Tech stack

| Layer | Technologies |
|--------|----------------|
| Client | React 18, Vite 5, Redux Toolkit, React Router, MUI, Tailwind CSS, Leaflet, Socket.IO client, Stripe.js |
| Server | Express, Mongoose, Passport, Socket.IO, Helmet, rate limiting |
| Data | MongoDB |
| Media & email | Cloudinary, Nodemailer (SMTP) |
| Optional ML | Python 3.10+ (see `server/recommendation/` and the docs above) |

## Repository layout

```
client/          # Vite + React SPA (port 5173 by default)
server/          # Express API entry: index.js (port 5000 by default)
docs/            # Extra guides (e.g. recommendation system)
```

The repository root `package.json` only holds a small shared dependency; day-to-day development uses `client/` and `server/` separately.

## Prerequisites

- **Node.js** 18+ recommended (matches Vite 5 and current dependencies).
- **MongoDB** reachable via connection string (local or Atlas).
- **Python 3.10+** only if you plan to run the recommendation pipelines or Flask sidecar described in the docs.

## Quick start

### 1. Backend

```bash
cd server
npm install
```

Create `server/.env` with at least the variables in [Server environment](#server-environment) (minimum: `MONGODB_URI`, JWT/secret keys, `FRONTEND_URL` for production).

```bash
npm run dev
```

The API listens on `PORT` or **5000** by default.

### 2. Frontend

```bash
cd client
npm install
```

Create `client/.env` (see [Client environment](#client-environment)). For local development, typical values proxy API traffic through Vite:

```env
VITE_API_URL=/api
VITE_BACKEND_URL=http://localhost:5000
VITE_SERVER_URL=http://localhost:5000
```

```bash
npm run dev
```

Open the URL Vite prints (default **http://localhost:5173**). Requests to `/api`, `/auth`, and `/socket.io` are proxied to the backend (`VITE_BACKEND_TARGET` overrides the proxy target, default `http://localhost:5000`).

### 3. Seed data (optional)

Hair/catalog sample data and related scripts live under `server/seed/`. Example:

```bash
cd server
npm run seed:hair
```

Requires `MONGODB_URI` and, for image uploads, Cloudinary variables if the seed uploads assets.

## Scripts

**Client** (`client/package.json`)

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite dev server with API proxy |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |

**Server** (`server/package.json`)

| Script | Purpose |
|--------|---------|
| `npm run dev` | Nodemon on `index.js` |
| `npm start` | Node on `index.js` |
| `npm run offline` | Offline-oriented startup script |
| `npm run db:diagnose` | MongoDB connectivity diagnostics |
| `npm run seed:hair` | Seed hair/catalog data |
| `npm run import:excel` | Import catalog from Excel |
| `npm run recommendation-collect` / `recommendation-train` | Python recommendation pipeline |

## Environment configuration

Never commit real `.env` files or secrets. Use your host’s secret manager in production.

### Client environment

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Often `/api` in dev so calls go through the Vite proxy |
| `VITE_BACKEND_URL` / `VITE_SERVER_URL` | Backend origin; in dev the client may still use the browser origin so the proxy applies (see `client/src/common/apiBaseUrl.js`) |
| `VITE_BACKEND_TARGET` | Proxy target for Vite (`vite.config.js`), default `http://localhost:5000` |
| `VITE_STRIPE_PUBLIC_KEY` | Stripe publishable key for checkout |
| `VITE_WEATHERAPI_KEY` | Optional weather on delivery/map flows |

### Server environment (overview)

**Core**

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | MongoDB connection string |
| `PORT` | HTTP port (default 5000) |
| `FRONTEND_URL` | Deployed SPA URL (CORS, redirects, Stripe success/cancel, emails) |
| `JWT_SECRET` | JWT signing |
| `SECRET_KEY_ACCESS_TOKEN` / `SECRET_KEY_REFRESH_TOKEN` | Access/refresh token secrets |

**Auth (optional)**

| Variable | Purpose |
|----------|---------|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |

**Payments**

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Stripe server SDK |
| `STRIPE_ENPOINT_WEBHOOK_SECRET_KEY` | Stripe webhook verification (name as used in order controller) |
| `MPESA_SHORTCODE`, `MPESA_PASSKEY`, etc. | M-Pesa STK / callbacks |
| `PESAPAL_*` | Pesapal base URL, keys, callback, notification ID |

**Media & mail**

| Variable | Purpose |
|----------|---------|
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET_KEY` | Image uploads |
| `SMTP_*` / `MAILER_*`, `EMAIL_FROM`, `EMAIL_REPLY_TO` | Outbound email |

**AI / RAG (optional)**

| Variable | Purpose |
|----------|---------|
| `RAG_ENABLED` | Enable RAG paths that require configuration |
| `OPENAI_API_KEY` | OpenAI chat/embeddings |
| `RAG_EMBED_PROVIDER`, `HF_TOKEN`, `HF_EMBED_MODEL` | Alternative embedding provider |
| `REASONING_ENABLED`, `REASONING_PROVIDER`, `OLLAMA_BASE_URL`, `REASONING_MODEL` | Optional reasoning layer |

**Development**

| Variable | Purpose |
|----------|---------|
| `NAWIRI_OFFLINE_MODE` | Development offline mode (see `connectDB.js`; not for production) |
| `NODE_ENV` | `development` / `production` |

The server also maintains an explicit CORS allowlist in `server/index.js`; add your production frontend origin via `FRONTEND_URL` or update the list for new domains.

## API surface (high level)

Routes are mounted under `/api` (and `/auth` for OAuth-related flows), including:

- Users, auth, categories, subcategories, products, cart, addresses, orders  
- Stripe, M-Pesa, Pesapal  
- Uploads, chat, loyalty, community campaigns, tracking, delivery, POS  
- Admin loyalty and user search endpoints under `/api/admin/...`

A health-style check is available at `GET /` on the API root.

## Deployment notes

- Set `FRONTEND_URL` to the canonical HTTPS URL of the built client.
- Ensure MongoDB network access (IP allowlist for Atlas, TLS, etc.).
- Configure payment webhooks to hit your public API URL and set the matching signing secrets.
- For the SPA, either serve the Vite `build` output behind the same host as the API or point the client’s API base URL at your API origin and align CORS.

## License

Server `package.json` declares **ISC**; confirm team-wide licensing for the whole monorepo before redistribution.
