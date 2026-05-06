import axios from 'axios';

// M-Pesa API URLs - SANDBOX (Test Mode)
const MPESA_AUTH_URL = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
const MPESA_STK_URL = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
const MPESA_QUERY_URL = 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query';

// For production, change to these URLs:
// const MPESA_AUTH_URL = 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
// const MPESA_STK_URL = 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
// const MPESA_QUERY_URL = 'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query';

// Generate auth token
export const getAuthToken = async () => {
  try {
    const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
    const response = await axios.get(MPESA_AUTH_URL, {
      headers: {
        Authorization: `Basic ${auth}`
      }
    });
    return response.data.access_token;
  } catch (error) {
    console.error('M-Pesa Auth Error:', error.message);
    throw error;
  }
};

// Generate password for STK Push (Base64 encoded)
export const generatePassword = () => {
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
  const data = `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`;
  return Buffer.from(data).toString('base64');
};

// Get current timestamp in Daraja format
export const getTimestamp = () => {
  return new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
};

// Initiate STK Push
export const initiateSTKPush = async (payload) => {
  try {
    const accessToken = await getAuthToken();
    const timestamp = getTimestamp();
    const password = generatePassword();

    const requestBody = {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(payload.amount),
      PartyA: payload.phoneNumber, // Customer phone
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: payload.phoneNumber,
      CallBackURL: `${process.env.BACKEND_URL || process.env.FRONTEND_URL}/api/mpesa/callback`,
      AccountReference: payload.accountReference, // Unique order ID
      TransactionDesc: payload.description || 'Payment for order'
    };

    const response = await axios.post(MPESA_STK_URL, requestBody, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('M-Pesa STK Push Error:', error.response?.data || error.message);
    throw error;
  }
};

// Query STK Push status
export const querySTKStatus = async (checkoutRequestId) => {
  try {
    const accessToken = await getAuthToken();
    const timestamp = getTimestamp();
    const password = generatePassword();

    const requestBody = {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId
    };

    const response = await axios.post(MPESA_QUERY_URL, requestBody, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('M-Pesa Query Error:', error.response?.data || error.message);
    throw error;
  }
};

export { MPESA_STK_URL, MPESA_QUERY_URL };