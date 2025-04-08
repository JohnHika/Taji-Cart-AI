import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';

import deliveryRouter from './route/delivery.route.js';
import orderRouter from './route/order.route.js';
import productRouter from './route/product.route.js';
import userRouter from './route/user.route.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: ["http://localhost:5173", "https://your-production-domain.com"], // Add any other origins you need
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Origin", 
    "X-Requested-With", 
    "Content-Type", 
    "Accept", 
    "Authorization",
    "Cache-Control", // Add this
    "Pragma",        // Add this
    "X-Requested-With" // Already included but mentioned for clarity
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
app.use('/api/products', productRouter);
app.use('/api/orders', orderRouter);
app.use('/api/delivery', deliveryRouter);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});