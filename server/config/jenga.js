import axios from 'axios';
import crypto from 'crypto';

// Nawiri Hair is subscribed to Jenga Payment Gateway → MPESA. That product
// uses the wallet-based STK API: funds land in the linked Jenga wallet and
// are then settled to the connected bank account. It is a different product
// from Jenga's account-based STK API, with a different endpoint and
// signature formula.
const JENGA_BASE_URL = process.env.JENGA_ENV === 'production'
  ? 'https://api.finserve.africa'
  : 'https://uat.finserve.africa';

const JENGA_AUTH_URL = `${JENGA_BASE_URL}/authentication/api/v3/authenticate/merchant`;
const JENGA_STK_PUSH_URL = `${JENGA_BASE_URL}/api-checkout/mpesa-stk-push/v3.0/init`;

// Jenga PGW hosted checkout is a distinct product from the wallet-based STK
// flow above, but shares the same merchant credentials and the same
// /authenticate/merchant bearer token. Its hosted checkout form posts to a
// jengapgw.io host (not finserve.africa). Jenga's public docs only publish
// the UAT form action (https://v3-uat.jengapgw.io/processPayment) — the
// production URL isn't documented anywhere we could find, so it must be
// supplied explicitly via JENGA_PGW_CHECKOUT_URL. Never silently fall back to
// UAT in production.
const JENGA_PGW_CHECKOUT_URL = process.env.JENGA_PGW_CHECKOUT_URL
  || (process.env.JENGA_ENV === 'production' ? null : 'https://v3-uat.jengapgw.io/processPayment');

// Unlike STK, Jenga PGW transactions (card, Equitel, etc.) have a real
// status-query endpoint — use it as the authoritative source in the card
// callback handler rather than trusting the callback's own status param.
const getTransactionDetailsUrl = (ref) =>
  `${JENGA_BASE_URL}/v3-apis/transaction-api/v3.0/transactions/details/${encodeURIComponent(ref)}`;

const requireEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    const err = new Error(`Missing required Jenga configuration: ${name}`);
    err.statusCode = 500;
    throw err;
  }
  return value;
};

/**
 * PEM private keys travel through environment variables, which mangles them
 * in predictable ways depending on where they were pasted (dashboard
 * single-line inputs, CI secret stores). Repair every whitespace-shaped
 * mangling — literal \n sequences, CRLF, %0A/%0D URL-encoding, wrapping
 * quotes, spaces where line breaks were, stray blank lines — then re-emit
 * canonical 64-char-wrapped PEM. Truncation is the one unrecoverable case;
 * it surfaces as a diagnostic error telling the operator to re-paste.
 */
const normalizePrivateKeyPem = (raw) => {
  const unescaped = String(raw ?? '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n?/g, '\n')
    .replace(/%0D%0A/gi, '\n')
    .replace(/%0A/gi, '\n')
    .replace(/%0D/gi, '\n');

  const headerMatch = unescaped.match(/-----BEGIN ([^-]+)-----/);
  if (!headerMatch) return null;
  const type = headerMatch[1].trim();

  // Stripping every non-base64 character also repairs keys whose line breaks
  // were replaced with spaces or which had blank lines inserted.
  const body = unescaped
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/[^A-Za-z0-9+/=]/g, '');

  const wrapped = (body.match(/.{1,64}/g) || []).join('\n');
  return `-----BEGIN ${type}-----\n${wrapped}\n-----END ${type}-----\n`;
};

