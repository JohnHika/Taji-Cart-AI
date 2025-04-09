const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Add this route near your other order routes
router.get("/recent", verifyToken, orderController.getMostRecentOrder);

module.exports = router;