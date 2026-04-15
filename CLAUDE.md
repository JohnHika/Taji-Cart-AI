# CLAUDE.md

This file provides guidance to Axon Code (claude.ai/code) when working with code in this repository.

## Project Overview

Taji Cart AI is a full-stack e-commerce platform with AI-assisted shopping features. It's structured as an npm workspaces monorepo with `client/` (React + Vite) and `server/` (Express + MongoDB) directories.

## Development Commands

### Root level (runs both client and server)
```bash
npm run dev              # Starts both client and server with concurrently
npm run build            # Builds client only
npm run start:server     # Starts server in production mode
```

### Client (`client/` directory)
```bash
npm run dev              # Vite dev server on port 5173
npm run build            # Production build
npm run lint              # ESLint
npm run preview           # Preview production build
```

### Server (`server/` directory)
```bash
npm run dev               # Nodemon on index.js (port 5000)
npm start                 # Node on index.js
npm run offline           # Offline-oriented startup script
npm run db:diagnose       # MongoDB connectivity diagnostics
npm run seed:hair         # Seed hair/catalog sample data
npm run import:excel      # Import catalog from Excel
npm run recommendation-collect    # Python data collection for ML
npm run recommendation-train      # Python ML model training
```

## Architecture

### Monorepo Structure

The root `package.json` is minimal—day-to-day development happens in `client/` and `server/` subdirectories. Both must be running for full functionality.

### Client Architecture

- **Entry**: `client/src/main.jsx` → renders `App.jsx` into the DOM
- **Routing**: React Router with `Outlet` pattern in `App.jsx`. Routes defined in `client/src/routes/` and `client/src/router/`
- **State**: Redux Toolkit store in `client/src/store/` and `client/src/redux/`. Key slices: `productSlice`, `userSlice`, `cartSlice`
- **API Layer**: `client/src/common/SummaryApi.js` defines all API endpoints. `client/src/utils/Axios.js` provides configured axios instance
- **Proxy**: Vite proxies `/api`, `/auth`, and `/socket.io` to backend (default `http://localhost:5000`)

**Key Patterns:**
- `useSelector` for reading Redux state
- `useDispatch` for actions like `fetchCartItems`, `setUserDetails`
- Auth token stored in `sessionStorage` (not localStorage)
- Categories fetched on app init and refreshed on visibility change

### Server Architecture

- **Entry**: `server/index.js` creates HTTP server, initializes Socket.IO, connects to MongoDB
- **App**: `server/app.js` is the Express app with middleware, CORS, routes, and error handlers
- **Routes**: Mounted under `/api` prefix. Route files in `server/route/` and `server/routes/`
- **Models**: Mongoose schemas in `server/models/`. Key models: `User`, `Product`, `Order`, `Category`, `LoyaltyCard`
- **Controllers**: Business logic in `server/controllers/`
- **Middleware**: Auth (`server/middleware/auth.js`), admin checks, rate limiting

**Key Patterns:**
- JWT auth with access/refresh tokens
- CORS whitelist explicitly defined in `app.js`—add new origins via `FRONTEND_URL` env var
- Global error handler catches `UnauthorizedError` and `JsonWebTokenError`
- Socket.IO initialized in `server/socket/socket.js`

### Database

MongoDB with Mongoose. Connection string via `MONGODB_URI` env var. Server runs even if DB fails to connect (logs warning, operations fail until connection established).

### Real-time Features

Socket.IO integration for live updates. Client connects via `/socket.io` proxy. Server initializes socket in `server/index.js` and exports handlers from `server/socket/socket.js`.

### Payment Integrations

Three payment systems, each requiring separate credentials:
- **Stripe**: Server SDK + webhook verification (`STRIPE_SECRET_KEY`, `STRIPE_ENPOINT_WEBHOOK_SECRET_KEY`)
- **M-Pesa**: Safaricom integration (`MPESA_SHORTCODE`, `MPESA_PASSKEY`, etc.)
- **Pesapal**: Gateway with callbacks (`PESAPAL_*` variables)

### Optional AI/ML Features

- **RAG Chat**: OpenAI/HuggingFace embeddings when `RAG_ENABLED=true` and API keys configured
- **Recommendations**: Python 3.10+ pipeline in `server/recommendation/` (see `docs/server/recommendation/README.md`)
- **Reasoning**: Optional Ollama integration via `REASONING_ENABLED=true`

## Environment Configuration

Never commit `.env` files. Both client and server have `.env.example` templates.

### Client `.env` (minimal for dev)
```env
VITE_API_URL=/api
VITE_BACKEND_URL=http://localhost:5000
VITE_SERVER_URL=http://localhost:5000
```

### Server `.env` (required)
```env
MONGODB_URI=mongodb://...
PORT=5000
FRONTEND_URL=http://localhost:5173
JWT_SECRET=...
SECRET_KEY_ACCESS_TOKEN=...
SECRET_KEY_REFRESH_TOKEN=...
```

Additional variables for payments, auth, media uploads, and AI features as needed.

## Deployment

- **Client**: Built with `npm run build`, output in `client/dist/`. Deploy behind same origin as API or configure CORS
- **Server**: Set `FRONTEND_URL` to production client URL. Configure MongoDB Atlas IP whitelist. Set webhook URLs for payment providers

## Common Patterns

### Adding a New API Endpoint

1. Define route handler in `server/route/` or `server/routes/`
2. Add controller logic in `server/controllers/`
3. Import and mount in `server/app.js` under `/api` prefix
4. Add endpoint definition to `client/src/common/SummaryApi.js`
5. Call from client using `Axios(SummaryApi.yourEndpoint)`

### Working with Categories/Products

Categories use a slug-ID URL pattern (e.g., `/category/hair-products-64a1b2c3d4e5f6`). Client extracts ID from URL and fetches from Redux store. Categories loaded on app init—ensure `fetchProductData()` runs before rendering category routes.

### Authentication Flow

1. Login stores tokens in `sessionStorage`
2. `fetchUserDetails()` called on app init if token exists
3. `auth` middleware on protected server routes validates JWT
4. Admin routes require both `auth` and `admin` middleware

### Socket.IO Usage

Client connects automatically when `App.jsx` loads. Server emits events from controllers or socket handlers. Use for real-time cart updates, order status, delivery tracking.

## Important Notes

- **No test suite**: This project doesn't have a test runner configured. Testing is manual
- **Offline mode**: `NAWIRI_OFFLINE_MODE=true` for development without full DB connectivity (not for production)
- **Category URL routing**: Client has special handling for direct URL navigation to category pages—ensure categories are loaded before rendering
- **Loyalty system**: Complex tier/points system with admin routes under `/api/admin/loyalty/`
- **Multiple payment flows**: Each payment provider has separate routes, controllers, and callback handling