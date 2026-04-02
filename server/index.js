import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import http from 'http';
import morgan from 'morgan';
import mongoose from 'mongoose'; // Add mongoose import
import passport from 'passport';
import connectDB from './config/connectDB.js';
import './config/passport.js'; // Import passport configuration
import { getUserLoyaltyCard } from './controllers/loyalty.controller.js';
import { admin } from './middleware/Admin.js';
import auth from './middleware/auth.js';
import addressRouter from './route/address.route.js';
import authRouter from './routes/auth.routes.js';
import cartRouter from './route/cart.route.js';
import categoryRouter from './route/category.route.js';
import chatRoutes from './route/chat.route.js'; // Import chat routes from correct path
import campaignRouter from './route/communitycampaign.routes.js'; // Import community campaign routes
import loyaltyRouter from './route/loyalty.routes.js';
import mpesaRouter from './route/mpesa.route.js';
import orderRouter from './route/order.route.js';
import productRouter from './route/product.route.js';
import stripeRouter from './route/stripe.route.js';
import pesapalRouter from './route/pesapal.route.js';
import { initiatePayment as pesapalInitiate } from './controllers/pesapal.controller.js';
import subCategoryRouter from './route/subCategory.route.js';
import trackingRouter from './route/tracking.route.js'; // Add this import
import uploadRouter from './route/upload.router.js';
import userRouter from './route/user.route.js';
import posRouter from './routes/pos.js'; // Add POS routes import
import { initializeSocket } from './socket/socket.js';
import { ensureDirectoriesExist } from './utils/setupDirectories.js';

// Import controllers directly for admin loyalty routes
import {
    getBenefitRanges,
    getLoyaltyCards,
    getLoyaltyStats,
    getTierThresholds,
    recalculateAllTiers, // Add this import
    refreshUserPoints,
    requestSecurityCode,
    updateBenefitRanges,
    updateTierThresholds
} from './controllers/loyalty.controller.js';

// Import user controller for user search functionality
import { searchUsers } from './controllers/user.controller.js';

dotenv.config();

// Define PORT at the top level so it's available throughout the file
const PORT = process.env.PORT || 5000;

const app = express();

// Robust CORS configuration for production and dev
const FRONTEND_URL = process.env.FRONTEND_URL;
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'https://nawiri-hair-client.onrender.com',
    'https://www.nawirihair.com',
    'https://admin.nawirihair.com',
].filter(Boolean);

if (FRONTEND_URL && !allowedOrigins.includes(FRONTEND_URL)) {
    allowedOrigins.push(FRONTEND_URL);
}

app.use(cors({
    credentials: true,
    origin: (origin, callback) => {
        // Allow same-origin requests or tools without origin
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200
}));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));
app.use(helmet({
    crossOriginResourcePolicy: false
}));

// Initialize Passport
app.use(passport.initialize());

// Ensure necessary directories exist
ensureDirectoriesExist();

// Simplified request logging - only in development
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        const start = Date.now();
        res.on('finish', () => {
            const duration = Date.now() - start;
            if (duration > 1000) { // Only log slow requests
                console.log(`⚠️ SLOW: ${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
            }
        });
        next();
    });
}

// Add this middleware to inspect incoming requests with files
app.use((req, res, next) => {
    if (req.method === 'POST' && req.path.includes('/chat/transcribe')) {
        console.log('Transcribe request detected:', {
            path: req.path,
            method: req.method,
            contentType: req.headers['content-type']
        });
    }
    next();
});

app.get("/", (request, response) => {
    response.json({
        message: "Server is running on port " + PORT
    });
});

// Route registration - all routes defined below

app.use('/api/user', userRouter);
app.use('/api/auth', authRouter);
// Alias to support legacy or direct calls without the /api prefix
app.use('/auth', authRouter);
app.use("/api/category", categoryRouter);
app.use("/api/file", uploadRouter);
app.use("/api/subcategory", subCategoryRouter);
app.use("/api/product", productRouter);
// Also mount at plural path to support existing client calls
app.use('/api/products', productRouter);
app.use("/api/cart", cartRouter);
app.use("/api/address", addressRouter);
app.use('/api/order', orderRouter);
app.use('/api/stripe', stripeRouter);
app.use('/api/pesapal', pesapalRouter);
// Alias for client: direct init endpoint (auth-protected)
app.post('/api/init-pesapal', auth, pesapalInitiate);
app.use('/api/mpesa', mpesaRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/chat', chatRoutes); // Only use one chat routes
app.use('/api/loyalty', loyaltyRouter); // Adjusted to consistent path structure
app.use('/api', campaignRouter); // Register the community campaign routes
app.use('/api/tracking', trackingRouter); // Add this line with your other routes
app.use('/api/pos', posRouter); // Add POS routes

// Import delivery routes using ES module syntax
import deliveryRoutes from './route/delivery.route.js';

// Register delivery routes
app.use('/api/delivery', deliveryRoutes);

// Admin loyalty routes at /api/admin/loyalty/... to match the frontend requests
// These routes map directly to the controller functions
app.get('/api/admin/loyalty/cards', auth, admin, getLoyaltyCards);
app.get('/api/admin/loyalty/stats', auth, admin, getLoyaltyStats);
app.get('/api/admin/loyalty/thresholds', auth, admin, getTierThresholds);
app.put('/api/admin/loyalty/thresholds', auth, admin, updateTierThresholds);
app.get('/api/admin/loyalty/benefit-ranges', auth, admin, getBenefitRanges);
app.put('/api/admin/loyalty/benefit-ranges', auth, admin, updateBenefitRanges);
app.post('/api/admin/loyalty/refresh-points', auth, admin, refreshUserPoints);

// Add the missing security code request endpoint
app.post('/api/loyalty/request-security-code', auth, admin, requestSecurityCode);

// Add this new route for recalculating all tiers
app.post('/api/admin/loyalty/recalculate-tiers', auth, admin, recalculateAllTiers);

// Admin route for searching users - needed for the special tier promotion feature
app.get('/api/admin/users/search', auth, admin, searchUsers);

// Special endpoint for loyalty card that matches the frontend expectation
// This route needs to be defined after all other routes to avoid conflicts
app.get('/api/users/:userId/loyalty-card', auth, getUserLoyaltyCard);

// Improved error handler
app.use((err, req, res, next) => {
    console.error('💥 Global error:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });

    if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }

    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Create HTTP server from Express app
const server = http.createServer(app);

// Initialize Socket.IO with the server
initializeSocket(server);

// Connection state tracking
let isServerRunning = false;
let connectionCheckInterval;

// Function to start the server
async function startServer() {
    try {
        await connectDB();
        
        // Only start the server once
        if (!isServerRunning) {
            server.listen(PORT, () => {
                console.log(`✅ Server running on port ${PORT}`);
                isServerRunning = true;
            });
            
            // Set up a periodic connection check (less frequent)
            connectionCheckInterval = setInterval(checkDatabaseConnection, 60000); // Check every 60 seconds
        }
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1); // Exit on startup failure
    }
}

// Function to periodically check database connection
async function checkDatabaseConnection() {
    try {
        // Simple ping to verify connection is alive
        if (mongoose.connection.readyState !== 1) {
            console.log('⚠️ MongoDB connection lost. Reconnecting...');
            clearInterval(connectionCheckInterval);
            await connectDB();
            connectionCheckInterval = setInterval(checkDatabaseConnection, 60000);
        }
    } catch (error) {
        console.error('❌ Connection check error:', error.message);
    }
}

// Handle server errors
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

// Start the server
startServer();

