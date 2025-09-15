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
    
    // Check if offline mode is explicitly enabled
    if (process.env.NAWIRI_OFFLINE_MODE === 'true') {
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
    
    // Check network connectivity first
    const networkAvailable = await memoryMongoDB.isNetworkAvailable();
    if (!networkAvailable) {
        console.log("⚠️ No network connectivity detected. Starting in OFFLINE MODE...");
        // Go straight to in-memory database when no network
        try {
            console.log("Attempting to start in-memory MongoDB...");
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

    const connectionOptions = {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        family: 4,
        retryWrites: true,
        maxIdleTimeMS: 30000,
        connectTimeoutMS: 30000,
        heartbeatFrequencyMS: 10000,
    };try {
        connectionAttempts++;
        console.log(`MongoDB connection attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS}`);
        
        // Run diagnostics first if it's not the first connection attempt
        if (connectionAttempts > 1) {
            console.log("Running MongoDB connection diagnostics...");
            try {
                const diagnostics = await diagnoseMongoDB(process.env.MONGODB_URI);
                console.log("Diagnostics results:");
                console.log("- Network connectivity:", diagnostics.networkConnectivity);
                
                // Check if any hosts are resolvable
                const hostResolution = Object.values(diagnostics.hostnameCheck);
                const anyResolvable = hostResolution.some(h => h.resolvable);
                console.log("- DNS resolution:", anyResolvable ? "Partial or complete" : "Failed");
                
                if (!anyResolvable) {
                    console.log("❌ No MongoDB hosts could be resolved. This is likely a DNS or network issue.");
                    console.log("   Possible causes: VPN interference, DNS issues, or network firewall");
                }
            } catch (diagError) {
                console.log("Diagnostics failed:", diagError.message);
            }
        }
        
        // First try the direct connection string to avoid DNS issues
        try {
            const directURI = convertSrvToDirectConnect(process.env.MONGODB_URI);
            console.log("Trying direct connection first...");
            
            await mongoose.connect(directURI, connectionOptions);
            usingLocalMongoDB = false;
            console.log("MongoDB connected successfully via direct connection");
            return;
        } catch (directError) {
            console.log("Direct connection failed, trying SRV connection:", directError.message);
            
            // If direct connection fails, try the SRV format
            await mongoose.connect(process.env.MONGODB_URI, connectionOptions);
            usingLocalMongoDB = false;
            console.log("MongoDB connected successfully via SRV connection");
            return;
        }
    } catch (error) {
        console.log("MongoDB Atlas connection error:", error.message);
        
        if (connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
            // Wait before retrying (exponential backoff)
            const retryDelay = Math.min(1000 * Math.pow(2, connectionAttempts), 30000);
            console.log(`Retrying in ${retryDelay/1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            return connectDB(); // Retry recursively
        } else {            console.log(`Failed to connect after ${MAX_CONNECTION_ATTEMPTS} attempts. Trying local MongoDB fallback...`);
            
            // Check network availability
            const networkAvailable = await memoryMongoDB.isNetworkAvailable();
            if (!networkAvailable) {
                console.log("❌ No network connectivity detected. Operating in OFFLINE MODE.");
            }
            
            // Try to start and connect to a local MongoDB as a last resort
            try {
                if (process.env.NODE_ENV !== 'production') {
                    // Check if Docker is available
                    const dockerAvailable = await localMongoDB.isDockerAvailable();
                    
                    if (dockerAvailable && networkAvailable) {
                        console.log("Docker is available. Attempting to start local MongoDB...");
                        
                        // Try to start local MongoDB container
                        try {
                            const started = await localMongoDB.startLocalMongoDB();
                            
                            if (started) {
                                // Connect to the local MongoDB
                                await localMongoDB.connectToLocalMongoDB();
                                usingLocalMongoDB = true;
                                console.log("⚠️ Connected to LOCAL MongoDB for development. Data will not sync with production.");
                                return;
                            }
                        } catch (dockerError) {
                            console.log("Docker MongoDB failed:", dockerError.message);
                        }
                    } else if (!networkAvailable || !dockerAvailable) {
                        // If no network or Docker failed, try in-memory MongoDB
                        console.log("Attempting to start in-memory MongoDB...");
                        try {
                            await memoryMongoDB.connectToMemoryServer();
                            usingLocalMongoDB = true;
                            console.log("⚠️ Connected to IN-MEMORY MongoDB. All data will be lost when the server stops!");
                            console.log("⚠️ This is a FAILSAFE MODE for offline development only.");
                            return;
                        } catch (memoryError) {
                            console.log("In-memory MongoDB failed:", memoryError.message);
                        }
                    } else {
                        console.log("Docker is not available. Cannot start local MongoDB.");
                    }
                }
            } catch (localError) {
                console.log("Failed to set up local MongoDB fallback:", localError);
            }
            
            throw new Error("Could not connect to MongoDB Atlas or local fallback. Please check your network and MongoDB configuration.");        }
    }
}

export default connectDB;