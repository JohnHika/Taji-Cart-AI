import mongoose from 'mongoose';
import DeliveryPersonnelModel from '../models/deliverypersonnel.model.js';
import { default as Order, default as OrderModel } from '../models/order.model.js';
import User from '../models/user.model.js';
import { emitOrderStatusUpdated, getIO } from '../socket/socket.js';

// Get delivery driver statistics
export const getDeliveryStats = async (req, res) => {
  try {
    const driverId = req.userId;
    
    // Get counts for different order statuses
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    // Active orders count
    const activeOrders = await OrderModel.countDocuments({
        deliveryPersonnel: driverId,
        status: { $in: ['driver_assigned', 'out_for_delivery', 'nearby'] }
    });
    
    // Completed today count
    const completedToday = await OrderModel.countDocuments({
        deliveryPersonnel: driverId,
        status: 'delivered',
        deliveredAt: { $gte: todayStart }
    });
    
    // Total completed all time
    const totalCompleted = await OrderModel.countDocuments({
        deliveryPersonnel: driverId,
        status: 'delivered'
    });
    
    // Get driver info including current location and availability status
    const driverInfo = await DeliveryPersonnelModel.findOne({ userId: driverId });
    
    return res.json({
        success: true,
        data: {
            activeOrders,
            completedToday,
            totalCompleted,
            isAvailable: driverInfo?.isAvailable || false,
            currentLocation: driverInfo?.currentLocation || null
        }
    });
  } catch (error) {
    console.error('Error fetching delivery stats:', error);
    return res.status(500).json({
        success: false,
        message: 'Error retrieving delivery statistics'
    });
  }
};

// Get active orders for delivery driver
export const getActiveOrders = async (req, res) => {
  try {
    const driverId = req.userId;
    
    // Find orders assigned to this driver that are not completed or cancelled
    const orders = await OrderModel.find({
        deliveryPersonnel: driverId,
        status: { $in: ['driver_assigned', 'out_for_delivery', 'nearby'] }
    })
    .populate({
        path: 'userId',
        select: 'name phone email'
    })
    .populate('delivery_address')
    .sort({ updatedAt: -1 });
    
    // Format the customer information and delivery address for each order
    const formattedOrders = orders.map(order => {
        return {
            _id: order._id,
            orderId: order.orderId,
            status: order.status,
            customer: {
                name: order.userId?.name || "Unknown Customer",
                phone: order.userId?.phone || "N/A",
                email: order.userId?.email || "N/A"
            },
            deliveryAddress: order.delivery_address?.fullAddress || "No address provided",
            total: order.totalAmt,
            createdAt: order.createdAt,
            currentLocation: order.currentLocation || null,
            estimatedDeliveryTime: order.estimatedDeliveryTime
        };
    });
    
    return res.json({
        success: true,
        data: formattedOrders
    });
  } catch (error) {
    console.error('Error fetching active orders:', error);
    return res.status(500).json({
        success: false,
        message: 'Error retrieving active orders'
    });
  }
};

// Get completed orders for delivery driver
export const getCompletedOrders = async (req, res) => {
  try {
    const driverId = req.userId;
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    
    // Apply date filtering if provided
    if (startDate && endDate) {
        dateFilter = {
            deliveredAt: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        };
    }
    
    // Find completed orders for this driver
    const orders = await OrderModel.find({
        deliveryPersonnel: driverId,
        status: 'delivered',
        ...dateFilter
    })
    .populate({
        path: 'userId',
        select: 'name'
    })
    .sort({ deliveredAt: -1 });
    
    return res.json({
        success: true,
        data: orders
    });
  } catch (error) {
    console.error('Error fetching completed orders:', error);
    return res.status(500).json({
        success: false,
        message: 'Error retrieving completed orders'
    });
  }
};

