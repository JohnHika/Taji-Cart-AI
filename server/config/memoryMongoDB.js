/**
 * In-memory MongoDB server for offline development
 * This module provides a way to run MongoDB in memory when no network connection is available
 */

import mongoose from 'mongoose';

let memoryServer = null;
let MongoMemoryServer = null;

/**
 * Start an in-memory MongoDB server
 * @returns {Promise<string>} Connection URI for the in-memory server
 */
export async function startMemoryServer() {
  try {
    // Only import mongodb-memory-server if we're in development
    if (!MongoMemoryServer) {
      try {
        const mongoMemoryModule = await import('mongodb-memory-server');
        MongoMemoryServer = mongoMemoryModule.MongoMemoryServer;
      } catch (error) {
        console.log('⚠️ mongodb-memory-server not available (production mode)');
        throw new Error('Memory server not available in production');
      }
    }

    // Create an in-memory MongoDB server
    memoryServer = await MongoMemoryServer.create({
      instance: {
        dbName: 'nawiri',
        port: 27017
      }
    });
    
    const uri = memoryServer.getUri();
    console.log('✅ In-memory MongoDB server started');
    console.log('URI:', uri);
    
    return uri;
  } catch (error) {
    console.error('Failed to start in-memory MongoDB server:', error);
    throw error;
  }
}

/**
 * Connect to the in-memory MongoDB server
 * @returns {Promise<boolean>} Whether the connection was successful
 */
export async function connectToMemoryServer() {
  try {
    if (!memoryServer) {
      await startMemoryServer();
    }
    
    const uri = memoryServer.getUri();
    
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000
    });
    
    console.log('✅ Connected to in-memory MongoDB server');
    return true;
  } catch (error) {
    console.error('Failed to connect to in-memory MongoDB server:', error);
    return false;
  }
}

/**
 * Stop the in-memory MongoDB server
 */
export async function stopMemoryServer() {
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
    console.log('In-memory MongoDB server stopped');
  }
}

/**
 * Check if network is available by trying to resolve a DNS name
 * @returns {Promise<boolean>} Whether the network is available
 */
export async function isNetworkAvailable() {
  try {
    const dns = await import('dns').then(m => m.promises);
    await dns.lookup('google.com');
    return true;
  } catch (error) {
    return false;
  }
}

export default {
  startMemoryServer,
  connectToMemoryServer,
  stopMemoryServer,
  isNetworkAvailable
};
