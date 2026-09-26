import { Router } from 'express';
import auth from '../middleware/auth.js';
import { admin } from '../middleware/Admin.js';
import upload from '../middleware/multer.js';
import DeliveryPersonnelModel from '../models/deliverypersonnel.model.js';
import {
    submitDriverDocuments,
    getDriversForVerification,
    verifyDriver,
    bulkVerifyDrivers,
    getDriverVerificationStatus,
    checkExpiringDocuments
} from '../controllers/driverVerification.controller.js';

const router = Router();

// These "driver" routes only ever required a valid login, not that the
// caller IS the driver named in :driverId — any authenticated user could
// overwrite another driver's ID/license documents (and reset their
// verificationStatus to 'pending') or read their verification status.
// Admins still pass through untouched.
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
            message: 'You may only access your own driver verification records'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error verifying driver ownership'
        });
    }
};

// Driver routes
router.post(
    '/:driverId/documents',
    auth,
    requireOwnDriverOrAdmin,
    upload.fields([
        { name: 'idFront', maxCount: 1 },
        { name: 'idBack', maxCount: 1 },
        { name: 'licenseFront', maxCount: 1 }
    ]),
    submitDriverDocuments
);

router.get(
    '/:driverId/status',
    auth,
    requireOwnDriverOrAdmin,
    getDriverVerificationStatus
);

// Admin routes
router.get(
    '/',
    auth,
    admin,
    getDriversForVerification
);

router.put(
    '/:driverId/verify',
    auth,
    admin,
    verifyDriver
);

router.put(
    '/bulk-verify',
    auth,
    admin,
    bulkVerifyDrivers
);

router.get(
    '/expiring-documents',
    auth,
    admin,
    checkExpiringDocuments
);

export default router;
