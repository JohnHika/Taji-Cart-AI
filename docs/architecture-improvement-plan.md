# Architecture improvement plan

## Current state

The current frontend is a Vite React SPA with client-side routing. That is fine for fast iteration, but it has tradeoffs:

- every route depends on a client-side app shell
- route deep-linking needs SPA rewrites
- initial JS is larger than necessary
- public marketing pages and authenticated dashboards ship through the same client bundle

## Recommended direction

### Phase 1: keep the app stable, reduce duplicate actions

- Use client-side request locks for mutation requests
- Use backend idempotency and uniqueness rules for cart/order/payment operations
- Convert legacy direct `axios` calls to the shared request client over time

### Phase 2: make the app feel less like one giant SPA

- Route-level code splitting for public pages, account pages, admin pages, seller pages, and delivery pages
- Separate layout bundles for customer, admin, seller, and delivery experiences
- Move frequently-changing dashboards behind authenticated route chunks instead of loading them in the main shell

### Phase 3: move to a hybrid architecture

If you want the project to stop behaving like a classic SPA, the cleanest long-term move is a hybrid framework:

- Next.js App Router
- React Router framework mode / Remix-style rendering

That gives you:

- real route boundaries
- server-rendered public pages
- better SEO and first-load performance
- API and UI separation without forcing every route through a single static entry document

## Suggested product split

- Public storefront and marketing pages: server-rendered
- Authenticated customer account pages: hybrid
- Admin, seller, and delivery dashboards: client-heavy islands or separate dashboard app
- Realtime backend: separate API service with WebSocket support

## Practical recommendation for this codebase

Do not rewrite everything at once.

1. Stabilize request locking and idempotency first
2. Add route-level lazy loading next
3. Split customer and operations dashboards into separate route bundles
4. Migrate the public storefront to a hybrid framework when the launch flow is stable
