import { Router } from 'express';
import {
    assignDeliveryPersonnel,
    getAvailableDeliveryPersonnel,
    getOrderTrackingDetails,
    updateOrderLocation
} from '../controllers/tracking.controller.js';
import auth from '../middleware/auth.js';
import { admin } from '../middleware/Admin.js';

const trackingRouter = Router();

// Customer routes
trackingRouter.get('/order/:id', auth, getOrderTrackingDetails);

// Delivery personnel routes
trackingRouter.post('/location/update', auth, updateOrderLocation);

// Admin routes
trackingRouter.get('/personnel/available', auth, admin, getAvailableDeliveryPersonnel);
trackingRouter.post('/assign', auth, admin, assignDeliveryPersonnel);

export default trackingRouter;