// Get delivery history with date range filtering
export const getDeliveryHistory = async (req, res) => {
  try {
    const driverId = req.userId;
    const { page = 1, limit = 10 } = req.query;
    
    // Pagination setup
    const skip = (page - 1) * limit;
    
    // Find all orders for this driver (including completed and cancelled)
    const orders = await OrderModel.find({
        deliveryPersonnel: driverId
    })
    .populate({
        path: 'userId',
        select: 'name'
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));
    
    // Get total count for pagination
    const totalOrders = await OrderModel.countDocuments({
        deliveryPersonnel: driverId
    });
    
    return res.json({
        success: true,
        data: orders,
        pagination: {
            total: totalOrders,
            page: parseInt(page),
            pages: Math.ceil(totalOrders / limit)
        }
    });
  } catch (error) {
    console.error('Error fetching delivery history:', error);
    return res.status(500).json({
        success: false,
        message: 'Error retrieving delivery history'
    });
  }
};

// Export delivery history to CSV 
export const exportDeliveryHistory = async (req, res) => {
  try {
    const driverId = req.userId;
    const { startDate, endDate } = req.query;
    
    // Validate date inputs
    if (!startDate || !endDate) {
        return res.status(400).json({
            success: false,
            message: 'Start date and end date are required'
        });
    }
    
    // Find orders within the date range
    const orders = await OrderModel.find({
        deliveryPersonnel: driverId,
        createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        }
    })
    .populate({
        path: 'userId',
        select: 'name phone email'
    })
    .populate('delivery_address')
    .sort({ createdAt: -1 });
    
    // Format data for export
    const exportData = orders.map(order => ({
        orderId: order.orderId,
        createdAt: order.createdAt,
        deliveredAt: order.deliveredAt || 'Not delivered',
        customerName: order.userId?.name || 'Unknown',
        customerPhone: order.userId?.phone || 'N/A',
        deliveryAddress: order.delivery_address?.fullAddress || 'N/A',
        status: order.status,
        amount: order.totalAmt
    }));
    
    return res.json({
        success: true,
        data: exportData
    });
  } catch (error) {
    console.error('Error exporting delivery history:', error);
    return res.status(500).json({
        success: false,
        message: 'Error exporting delivery history'
    });
  }
};

// Update order status
export const updateOrderStatus = async (req, res) => {
  try {
    const driverId = req.userId;
    const { orderId, status } = req.body;
    
    if (!orderId || !status) {
        return res.status(400).json({
            success: false,
            message: 'Order ID and status are required'
        });
    }
    
    // Validate status
    const validStatuses = ['out_for_delivery', 'nearby', 'delivered'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid status. Must be one of: out_for_delivery, nearby, delivered'
        });
    }
    
    // Find the order and verify it's assigned to this driver
    const order = await OrderModel.findOne({
        _id: orderId,
        deliveryPersonnel: driverId,
        status: { $ne: 'delivered' } // Can't update if already delivered
    });
    
    if (!order) {
        return res.status(404).json({
            success: false,
            message: 'Order not found or not assigned to you'
        });
    }
    
    // Update the order status
    order.status = status;
    
    // Add to status history
    order.statusHistory.push({
        status,
        timestamp: new Date()
    });
    
    // If delivered, update delivered time
    if (status === 'delivered') {
        order.deliveredAt = new Date();
        
        // Update driver availability
        await DeliveryPersonnelModel.findOneAndUpdate(
            { userId: driverId },
            { 
                $pull: { activeOrders: orderId },
                $set: { isAvailable: true } 
            }
        );
    }
    
    await order.save();
    
    // Send real-time update via socket
    // This will emit to both the customer and any staff watching this order
    emitOrderStatusUpdated(order);
    
    return res.json({
        success: true,
        message: `Order status updated to ${status}`,
        data: order
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    return res.status(500).json({
        success: false,
        message: 'Error updating order status'
    });
  }
};

