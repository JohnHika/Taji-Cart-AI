import { Router } from 'express';
import { admin } from '../middleware/Admin.js';
import auth from '../middleware/auth.js';
import { delivery } from '../middleware/Delivery.js';
import staff from '../middleware/Staff.js'; // Fixed import - staff is a default export

// Import controller functions from deliveryController.js
import {
    assignDeliveryPersonnel,
    dispatchOrder, // Import the new dispatch function
    exportDeliveryHistory,
    getActiveOrders,
    getAvailableDrivers,
    getCompletedOrders,
    getDashboardStats, // Add the new dashboard stats controller
    getDeliveryHistory,
    getDeliveryStats,
    getPendingOrders,
    manuallyAssignDriver,
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

// Update order status
deliveryRouter.post('/update-status', auth, delivery, updateOrderStatus);

// Update driver location
deliveryRouter.post('/update-location', auth, delivery, updateDriverLocation);

// ADMIN & STAFF ROUTES
// Get staff dashboard statistics
deliveryRouter.get('/dashboard-stats', auth, adminOrStaff, getDashboardStats);

// Get available drivers for manual selection
deliveryRouter.get('/available-drivers', auth, adminOrStaff, getAvailableDrivers);

// Manual assignment of a specific driver by admin/staff
deliveryRouter.post('/assign-driver', auth, adminOrStaff, manuallyAssignDriver);

// For fulfillment staff to dispatch an order for delivery
deliveryRouter.post('/dispatch', auth, adminOrStaff, dispatchOrder);

// Auto-assign delivery personnel to an order (admin only - more powerful function)
deliveryRouter.post('/assign', auth, admin, assignDeliveryPersonnel);

// Get orders ready for dispatch (for admin/staff dashboard)
deliveryRouter.get('/pending-dispatch', auth, adminOrStaff, getPendingOrders);
deliveryRouter.get('/pending-orders', auth, adminOrStaff, getPendingOrders);

export default deliveryRouter;
