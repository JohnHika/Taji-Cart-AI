import geolib from 'geolib';
import DeliveryPersonnelModel from '../models/deliverypersonnel.model.js';
import NotificationModel from '../models/notification.model.js';
import OrderModel from '../models/order.model.js';
import { getIO } from '../socket/socket.js';

/**
 * Calculate ETA using Haversine formula and estimated speed
 * @param {Object} start - Start coordinates {lat, lng}
 * @param {Object} end - End coordinates {lat, lng}
 * @param {Number} speedKmh - Speed in kilometers per hour (default: 30)
 * @returns {Object} - {distance: meters, eta: Date, duration: minutes}
 */
const calculateETA = (start, end, speedKmh = 30) => {
    // Convert coordinates to format required by geolib
    const startPoint = { latitude: start.lat, longitude: start.lng };
    const endPoint = { latitude: end.lat, longitude: end.lng };
    
    // Calculate distance in meters using geolib
    const distance = geolib.getDistance(startPoint, endPoint);
    
    // Calculate time in minutes (distance in km / speed in km/h * 60)
    const durationMinutes = (distance / 1000) / speedKmh * 60;
    
    // Calculate ETA
    const eta = new Date();
    eta.setMinutes(eta.getMinutes() + durationMinutes);
    
    return {
        distance, // in meters
        eta,
        duration: durationMinutes // in minutes
    };
};

// Get order tracking details
export const getOrderTrackingDetails = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate if the order belongs to the requesting user
        const order = await OrderModel.findById(id)
            .populate('deliveryPersonnel', 'name phoneNumber currentLocation')
            .populate('delivery_address');
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        // Only allow the order owner or an admin to track the order
        if (order.userId.toString() !== req.userId && req.userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to track this order'
            });
        }
        
        return res.status(200).json({
            success: true,
            data: order
        });
    } catch (error) {
        console.error('Error fetching order tracking details:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch tracking details'
        });
    }
};

