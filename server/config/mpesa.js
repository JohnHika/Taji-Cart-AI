import axios from 'axios';

// Use sandbox URLs for now; swap to production when live
const MPESA_AUTH_URL = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
const MPESA_STK_URL = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
const MPESA_STK_QUERY_URL = 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query';

/**
 * Fetch a short-lived OAuth access token from Safaricom.
 * Requires MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET in env.
 */
const getAuthToken = async () => {
  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString('base64');

  const response = await axios.get(MPESA_AUTH_URL, {
    headers: { Authorization: `Basic ${auth}` },
    timeout: 10000,
  });

  return response.data.access_token;
};

const buildShortcodePassword = (timestamp) =>
  Buffer.from(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`).toString('base64');

const buildTimestamp = () => {
  const now = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

// The callback Safaricom POSTs to our server is unauthenticated and its body
// must never be trusted for financial finality — anyone who observes a
// checkoutRequestId (the client legitimately sees it, to poll status) could
// otherwise forge a "payment succeeded" callback. This independently asks
// Safaricom's own API what a given CheckoutRequestID's real status is, so the
// callback is only ever used as a "go check" trigger, never as proof itself.
const queryStkPushStatus = async (checkoutRequestId) => {
  const timestamp = buildTimestamp();
  const token = await getAuthToken();

  const response = await axios.post(
    MPESA_STK_QUERY_URL,
    {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: buildShortcodePassword(timestamp),
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    },
    {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      timeout: 10000,
    }
  );

  return response.data;
};

export { getAuthToken, MPESA_STK_URL, queryStkPushStatus };
