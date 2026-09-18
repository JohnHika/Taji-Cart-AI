import { Router } from 'express';
import auth from '../middleware/auth.js';
import {
  initiateJengaPayment,
  initiateGuestJengaPayment,
  getJengaPaymentStatus,
  handleJengaCallback,
  initiateJengaCardPayment,
  handleJengaCardCallback,
} from '../controllers/jenga.controller.js';

const jengaRouter = Router();

// Authenticated — never exposes Jenga credentials, only triggers server-side calls.
jengaRouter.post('/pay', auth, initiateJengaPayment);
jengaRouter.get('/status/:orderReference', auth, getJengaPaymentStatus);
jengaRouter.post('/card/pay', auth, initiateJengaCardPayment);

// Public — no account required. getJengaPaymentStatus's ownership check
// (doc.userId && ...) already no-ops when doc.userId is unset, which is
// exactly the guest-order case, so it's safe to reuse unauthenticated here.
jengaRouter.post('/guest/pay', initiateGuestJengaPayment);
jengaRouter.get('/guest/status/:orderReference', getJengaPaymentStatus);

// Public — Jenga calls this; callback body alone never approves a payment,
// it only triggers an authenticated status reconciliation.
jengaRouter.post('/callback', handleJengaCallback);
// Public — this is a browser redirect (GET), not a server-to-server call;
// see handleJengaCardCallback for why the query params aren't trusted directly.
jengaRouter.get('/card/callback', handleJengaCardCallback);

export default jengaRouter;
