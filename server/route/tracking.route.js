import { Router } from 'express';
import {
    assignDeliveryPersonnel,
    getAvailableDeliveryPersonnel,
    getOrderTrackingDetails,
    updateOrderLocation
} from '../controllers/tracking.controller.js';
import auth from '../middleware/auth.js';
import { admin } from '../middleware/Admin.js';
import { delivery } from '../middleware/Delivery.js';

const trackingRouter = Router();

// Customer routes
trackingRouter.get('/order/:id', auth, getOrderTrackingDetails);

// Delivery personnel routes
trackingRouter.post('/location/update', auth, delivery, (_req, res) => res.status(410).json({ success: false, message: 'Use /api/delivery/update-location instead.' }));

// Admin routes
trackingRouter.get('/personnel/available', auth, admin, getAvailableDeliveryPersonnel);
trackingRouter.post('/assign', auth, admin, (_req, res) => res.status(410).json({ success: false, message: 'Use /api/delivery/assign instead.' }));

export default trackingRouter;
