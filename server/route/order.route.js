import { Router } from 'express'
import {
    assignDeliveryPersonnel,
    CashOnDeliveryOrderController,
    checkoutController,
    completePickupController,
    getAllOrdersAdmin,
    getAllPickupOrdersHistory,
    getAssignedOrders,
    getMostRecentOrder,
    getOrderBySessionController,
    getOrderDetailsController,
    getOrderTrackingDetails,
    getPendingPickupsController,
    getVerificationHistoryController,
    guestCheckoutController,
    trackGuestOrderController,
    updateOrderLocation,
    updateOrderStatus,
    verifyPickupCode,
    verifyPickupController
} from '../controllers/order.controller.js'
import { admin } from '../middleware/Admin.js'
import auth from '../middleware/auth.js'
import staff from '../middleware/Staff.js'
import { delivery } from '../middleware/Delivery.js'
import { requireStaffPermission } from '../middleware/requireStaffPermission.js'

const orderRouter = Router()

// User order routes
orderRouter.post("/cash-on-delivery", auth, CashOnDeliveryOrderController)
orderRouter.post('/checkout', auth, checkoutController) // Checkout with payment redirect
orderRouter.post('/guest-checkout', guestCheckoutController) // Guest checkout (no auth required)
orderRouter.get('/track-guest', trackGuestOrderController) // Guest order tracking (no auth required)
orderRouter.get("/order-list", auth, getOrderDetailsController)
orderRouter.get("/details", auth, getOrderBySessionController)
orderRouter.get("/recent", auth, getMostRecentOrder)
orderRouter.get("/receipt", auth, getOrderBySessionController)

// Admin order management routes
orderRouter.get('/admin/all', auth, admin, getAllOrdersAdmin)
orderRouter.put('/status/:id', auth, admin, updateOrderStatus)

// Delivery tracking routes
orderRouter.get("/track/:id", auth, getOrderTrackingDetails);
// Retired: these older routes bypassed the dispatch/verification/capacity flow.
orderRouter.post("/assign-delivery", auth, admin, (_req, res) => res.status(410).json({ success: false, message: 'Use /api/delivery/assign-driver instead.' }));
orderRouter.post("/update-location", auth, delivery, (_req, res) => res.status(410).json({ success: false, message: 'Use /api/delivery/update-location instead.' }));
orderRouter.get("/delivery-assigned", auth, (_req, res) => res.status(410).json({ success: false, message: 'This testing endpoint has been retired.' }));

// Staff Pickup Verification Routes
orderRouter.post('/verify-pickup', auth, staff, requireStaffPermission('pickup.verify_code'), verifyPickupController);
orderRouter.put('/complete-pickup', auth, staff, requireStaffPermission('pickup.complete'), completePickupController);
orderRouter.get('/pending-pickups', auth, staff, requireStaffPermission('pickup.view_queue'), getPendingPickupsController);
orderRouter.get('/verification-history', auth, staff, requireStaffPermission('pickup.view_history'), getVerificationHistoryController);
orderRouter.get('/pickup-orders-history', auth, staff, requireStaffPermission('pickup.view_history'), getAllPickupOrdersHistory);

// Staff routes for order verification
orderRouter.post('/staff/verify-pickup-code', auth, staff, requireStaffPermission('pickup.verify_code'), verifyPickupCode);
orderRouter.post('/staff/complete-pickup', auth, staff, requireStaffPermission('pickup.complete'), completePickupController);
orderRouter.get('/staff/pending-pickups', auth, staff, requireStaffPermission('pickup.view_queue'), getPendingPickupsController);
orderRouter.get('/staff/verification-history', auth, staff, requireStaffPermission('pickup.view_history'), getVerificationHistoryController);
orderRouter.get('/staff/pickup-orders-history', auth, staff, requireStaffPermission('pickup.view_history'), getAllPickupOrdersHistory);

export default orderRouter
