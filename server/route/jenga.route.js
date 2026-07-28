import { Router } from 'express';
import auth from '../middleware/auth.js';
import {
  initiateJengaPayment,
  getJengaPaymentStatus,
  handleJengaCallback,
} from '../controllers/jenga.controller.js';

const jengaRouter = Router();

// Authenticated — never exposes Jenga credentials, only triggers server-side calls.
jengaRouter.post('/pay', auth, initiateJengaPayment);
jengaRouter.get('/status/:orderReference', auth, getJengaPaymentStatus);

// Public — Jenga calls this; callback body alone never approves a payment,
// it only triggers an authenticated status reconciliation.
jengaRouter.post('/callback', handleJengaCallback);

export default jengaRouter;
