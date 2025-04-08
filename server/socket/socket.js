import { Server } from 'socket.io';
import OrderModel from '../models/order.model.js';

let io;

export const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:5173',
            methods: ["GET", "POST"],
            credentials: true
        }
    });
    
    io.on('connection', (socket) => {
        console.log('New client connected');
        
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
            console.log('Client disconnected');
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