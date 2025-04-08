import { Router } from 'express';
import {
    getAssignedDeliveries,
    getCompletedDeliveries,
    getDeliveryDashboard,
    updateDeliveryStatus
} from '../controllers/delivery.controller.js';
import auth from '../middleware/auth.js';
import { delivery } from '../middleware/Delivery.js';

const deliveryRouter = Router();

// All routes require authentication and delivery role
deliveryRouter.get('/assigned', auth, delivery, getAssignedDeliveries);
deliveryRouter.get('/completed', auth, delivery, getCompletedDeliveries);
deliveryRouter.put('/update-status/:orderId', auth, delivery, updateDeliveryStatus);
deliveryRouter.get('/dashboard', auth, delivery, getDeliveryDashboard);

export default deliveryRouter;
