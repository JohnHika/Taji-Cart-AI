import { Router } from 'express';
import auth from '../middleware/auth.js';
import { admin } from '../middleware/Admin.js';
import {
    processMpesaPayout,
    handleMpesaPayoutCallback,
    checkMpesaPayoutStatus,
    getMpesaBalance
} from '../controllers/mpesaPayout.controller.js';

const router = Router();

// Admin routes for processing payouts
router.post(
    '/:driverId/payouts/:payoutId/mpesa',
    auth,
    admin,
    processMpesaPayout
);

// M-Pesa callback routes
router.post(
    '/payout-callback/result',
    handleMpesaPayoutCallback
);

router.post(
    '/payout-callback/timeout',
    handleMpesaPayoutCallback
);

// Admin utility routes
router.get(
    '/payouts/:conversationId/status',
    auth,
    admin,
    checkMpesaPayoutStatus
);

router.get(
    '/balance',
    auth,
    admin,
    getMpesaBalance
);

export default router;
