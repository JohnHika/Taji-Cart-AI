import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import http from 'http';
import morgan from 'morgan';
import connectDB from './config/connectDB.js';
import { getUserLoyaltyCard } from './controllers/loyalty.controller.js';
import { admin } from './middleware/Admin.js';
import auth from './middleware/auth.js';
import addressRouter from './route/address.route.js';
import cartRouter from './route/cart.route.js';
import categoryRouter from './route/category.route.js';
import chatRoutes from './route/chat.route.js'; // Import chat routes from correct path
import campaignRouter from './route/communitycampaign.routes.js'; // Import community campaign routes
import loyaltyRouter from './route/loyalty.routes.js';
import mpesaRouter from './route/mpesa.route.js';
import orderRouter from './route/order.route.js';
import productRouter from './route/product.route.js';
import stripeRouter from './route/stripe.route.js';
import subCategoryRouter from './route/subCategory.route.js';
import trackingRouter from './route/tracking.route.js'; // Add this import
import uploadRouter from './route/upload.router.js';
import userRouter from './route/user.route.js';
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
const PORT = process.env.PORT || 8080;

const app = express();
app.use(cors({
    credentials: true,
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));
app.use(helmet({
    crossOriginResourcePolicy: false
}));

// Ensure necessary directories exist
ensureDirectoriesExist();

// Performance monitoring middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
    });
    next();
});

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

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

app.use('/api/user', userRouter);
app.use("/api/category", categoryRouter);
app.use("/api/file", uploadRouter);
app.use("/api/subcategory", subCategoryRouter);
app.use("/api/product", productRouter);
app.use("/api/cart", cartRouter);
app.use("/api/address", addressRouter);
app.use('/api/order', orderRouter);
app.use('/api/stripe', stripeRouter);
app.use('/api/mpesa', mpesaRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/chat', chatRoutes); // Only use one chat routes
app.use('/api/loyalty', loyaltyRouter); // Adjusted to consistent path structure
app.use('/api', campaignRouter); // Register the community campaign routes
app.use('/api/tracking', trackingRouter); // Add this line with your other routes

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

connectDB().then(() => {
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch(error => {
    console.error('Error connecting to the database:', error);
});

