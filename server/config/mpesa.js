import axios from 'axios';

// Use sandbox URLs for now; swap to production when live
const MPESA_AUTH_URL = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
const MPESA_STK_URL = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

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

export { getAuthToken, MPESA_STK_URL };
