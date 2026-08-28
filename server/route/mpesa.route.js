import { Router } from 'express';
import auth from '../middleware/auth.js';
import MpesaPayment from '../models/mpesaPayment.model.js';
import { queryStkPushStatus } from '../config/mpesa.js';

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
 *
 * This endpoint has no signature and CheckoutRequestID is visible to the
 * client (it's returned to and polled by the browser/app), so the POST body
 * itself is never trusted for financial finality — anyone who captured that
 * ID could otherwise forge a "payment succeeded" callback. It's used only as
 * a trigger to independently ask Safaricom's own STK Push Query API what the
 * real status is, and that response is what actually decides success/failure.
 */
mpesaRouter.post('/callback', async (req, res) => {
  try {
    const checkoutId = req.body?.Body?.stkCallback?.CheckoutRequestID;

    if (checkoutId) {
      const existing = await MpesaPayment.findOne({ checkoutRequestId: checkoutId });

      // Already resolved (a retried callback, or a forged duplicate) — no-op.
      if (existing && existing.status === 'pending') {
        try {
          const verified = await queryStkPushStatus(checkoutId);
          const verifiedResultCode = Number(verified?.ResultCode);

          await MpesaPayment.findOneAndUpdate(
            { checkoutRequestId: checkoutId, status: 'pending' },
            {
              status:      verifiedResultCode === 0 ? 'success' : 'failed',
              resultCode:  verifiedResultCode,
              resultDesc:  verified?.ResultDesc || '',
              rawCallback: req.body,
            }
          );
        } catch (verifyError) {
          // Could not independently confirm with Safaricom — leave the
          // payment 'pending' rather than trusting the unverified callback
          // body. The client's status poll will keep waiting; a genuine
          // payment can be confirmed on a later callback retry or manually.
          console.error(`M-Pesa status verification failed for ${checkoutId}:`, verifyError?.response?.data || verifyError.message);
        }
      }
    }

    // Always 200 — Safaricom retries on any other status code
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('M-Pesa callback error:', err);
    return res.status(200).json({ success: true }); // still 200 to stop retries
  }
});

export default mpesaRouter;
