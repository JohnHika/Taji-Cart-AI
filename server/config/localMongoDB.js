/**
 * This module provides a way to set up a local MongoDB instance for development.
 * Usage: 
 * 1. Run 'docker run --name mongodb -p 27017:27017 -d mongo' to start a local MongoDB
 * 2. Uncomment the LOCAL_MONGODB_URI line in your .env file
 */

import mongoose from 'mongoose';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Checks if Docker is installed and running
 * @returns {Promise<boolean>} Whether Docker is available
 */
export async function isDockerAvailable() {
    try {
        await execAsync('docker --version');
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Checks if a local MongoDB Docker container is running
 * @returns {Promise<boolean>} Whether MongoDB container is running
 */
export async function isMongoDBContainerRunning() {
    try {
        const { stdout } = await execAsync('docker ps --filter "name=mongodb" --format "{{.Names}}"');
        return stdout.trim() === 'mongodb';
    } catch (error) {
        return false;
    }
}

/**
 * Starts a local MongoDB Docker container if not already running
 * @returns {Promise<boolean>} Whether the container was started successfully
 */
export async function startLocalMongoDB() {
    try {
        if (!(await isDockerAvailable())) {
            console.log('Docker is not available. Cannot start local MongoDB.');
            return false;
        }
        
        if (await isMongoDBContainerRunning()) {
            console.log('MongoDB container is already running.');
            return true;
        }
        
        // Check if the container exists but is stopped
        const { stdout: containerId } = await execAsync('docker ps -a --filter "name=mongodb" --format "{{.ID}}"');
        
        if (containerId.trim()) {
            console.log('Starting existing MongoDB container...');
            await execAsync(`docker start ${containerId.trim()}`);
        } else {
            console.log('Creating and starting new MongoDB container...');
            await execAsync('docker run --name mongodb -p 27017:27017 -d mongo');
        }
        
        console.log('Local MongoDB started successfully.');
        return true;
    } catch (error) {
        console.error('Failed to start local MongoDB:', error);
        return false;
    }
}

/**
 * Gets the connection string for the local MongoDB
 * @returns {string} MongoDB connection string
 */
export function getLocalMongoDBUri() {
    return 'mongodb://localhost:27017/taji-cart';
}

/**
 * Connects to the local MongoDB instance
 * @returns {Promise<void>}
 */
export async function connectToLocalMongoDB() {
    try {
        await mongoose.connect(getLocalMongoDBUri(), {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 10000
        });
        console.log('Connected to local MongoDB successfully');
        return true;
    } catch (error) {
        console.error('Failed to connect to local MongoDB:', error);
        return false;
    }
}

export default {
    isDockerAvailable,
    isMongoDBContainerRunning,
    startLocalMongoDB,
    getLocalMongoDBUri,
    connectToLocalMongoDB
};