// Update driver location
export const updateDriverLocation = async (req, res) => {
  try {
    const driverId = req.userId;
    const { latitude, longitude, orderId } = req.body;
    
    if (!latitude || !longitude) {
        return res.status(400).json({
            success: false,
            message: 'Latitude and longitude are required'
        });
    }
    
    // Update driver location
    await DeliveryPersonnelModel.findOneAndUpdate(
        { userId: driverId },
        {
            currentLocation: {
                lat: latitude,
                lng: longitude,
                lastUpdated: new Date()
            }
        }
    );
    
    // If order ID is provided, update order location as well
    if (orderId) {
        const order = await OrderModel.findOne({
            _id: orderId,
            deliveryPersonnel: driverId
        });
        
        if (order) {
            order.currentLocation = {
                lat: latitude,
                lng: longitude,
                lastUpdated: new Date()
            };
            
            await order.save();
            
            // Send real-time location update via socket
            const io = getIO();
            io.to(`order_${orderId}`).emit('locationUpdated', {
                orderId,
                location: {
                    lat: latitude,
                    lng: longitude
                },
                timestamp: new Date()
            });
        }
    }
    
    return res.json({
        success: true,
        message: 'Location updated successfully'
    });
  } catch (error) {
    console.error('Error updating driver location:', error);
    return res.status(500).json({
        success: false,
        message: 'Error updating driver location'
    });
  }
};

// Auto-assign delivery personnel to an order
export const assignDeliveryPersonnel = async (req, res) => {
  try {
    const { orderId } = req.body;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }
    
    // Find the order
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check if the order is already assigned to a delivery person
    if (order.deliveryPersonnel) {
      return res.status(400).json({
        success: false,
        message: 'This order is already assigned to a delivery person'
      });
    }
    
    // Check if order is for delivery
    if (order.fulfillment_type !== 'delivery') {
      return res.status(400).json({
        success: false,
        message: 'This order is not marked for delivery'
      });
    }
    
    // NEW CHECK: Verify that the order has been dispatched first
    if (order.status !== 'dispatched') {
      return res.status(400).json({
        success: false,
        message: 'This order must be dispatched before assigning to a delivery person',
        currentStatus: order.status
      });
    }
    
    // Find available delivery personnel who can take this order
    // First try to import the DeliveryPersonnel model
    let DeliveryPersonnelModel;
    try {
      DeliveryPersonnelModel = mongoose.model('DeliveryPersonnel');
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: 'Delivery personnel system is not available',
        error: err.message
      });
    }
    
    // Find an available delivery person
    // Logic: Find someone who is active and has the fewest active orders
    const availablePersonnel = await DeliveryPersonnelModel.find({
      isActive: true,
      isAvailable: true
    }).sort({ activeOrdersCount: 1 }).limit(1);
    
    // If no one is available, try to find someone with the lowest number of active orders
    let assignedPersonnel;
    if (availablePersonnel.length === 0) {
      const anyPersonnel = await DeliveryPersonnelModel.find({
        isActive: true
      }).sort({ activeOrdersCount: 1 }).limit(1);
      
      if (anyPersonnel.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No delivery personnel available at the moment'
        });
      }
      
      assignedPersonnel = anyPersonnel[0];
    } else {
      assignedPersonnel = availablePersonnel[0];
    }
    
    // Assign the order to the delivery person
    order.deliveryPersonnel = assignedPersonnel._id;
    order.status = 'driver_assigned';
    
    // Add entry to status history if it exists
    if (order.statusHistory) {
      order.statusHistory.push({
        status: 'driver_assigned',
        timestamp: new Date(),
        updatedBy: req.userId,
        note: `Assigned to delivery personnel ${assignedPersonnel.name}`
      });
    }
    
    // Set estimated delivery time (e.g., 45 minutes from now)
    const estimatedDelivery = new Date();
    estimatedDelivery.setMinutes(estimatedDelivery.getMinutes() + 45);
    order.estimatedDeliveryTime = estimatedDelivery;
    
    await order.save();
    
    // Update the delivery personnel record
    assignedPersonnel.activeOrdersCount = (assignedPersonnel.activeOrdersCount || 0) + 1;
    
    // If the personnel has too many active orders, mark them as unavailable
    if (assignedPersonnel.activeOrdersCount >= 5) {
      assignedPersonnel.isAvailable = false;
    }
    
    // Add this order to their active orders array if it exists
    if (assignedPersonnel.activeOrders) {
      assignedPersonnel.activeOrders.push(orderId);
    } else {
      assignedPersonnel.activeOrders = [orderId];
    }
    
    await assignedPersonnel.save();
    
    // Create notification for the user
    try {
      const NotificationModel = mongoose.model('Notification');
      await NotificationModel.create({
        type: 'order_update',
        title: 'Delivery Driver Assigned',
        message: `Your order has been assigned to a delivery driver and will be delivered soon. Estimated delivery time: ${estimatedDelivery.toLocaleTimeString()}`,
        isRead: false,
        userId: order.userId
      });
    } catch (notificationError) {
      console.log('Could not create notification:', notificationError.message);
      // Continue with the flow even if notification creation fails
    }
    
    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Order assigned to delivery personnel successfully',
      data: {
        orderId: order._id,
        deliveryPersonnelId: assignedPersonnel._id,
        deliveryPersonnelName: assignedPersonnel.name,
        status: 'driver_assigned',
        estimatedDelivery: order.estimatedDeliveryTime
      }
    });
    
  } catch (error) {
    console.error('Error assigning delivery personnel:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to assign delivery personnel',
      error: error.message
    });
  }
};

