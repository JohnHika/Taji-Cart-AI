import express from 'express';
import * as deliveryController from '../controllers/deliveryController.js';
import auth from '../middleware/auth.js';  // Change this line

const router = express.Router();

// Apply authentication to all delivery routes
router.use(auth);  // Change this line

// Dashboard statistics
router.get('/stats', deliveryController.getDeliveryStats);

// Active deliveries
router.get('/active-orders', deliveryController.getActiveOrders);

// Completed deliveries
router.get('/completed-orders', deliveryController.getCompletedOrders);

// Delivery history
router.get('/history', deliveryController.getDeliveryHistory);
router.get('/export-history', deliveryController.exportDeliveryHistory);

// Update order status
router.post('/update-status', deliveryController.updateOrderStatus);

// Update driver location
router.post('/update-location', deliveryController.updateDriverLocation);

export default router;
