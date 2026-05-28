import { Router } from 'express';
import auth from '../middleware/auth.js';
import MpesaPayment from '../models/mpesaPayment.model.js';

const mpesaRouter = Router();

/**
 * GET /api/mpesa/status?checkoutRequestId=...
 * Polled by StaffPOS.jsx every 3 seconds while a payment row is 'pending'.
 */
mpesaRouter.get('/status', auth, async (req, res) => {
  try {
    const { checkoutRequestId } = req.query;
    if (!checkoutRequestId) {
      return res.status(400).json({ success: false, message: 'checkoutRequestId is required' });
    }

    const doc = await MpesaPayment.findOne({ checkoutRequestId });
    if (!doc) {
      return res.json({ success: true, status: 'unknown' });
    }

    return res.json({
      success: true,
      status: doc.status,
      resultCode: doc.resultCode,
      resultDesc: doc.resultDesc,
    });
  } catch (err) {
    console.error('M-Pesa status lookup error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/mpesa/callback
 * Safaricom calls this URL after the customer authorises (or rejects) the STK prompt.
 * Always returns HTTP 200 so Safaricom doesn't retry indefinitely.
 */
mpesaRouter.post('/callback', async (req, res) => {
  try {
    const callbackData  = req.body;
    const stkCallback   = callbackData?.Body?.stkCallback;
    const resultCode    = stkCallback?.ResultCode;
    const resultDesc    = stkCallback?.ResultDesc;
    const checkoutId    = stkCallback?.CheckoutRequestID;

    if (checkoutId) {
      await MpesaPayment.findOneAndUpdate(
        { checkoutRequestId: checkoutId },
        {
          status:      resultCode === 0 ? 'success' : 'failed',
          resultCode,
          resultDesc,
          rawCallback: callbackData,
        }
      );
    }

    // Always 200 — Safaricom retries on any other status code
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('M-Pesa callback error:', err);
    return res.status(200).json({ success: true }); // still 200 to stop retries
  }
});

export default mpesaRouter;