// Dispatch an order for delivery
export const dispatchOrder = async (req, res) => {
  try {
    const { orderId, notes } = req.body;
    const staffId = req.userId; // ID of admin/staff who is dispatching the order

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }
    
    // Find the order
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check if order is already dispatched
    if (order.status === 'dispatched' || 
        order.status === 'driver_assigned' || 
        order.status === 'out_for_delivery' || 
        order.status === 'delivered') {
      return res.status(400).json({
        success: false,
        message: `This order has already been ${order.status}`
      });
    }
    
    // Check if order fulfillment type is delivery
    if (order.fulfillment_type !== 'delivery' && order.deliveryMethod !== 'delivery') {
      return res.status(400).json({
        success: false,
        message: 'This order is not for delivery'
      });
    }

    // Get staff information for the record
    const staff = await User.findById(staffId).select('name email');
    
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff user not found'
      });
    }
    
    // Update the order status to dispatched
    order.status = 'dispatched';
    
    // Record dispatch information
    order.dispatchInfo = {
      dispatchedAt: new Date(),
      dispatchedBy: staffId,
      dispatchNotes: notes || `Dispatched by ${staff.name || staff.email}`
    };
    
    // Add to status history
    order.statusHistory.push({
      status: 'dispatched',
      timestamp: new Date(),
      updatedBy: staffId,
      note: notes || `Dispatched by ${staff.name || staff.email}`
    });
    
    await order.save();
    
    // Create notification for the user
    try {
      const NotificationModel = mongoose.model('Notification');
      await NotificationModel.create({
        type: 'order_update',
        title: 'Order Dispatched',
        message: 'Your order has been dispatched and will be assigned to a delivery person shortly.',
        isRead: false,
        userId: order.userId
      });
    } catch (notificationError) {
      console.log('Could not create notification:', notificationError.message);
      // Continue with the flow even if notification creation fails
    }
    
    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Order dispatched successfully',
      data: {
        orderId: order._id,
        status: order.status,
        dispatchedAt: order.dispatchInfo.dispatchedAt,
        dispatchedBy: `${staff.name || staff.email}`,
        notes: order.dispatchInfo.dispatchNotes
      }
    });
    
  } catch (error) {
    console.error('Error dispatching order:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to dispatch order',
      error: error.message
    });
  }
};

