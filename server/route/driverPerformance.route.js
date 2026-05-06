import { Router } from 'express';
import auth from '../middleware/auth.js';
import { admin } from '../middleware/Admin.js';
import {
    getDriverPerformanceSummary,
    updateDeliveryPerformance,
    recordCancelledDelivery,
    getPerformanceHistory,
    generateMonthlyPerformanceReport,
    getTopPerformers,
    addPerformanceNote,
    updatePerformanceIndicators
} from '../controllers/driverPerformance.controller.js';

const router = Router();

// Driver routes
router.get(
    '/:driverId/summary',
    auth,
    getDriverPerformanceSummary
);

router.get(
    '/:driverId/history',
    auth,
    getPerformanceHistory
);

// Admin routes
router.put(
    '/:driverId/deliveries/:orderId',
    auth,
    admin,
    updateDeliveryPerformance
);

router.put(
    '/:driverId/cancellations',
    auth,
    admin,
    recordCancelledDelivery
);

router.get(
    '/monthly-report',
    auth,
    admin,
    generateMonthlyPerformanceReport
);

router.get(
    '/top-performers',
    auth,
    admin,
    getTopPerformers
);

router.post(
    '/:driverId/notes',
    auth,
    admin,
    addPerformanceNote
);

router.put(
    '/:driverId/indicators',
    auth,
    admin,
    updatePerformanceIndicators
);

export default router;
