import { Router } from 'express'
import {
    CashOnDeliveryOrderController,
    getAllOrdersAdmin,
    getOrderBySessionController,
    getOrderDetailsController,
    paymentController,
    updateOrderStatus,
    webhookStripe,
    getOrderTrackingDetails,
    assignDeliveryPersonnel,
    updateOrderLocation,
    getAssignedOrders
} from '../controllers/order.controller.js'
import { admin } from '../middleware/Admin.js'
import auth from '../middleware/auth.js'

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

export default orderRouter