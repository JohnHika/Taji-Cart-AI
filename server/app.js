import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import passport from 'passport';

import connectDB from './config/connectDB.js';
import './config/passport.js'; // registers passport strategies (side-effect only)

// ── Routes (corrected paths matching actual files on disk) ──────────────────
import addressRouter from './route/address.route.js';
import cartRouter from './route/cart.route.js';
import categoryRouter from './route/category.route.js';
import chatRoutes from './route/chat.route.js';
import campaignRouter from './route/communitycampaign.routes.js';
import deliveryRoutes from './route/delivery.route.js';
import loyaltyRouter from './route/loyalty.routes.js';
import mpesaRouter from './route/mpesa.route.js';
import orderRouter from './route/order.route.js';
import pesapalRouter from './route/pesapal.route.js';
import productRouter from './route/product.route.js';
import stripeRouter from './route/stripe.route.js';
import subCategoryRouter from './route/subCategory.route.js';
import trackingRouter from './route/tracking.route.js';
import uploadRouter from './route/upload.router.js';
import userRouter from './route/user.route.js';
import authRoutes from './routes/auth.routes.js';
import posRouter from './routes/pos.js';

// ── Controllers used directly on admin routes ───────────────────────────────
import { initiatePayment as pesapalInitiate } from './controllers/pesapal.controller.js';
import {
    getBenefitRanges,
    getLoyaltyCards,
    getLoyaltyStats,
    getTierThresholds,
    getUserLoyaltyCard,
    recalculateAllTiers,
    refreshUserPoints,
    requestSecurityCode,
    updateBenefitRanges,
    updateTierThresholds,
} from './controllers/loyalty.controller.js';
import { searchUsers } from './controllers/user.controller.js';
import { admin } from './middleware/Admin.js';
import auth from './middleware/auth.js';

dotenv.config();

const app = express();

// Connect to database on startup
connectDB();

// ── CORS ────────────────────────────────────────────────────────────────────
const FRONTEND_URL = process.env.FRONTEND_URL;
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'https://nawiri-hair-client.onrender.com',
    'https://nawirihairke.com',
    'https://www.nawirihairke.com',
    'https://www.nawirihair.com',
    'https://admin.nawirihair.com',
];
if (FRONTEND_URL && !allowedOrigins.includes(FRONTEND_URL)) {
    allowedOrigins.push(FRONTEND_URL);
}

app.use(cors({
    credentials: true,
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200,
}));
app.options('*', cors());

// ── Core middleware ──────────────────────────────────────────────────────────
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests, please try again later',
});
app.use(limiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());
app.use(session({
    secret: process.env.SESSION_SECRET || 'taji-cart-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' },
}));

// ── Routes ───────────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ message: 'Taji Cart API is running ✅' }));

app.use('/api/user', userRouter);
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);
app.use('/api/category', categoryRouter);
app.use('/api/subcategory', subCategoryRouter);
app.use('/api/file', uploadRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/product', productRouter);
app.use('/api/products', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/address', addressRouter);
app.use('/api/order', orderRouter);
app.use('/api/stripe', stripeRouter);
app.use('/api/pesapal', pesapalRouter);
app.post('/api/init-pesapal', auth, pesapalInitiate);
app.use('/api/mpesa', mpesaRouter);
app.use('/api/chat', chatRoutes);
app.use('/api/loyalty', loyaltyRouter);
app.use('/api', campaignRouter);
app.use('/api/tracking', trackingRouter);
app.use('/api/pos', posRouter);
app.use('/api/delivery', deliveryRoutes);

// ── Admin loyalty routes ─────────────────────────────────────────────────────
app.get('/api/admin/loyalty/cards', auth, admin, getLoyaltyCards);
app.get('/api/admin/loyalty/stats', auth, admin, getLoyaltyStats);
app.get('/api/admin/loyalty/thresholds', auth, admin, getTierThresholds);
app.put('/api/admin/loyalty/thresholds', auth, admin, updateTierThresholds);
app.get('/api/admin/loyalty/benefit-ranges', auth, admin, getBenefitRanges);
app.put('/api/admin/loyalty/benefit-ranges', auth, admin, updateBenefitRanges);
app.post('/api/admin/loyalty/refresh-points', auth, admin, refreshUserPoints);
app.post('/api/loyalty/request-security-code', auth, admin, requestSecurityCode);
app.post('/api/admin/loyalty/recalculate-tiers', auth, admin, recalculateAllTiers);
app.get('/api/admin/users/search', auth, admin, searchUsers);
app.get('/api/users/:userId/loyalty-card', auth, getUserLoyaltyCard);

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('💥 Global error:', { message: err.message, path: req.path });
    if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});

export default app;
