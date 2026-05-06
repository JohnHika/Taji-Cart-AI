import express from 'express';
import { equityPayment, checkEquityPaymentStatus, equityPaymentCallback } from '../controllers/equity.controller.js';
import auth from '../middleware/auth.js';

const equityRouter = express.Router();

// Payment routes
equityRouter.post('/api/equity/pay', auth, equityPayment);
equityRouter.get('/api/equity/status/:transactionId', auth, checkEquityPaymentStatus);

// Webhook callback (no auth needed - Equity Bank will call this)
equityRouter.post('/api/equity/callback', equityPaymentCallback);

export default equityRouter;
