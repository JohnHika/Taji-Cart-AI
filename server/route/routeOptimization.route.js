import { Router } from 'express';
import auth from '../middleware/auth.js';
import { admin } from '../middleware/Admin.js';
import {
    optimizeDriverRoute,
    optimizeMultiDriverRoutes,
    calculateDeliveryETA,
    validateOpenStreetMapApiKey,
    getDriverCurrentRoute
} from '../controllers/routeOptimization.controller.js';

const router = Router();

// Driver routes
router.get(
    '/:driverId/route',
    auth,
    getDriverCurrentRoute
);

// Admin and system routes
router.post(
    '/:driverId/optimize',
    auth,
    optimizeDriverRoute
);

router.post(
    '/multi-driver/optimize',
    auth,
    admin,
    optimizeMultiDriverRoutes
);

router.get(
    '/:orderId/eta',
    auth,
    calculateDeliveryETA
);

router.get(
    '/validate-api-key',
    auth,
    admin,
    validateOpenStreetMapApiKey
);

export default router;
