import axios from 'axios';
import crypto from 'crypto';
import DriverFinancialModel from '../models/driverfinancial.model.js';
import { getCurrentTimestamp, generatePassword } from '../utils/mpesa.js';

// M-Pesa Payout Configuration
const MPESA_ENV = process.env.MPESA_ENV || 'sandbox';
const MPESA_API_BASE = MPESA_ENV === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';

const MPESA_BUSINESS_SHORT_CODE = process.env.MPESA_BUSINESS_SHORT_CODE;
const MPESA_PASSKEY = process.env.MPESA_PASSKEY;
const MPESA_INITIATOR_NAME = process.env.MPESA_INITIATOR_NAME;
const MPESA_INITIATOR_PASSWORD = process.env.MPESA_INITIATOR_PASSWORD;
const MPESA_CALLBACK_URL = process.env.MPESA_CALLBACK_URL || 'https://yourdomain.com/api/mpesa/payout-callback';

// Generate M-Pesa security credentials
export const getSecurityCredentials = () => {
    const timestamp = getCurrentTimestamp();
    const password = generatePassword(MPESA_BUSINESS_SHORT_CODE, MPESA_PASSKEY, timestamp);
    return { timestamp, password };
};

// Generate access token for M-Pesa API
export const getMpesaAccessToken = async () => {
    try {
        const consumerKey = process.env.MPESA_CONSUMER_KEY;
        const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
        const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

        const response = await axios.get(
            `${MPESA_API_BASE}/oauth/v1/generate?grant_type=client_credentials`,
            {
                headers: {
                    'Authorization': `Basic ${auth}`
                }
            }
        );

        return response.data.access_token;
    } catch (error) {
        console.error('Error getting M-Pesa access token:', error.response?.data || error.message);
        throw new Error('Failed to get M-Pesa access token');
    }
};

// Process payout via M-Pesa
export const processMpesaPayout = async (req, res) => {
    try {
        const { driverId, payoutId } = req.params;
        const adminId = req.userId;

        // Get payout details
        const financials = await DriverFinancialModel.findOne({ driverId });
        if (!financials) {
            return res.status(404).json({
                success: false,
                message: 'Financial records not found'
            });
        }

        const payout = financials.payouts.id(payoutId);
        if (!payout) {
            return res.status(404).json({
                success: false,
                message: 'Payout request not found'
            });
        }

        if (payout.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Payout can only be processed if status is pending'
            });
        }

        if (payout.method !== 'mpesa') {
            return res.status(400).json({
                success: false,
                message: 'This payout is not configured for M-Pesa'
            });
        }

        // Get driver's M-Pesa number from payout preferences
        const mpesaNumber = financials.payoutPreferences.mpesaNumber;
        if (!mpesaNumber || !mpesaNumber.startsWith('254')) {
            return res.status(400).json({
                success: false,
                message: 'Invalid M-Pesa number. Must start with 254'
            });
        }

        // Get M-Pesa access token
        const accessToken = await getMpesaAccessToken();

        // Prepare M-Pesa B2C payment request
        const { timestamp, password } = getSecurityCredentials();

        const requestData = {
            InitiatorName: MPESA_INITIATOR_NAME,
            SecurityCredential: password,
            CommandID: 'BusinessPayment',
            Amount: payout.amount,
            PartyA: MPESA_BUSINESS_SHORT_CODE,
            PartyB: mpesaNumber,
            Remarks: `Driver payout for ${payout.amount} KES`,
            QueueTimeOutURL: `${MPESA_CALLBACK_URL}/timeout`,
            ResultURL: `${MPESA_CALLBACK_URL}/result`,
            Occasion: 'DriverPayout'
        };

        const response = await axios.post(
            `${MPESA_API_BASE}/mpesa/b2c/v1/paymentrequest`,
            requestData,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Update payout status
        payout.status = 'processed';
        payout.reference = response.data.ConversationID;
        payout.processedBy = adminId;
        payout.processedAt = new Date();

        // Move amount from pending to paid
        financials.earnings.pending -= payout.amount;
        financials.earnings.paid += payout.amount;

        await financials.save();

        res.status(200).json({
            success: true,
            message: 'M-Pesa payout processed successfully',
            data: {
                conversationId: response.data.ConversationID,
                originatorConversationId: response.data.OriginatorConversationID,
                responseCode: response.data.ResponseCode,
                responseDescription: response.data.ResponseDescription
            }
        });

    } catch (error) {
        console.error('Error processing M-Pesa payout:', error.response?.data || error.message);

        // Update payout status to failed if error occurs
        if (error.response?.data?.errorCode) {
            const financials = await DriverFinancialModel.findOne({ driverId: req.params.driverId });
            if (financials) {
                const payout = financials.payouts.id(req.params.payoutId);
                if (payout) {
                    payout.status = 'failed';
                    payout.notes = `M-Pesa error: ${error.response.data.errorMessage}`;
                    await financials.save();
                }
            }
        }

        res.status(500).json({
            success: false,
            message: 'Error processing M-Pesa payout',
            error: error.response?.data || error.message
        });
    }
};

