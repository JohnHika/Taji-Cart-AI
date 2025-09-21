import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';

import orderRouter from './route/order.route.js';
import productRouter from './route/product.route.js';
import userRouter from './route/user.route.js';
import deliveryRoutes from './routes/delivery.js'; // Not delivery.route.js

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOriginsLegacy = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://nawiri-hair-client.onrender.com',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOriginsLegacy.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Origin", 
    "Content-Type", 
    "Accept", 
    "Authorization",
    "Cache-Control",
    "Pragma"
  ]
}));

app.use(bodyParser.json());

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.log('Error connecting to MongoDB', err);
});

app.use('/api/users', userRouter);
app.use('/api/user', userRouter);
app.use('/api/products', productRouter);
app.use('/api/orders', orderRouter);
app.use('/api/delivery', deliveryRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});