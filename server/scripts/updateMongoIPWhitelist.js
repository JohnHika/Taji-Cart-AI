#!/usr/bin/env node

/**
 * This script helps update your MongoDB Atlas IP whitelist by:
 * 1. Fetching your current public IP address
 * 2. Providing instructions to add it to MongoDB Atlas
 * 
 * Run with: node updateMongoIPWhitelist.js
 */

import fetch from 'node-fetch';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function getCurrentPublicIP() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Error fetching IP:', error);
    
    try {
      // Alternative IP service
      const response = await fetch('https://api.ipify.org');
      const ip = await response.text();
      return ip;
    } catch (alternativeError) {
      console.error('Error fetching IP from alternative service:', alternativeError);
      return null;
    }
  }
}

function createConnectionTestScript(ip) {
  const testScript = `
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testConnection() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not found in .env file');
    return;
  }

  console.log('Testing MongoDB connection from IP: ${ip}');
  console.log('Using connection string from .env file');
  
  try {
    const client = new MongoClient(process.env.MONGODB_URI, {
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 10000,
    });
    
    await client.connect();
    console.log('✅ Successfully connected to MongoDB Atlas!');
    
    const dbs = await client.db().admin().listDatabases();
    console.log('Available databases:');
    dbs.databases.forEach(db => console.log(' - ' + db.name));
    
    await client.close();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Please make sure your IP is whitelisted in MongoDB Atlas');
  }
}

testConnection();
`;

  fs.writeFileSync(path.join(process.cwd(), 'testMongoConnection.js'), testScript);
  console.log('Created test script: testMongoConnection.js');
}

async function main() {
  console.log('⏳ Fetching your current public IP address...');
  const ip = await getCurrentPublicIP();
  
  if (!ip) {
    console.log('❌ Could not determine your public IP address.');
    console.log('Please visit https://whatismyip.com and use the displayed IP address.');
    rl.close();
    return;
  }
  
  console.log(`\n✅ Your current public IP address is: ${ip}`);
  console.log('\n=== MONGODB ATLAS IP WHITELIST INSTRUCTIONS ===');
  console.log('1. Log in to your MongoDB Atlas account');
  console.log('2. Select your cluster');
  console.log('3. Click on "Network Access" in the left sidebar');
  console.log('4. Click "ADD IP ADDRESS"');
  console.log(`5. Enter ${ip} in both "IP Address" fields`);
  console.log('6. Add a comment like "My development machine"');
  console.log('7. Click "Confirm"');
  console.log('\nAlternatively, you can add 0.0.0.0/0 to allow access from anywhere (not recommended for production)');
  
  createConnectionTestScript(ip);
  
  console.log('\n📋 To test your MongoDB connection after whitelisting:');
  console.log('   node testMongoConnection.js');
  
  rl.question('\nWould you like to open MongoDB Atlas in your browser? (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y') {
      try {
        const openCommand = process.platform === 'win32' ? 'start' : 
                           process.platform === 'darwin' ? 'open' : 'xdg-open';
        execSync(`${openCommand} https://cloud.mongodb.com`);
        console.log('Opening MongoDB Atlas in your browser...');
      } catch (error) {
        console.log('Could not open browser automatically. Please visit https://cloud.mongodb.com');
      }
    }
    
    rl.close();
  });
}

main();
