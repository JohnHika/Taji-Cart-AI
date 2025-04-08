import express from 'express';
import session from 'express-session';
import { closeInactiveSessions } from './controllers/chat.controller.js';
import productRoutes from './route/product.route.js';

const app = express();

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

// Make sure this line exists to register the product routes
app.use('/api/product', productRoutes);

// ...rest of your app configuration