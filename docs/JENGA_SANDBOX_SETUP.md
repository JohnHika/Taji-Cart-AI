# Jenga (Finserve/Equity) M-Pesa Sandbox Setup

## Overview

Nawiri's online customer checkout (`CheckoutPage.jsx`, `GuestCheckout.jsx`) previously only
supported Cash on Delivery — despite `EQUITY_BANK_INTEGRATION.md` and `PAYHERO_SETUP.md`
describing integrations, none of that code was ever actually implemented (verified by
grep: no `server/config/equity.js`, no `server/controllers/equity.controller.js`, etc.
existed before this change). This document covers the first real online payment gateway:
Jenga/Finserve, using **account-based settlement**.

Separately, `server/routes/pos.js` + `server/route/mpesa.route.js` implement direct
Safaricom Daraja STK push for in-store POS sales. That is a different, unrelated
integration — POS assumes immediate cash/mobile settlement and decrements stock at sale
time. It is not touched by this document.

## Selected settlement flow: account-based

Jenga offers two STK push flows:

- **Account-based settlement** (used here): `POST /v3-apis/payment-api/v3.0/stkussdpush/initiate`.
  Funds settle directly into `JENGA_ACCOUNT_NUMBER` (Nawiri's Equity account). Simpler —
  no separate wallet-to-bank sweep step, and consistent with Nawiri's existing Equity
  banking relationship.
- **Wallet-based settlement** (not used): `POST /api-checkout/mpesa-stk-push/v3.0/init`.
  Funds land in a Jenga wallet first, then require a separate step to sweep to a bank
  account. More flexible (multiple destination accounts) but adds operational complexity
  we don't need.

Do not mix the two — the signature formula, request shape, and status-query endpoint
differ between them.

## Architecture

```
Checkout UI (JengaPayment.jsx)
  -> POST /api/jenga/pay        [authenticated]  initiate: creates PENDING order + payment doc, calls Jenga
  -> GET  /api/jenga/status/:ref [authenticated]  polled every 3s while pending
Jenga
  -> POST /api/jenga/callback   [public]         triggers reconciliation, never trusted alone
```

Files:
- `server/config/jenga.js` — auth token fetch, RSA-SHA256 request signing
- `server/utils/jengaValidation.js` — Kenyan phone normalization, amount validation
- `server/models/jengaPayment.model.js` — payment record (pending/paid/failed/cancelled/expired)
- `server/controllers/jenga.controller.js` — initiate / status / callback handlers
- `server/route/jenga.route.js` — mounted at `/api/jenga` in `server/app.js`
- `client/src/components/JengaPayment.jsx` — phone input + polling UI
- `client/src/pages/CheckoutPage.jsx` — Cash/M-Pesa payment method toggle

## Security model — payment never trusted without verification

1. Checkout UI sends phone + cart to the backend (never calls Jenga directly; no Jenga
   credentials reach the browser).
2. Backend validates phone (Kenyan formats only) and amount (KES 1–150,000, ≤2 decimals).
3. Backend creates the order with `payment_status: "PENDING"` and a `JengaPayment` doc
   **before** contacting Jenga. Stock is **not** decremented yet.
4. Backend obtains a Jenga access token and signs the STK push request with the RSA
   private key, then calls Jenga's initiate endpoint.
5. Jenga calls back `POST /api/jenga/callback` after the customer approves/rejects the
   prompt. Account-based settlement has **no separate authenticated status-query
   endpoint** (confirmed both in Jenga's docs and by testing — see "Live UAT findings"
   below), so the callback itself is the sole source of truth for this flow.
6. The callback is still validated strictly before anything is marked paid: the
   documented success code (`status: true, code: 3`) must match, and the returned
   reference and amount (compared via integer cents, not floats) must match the locally
   stored pending payment. Any other code, a reference mismatch, or an amount mismatch
   leaves the payment `pending` — never guessed at.
7. Finalization (stock decrement, order status → `PAID`, cart clear) happens exactly once,
   guarded by an atomic `findOneAndUpdate` on a `finalizedAt` field — safe against
   duplicate callbacks or a callback racing a client poll.
8. Any missing config, signature failure, reference mismatch, amount mismatch, unknown
   status, or network error fails closed — the payment stays `pending`, nothing is
   finalized.

## Environment variables

Add to `server/.env` (see `server/.env.example` for placeholders — never commit real
values):

```env
JENGA_ENV=sandbox
JENGA_API_KEY=
JENGA_MERCHANT_CODE=
JENGA_CONSUMER_SECRET=
JENGA_PRIVATE_KEY=
JENGA_ACCOUNT_NUMBER=
JENGA_MERCHANT_NAME=
JENGA_CALLBACK_URL=https://your-backend-origin.example.com/api/jenga/callback
```

`JENGA_PRIVATE_KEY` should be the PEM private key with newlines escaped as `\n` (the code
restores them via `.replace(/\\n/g, '\n')` in `server/config/jenga.js`). Never print or
log the restored key.

## RSA key generation and upload

```bash
openssl genrsa -out jenga_private.pem 2048
openssl rsa -in jenga_private.pem -pubout -out jenga_public.pem
```

Upload `jenga_public.pem` to the Jenga developer portal. Keep `jenga_private.pem`
server-side only — set its contents (with `\n` escaping) as `JENGA_PRIVATE_KEY` in your
deployment's environment variables, and never commit the `.pem` file.

## Sandbox authentication

Sandbox base URL: `https://uat.finserve.africa`. Auth endpoint:
`POST /authentication/api/v3/authenticate/merchant` with `{ merchantCode, consumerSecret }`
and an `Api-Key` header. A successful response returns `{ accessToken: "..." }`.

## Local sandbox testing with a tunnel

Jenga needs a public HTTPS URL to reach `POST /api/jenga/callback`. For local development,
use a tunnel (e.g. `ngrok http 5000` or a Cloudflare quick tunnel) and set:

```env
JENGA_CALLBACK_URL=https://<your-tunnel-subdomain>/api/jenga/callback
```

Confirm the actual API prefix by checking `server/app.js` (`app.use('/api/jenga', jengaRouter)`)
rather than assuming a path.

## Google authentication relationship

Jenga payments are independent of the Google OAuth login flow (`config/passport.js`).
`POST /api/jenga/pay` and `GET /api/jenga/status/:orderReference` both require the same
`auth` middleware (`server/middleware/auth.js`) used across the rest of the app — a valid
JWT (from either Google or email/password login) in the `accessToken` cookie or
`Authorization` header. The callback route is intentionally public/unauthenticated since
Jenga (not the browser) calls it, but it never trusts the callback body — see the security
model above.

## Idempotency and duplicate protection

- `JengaPayment.orderReference` is unique — one document per initiated payment.
- Reconciliation (`reconcilePayment` in `jenga.controller.js`) is a no-op once
  `status !== 'pending'`, so repeated callbacks or repeated polls after resolution do
  nothing.
- Finalization (`finalizePaidOrder`) additionally guards on `finalizedAt` via an atomic
  `findOneAndUpdate`, so even a callback and a poll racing each other can only finalize
  once.

## Manual verification performed

- RSA-SHA256 signature generation verified round-trip against a generated test keypair
  (sign with private key, verify with public key) — confirms the signing implementation
  and `\n`-escape restoration are correct.
- Kenyan phone normalization tested against all supported formats (07/01/2547/2541/+254)
  and rejected invalid inputs (wrong prefix, letters, empty).
- Amount validation tested against boundary cases (0, negative, >2 decimals, over the KES
  150,000 ceiling).
- Missing-credential fail-closed behavior confirmed (`getAuthToken` throws before any
  network call when `JENGA_MERCHANT_CODE`/`JENGA_CONSUMER_SECRET`/`JENGA_API_KEY` are
  unset).
- Client build (`npm run build`) passes with the new checkout UI wired in.
- **End-to-end UAT test with real credentials and a real successful payment** (see
  below) — sandbox authentication, RSA key match, callback delivery, correct code
  parsing, order finalized once, stock decremented once.

No test runner is configured in this repository (per the main `CLAUDE.md`), so the above
were verified with ad-hoc Node scripts rather than a committed test suite.

## Live UAT findings (2026-07-12)

Once real merchant credentials, an active settlement bank account, and an active
"Telco Push Payments STK and USSD" subscription were configured on the Jenga portal
(merchant code 7531248556), the following was verified against Jenga's real UAT
environment:

- **Sandbox authentication succeeds** — `getAuthToken()` returns a real access token.
- **RSA key pair matches the portal-registered public key** — a correctly signed STK
  push initiate request was accepted (previously rejected with `401101` before the
  merchant account had an active bank account + subscription).
- **Callback delivery is reachable and correctly parsed** — verified via direct probe
  POSTs and a real "expired"/cancelled transaction, whose callback arrived within
  seconds.
- **Full end-to-end flow verified with a real paid transaction**: authenticated login →
  real cart → STK push → real M-Pesa payment → callback received → validated →
  `JengaPayment.status = 'paid'` → order `payment_status = 'PAID'` → stock decremented
  exactly once (13 → 12).

### Important: UAT is not money-safe by default for this flow

Unlike Safaricom's own Daraja sandbox (which uses a fixed test MSISDN and never touches
real phones), **Jenga's account-based settlement UAT drives real STK pushes to real
phone numbers with real M-Pesa PIN entry and real balance deductions**. Four real
transactions were confirmed via M-Pesa SMS during testing (KES 1 x3, KES 600 x1); the
three that weren't recognized as paid due to the bug below were automatically reversed
by Safaricom/Jenga to a "Daraja-Sandbox" test recipient. Do not assume "UAT" means no
real money moves for this specific API product — budget for and expect real (reversible)
charges when testing.

