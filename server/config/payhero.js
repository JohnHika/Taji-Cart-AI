import axios from 'axios';

// PayHero API configuration
const PAYHERO_BASE_URL = process.env.PAYHERO_BASE_URL || 'https://backend.payhero.co.ke';
const PAYHERO_API_KEY = process.env.PAYHERO_API_KEY;
const PAYHERO_CHANNEL_ID = process.env.PAYHERO_CHANNEL_ID;

// Generate Basic Auth token from API key
// PayHero uses API Key as username, empty password
const getPayHeroAuthToken = () => {
  if (!PAYHERO_API_KEY) {
    throw new Error('PAYHERO_API_KEY not configured');
  }
  const credentials = Buffer.from(`${PAYHERO_API_KEY}:`).toString('base64');
  return `Basic ${credentials}`;
};

// Initiate STK Push payment (M-Pesa)
const initiateSTKPush = async (payload) => {
  try {
    const authToken = getPayHeroAuthToken();

    const requestBody = {
      amount: payload.amount,
      phone_number: payload.phoneNumber,
      channel_id: parseInt(PAYHERO_CHANNEL_ID),
      provider: payload.provider || 'm-pesa',
      network_code: payload.networkCode || '63902', // Safaricom M-Pesa
      external_reference: payload.externalReference,
      customer_name: payload.customerName,
      callback_url: payload.callbackUrl,
      ...(payload.email && { email: payload.email }),
      ...(payload.description && { description: payload.description })
    };

    const response = await axios.post(
      `${PAYHERO_BASE_URL}/api/v2/payments`,
      requestBody,
      {
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('PayHero STK Push Error:', error.response?.data || error.message);
    throw error;
  }
};

// Check payment status
const checkPaymentStatus = async (checkoutRequestId) => {
  try {
    const authToken = getPayHeroAuthToken();

    const response = await axios.get(
      `${PAYHERO_BASE_URL}/api/v2/payments/${checkoutRequestId}`,
      {
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('PayHero Status Check Error:', error.response?.data || error.message);
    throw error;
  }
};

// Generate payment link (for sharing via SMS/WhatsApp)
const generatePaymentLink = async (payload) => {
  try {
    const authToken = getPayHeroAuthToken();

    const requestBody = {
      amount: payload.amount,
      channel_id: parseInt(PAYHERO_CHANNEL_ID),
      external_reference: payload.externalReference,
      customer_name: payload.customerName,
      callback_url: payload.callbackUrl,
      ...(payload.email && { email: payload.email }),
      ...(payload.phoneNumber && { phone_number: payload.phoneNumber }),
      ...(payload.description && { description: payload.description }),
      ...(payload.redirectUrl && { redirect_url: payload.redirectUrl })
    };

    const response = await axios.post(
      `${PAYHERO_BASE_URL}/api/v2/payments/link`,
      requestBody,
      {
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('PayHero Payment Link Error:', error.response?.data || error.message);
    throw error;
  }
};

// Verify webhook signature (if PayHero provides signature verification)
const verifyWebhookSignature = (payload, signature, secret) => {
  // Implement if PayHero provides webhook signature verification
  // For now, we'll rely on the callback URL being secure
  return true;
};

// Format phone number for PayHero (accepts 07XX, +2547XX, 2547XX)
const formatPhoneNumber = (phoneNumber) => {
  let formatted = phoneNumber.replace(/\s/g, '').replace(/\+/g, '');

  // Remove leading 0 and add 254
  if (formatted.startsWith('0')) {
    formatted = '254' + formatted.substring(1);
  }

  // Ensure it starts with 254
  if (!formatted.startsWith('254')) {
    formatted = '254' + formatted;
  }

  return formatted;
};

export {
  initiateSTKPush,
  checkPaymentStatus,
  generatePaymentLink,
  verifyWebhookSignature,
  formatPhoneNumber,
  PAYHERO_BASE_URL,
  PAYHERO_CHANNEL_ID
};
