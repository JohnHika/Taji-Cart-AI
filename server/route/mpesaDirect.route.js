import { Router } from 'express';
import {
  createMpesaPayment,
  mpesaCallback,
  checkMpesaStatus,
  verifyPaymentByReference
} from '../controllers/mpesaDirect.controller.js';

const router = Router();

// Initiate M-Pesa STK Push payment (with unique order code)
router.post('/pay', createMpesaPayment);

// M-Pesa callback webhook (Safaricom sends payment confirmation here)
router.post('/callback', mpesaCallback);

// Check payment status by checkout request ID
router.get('/status/:checkoutRequestId', checkMpesaStatus);

// Verify payment by unique order reference
router.get('/verify/:orderReference', verifyPaymentByReference);

export default router;