// M-Pesa payout callback handler
export const handleMpesaPayoutCallback = async (req, res) => {
    try {
        const callbackData = req.body;
        console.log('M-Pesa payout callback received:', callbackData);

        // Log the callback data for debugging
        // In production, you would process this data to update payout status

        res.status(200).json({
            ResultCode: 0,
            ResultDesc: 'Accepted'
        });

    } catch (error) {
        console.error('Error handling M-Pesa payout callback:', error);
        res.status(500).json({
            ResultCode: 1,
            ResultDesc: 'Error processing callback'
        });
    }
};

// Check M-Pesa payout status
export const checkMpesaPayoutStatus = async (req, res) => {
    try {
        const { conversationId } = req.params;

        const accessToken = await getMpesaAccessToken();
        const { timestamp, password } = getSecurityCredentials();

        const requestData = {
            Initiator: MPESA_INITIATOR_NAME,
            SecurityCredential: password,
            CommandID: 'TransactionStatusQuery',
            TransactionID: conversationId,
            PartyA: MPESA_BUSINESS_SHORT_CODE,
            IdentifierType: '1',
            Remarks: 'Checking payout status',
            QueueTimeOutURL: `${MPESA_CALLBACK_URL}/timeout`,
            ResultURL: `${MPESA_CALLBACK_URL}/result`
        };

        const response = await axios.post(
            `${MPESA_API_BASE}/mpesa/transactionstatus/v1/query`,
            requestData,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        res.status(200).json({
            success: true,
            data: response.data
        });

    } catch (error) {
        console.error('Error checking M-Pesa payout status:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'Error checking payout status',
            error: error.response?.data || error.message
        });
    }
};

// Get M-Pesa balance
export const getMpesaBalance = async (req, res) => {
    try {
        const accessToken = await getMpesaAccessToken();
        const { timestamp, password } = getSecurityCredentials();

        const requestData = {
            Initiator: MPESA_INITIATOR_NAME,
            SecurityCredential: password,
            CommandID: 'AccountBalance',
            PartyA: MPESA_BUSINESS_SHORT_CODE,
            IdentifierType: '4',
            Remarks: 'Checking account balance',
            QueueTimeOutURL: `${MPESA_CALLBACK_URL}/timeout`,
            ResultURL: `${MPESA_CALLBACK_URL}/result`
        };

        const response = await axios.post(
            `${MPESA_API_BASE}/mpesa/accountbalance/v1/query`,
            requestData,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        res.status(200).json({
            success: true,
            data: response.data
        });

    } catch (error) {
        console.error('Error getting M-Pesa balance:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'Error getting M-Pesa balance',
            error: error.response?.data || error.message
        });
    }
};