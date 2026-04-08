// Local development server — wraps the Express app with Socket.IO and HTTP.
// For Vercel serverless deployment, see /api/index.js at the repo root.
import dotenv from 'dotenv';
import http from 'http';
import mongoose from 'mongoose';
import app from './app.js';
import { startKeepalive } from './keepalive.js';
import { initializeSocket } from './socket/socket.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
initializeSocket(server);

let connectionCheckInterval;

server.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    startKeepalive();
    connectionCheckInterval = setInterval(async () => {
        try {
            if (mongoose.connection.readyState !== 1) {
                console.log('⚠️ MongoDB connection lost. Reconnecting...');
                clearInterval(connectionCheckInterval);
                await mongoose.connect(process.env.MONGO_URI);
                connectionCheckInterval = setInterval(checkConnection, 60000);
            }
        } catch (error) {
            console.error('❌ Connection check error:', error.message);
        }
    }, 60000);
});

server.on('error', (error) => {
    console.error('Server error:', error);
    if (error.code === 'EADDRINUSE') {
        console.log(`Port ${PORT} is already in use. Trying again in 5 seconds...`);
        setTimeout(() => {
            server.close();
            server.listen(PORT);
        }, 5000);
    }
});
