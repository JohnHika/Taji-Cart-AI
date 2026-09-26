import { Router } from 'express';
import auth from '../middleware/auth.js';
import { admin } from '../middleware/Admin.js';
import upload from '../middleware/multer.js';
import DeliveryPersonnelModel from '../models/deliverypersonnel.model.js';
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

// These routes only ever required a valid login, not that the caller IS the
// driver named in :driverId — any authenticated user could read or rewrite
// another driver's earnings, payout preferences (bank/M-Pesa details) or
// request a payout on their behalf. Admins still pass through untouched.
const requireOwnDriverOrAdmin = async (req, res, next) => {
    if (req.isAdmin) {
        return next();
    }

    try {
        const { driverId } = req.params;
        const profile = await DeliveryPersonnelModel.findOne({ userId: req.userId }).select('_id');

        if (profile && String(profile._id) === String(driverId)) {
            return next();
        }

        return res.status(403).json({
            success: false,
            message: 'You may only access your own driver financial records'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error verifying driver ownership'
        });
    }
};

// Payout requests must be for a real, positive amount — the controller
// trusts req.body.amount as-is (subtracting it straight from pending
// earnings), so a negative amount would top the driver's pending balance up
// instead of drawing it down.
const requirePositivePayoutAmount = (req, res, next) => {
    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Payout amount must be a positive number'
        });
    }
    next();
};

// Driver routes
router.get(
    '/:driverId/summary',
    auth,
    requireOwnDriverOrAdmin,
    getDriverFinancialSummary
);

router.get(
    '/:driverId/earnings',
    auth,
    requireOwnDriverOrAdmin,
    calculateDriverEarnings
);

router.post(
    '/:driverId/preferences',
    auth,
    requireOwnDriverOrAdmin,
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
    requireOwnDriverOrAdmin,
    requirePositivePayoutAmount,
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
    requireOwnDriverOrAdmin,
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
