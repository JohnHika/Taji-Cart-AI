const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/delivery.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');

// Apply authentication to all delivery routes
router.use(authMiddleware);

// Apply role middleware to ensure only delivery personnel can access these routes
router.use(roleMiddleware(['delivery']));

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

module.exports = router;