// Get list of available delivery drivers for admin/staff to choose from
export const getAvailableDrivers = async (req, res) => {
  try {
    // Try to import the DeliveryPersonnel model
    let DeliveryPersonnelModel;
    try {
      DeliveryPersonnelModel = mongoose.model('DeliveryPersonnel');
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: 'Delivery personnel system is not available',
        error: err.message
      });
    }
    
    // Find all active delivery personnel
    const allDrivers = await DeliveryPersonnelModel.find({
      isActive: true
    }).select('name userId profileImage activeOrdersCount isAvailable currentLocation lastActive')
    .sort({ isAvailable: -1, activeOrdersCount: 1 });
    
    if (!allDrivers || allDrivers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No delivery drivers found in the system'
      });
    }
    
    // Get more user details for each driver if available
    const driversWithDetails = await Promise.all(allDrivers.map(async (driver) => {
      let userDetails = {};
      
      // Try to get additional user info if userId exists
      if (driver.userId) {
        try {
          const user = await User.findById(driver.userId)
            .select('name email mobile profile_pic currentLocation lastLogin');
          if (user) {
            userDetails = {
              name: user.name,
              email: user.email,
              mobile: user.mobile,
              profilePic: user.profile_pic,
              lastLogin: user.lastLogin
            };
          }
        } catch (error) {
          console.log(`Could not fetch user details for driver ${driver._id}:`, error.message);
        }
      }
      
      // Calculate efficiency rating based on completed deliveries and ratings
      let efficiencyScore = 'N/A';
      try {
        const completedDeliveries = await Order.find({
          deliveryPersonnel: driver._id,
          status: 'delivered'
        }).select('driverRating deliveredAt createdAt');
        
        if (completedDeliveries.length > 0) {
          // Calculate average rating
          const ratings = completedDeliveries.filter(order => order.driverRating);
          const avgRating = ratings.length > 0 
            ? ratings.reduce((sum, order) => sum + order.driverRating, 0) / ratings.length 
            : 'No ratings';
          
          // Calculate average delivery time (in minutes)
          const deliveryTimes = completedDeliveries
            .filter(order => order.deliveredAt && order.createdAt)
            .map(order => (order.deliveredAt - order.createdAt) / (1000 * 60));
          
          const avgDeliveryTime = deliveryTimes.length > 0
            ? deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length
            : 'N/A';
          
          efficiencyScore = {
            avgRating: typeof avgRating === 'number' ? avgRating.toFixed(1) : avgRating,
            completedOrders: completedDeliveries.length,
            avgDeliveryTime: typeof avgDeliveryTime === 'number' ? `${Math.round(avgDeliveryTime)} mins` : avgDeliveryTime
          };
        }
      } catch (error) {
        console.log(`Could not calculate efficiency for driver ${driver._id}:`, error.message);
      }
      
      // Count active orders
      const activeOrders = await Order.countDocuments({
        deliveryPersonnel: driver._id,
        status: { $in: ['driver_assigned', 'out_for_delivery', 'nearby'] }
      });
      
      return {
        _id: driver._id,
        name: driver.name || userDetails.name || 'Unknown Driver',
        profileImage: driver.profileImage || userDetails.profilePic,
        isAvailable: driver.isAvailable,
        activeOrdersCount: activeOrders || driver.activeOrdersCount || 0,
        currentLocation: driver.currentLocation || userDetails.currentLocation,
        lastActive: driver.lastActive || userDetails.lastLogin,
        contact: {
          email: userDetails.email,
          mobile: userDetails.mobile
        },
        efficiencyScore,
        userId: driver.userId
      };
    }));
    
    // Return the list of drivers, sorted with available drivers first
    return res.status(200).json({
      success: true,
      data: driversWithDetails
    });
    
  } catch (error) {
    console.error('Error fetching available drivers:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch available drivers',
      error: error.message
    });
  }
};

