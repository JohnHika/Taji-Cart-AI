import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import connectDB from './config/connectDB.js';
import passport from './config/passport.js';
import { closeInactiveSessions } from './controllers/chat.controller.js';
import addressRouter from './route/address.routes.js';
import campaignRouter from './route/campaign.routes.js';
import cartRouter from './route/cart.routes.js';
import categoryRouter from './route/category.routes.js';
import chatRoutes from './route/chat.routes.js';
import deliveryRoutes from './route/delivery.routes.js';
import loyaltyRouter from './route/loyalty.routes.js';
import mpesaRouter from './route/mpesa.routes.js';
import orderRouter from './route/order.routes.js';
import productRouter from './route/product.routes.js';
import productSearchRouter from './route/productSearch.routes.js';
import recommandRouter from './route/recommend.routes.js';
import reviewRouter from './route/review.routes.js';
import searchRoutes from './route/search.routes.js';
import stripeRouter from './route/stripe.routes.js';
import subcategoryRouter from './route/subcategory.routes.js';
import trackingRoutes from './route/tracking.routes.js';
import uploadRouter from './route/upload.routes.js';
import userRoutes from './route/user.route.js';
import authRoutes from './routes/auth.routes.js';

// Load environment variables
dotenv.config();

// Create Express application
const app = express();

// Database connection
connectDB();

// Apply rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per window (15 min)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests, please try again later'
});

// Apply rate limiter to all requests
app.use(limiter);

// Middlewares
const FRONTEND_URL_APP = process.env.FRONTEND_URL;
const allowedOriginsApp = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://nawiri-hair-client.onrender.com',
  'https://www.nawirihair.com', 
  'https://admin.nawirihair.com'
];
if (FRONTEND_URL_APP && !allowedOriginsApp.includes(FRONTEND_URL_APP)) {
  allowedOriginsApp.push(FRONTEND_URL_APP);
}
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOriginsApp.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Initialize Passport
app.use(passport.initialize());

// Configure session middleware
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Schedule regular cleanup of inactive chat sessions (runs every 24 hours)
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
setInterval(async () => {
  try {
    const closedCount = await closeInactiveSessions();
    console.log(`Scheduled task: Closed ${closedCount} inactive chat sessions`);
  } catch (error) {
    console.error('Scheduled task error:', error);
  }
}, CLEANUP_INTERVAL);

// Run once at startup
setTimeout(async () => {
  try {
    const closedCount = await closeInactiveSessions();
    console.log(`Initial cleanup: Closed ${closedCount} inactive chat sessions`);
  } catch (error) {
    console.error('Initial cleanup error:', error);
  }
}, 10000); // Wait 10 seconds after server start

// API routes
app.use('/api/user', userRoutes);
app.use('/api/category', categoryRouter);
app.use('/api/subcategory', subcategoryRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/product', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/address', addressRouter);
app.use('/api/order', orderRouter);
app.use('/api/mpesa', mpesaRouter);
app.use('/api/stripe', stripeRouter);
app.use('/api/recommend', recommandRouter);
app.use('/api/review', reviewRouter);
app.use('/api/loyalty', loyaltyRouter);
app.use('/api/campaigns', campaignRouter);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/product-search', productSearchRouter);

// OAuth authentication routes
app.use('/api/auth', authRoutes);

// Default route
app.get('/', (req, res) => {
  res.send('Welcome to Nawiri Hair API!');
});

// Not Found route
app.use('*', (req, res) => {
  res.status(404).json({
    message: `${req.originalUrl} not found!`,
    success: false
  });
});

export default app;