import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import OrderModel from '../models/order.model.js';
import UserModel from '../models/user.model.js';

let io;

export const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:5173',
            methods: ["GET", "POST"],
            credentials: true
        }
    });
    
    // Middleware for authentication
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication token required'));
            }
            
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await UserModel.findById(decoded.id).select('-password');
            
            if (!user) {
                return next(new Error('User not found'));
            }
            
            // Attach user to socket
            socket.user = user;
            next();
        } catch (error) {
            console.error('Socket authentication error:', error);
            next(new Error('Authentication failed'));
        }
    });
    
    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.user?._id || 'Unknown'}`);
        
        // Join rooms based on user role
        if (socket.user) {
            // Join personal room
            socket.join(`user_${socket.user._id}`);
            
            // Join role-based rooms
            if (socket.user.roles.includes('staff')) {
                socket.join('staff-room');
            }
            
            if (socket.user.roles.includes('delivery')) {
                socket.join('delivery-room');
                // If they have active deliveries, join those rooms
                if (socket.user.activeDeliveries && socket.user.activeDeliveries.length > 0) {
                    socket.user.activeDeliveries.forEach(orderId => {
                        socket.join(`order_${orderId}`);
                    });
                }
            }
        }
        
        // Join specific rooms on request
        socket.on('join', (room) => {
            if (room === 'staff-pickups' && socket.user?.roles.includes('staff')) {
                socket.join('staff-pickups');
                console.log(`Staff ${socket.user._id} joined staff-pickups room`);
            } else if (room === 'delivery-updates' && socket.user?.roles.includes('delivery')) {
                socket.join('delivery-updates');
                console.log(`Delivery personnel ${socket.user._id} joined delivery-updates room`);
            } else if (room.startsWith('order_')) {
                // Allow customers to join their own order rooms
                socket.join(room);
                console.log(`User ${socket.user?._id || 'Unknown'} joined ${room}`);
            }
        });
        
        // Join order tracking room
        socket.on('joinOrderRoom', (orderId) => {
            socket.join(`order_${orderId}`);
            console.log(`Client joined room: order_${orderId}`);
        });
        
        // Delivery personnel updates their location
        socket.on('updateLocation', async (data) => {
            try {
                const { orderId, location } = data;
                
                // Update order location in database
                await OrderModel.findByIdAndUpdate(orderId, {
                    currentLocation: {
                        lat: location.lat,
                        lng: location.lng,
                        lastUpdated: new Date()
                    }
                });
                
                // Broadcast to all clients in this order room
                io.to(`order_${orderId}`).emit('locationUpdated', {
                    orderId,
                    location,
                    timestamp: new Date()
                });
                
                console.log(`Location updated for order ${orderId}`);
            } catch (error) {
                console.error('Error updating location:', error);
            }
        });
        
        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.user?._id || 'Unknown'}`);
        });
    });
    
    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};

// Helper functions to broadcast events from controllers
export const emitNewPickupOrder = (orderData) => {
    if (!io) return;
    
    console.log('Emitting new pickup order event');
    
    // Emit to staff room
    io.to('staff-pickups').emit('new_pickup_order', orderData);
};

export const emitPickupStatusUpdated = (orderData) => {
    if (!io) return;
    
    console.log('Emitting pickup status updated event');
    
    // Emit to staff room
    io.to('staff-pickups').emit('pickup_status_updated', orderData);
    
    // Emit to customer's room
    if (orderData.userId) {
        io.to(`user_${orderData.userId}`).emit('order_status_updated', orderData);
    }
    
    // Emit to the order's room
    io.to(`order_${orderData._id}`).emit('status_updated', {
        status: orderData.status,
        timestamp: new Date()
    });
};

export const emitNewDeliveryAssigned = (orderData, personnelId) => {
    if (!io) return;
    
    console.log('Emitting new delivery assigned event');
    
    // Emit to specific delivery personnel
    io.to(`user_${personnelId}`).emit('new_delivery_assigned', orderData);
    
    // Emit to all delivery personnel room (for UI updates)
    io.to('delivery-updates').emit('delivery_assigned', {
        orderId: orderData._id,
        personnelId: personnelId
    });
};

export const emitOrderStatusUpdated = (orderData) => {
    if (!io) return;
    
    console.log('Emitting order status updated event');
    
    // Emit to the order's room
    io.to(`order_${orderData._id}`).emit('status_updated', {
        orderId: orderData._id,
        status: orderData.status,
        currentLocation: orderData.currentLocation,
        timestamp: new Date()
    });
    
    // Emit to customer's room
    if (orderData.userId) {
        io.to(`user_${orderData.userId}`).emit('order_status_updated', orderData);
    }
    
    // If order is for delivery and has a delivery personnel, notify them too
    if (orderData.deliveryPersonnel && orderData.fulfillment_type === 'delivery') {
        io.to(`user_${orderData.deliveryPersonnel}`).emit('order_status_updated', orderData);
    }
};