// Manually assign a specific delivery driver to an order (for admin/staff)
export const manuallyAssignDriver = async (req, res) => {
  try {
    const { orderId, driverId, notes } = req.body;
    const staffId = req.userId; // ID of admin/staff making the assignment
    
    if (!orderId || !driverId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and Driver ID are required'
      });
    }
    
    // Find the order
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check if the order is already assigned to a delivery person
    if (order.deliveryPersonnel) {
      return res.status(400).json({
        success: false,
        message: 'This order is already assigned to a delivery person'
      });
    }
    
    // Check if order is for delivery
    if (order.fulfillment_type !== 'delivery') {
      return res.status(400).json({
        success: false,
        message: 'This order is not marked for delivery'
      });
    }
    
    // Check if order has been dispatched
    if (order.status !== 'dispatched') {
      return res.status(400).json({
        success: false,
        message: 'This order must be dispatched before assigning to a delivery person',
        currentStatus: order.status
      });
    }

    // Try to import the DeliveryPersonnel model
    let DeliveryPersonnelModel;
    try {
      DeliveryPersonnelModel = mongoose.model('DeliveryPersonnel');
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: 'Delivery personnel system is not available',
        error: err.message
      });
    }
    
    // Find the selected delivery personnel
    const selectedDriver = await DeliveryPersonnelModel.findById(driverId);
    
    if (!selectedDriver) {
      return res.status(404).json({
        success: false,
        message: 'Selected delivery driver not found'
      });
    }
    
    // Check if the driver is active
    if (!selectedDriver.isActive) {
      return res.status(400).json({
        success: false,
        message: 'The selected driver is not active'
      });
    }
    
    // Get staff information for the record
    const staff = await User.findById(staffId).select('name email');
    
    // Assign the order to the selected driver
    order.deliveryPersonnel = selectedDriver._id;
    order.status = 'driver_assigned';
    
    // Add entry to status history
    if (order.statusHistory) {
      order.statusHistory.push({
        status: 'driver_assigned',
        timestamp: new Date(),
        updatedBy: staffId,
        note: notes || `Manually assigned to driver ${selectedDriver.name} by ${staff?.name || staff?.email || 'Admin/Staff'}`
      });
    }
    
    // Set estimated delivery time (45 minutes from now by default)
    const estimatedDelivery = new Date();
    estimatedDelivery.setMinutes(estimatedDelivery.getMinutes() + 45);
    order.estimatedDeliveryTime = estimatedDelivery;
    
    await order.save();
    
    // Update the delivery personnel record
    selectedDriver.activeOrdersCount = (selectedDriver.activeOrdersCount || 0) + 1;
    
    // If the personnel has too many active orders, mark them as unavailable
    if (selectedDriver.activeOrdersCount >= 5) {
      selectedDriver.isAvailable = false;
    }
    
    // Add this order to their active orders array if it exists
    if (selectedDriver.activeOrders) {
      selectedDriver.activeOrders.push(orderId);
    } else {
      selectedDriver.activeOrders = [orderId];
    }
    
    await selectedDriver.save();
    
    // Create notification for the customer
    try {
      const NotificationModel = mongoose.model('Notification');
      await NotificationModel.create({
        type: 'order_update',
        title: 'Delivery Driver Assigned',
        message: `Your order has been assigned to a delivery driver and will be delivered soon. Estimated delivery time: ${estimatedDelivery.toLocaleTimeString()}`,
        isRead: false,
        userId: order.userId
      });
    } catch (notificationError) {
      console.log('Could not create notification:', notificationError.message);
    }
    
    // Create notification for the driver
    try {
      // If the driver has a user account, notify them
      if (selectedDriver.userId) {
        const NotificationModel = mongoose.model('Notification');
        await NotificationModel.create({
          type: 'new_delivery',
          title: 'New Delivery Assignment',
          message: `You have been assigned a new delivery order (#${order.orderId}).`,
          isRead: false,
          userId: selectedDriver.userId
        });
      }
    } catch (driverNotificationError) {
      console.log('Could not create driver notification:', driverNotificationError.message);
    }
    
    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Order manually assigned to selected driver successfully',
      data: {
        orderId: order._id,
        deliveryPersonnelId: selectedDriver._id,
        deliveryPersonnelName: selectedDriver.name,
        status: 'driver_assigned',
        estimatedDelivery: order.estimatedDeliveryTime,
        assignedBy: staff?.name || staff?.email || 'Admin/Staff'
      }
    });
    
  } catch (error) {
    console.error('Error manually assigning delivery driver:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to assign delivery driver',
      error: error.message
    });
  }
};