// Shape metadata for failure diagnostics — never includes key material.
const describeKeyShape = (raw) => {
  const value = String(raw ?? '');
  return {
    length: value.length,
    header: (value.match(/-----BEGIN [^-]+-----/) || ['missing'])[0],
    hasEndMarker: value.includes('-----END'),
    realNewlines: (value.match(/\n/g) || []).length,
    carriageReturns: (value.match(/\r/g) || []).length,
    literalBackslashN: (value.match(/\\n/g) || []).length,
    urlEncodedNewlines: (value.match(/%0A/gi) || []).length,
    wrappedInQuotes: /^["'].+["']$/.test(value.trim()),
    singleLine: !/[\n\\%]/.test(value),
    base64BodyChars: (value
      .replace(/-----BEGIN [^-]+-----/, '')
      .replace(/-----END [^-]+-----/, '')
      .match(/[A-Za-z0-9+/=]/g) || []).length,
  };
};

const getPrivateKey = () => {
  const raw = requireEnv('JENGA_PRIVATE_KEY');
  // Try the value as-is first (correctly stored PEM), then the repaired
  // canonical form (every paste-damage mode except truncation).
  for (const candidate of [raw, normalizePrivateKeyPem(raw)]) {
    if (!candidate) continue;
    try {
      crypto.createPrivateKey(candidate); // fail fast here, not inside createSign
      return candidate;
    } catch {
      // fall through to the next strategy
    }
  }

  console.error(
    'JENGA_PRIVATE_KEY could not be parsed as a private key. Shape (metadata only, never key material):',
    JSON.stringify(describeKeyShape(raw))
  );
  console.error(
    'Likely cause: the key was truncated or corrupted when entered into the environment settings. ' +
    'Re-copy the full key from JengaHQ (Integrations & Keys); a single line with literal \\n sequences also works.'
  );
  const err = new Error('Payment signing is unavailable: the server RSA key failed to load (see server logs).');
  err.statusCode = 500;
  throw err;
};

// Merchant tokens last 15 minutes. Server-side calls (STK push, status
// queries) reuse one until shortly before it expires instead of
// authenticating on every request.
let cachedToken = null;
const TOKEN_REUSE_MARGIN_MS = 60 * 1000;

const readTokenExpiry = (data, token) => {
  const fromResponse = Date.parse(data?.expiresIn);
  if (Number.isFinite(fromResponse)) return fromResponse;
  try {
    const { exp } = JSON.parse(Buffer.from(String(token).split('.')[1], 'base64url').toString());
    if (Number.isFinite(exp)) return exp * 1000;
  } catch {
    // Not a JWT — fall back below.
  }
  return Date.now() + 10 * 60 * 1000;
};

/**
 * Fetch a short-lived OAuth access token from Jenga/Finserve.
 * Requires JENGA_MERCHANT_CODE, JENGA_CONSUMER_SECRET, JENGA_API_KEY in env.
 * Pass { fresh: true } when the token is handed to Jenga's hosted checkout
 * page, which uses it for the whole 15-minute session — a cached token could
 * expire part-way through.
 */
const getAuthToken = async ({ fresh = false } = {}) => {
  if (!fresh && cachedToken && cachedToken.expiresAt - TOKEN_REUSE_MARGIN_MS > Date.now()) {
    return cachedToken.token;
  }

  const merchantCode = requireEnv('JENGA_MERCHANT_CODE');
  const consumerSecret = requireEnv('JENGA_CONSUMER_SECRET');
  const apiKey = requireEnv('JENGA_API_KEY');

  const response = await axios.post(
    JENGA_AUTH_URL,
    { merchantCode, consumerSecret },
    {
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': apiKey,
      },
      timeout: 10000,
    }
  );

  const token = response.data?.accessToken;
  if (!token) {
    const err = new Error('Jenga authentication did not return an access token');
    err.statusCode = 502;
    throw err;
  }
  cachedToken = { token, expiresAt: readTokenExpiry(response.data, token) };
  return token;
};

/**
 * Signature formula for Jenga Payment Gateway's wallet-based M-Pesa STK API
 * (exact field order, no separators):
 * order.orderReference + payment.paymentCurrency + payment.details.msisdn + payment.details.paymentAmount
 * Signed with the merchant's RSA private key (SHA256), then Base64 encoded.
 */
const signStkPushRequest = ({ orderReference, currency, mobileNumber, amount }) => {
  const privateKey = getPrivateKey();
  const dataToSign = `${orderReference}${currency}${mobileNumber}${amount}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(dataToSign);
  signer.end();

  return signer.sign(privateKey, 'base64');
};

/**
 * Sign the hosted PGW checkout fields when the merchant has enabled PGW secure
 * mode. Jenga specifies this exact concatenation order in its checkout
 * reference: merchantCode + orderReference + currency + orderAmount +
 * callbackUrl. The result is an RSA-SHA256 signature encoded as Base64, just
 * like the other Jenga request signatures.
 */
const signPgwCheckoutRequest = ({ merchantCode, orderReference, currency, orderAmount, callbackUrl }) => {
  const privateKey = getPrivateKey();
  const dataToSign = `${merchantCode}${orderReference}${currency}${orderAmount}${callbackUrl}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(dataToSign);
  signer.end();
  return signer.sign(privateKey, 'base64');
};

/**
 * Signs a single reference string with the merchant's RSA private key
 * (SHA256, Base64) — used for the Query Transaction Details `Signature`
 * header. Jenga's own docs describe this generically (see the
 * "Generate Signature" guide) as "concatenate the request fields in order,
 * RSA-SHA256 sign, Base64 encode"; for this endpoint the only field is the
 * transaction reference itself.
 */
const signReference = (ref) => {
  const privateKey = getPrivateKey();
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(String(ref));
  signer.end();
  return signer.sign(privateKey, 'base64');
};

export {
  getAuthToken,
  signStkPushRequest,
  signPgwCheckoutRequest,
  signReference,
  JENGA_STK_PUSH_URL,
  JENGA_PGW_CHECKOUT_URL,
  getTransactionDetailsUrl,
  requireEnv,
};
