import { Router } from 'express';
import { admin } from '../middleware/Admin.js';
import auth from '../middleware/auth.js';
import { delivery } from '../middleware/Delivery.js';
import staff from '../middleware/Staff.js'; // Fixed import - staff is a default export
import { requireStaffPermission } from '../middleware/requireStaffPermission.js';

// Import controller functions from deliveryController.js
import {
    acceptAvailableDeliveryOrder,
    getActiveDeliveriesForStaff,
    getAvailableDeliveryOrders,
    assignDeliveryPersonnel,
    getCompletedDeliveriesForStaff,
    getDispatchedOrders,
    dispatchOrder, // Import the new dispatch function
    exportDeliveryHistory,
    getActiveOrders,
    getAvailableDrivers,
    getCompletedOrders,
    getDashboardStats, // Add the new dashboard stats controller
    getDeliveryOrderDetails,
    getDeliveryHistory,
    getDeliveryStats,
    getPendingOrders,
    manuallyAssignDriver,
    toggleDriverStatusForStaff,
    updateDriverPresence,
    updateDriverLocation,
    updateOrderStatus
} from '../controllers/deliveryController.js';

const deliveryRouter = Router();

// Create a middleware that allows both admin and staff access
// This eliminates code duplication for each route
const adminOrStaff = (req, res, next) => {
    if (req.isAdmin) {
        // If admin middleware already verified this is an admin, let them through
        return next();
    } else {
        // Otherwise, apply the staff middleware
        return staff(req, res, next);
    }
};

// DRIVER ROUTES (require delivery role)
// Dashboard statistics
deliveryRouter.get('/stats', auth, delivery, getDeliveryStats);

// Active deliveries
deliveryRouter.get('/active-orders', auth, delivery, getActiveOrders);

// Completed deliveries
deliveryRouter.get('/completed-orders', auth, delivery, getCompletedOrders);

// Delivery history
deliveryRouter.get('/history', auth, delivery, getDeliveryHistory);
deliveryRouter.get('/export-history', auth, delivery, exportDeliveryHistory);
deliveryRouter.get('/order-details/:orderId', auth, delivery, getDeliveryOrderDetails);

// Update order status
deliveryRouter.post('/update-status', auth, delivery, updateOrderStatus);

// Driver online/offline presence
deliveryRouter.post('/presence', auth, delivery, updateDriverPresence);

// Driver claimable delivery pool
deliveryRouter.get('/available', auth, delivery, getAvailableDeliveryOrders);

// Driver self-accept available delivery
deliveryRouter.post('/accept/:orderId', auth, delivery, acceptAvailableDeliveryOrder);

// Update driver location
deliveryRouter.post('/update-location', auth, delivery, updateDriverLocation);

// ADMIN & STAFF ROUTES
// Get staff dashboard statistics
deliveryRouter.get('/dashboard-stats', auth, adminOrStaff, requireStaffPermission('delivery.view'), getDashboardStats);

// Get available drivers for manual selection
deliveryRouter.get('/available-drivers', auth, adminOrStaff, requireStaffPermission('delivery.view'), getAvailableDrivers);

// Get dispatched orders waiting for driver assignment
deliveryRouter.get('/dispatched-orders', auth, adminOrStaff, requireStaffPermission('delivery.view'), getDispatchedOrders);

// Get active deliveries for staff/admin monitoring
deliveryRouter.get('/active-deliveries', auth, adminOrStaff, requireStaffPermission('delivery.view'), getActiveDeliveriesForStaff);

// Get completed deliveries for staff/admin monitoring
deliveryRouter.get('/completed-deliveries', auth, adminOrStaff, requireStaffPermission('delivery.view_history'), getCompletedDeliveriesForStaff);

// Manual assignment of a specific driver by admin/staff
deliveryRouter.post('/assign-driver', auth, adminOrStaff, requireStaffPermission('delivery.assign_driver'), manuallyAssignDriver);

// Toggle driver active status by admin/staff
deliveryRouter.post('/toggle-driver-status', auth, adminOrStaff, requireStaffPermission('delivery.manage_drivers'), toggleDriverStatusForStaff);

// For fulfillment staff to dispatch an order for delivery
deliveryRouter.post('/dispatch', auth, adminOrStaff, requireStaffPermission('delivery.dispatch'), dispatchOrder);

// Auto-assign delivery personnel to an order (admin only - more powerful function)
deliveryRouter.post('/assign', auth, admin, requireStaffPermission('delivery.assign_driver'), assignDeliveryPersonnel);

// Get orders ready for dispatch (for admin/staff dashboard)
deliveryRouter.get('/pending-dispatch', auth, adminOrStaff, requireStaffPermission('delivery.view'), getPendingOrders);
deliveryRouter.get('/pending-orders', auth, adminOrStaff, requireStaffPermission('delivery.view'), getPendingOrders);

export default deliveryRouter;