// Get dashboard statistics for staff
export const getDashboardStats = async (req, res) => {
  try {
    // Get current date for filtering today's orders
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Count orders by status - Include all orders with delivery as fulfillment type
    // that haven't been dispatched yet (pending, processing, confirmed)
    const pendingOrders = await Order.countDocuments({
      status: { $in: ['pending', 'processing', 'confirmed'] },
      fulfillment_type: 'delivery'
    });
    
    const dispatchedOrders = await Order.countDocuments({
      status: 'dispatched',
      fulfillment_type: 'delivery'
    });
    
    const activeDeliveries = await Order.countDocuments({
      status: { $in: ['driver_assigned', 'out_for_delivery', 'nearby'] },
      fulfillment_type: 'delivery'
    });
    
    const completedToday = await Order.countDocuments({
      status: 'delivered',
      fulfillment_type: 'delivery',
      deliveredAt: { $gte: today }
    });
    
    // Get driver availability stats
    let DeliveryPersonnelModel;
    let totalDrivers = 0;
    let availableDrivers = 0;
    
    try {
      DeliveryPersonnelModel = mongoose.model('DeliveryPersonnel');
      totalDrivers = await DeliveryPersonnelModel.countDocuments({ isActive: true });
      availableDrivers = await DeliveryPersonnelModel.countDocuments({ 
        isActive: true,
        isAvailable: true
      });
    } catch (err) {
      console.log('Warning: DeliveryPersonnelModel not available or empty', err.message);
    }
    
    // Get recent orders for delivery (last 5)
    const recentOrders = await Order.find({
      fulfillment_type: 'delivery',
      status: { $in: ['confirmed', 'pending', 'processing', 'dispatched', 'driver_assigned', 'out_for_delivery', 'nearby', 'delivered'] }
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('userId', 'name email')
    .populate('deliveryPersonnel')
    .populate('delivery_address');
    
    // Format recent orders for display
    const formattedRecentOrders = recentOrders.map(order => ({
      _id: order._id,
      orderId: order.orderId || order._id,
      status: order.status,
      customerName: order.userId?.name || 'Unknown Customer',
      customerEmail: order.userId?.email || 'N/A',
      deliveryAddress: order.delivery_address?.fullAddress || 'No address provided',
      driverName: order.deliveryPersonnel?.name || 'Not assigned',
      createdAt: order.createdAt,
      total: order.totalAmt
    }));
    
    // Get active drivers with their current locations
    let activeDrivers = [];
    try {
      if (DeliveryPersonnelModel) {
        activeDrivers = await DeliveryPersonnelModel.find({
          isActive: true
        })
        .select('name currentLocation activeOrdersCount isAvailable userId')
        .limit(10);
      }
    } catch (err) {
      console.log('Warning: Could not fetch active drivers', err.message);
    }
    
    // Get delivery performance metrics
    const deliveryTimeStats = await getDeliveryPerformance();
    
    // Return combined dashboard stats
    return res.status(200).json({
      success: true,
      data: {
        counts: {
          pendingOrders,
          dispatchedOrders,
          activeDeliveries,
          completedToday,
          availableDrivers,
          totalDrivers
        },
        recentOrders: formattedRecentOrders,
        activeDrivers,
        deliveryPerformance: deliveryTimeStats,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving dashboard statistics',
      error: error.message
    });
  }
};

// Helper function to calculate delivery performance metrics
const getDeliveryPerformance = async () => {
  // Get the date for 7 days ago
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  // Get all completed deliveries in the last 7 days
  const completedDeliveries = await Order.find({
    status: 'delivered',
    deliveredAt: { $gte: sevenDaysAgo }
  }).select('createdAt deliveredAt');
  
  // Calculate average delivery time
  let totalMinutes = 0;
  let validDeliveries = 0;
  
  completedDeliveries.forEach(order => {
    if (order.createdAt && order.deliveredAt) {
      const deliveryTime = (order.deliveredAt - order.createdAt) / (1000 * 60); // in minutes
      if (deliveryTime > 0) {
        totalMinutes += deliveryTime;
        validDeliveries++;
      }
    }
  });
  
  const avgDeliveryTime = validDeliveries > 0 ? Math.round(totalMinutes / validDeliveries) : 0;
  
  // Calculate completed deliveries by day for the last 7 days
  const dailyStats = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    
    const count = await Order.countDocuments({
      status: 'delivered',
      deliveredAt: {
        $gte: date,
        $lt: nextDay
      }
    });
    
    dailyStats.push({
      date: date.toISOString().split('T')[0],
      count
    });
  }
  
  return {
    avgDeliveryTime,
    deliveriesLast7Days: completedDeliveries.length,
    dailyStats
  };
};

// Get all orders pending for dispatch (for staff/admin)
export const getPendingOrders = async (req, res) => {
  try {
    const { sort = 'createdAt', direction = 'desc' } = req.query;
    
    // Sorting configuration
    const sortConfig = {};
    sortConfig[sort] = direction === 'desc' ? -1 : 1;
    
    // Find all orders that are confirmed/pending/processing and haven't been dispatched
    // Only include delivery orders
    const pendingOrders = await Order.find({
      status: { $in: ['pending', 'processing', 'confirmed'] },
      fulfillment_type: 'delivery'
    })
    .populate('userId', 'name email phone')
    .populate('delivery_address')
    .sort(sortConfig)
    .limit(100); // Limit for performance
    
    if (!pendingOrders || pendingOrders.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No pending orders found',
        data: []
      });
    }
    
    // Format the data for frontend display
    const formattedOrders = pendingOrders.map(order => {
      // Get delivery address details
      let deliveryAddress = {
        street: 'No address available',
        city: '',
        neighborhood: '',
        landmark: ''
      };
      
      if (order.delivery_address) {
        deliveryAddress = {
          street: order.delivery_address.street || order.delivery_address.address || 'Address not specified',
          city: order.delivery_address.city || '',
          neighborhood: order.delivery_address.neighborhood || order.delivery_address.area || '',
          landmark: order.delivery_address.landmark || ''
        };
      }
      
      // Extract order items
      const items = Array.isArray(order.items) ? order.items.map(item => ({
        name: item.name || item.productName || (item.productId && item.productId.name) || 'Unknown Product',
        quantity: item.quantity || 1
      })) : [];
      
      // Create customer object
      const customer = {
        name: order.userId?.name || 'Unknown Customer',
        phone: order.userId?.phone || order.userId?.mobile || 'No Contact',
        email: order.userId?.email || 'No Email'
      };
      
      return {
        _id: order._id,
        orderId: order.orderId || order._id.toString().slice(-6).toUpperCase(),
        customer,
        deliveryAddress,
        items,
        total: order.totalAmt || order.total || 0,
        createdAt: order.createdAt,
        status: order.status,
        paymentStatus: order.payment_status || order.paymentStatus || 'unknown'
      };
    });
    
    return res.status(200).json({
      success: true,
      data: formattedOrders
    });
  } catch (error) {
    console.error('Error fetching pending orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching pending orders',
      error: error.message
    });
  }
};