// Assign delivery personnel to order
export const assignDeliveryPersonnel = async (req, res) => {
    try {
        const { orderId, personnelId } = req.body;
        
        // Validate inputs
        if (!orderId || !personnelId) {
            return res.status(400).json({
                success: false,
                message: 'Order ID and Personnel ID are required'
            });
        }
        
        const order = await OrderModel.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        const personnel = await DeliveryPersonnelModel.findById(personnelId);
        if (!personnel) {
            return res.status(404).json({
                success: false,
                message: 'Delivery personnel not found'
            });
        }
        
        // Update order with delivery personnel and status
        order.deliveryPersonnel = personnelId;
        order.status = 'driver_assigned';
        
        // Add to status history
        const statusEntry = {
            status: 'driver_assigned',
            timestamp: new Date(),
            note: `Assigned to ${personnel.name}`
        };
        
        // Add personnel location if available
        if (personnel.currentLocation) {
            statusEntry.location = personnel.currentLocation;
            
            // Calculate ETA if delivery address has coordinates
            if (order.delivery_address && order.delivery_address.coordinates) {
                const etaInfo = calculateETA(
                    personnel.currentLocation,
                    order.delivery_address.coordinates
                );
                
                // Update estimated delivery time based on current ETA calculation
                order.estimatedDeliveryTime = etaInfo.eta;
            } else {
                // Fallback to basic estimate (45 minutes)
                const estimatedDelivery = new Date();
                estimatedDelivery.setMinutes(estimatedDelivery.getMinutes() + 45);
                order.estimatedDeliveryTime = estimatedDelivery;
            }
        } else {
            // Fallback to basic estimate (45 minutes)
            const estimatedDelivery = new Date();
            estimatedDelivery.setMinutes(estimatedDelivery.getMinutes() + 45);
            order.estimatedDeliveryTime = estimatedDelivery;
        }
        
        order.statusHistory.push(statusEntry);
        
        await order.save();
        
        // Update delivery personnel status
        personnel.isAvailable = false;
        personnel.activeOrders.push(orderId);
        await personnel.save();
        
        // Send real-time notification
        const io = getIO();
        io.to(`order_${orderId}`).emit('statusUpdated', {
            orderId,
            status: 'driver_assigned',
            personnelName: personnel.name,
            estimatedDelivery: order.estimatedDeliveryTime,
            statusHistory: order.statusHistory
        });
        
        // Create notification for the user
        await NotificationModel.create({
            type: 'order_update',
            title: 'Delivery Assigned',
            message: `Your order is being prepared for delivery by ${personnel.name}`,
            isRead: false,
            userId: order.userId
        });
        
        return res.status(200).json({
            success: true,
            message: 'Delivery personnel assigned successfully',
            data: order
        });
    } catch (error) {
        console.error('Error assigning delivery personnel:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Update order location
export const updateOrderLocation = async (req, res) => {
    try {
        const { orderId, location, status } = req.body;
        
        if (!orderId || !location || !location.lat || !location.lng) {
            return res.status(400).json({
                success: false,
                message: 'Order ID and location coordinates are required'
            });
        }
        
        const order = await OrderModel.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        // Update order location
        order.currentLocation = {
            lat: location.lat,
            lng: location.lng,
            lastUpdated: new Date()
        };
        
        // Calculate distance to destination and ETA if we have delivery address coordinates
        let isNearby = false;
        let etaInfo = null;
        
        if (order.delivery_address && order.delivery_address.coordinates) {
            const destination = order.delivery_address.coordinates;
            
            // Calculate distance in meters and ETA
            etaInfo = calculateETA(
                { lat: location.lat, lng: location.lng },
                { lat: destination.lat, lng: destination.lng }
            );
            
            // Update estimated delivery time
            order.estimatedDeliveryTime = etaInfo.eta;
            
            // If within 500 meters, mark as nearby
            if (etaInfo.distance < 500 && order.status !== 'delivered' && order.status !== 'nearby') {
                isNearby = true;
                order.status = 'nearby';
                order.statusHistory.push({
                    status: 'nearby',
                    timestamp: new Date(),
                    location: {
                        lat: location.lat,
                        lng: location.lng
                    },
                    note: 'Driver is nearby your location'
                });
                
                // Create notification
                await NotificationModel.create({
                    type: 'order_update',
                    title: 'Delivery Nearby',
                    message: 'Your delivery driver is nearby your location!',
                    isRead: false,
                    userId: order.userId
                });
            }
        }
        
        // Update status if provided and not already updated by nearby check
        if (status && status !== order.status && !isNearby) {
            order.status = status;
            order.statusHistory.push({
                status,
                timestamp: new Date(),
                location: {
                    lat: location.lat,
                    lng: location.lng
                }
            });
            
            // If delivered, update necessary fields
            if (status === 'delivered') {
                order.deliveredAt = new Date();
                
                // Update delivery personnel status
                if (order.deliveryPersonnel) {
                    const personnel = await DeliveryPersonnelModel.findById(order.deliveryPersonnel);
                    if (personnel) {
                        personnel.isAvailable = true;
                        personnel.activeOrders = personnel.activeOrders.filter(
                            id => id.toString() !== orderId.toString()
                        );
                        await personnel.save();
                    }
                }
                
                // Create notification
                await NotificationModel.create({
                    type: 'order_update',
                    title: 'Order Delivered',
                    message: 'Your order has been delivered. Enjoy!',
                    isRead: false,
                    userId: order.userId
                });
            }
        }
        
        await order.save();
        
        // Send real-time update with enhanced information
        const io = getIO();
        io.to(`order_${orderId}`).emit('locationUpdated', {
            orderId,
            location,
            status: order.status,
            timestamp: new Date(),
            ...(etaInfo && {
                distance: etaInfo.distance,
                eta: etaInfo.eta,
                duration: etaInfo.duration
            })
        });
        
        return res.status(200).json({
            success: true,
            message: 'Order location updated successfully',
            data: {
                orderId,
                location: order.currentLocation,
                status: order.status,
                ...(etaInfo && {
                    distance: etaInfo.distance,
                    eta: etaInfo.eta,
                    duration: etaInfo.duration
                })
            }
        });
    } catch (error) {
        console.error('Error updating order location:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Get all available delivery personnel (admin only)
export const getAvailableDeliveryPersonnel = async (req, res) => {
    try {
        const personnel = await DeliveryPersonnelModel.find({ isAvailable: true });
        
        return res.status(200).json({
            success: true,
            data: personnel
        });
    } catch (error) {
        console.error('Error fetching delivery personnel:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};