### Root cause found and fixed: wrong success code

Initial testing showed three real, SMS-confirmed successful payments produce **no
visible effect** in our system — payments stayed `pending` indefinitely. This was
initially misdiagnosed as "Jenga doesn't deliver callbacks for paid outcomes" after
callbacks appeared not to arrive within several minutes of waiting.

The actual bug: `mapJengaCallbackToLocal` in `jenga.controller.js` checked for
`status: true && code === 0` to recognize a paid transaction. Jenga's documented
success code for this endpoint is **`code: 3`** ("Transaction completed successfully
and credited to merchant"), not `0`. The callback was very likely arriving correctly
every time — our code just never recognized it as success, silently fell through to
`unknown`, and left the payment `pending` forever. `code: 0` is documented as
"Request pending to be processed", not success.

Full documented code table now implemented:

| Code | Meaning | Local status |
|---|---|---|
| 0 | Request pending to be processed | (not a callback state — request not yet actioned) |
| 1 | Transaction Failed | `failed` |
| 2 | Successful — Awaiting Third Party Settlement | `pending` (keep polling) |
| 3 | Completed and credited to merchant | `paid` |
| 4 | Successful debit, failed merchant credit | `pending` (keep polling) |
| 5, 6 | Cancelled | `cancelled` |
| 7 | Rejected (validation error) | `failed` |

**Lesson**: a single observed callback's `message` string ("No response from user.")
was mistakenly treated as defining that code's general meaning, without checking
Jenga's documented code table first. Always verify against the documented table, not
just one sample's human-readable message.

**Safety net kept regardless**: `getJengaPaymentStatus` still reports a payment stuck
`pending` past `PENDING_STALE_AFTER_MS` (100 seconds) as `stale` to the client, which
stops polling and surfaces a support-contact message — useful for genuine delivery
failures or codes 2/4 that never resolve, even though the code-3 bug was the primary
cause of the observed failures.

## Production migration checklist

- [x] Real Jenga sandbox credentials added to `server/.env` (never commit them)
- [x] RSA public key uploaded to the Jenga portal; private key set as `JENGA_PRIVATE_KEY`
- [x] `JENGA_CALLBACK_URL` points to a publicly reachable HTTPS backend URL
- [x] Sandbox authentication succeeds (`getAuthToken` returns a token)
- [x] End-to-end sandbox STK push tested with a low-value transaction (KES 1, paid)
- [x] Confirm order finalizes exactly once and stock decrements exactly once
- [ ] Confirm cancelled/rejected payments leave the order unpaid and stock untouched
      (verified for one real cancelled/no-response transaction; not yet verified for
      every documented failure code)
- [ ] Switch `JENGA_ENV=production` and swap sandbox credentials for live ones only after
      the above are verified, and only once a production merchant account has an active
      bank account + subscription (same portal steps required in UAT)
