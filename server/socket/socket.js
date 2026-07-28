import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import OrderModel from '../models/order.model.js';
import DeliveryPersonnelModel from '../models/deliverypersonnel.model.js';
import UserModel from '../models/user.model.js';

let io;

const getSocketUserRoles = (user) => {
    const roles = new Set();

    if (typeof user?.role === 'string' && user.role) {
        roles.add(user.role);
    }

    if (user?.isAdmin === true) {
        roles.add('admin');
    }

    if (user?.isDelivery === true) {
        roles.add('delivery');
    }

    if (user?.isStaff === true) {
        roles.add('staff');
    }

    return [...roles];
};

const isPrivateNetworkOrigin = (origin) => {
    try {
        const { protocol, hostname } = new URL(origin);
        if (!['http:', 'https:'].includes(protocol)) return false;
        if (hostname === 'localhost' || hostname === '127.0.0.1') return true;

        const is10 = /^10\./.test(hostname);
        const is192 = /^192\.168\./.test(hostname);
        const is172 = /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);
        return is10 || is192 || is172;
    } catch (error) {
        return false;
    }
};

const hasOrderAccess = async (user, roles, orderId) => {
    if (!orderId || !/^[0-9a-fA-F]{24}$/.test(String(orderId)) || !user?._id) return false;
    if (roles.includes('admin') || roles.includes('staff')) return Boolean(await OrderModel.exists({ _id: orderId }));

    const order = await OrderModel.findById(orderId).select('userId deliveryPersonnel');
    if (!order) return false;
    if (order.userId?.toString() === user._id.toString()) return true;

    if (roles.includes('delivery')) {
        const profile = await DeliveryPersonnelModel.findOne({ userId: user._id }).select('_id');
        return Boolean(profile && order.deliveryPersonnel?.toString() === profile._id.toString());
    }
    return false;
};

export const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: (origin, callback) => {
                const allowed = [
                    'http://localhost:5173',
                    'http://localhost:5174',
                    'https://nawiri-hair-client.onrender.com',
                    'https://nawiri-hair.vercel.app',
                    'https://nawirihairke.com',
                    'https://www.nawirihairke.com',
                    'https://www.nawirihair.com',
                    'https://admin.nawirihair.com',
                ];
                const envOrigin = process.env.FRONTEND_URL;
                if (envOrigin && !allowed.includes(envOrigin)) allowed.push(envOrigin);
                if (!origin || allowed.includes(origin)) return callback(null, true);
                if (isPrivateNetworkOrigin(origin)) return callback(null, true);
                return callback(new Error(`Socket CORS: Origin ${origin} not allowed`));
            },
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

            const accessTokenSecret = process.env.SECRET_KEY_ACCESS_TOKEN || process.env.JWT_SECRET;
            if (!accessTokenSecret) {
                console.error('Socket authentication error: no access token secret configured');
                return next(new Error('Authentication failed'));
            }

            // Verify token using the same secret and payload shape as HTTP auth.
            const decoded = jwt.verify(token, accessTokenSecret);
            const userId = decoded?._id || decoded?.id;

            if (!userId) {
                return next(new Error('Authentication failed'));
            }

            const user = await UserModel.findById(userId).select('-password');
            
            if (!user) {
                return next(new Error('User not found'));
            }
            
            // Attach user to socket
            socket.user = user;
            socket.userRoles = getSocketUserRoles(user);
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
            if (socket.userRoles?.includes('staff')) {
                socket.join('staff-room');
            }
            
            if (socket.userRoles?.includes('delivery')) {
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
        socket.on('join', async (room) => {
            if (room === 'staff-pickups' && socket.userRoles?.includes('staff')) {
                socket.join('staff-pickups');
                console.log(`Staff ${socket.user._id} joined staff-pickups room`);
            } else if (room === 'delivery-updates' && socket.userRoles?.includes('delivery')) {
                socket.join('delivery-updates');
                console.log(`Delivery personnel ${socket.user._id} joined delivery-updates room`);
            } else if (room.startsWith('order_')) {
                const orderId = room.slice('order_'.length);
                if (await hasOrderAccess(socket.user, socket.userRoles || [], orderId)) {
                    socket.join(room);
                    console.log(`User ${socket.user?._id || 'Unknown'} joined ${room}`);
                }
            }
        });
        
        // Join order tracking room
        socket.on('joinOrderRoom', async (orderId) => {
            if (await hasOrderAccess(socket.user, socket.userRoles || [], orderId)) {
                socket.join(`order_${orderId}`);
                console.log(`Client joined room: order_${orderId}`);
            }
        });
        
        // Delivery personnel updates their location
        socket.on('updateLocation', async (data) => {
            try {
                const { orderId, location } = data;
                if (!socket.userRoles?.includes('delivery') || !location ||
                    !Number.isFinite(Number(location.lat)) || !Number.isFinite(Number(location.lng)) ||
                    Number(location.lat) < -90 || Number(location.lat) > 90 ||
                    Number(location.lng) < -180 || Number(location.lng) > 180) {
                    return;
                }

                const profile = await DeliveryPersonnelModel.findOne({ userId: socket.user._id }).select('_id');
                const order = profile && await OrderModel.findOne({ _id: orderId, deliveryPersonnel: profile._id }).select('orderId');
                if (!order) return;
                
                const currentLocation = {
                        lat: location.lat,
                        lng: location.lng,
                        lastUpdated: new Date()
                };
                // Keep all persisted checkout lines in sync.
                await OrderModel.updateMany({ orderId: order.orderId, deliveryPersonnel: profile._id }, { $set: { currentLocation } });
                
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
