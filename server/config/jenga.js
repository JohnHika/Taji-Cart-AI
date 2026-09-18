import axios from 'axios';
import crypto from 'crypto';

// Account-based settlement flow (Jenga/Finserve API v3.0).
// Funds settle directly into JENGA_ACCOUNT_NUMBER — no wallet sweep step.
const JENGA_BASE_URL = process.env.JENGA_ENV === 'production'
  ? 'https://api.finserve.africa'
  : 'https://uat.finserve.africa';

const JENGA_AUTH_URL = `${JENGA_BASE_URL}/authentication/api/v3/authenticate/merchant`;
const JENGA_STK_PUSH_URL = `${JENGA_BASE_URL}/v3-apis/payment-api/v3.0/stkussdpush/initiate`;
// Account-based settlement has no dedicated STK status-query endpoint — per
// Jenga's docs, final status only arrives via the POST callback (see
// server/controllers/jenga.controller.js: reconcilePayment).

// Jenga PGW (card checkout) is a distinct product from the account-based STK
// settlement above, but shares the same merchant credentials and the same
// /authenticate/merchant bearer token. Its hosted checkout form posts to a
// jengapgw.io host (not finserve.africa). Jenga's public docs only publish
// the UAT form action (https://v3-uat.jengapgw.io/processPayment) — the
// production URL isn't documented anywhere we could find, so it must be
// supplied explicitly via JENGA_PGW_CHECKOUT_URL once Jenga support/the
// merchant portal confirms it. Never silently fall back to UAT in production.
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

const getPrivateKey = () => {
  const raw = requireEnv('JENGA_PRIVATE_KEY');
  return raw.replace(/\\n/g, '\n');
};

/**
 * Fetch a short-lived OAuth access token from Jenga/Finserve.
 * Requires JENGA_MERCHANT_CODE, JENGA_CONSUMER_SECRET, JENGA_API_KEY in env.
 */
const getAuthToken = async () => {
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
  return token;
};

/**
 * Signature formula per Jenga docs (exact field order, no separators):
 * merchant.accountNumber + payment.ref + payment.mobileNumber + payment.telco + payment.amount + payment.currency
 * Signed with the merchant's RSA private key (SHA256), then Base64 encoded.
 */
const signStkPushRequest = ({ accountNumber, ref, mobileNumber, telco, amount, currency }) => {
  const privateKey = getPrivateKey();
  const dataToSign = `${accountNumber}${ref}${mobileNumber}${telco}${amount}${currency}`;

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
  signReference,
  JENGA_STK_PUSH_URL,
  JENGA_PGW_CHECKOUT_URL,
  getTransactionDetailsUrl,
  requireEnv,
};
