import { Router } from 'express';
import {
  createPayHeroPayment,
  createCashOnDeliveryOrder,
  checkPayHeroStatus,
  payHeroCallback,
  getPayHeroPaymentLink
} from '../controllers/payhero.controller.js';

const router = Router();

// Initiate PayHero online payment (M-Pesa STK Push)
router.post('/pay', createPayHeroPayment);

// Create Cash on Delivery order
router.post('/cod', createCashOnDeliveryOrder);

// Check payment status
router.get('/status/:checkoutRequestId', checkPayHeroStatus);

// Generate payment link for order
router.get('/link/:orderId', getPayHeroPaymentLink);

// Webhook callback from PayHero (no auth required - uses callback URL security)
router.post('/callback', payHeroCallback);

export default router;
