import axios from 'axios';

// Equity Bank API configuration
const EQUITY_BASE_URL = process.env.EQUITY_BASE_URL || 'https://uat.equity.co.ke';
const EQUITY_API_KEY = process.env.EQUITY_API_KEY;
const EQUITY_SECRET = process.env.EQUITY_SECRET;
const EQUITY_COMPANY_CODE = process.env.EQUITY_COMPANY_CODE;

// Generate auth token for Equity API
const getEquityAuthToken = async () => {
  try {
    const auth = Buffer.from(`${EQUITY_API_KEY}:${EQUITY_SECRET}`).toString('base64');
    const response = await axios.post(
      `${EQUITY_BASE_URL}/api/v2/token`,
      {},
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error('Equity Bank Auth Error:', error.response?.data || error.message);
    throw error;
  }
};

// Create payment request (EazzyPay)
const createPaymentRequest = async (accessToken, payload) => {
  try {
    const response = await axios.post(
      `${EQUITY_BASE_URL}/api/v2/ez-payments`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Company-Code': EQUITY_COMPANY_CODE
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Equity Payment Request Error:', error.response?.data || error.message);
    throw error;
  }
};

// Check payment status
const checkPaymentStatus = async (accessToken, transactionId) => {
  try {
    const response = await axios.get(
      `${EQUITY_BASE_URL}/api/v2/ez-payments/${transactionId}/status`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Company-Code': EQUITY_COMPANY_CODE
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Equity Payment Status Check Error:', error.response?.data || error.message);
    throw error;
  }
};

export { getEquityAuthToken, createPaymentRequest, checkPaymentStatus };
