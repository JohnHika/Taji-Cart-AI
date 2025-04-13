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
    getDeliveryHistory,
    getDeliveryStats,
    manuallyAssignDriver,
    updateDriverLocation,
    updateOrderStatus
} from '../controllers/deliveryController.js';

const deliveryRouter = Router();

// All routes require authentication and delivery role
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

// Admin/Staff Routes
// Route for fulfillment staff to assign a delivery person to an order (requires previous dispatch)
deliveryRouter.post('/assign', auth, admin, assignDeliveryPersonnel);

// NEW: Get available drivers for manual selection
deliveryRouter.get('/available-drivers', auth, (req, res, next) => {
    // Use staff middleware directly for staff check
    const checkStaff = (req, res, next) => {
        if (req.isAdmin) {
            // If admin middleware already verified this is an admin, let them through
            return next();
        } else {
            // Otherwise, apply the staff middleware
            return staff(req, res, next);
        }
    };
    
    return checkStaff(req, res, next);
}, getAvailableDrivers);

// NEW: Manual assignment of a specific driver by admin/staff
deliveryRouter.post('/assign-driver', auth, (req, res, next) => {
    // Use staff middleware directly for staff check
    const checkStaff = (req, res, next) => {
        if (req.isAdmin) {
            // If admin middleware already verified this is an admin, let them through
            return next();
        } else {
            // Otherwise, apply the staff middleware
            return staff(req, res, next);
        }
    };
    
    return checkStaff(req, res, next);
}, manuallyAssignDriver);

// Route for fulfillment staff to dispatch an order for delivery - can be accessed by both admin and staff
deliveryRouter.post('/dispatch', auth, (req, res, next) => {
    // Use staff middleware directly for staff check
    const checkStaff = (req, res, next) => {
        if (req.isAdmin) {
            // If admin middleware already verified this is an admin, let them through
            return next();
        } else {
            // Otherwise, apply the staff middleware
            return staff(req, res, next);
        }
    };
    
    return checkStaff(req, res, next);
}, dispatchOrder);

// Get orders ready for dispatch (for admin/staff dashboard)
deliveryRouter.get('/pending-dispatch', auth, (req, res, next) => {
    // Use staff middleware directly for staff check
    const checkStaff = (req, res, next) => {
        if (req.isAdmin) {
            // If admin middleware already verified this is an admin, let them through
            return next();
        } else {
            // Otherwise, apply the staff middleware
            return staff(req, res, next);
        }
    };
    
    return checkStaff(req, res, next);
}, async (req, res) => {
    try {
        // Use ES module import for Order model
        const Order = (await import('../models/order.model.js')).default;
        
        // Find orders that are ready for dispatch (status is processing or pending)
        // and fulfillment type is delivery
        const pendingOrders = await Order.find({
            status: { $in: ['pending', 'processing'] },
            fulfillment_type: 'delivery',
        }).populate('userId', 'name email mobile')
          .populate('delivery_address')
          .sort({ createdAt: 1 }); // Oldest first
          
        return res.status(200).json({
            success: true,
            data: pendingOrders
        });
    } catch (error) {
        console.error('Error fetching pending dispatch orders:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch orders pending dispatch',
            error: error.message
        });
    }
});

export default deliveryRouter;
