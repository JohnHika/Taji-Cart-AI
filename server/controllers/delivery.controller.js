import DeliveryPersonnelModel from '../models/deliverypersonnel.model.js';
import OrderModel from '../models/order.model.js';

/**
 * Get all deliveries assigned to the logged-in delivery person
 */
export const getAssignedDeliveries = async (req, res) => {
    try {
        const userId = req.userId;
        
        // Find delivery personnel record
        const deliveryPersonnel = await DeliveryPersonnelModel.findOne({ userId });
        
        if (!deliveryPersonnel) {
            return res.status(404).json({
                message: "Delivery personnel record not found",
                success: false
            });
        }
        
        // Get active deliveries assigned to this person
        const assignedOrders = await OrderModel.find({
            deliveryPersonnel: deliveryPersonnel._id,
            status: { 
                $in: [
                    'driver_assigned', 
                    'out_for_delivery', 
                    'nearby'
                ] 
            }
        })
        .sort({ updatedAt: -1 })
        .populate('userId', 'name email mobile')
        .populate('delivery_address');
        
        return res.status(200).json({
            success: true,
            data: assignedOrders
        });
    } catch (error) {
        console.error("Error fetching assigned deliveries:", error);
        return res.status(500).json({
            message: error.message || "Error fetching assigned deliveries",
            success: false
        });
    }
};

/**
 * Get completed deliveries by the logged-in delivery person
 */
export const getCompletedDeliveries = async (req, res) => {
    try {
        const userId = req.userId;
        const { page = 1, limit = 10 } = req.query;
        
        // Find delivery personnel record
        const deliveryPersonnel = await DeliveryPersonnelModel.findOne({ userId });
        
        if (!deliveryPersonnel) {
            return res.status(404).json({
                message: "Delivery personnel record not found",
                success: false
            });
        }
        
        // Get completed deliveries with pagination
        const completedOrders = await OrderModel.find({
            deliveryPersonnel: deliveryPersonnel._id,
            status: 'delivered'
        })
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('userId', 'name email mobile')
        .populate('delivery_address');
        
        // Get total count for pagination
        const totalOrders = await OrderModel.countDocuments({
            deliveryPersonnel: deliveryPersonnel._id,
            status: 'delivered'
        });
        
        return res.status(200).json({
            success: true,
            data: {
                orders: completedOrders,
                totalPages: Math.ceil(totalOrders / limit),
                currentPage: parseInt(page)
            }
        });
    } catch (error) {
        console.error("Error fetching completed deliveries:", error);
        return res.status(500).json({
            message: error.message || "Error fetching completed deliveries",
            success: false
        });
    }
};

/**
 * Update the status of a delivery
 */
export const updateDeliveryStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, latitude, longitude, note } = req.body;
        const userId = req.userId;
        
        if (!orderId || !status) {
            return res.status(400).json({
                message: "Order ID and status are required",
                success: false
            });
        }
        
        // Validate status
        const validStatuses = ['driver_assigned', 'out_for_delivery', 'nearby', 'delivered'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid status. Must be one of: " + validStatuses.join(', '),
                success: false
            });
        }
        
        // Find delivery personnel record
        const deliveryPersonnel = await DeliveryPersonnelModel.findOne({ userId });
        
        if (!deliveryPersonnel) {
            return res.status(404).json({
                message: "Delivery personnel record not found",
                success: false
            });
        }
        
        // Get the order and make sure it's assigned to this delivery person
        const order = await OrderModel.findById(orderId);
        
        if (!order) {
            return res.status(404).json({
                message: "Order not found",
                success: false
            });
        }
        
        if (!order.deliveryPersonnel || 
            !order.deliveryPersonnel.equals(deliveryPersonnel._id)) {
            return res.status(403).json({
                message: "This order is not assigned to you",
                success: false
            });
        }
        
        // Update the order status
        order.status = status;
        
        // Add to status history
        const statusUpdate = {
            status: status,
            timestamp: new Date(),
            note: note || `Status updated to ${status}`
        };
        
        // If location is provided, add it
        if (latitude && longitude) {
            statusUpdate.location = {
                lat: latitude,
                lng: longitude
            };
            
            // Also update current location
            order.currentLocation = {
                lat: latitude,
                lng: longitude,
                lastUpdated: new Date()
            };
        }
        
        // Add status update to history
        if (!order.statusHistory) {
            order.statusHistory = [];
        }
        order.statusHistory.push(statusUpdate);
        
        // If status is 'delivered', set estimated delivery time to now
        if (status === 'delivered') {
            order.estimatedDeliveryTime = new Date();
        } else if (status === 'out_for_delivery') {
            // Set estimated delivery time to 1 hour from now
            const estimatedTime = new Date();
            estimatedTime.setHours(estimatedTime.getHours() + 1);
            order.estimatedDeliveryTime = estimatedTime;
        }
        
        await order.save();
        
        return res.status(200).json({
            message: `Order status updated to ${status}`,
            success: true,
            data: order
        });
    } catch (error) {
        console.error("Error updating delivery status:", error);
        return res.status(500).json({
            message: error.message || "Error updating delivery status",
            success: false
        });
    }
};

/**
 * Get delivery dashboard data
 */
export const getDeliveryDashboard = async (req, res) => {
    try {
        const userId = req.userId;
        
        // Find delivery personnel record
        const deliveryPersonnel = await DeliveryPersonnelModel.findOne({ userId });
        
        if (!deliveryPersonnel) {
            return res.status(404).json({
                message: "Delivery personnel record not found",
                success: false
            });
        }
        
        // Get pending deliveries
        const pendingDeliveries = await OrderModel.countDocuments({
            deliveryPersonnel: deliveryPersonnel._id,
            status: { $in: ['driver_assigned', 'out_for_delivery', 'nearby'] }
        });
        
        // Get today's completed deliveries
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayDeliveries = await OrderModel.countDocuments({
            deliveryPersonnel: deliveryPersonnel._id,
            status: 'delivered',
            updatedAt: { $gte: today }
        });
        
        // Get all time completed deliveries
        const totalDeliveries = await OrderModel.countDocuments({
            deliveryPersonnel: deliveryPersonnel._id,
            status: 'delivered'
        });
        
        // Get average rating 
        const averageRating = deliveryPersonnel.averageRating || 0;
        
        return res.status(200).json({
            success: true,
            data: {
                pendingDeliveries,
                todayDeliveries,
                totalDeliveries,
                averageRating
            }
        });
    } catch (error) {
        console.error("Error fetching delivery dashboard:", error);
        return res.status(500).json({
            message: error.message || "Error fetching delivery dashboard",
            success: false
        });
    }
};
