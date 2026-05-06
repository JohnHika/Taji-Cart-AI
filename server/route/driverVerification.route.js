import { Router } from 'express';
import auth from '../middleware/auth.js';
import { admin } from '../middleware/Admin.js';
import upload from '../middleware/multer.js';
import {
    submitDriverDocuments,
    getDriversForVerification,
    verifyDriver,
    getDriverVerificationStatus,
    checkExpiringDocuments
} from '../controllers/driverVerification.controller.js';

const router = Router();

// Driver routes
router.post(
    '/:driverId/documents',
    auth,
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

router.get(
    '/expiring-documents',
    auth,
    admin,
    checkExpiringDocuments
);

export default router;
