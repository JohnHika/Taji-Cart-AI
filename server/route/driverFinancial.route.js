import { Router } from 'express';
import auth from '../middleware/auth.js';
import { admin } from '../middleware/Admin.js';
import upload from '../middleware/multer.js';
import {
    getDriverFinancialSummary,
    addDeliveryCommission,
    requestPayout,
    processPayout,
    addExpense,
    updatePayoutPreferences,
    getAllPayouts,
    calculateDriverEarnings
} from '../controllers/driverFinancial.controller.js';

const router = Router();

// Driver routes
router.get(
    '/:driverId/summary',
    auth,
    getDriverFinancialSummary
);

router.get(
    '/:driverId/earnings',
    auth,
    calculateDriverEarnings
);

router.post(
    '/:driverId/preferences',
    auth,
    updatePayoutPreferences
);

// Admin routes
router.post(
    '/:driverId/commissions/:orderId',
    auth,
    admin,
    addDeliveryCommission
);

router.post(
    '/:driverId/payouts',
    auth,
    requestPayout
);

router.put(
    '/:driverId/payouts/:payoutId',
    auth,
    admin,
    processPayout
);

router.post(
    '/:driverId/expenses',
    auth,
    upload.single('receipt'),
    addExpense
);

router.get(
    '/payouts',
    auth,
    admin,
    getAllPayouts
);

export default router;
