import { Router } from 'express'
import {
    assignDeliveryPersonnel,
    CashOnDeliveryOrderController,
    completePickupController,
    getAllOrdersAdmin,
    getAllPickupOrdersHistory,
    getAssignedOrders,
    getOrderBySessionController,
    getOrderDetailsController,
    getOrderTrackingDetails,
    getPendingPickupsController,
    getVerificationHistoryController,
    paymentController,
    updateOrderLocation,
    updateOrderStatus,
    verifyPickupCode,
    verifyPickupController,
    webhookStripe
} from '../controllers/order.controller.js'
import { admin } from '../middleware/Admin.js'
import auth from '../middleware/auth.js'
import staff from '../middleware/Staff.js'

const orderRouter = Router()

// User order routes
orderRouter.post("/cash-on-delivery", auth, CashOnDeliveryOrderController)
orderRouter.post('/checkout', auth, paymentController)
orderRouter.post('/webhook', webhookStripe)
orderRouter.get("/order-list", auth, getOrderDetailsController)
orderRouter.get("/details", auth, getOrderBySessionController)

// Admin order management routes
orderRouter.get('/admin/all', auth, admin, getAllOrdersAdmin)
orderRouter.put('/status/:id', auth, admin, updateOrderStatus)

// Delivery tracking routes
orderRouter.get("/track/:id", auth, getOrderTrackingDetails);
orderRouter.post("/assign-delivery", auth, admin, assignDeliveryPersonnel);
orderRouter.post("/update-location", auth, updateOrderLocation);
orderRouter.get("/delivery-assigned", auth, getAssignedOrders); // For testing

// Staff Pickup Verification Routes
orderRouter.post('/verify-pickup', auth, staff, verifyPickupController);
orderRouter.put('/complete-pickup', auth, staff, completePickupController);
orderRouter.get('/pending-pickups', auth, staff, getPendingPickupsController);
orderRouter.get('/verification-history', auth, staff, getVerificationHistoryController);
orderRouter.get('/pickup-orders-history', auth, staff, getAllPickupOrdersHistory);

// Staff routes for order verification
orderRouter.post('/staff/verify-pickup-code', auth, staff, verifyPickupCode);
orderRouter.post('/staff/complete-pickup', auth, staff, completePickupController);
orderRouter.get('/staff/pending-pickups', auth, staff, getPendingPickupsController);
orderRouter.get('/staff/verification-history', auth, staff, getVerificationHistoryController);
orderRouter.get('/staff/pickup-orders-history', auth, staff, getAllPickupOrdersHistory);

export default orderRouter