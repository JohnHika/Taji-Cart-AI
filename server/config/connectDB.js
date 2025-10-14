import mongoose from "mongoose";
import dotenv from 'dotenv';
import { convertSrvToDirectConnect, diagnoseMongoDB } from './directConnectFallback.js';
import localMongoDB from './localMongoDB.js';
import memoryMongoDB from './memoryMongoDB.js';
dotenv.config();

// Set up mongoose connection options globally
mongoose.set('strictQuery', false);

// Create a monitor to handle connection state
let isConnected = false;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;
let usingLocalMongoDB = false;

// Set up mongoose event listeners for connection management
mongoose.connection.on('connected', () => {
    const source = usingLocalMongoDB ? 'local development database' : 'MongoDB Atlas';
    console.log(`✅ MongoDB connection established successfully (${source})`);
    isConnected = true;
    connectionAttempts = 0;
});

mongoose.connection.on('error', (err) => {
    console.log('❌ MongoDB connection error:', err);
    isConnected = false;
});

mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB disconnected');
    isConnected = false;
});

// Handle process termination events
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('MongoDB connection closed due to app termination');
    process.exit(0);
});

async function connectDB() {
    if (isConnected) {
        console.log('Already connected to MongoDB');
        return;
    }

    if (!process.env.MONGODB_URI) {
        throw new Error("Please provide MONGODB_URI in the .env file");
    }
    
    // Check if offline mode is explicitly enabled (development only)
    if (process.env.NAWIRI_OFFLINE_MODE === 'true' && process.env.NODE_ENV !== 'production') {
        console.log("🔌 OFFLINE MODE explicitly enabled via environment variable");
        try {
            console.log("Starting in-memory MongoDB database...");
            await memoryMongoDB.connectToMemoryServer();
            usingLocalMongoDB = true;
            console.log("✅ Connected to IN-MEMORY MongoDB. All data will be lost when the server stops!");
            console.log("⚠️ This is a FAILSAFE MODE for offline development only.");
            return;
        } catch (memoryError) {
            console.log("In-memory MongoDB failed:", memoryError.message);
            throw new Error("Could not start offline MongoDB. Cannot continue without a database.");
        }
    }
    
    // Skip network check and memory MongoDB in production
    if (process.env.NODE_ENV === 'production') {
        console.log("🚀 Production mode: attempting MongoDB Atlas connection");
        
        // Optimized connection options for faster startup
        const connectionOptions = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 2000, // Fast timeout
            socketTimeoutMS: 30000,
            family: 4,
            maxPoolSize: 5, // Reduced pool size
            minPoolSize: 1,
            maxIdleTimeMS: 10000,
            connectTimeoutMS: 2000, // Very fast connection timeout
            bufferCommands: false
        };

        try {
            // Directly try SRV connection (faster than trying direct first)
            await mongoose.connect(process.env.MONGODB_URI, connectionOptions);
            usingLocalMongoDB = false;
            console.log("✅ MongoDB connected");
            return;
        } catch (error) {
            console.log("MongoDB Atlas connection error:", error.message);
            throw new Error(`Cannot connect to MongoDB Atlas: ${error.message}. Check your MONGODB_URI and network connectivity.`);
        }
    }
    
    // Optimized connection options for faster startup
    const connectionOptions = {
        serverSelectionTimeoutMS: 2000, // Fast timeout
        socketTimeoutMS: 30000,
        family: 4,
        retryWrites: true,
        maxIdleTimeMS: 10000,
        connectTimeoutMS: 2000, // Fast connection timeout
        heartbeatFrequencyMS: 10000,
        maxPoolSize: 5, // Reduced pool size
        minPoolSize: 1,
        bufferCommands: false
    };

    try {
        connectionAttempts++;
        console.log(`MongoDB connection attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS}`);
        
        // Try SRV connection directly (fastest method)
        await mongoose.connect(process.env.MONGODB_URI, connectionOptions);
        usingLocalMongoDB = false;
        console.log("✅ MongoDB connected");
        return;
    } catch (error) {
        console.log("MongoDB connection error:", error.message);
        
        if (connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
            // Fast retry with minimal delay
            console.log(`Retrying immediately (attempt ${connectionAttempts + 1}/${MAX_CONNECTION_ATTEMPTS})...`);
            await new Promise(resolve => setTimeout(resolve, 500)); // Only 500ms delay
            return connectDB(); // Retry recursively
        } else {
            console.log(`⚠️ Failed to connect after ${MAX_CONNECTION_ATTEMPTS} attempts.`);
            
            // In production, fail hard without fallbacks
            if (process.env.NODE_ENV === 'production') {
                throw new Error(`Cannot connect to MongoDB Atlas after ${MAX_CONNECTION_ATTEMPTS} attempts. Check your MONGODB_URI and network connectivity.`);
            }
            
            // Development: Try in-memory MongoDB as quick fallback
            console.log("Trying in-memory MongoDB fallback...");
            try {
                await memoryMongoDB.connectToMemoryServer();
                usingLocalMongoDB = true;
                console.log("⚠️ Connected to IN-MEMORY MongoDB. All data will be lost when the server stops!");
                return;
            } catch (memoryError) {
                console.log("In-memory MongoDB failed:", memoryError.message);
                throw new Error("Could not connect to MongoDB Atlas or memory fallback. Please check your network and MongoDB configuration.");
            }
        }
    }
}

export default connectDB;