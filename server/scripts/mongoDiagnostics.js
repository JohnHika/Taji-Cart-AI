#!/usr/bin/env node

/**
 * MongoDB Connection Troubleshooter
 * 
 * This script helps diagnose MongoDB connection issues by:
 * 1. Testing both SRV and direct connection methods
 * 2. Checking DNS resolution
 * 3. Verifying network connectivity
 * 4. Providing detailed diagnostics
 * 
 * Usage: node mongoDiagnostics.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

// Configure dotenv
dotenv.config();

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Get current IP address
async function getCurrentIp() {
  try {
    const { stdout } = await execAsync('curl -s https://api.ipify.org');
    return stdout.trim();
  } catch (error) {
    try {
      const response = await fetch('https://api.ipify.org');
      return await response.text();
    } catch (err) {
      return 'Unable to determine IP';
    }
  }
}

// Parse MongoDB URI to extract hosts
function parseMongoURI(uri) {
  if (!uri) return { hosts: [], username: null, options: {} };
  
  const result = {
    hosts: [],
    username: null,
    database: null,
    options: {}
  };
  
  try {
    // Handle SRV format
    if (uri.startsWith('mongodb+srv://')) {
      const withoutProtocol = uri.replace('mongodb+srv://', '');
      let auth = '';
      let host = '';
      
      if (withoutProtocol.includes('@')) {
        [auth, host] = withoutProtocol.split('@');
        if (auth.includes(':')) {
          result.username = auth.split(':')[0];
        } else {
          result.username = auth;
        }
      } else {
        host = withoutProtocol;
      }
      
      if (host.includes('/')) {
        const parts = host.split('/');
        host = parts[0];
        if (parts[1].includes('?')) {
          result.database = parts[1].split('?')[0];
          const queryParams = parts[1].split('?')[1];
          if (queryParams) {
            queryParams.split('&').forEach(param => {
              const [key, value] = param.split('=');
              result.options[key] = value;
            });
          }
        } else {
          result.database = parts[1];
        }
      }
      
      result.hosts.push(host);
      
      // For Atlas, also add the individual shard hosts
      if (host.includes('mongodb.net')) {
        const prefix = host.split('.')[0];
        const clusterMatch = host.match(/([a-z0-9]+)\.mongodb\.net/i);
        const clusterId = clusterMatch && clusterMatch[1] ? clusterMatch[1] : '';
        
        result.hosts.push(`${prefix}-shard-00-00.${clusterId}.mongodb.net`);
        result.hosts.push(`${prefix}-shard-00-01.${clusterId}.mongodb.net`);
        result.hosts.push(`${prefix}-shard-00-02.${clusterId}.mongodb.net`);
      }
    } else if (uri.startsWith('mongodb://')) {
      const withoutProtocol = uri.replace('mongodb://', '');
      let auth = '';
      let hosts = '';
      
      if (withoutProtocol.includes('@')) {
        [auth, hosts] = withoutProtocol.split('@');
        if (auth.includes(':')) {
          result.username = auth.split(':')[0];
        } else {
          result.username = auth;
        }
      } else {
        hosts = withoutProtocol;
      }
      
      let restOfUri = '';
      if (hosts.includes('/')) {
        const parts = hosts.split('/');
        hosts = parts[0];
        restOfUri = parts.slice(1).join('/');
      }
      
      // Handle multiple hosts in a replica set
      hosts.split(',').forEach(host => {
        result.hosts.push(host.split(':')[0]);
      });
      
      if (restOfUri) {
        if (restOfUri.includes('?')) {
          const parts = restOfUri.split('?');
          result.database = parts[0] || null;
          const queryParams = parts[1];
          if (queryParams) {
            queryParams.split('&').forEach(param => {
              const [key, value] = param.split('=');
              result.options[key] = value;
            });
          }
        } else {
          result.database = restOfUri;
        }
      }
    }
  } catch (error) {
    console.error('Error parsing MongoDB URI:', error);
  }
  
  return result;
}

// Test DNS resolution for a hostname
async function testDnsResolution(hostname) {
  try {
    const addresses = await dns.resolve4(hostname);
    return {
      success: true,
      addresses
    };
  } catch (error) {
    return {
      success: false,
      error: error.code
    };
  }
}

// Test SRV record resolution
async function testSrvResolution(hostname) {
  try {
    const records = await dns.resolveSrv(`_mongodb._tcp.${hostname}`);
    return {
      success: true,
      records
    };
  } catch (error) {
    return {
      success: false,
      error: error.code
    };
  }
}

// Ping a host to check connectivity
async function pingHost(hostname) {
  try {
    const cmd = process.platform === 'win32'
      ? `ping -n 1 ${hostname}`
      : `ping -c 1 -W 2 ${hostname}`;
    
    const { stdout } = await execAsync(cmd);
    const success = !stdout.includes('100% packet loss') && !stdout.includes('100% loss') && !stdout.includes('Destination host unreachable');
    
    return {
      success,
      output: stdout
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Test MongoDB connection
async function testMongoConnection(uri, options = {}) {
  try {
    const connection = await mongoose.createConnection(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      ...options
    });
    
    const dbInfo = await connection.db.admin().serverInfo();
    await connection.close();
    
    return {
      success: true,
      version: dbInfo.version,
      host: dbInfo.host
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
}

// Convert SRV connection string to direct format
function convertToDirectFormat(uri) {
  if (!uri || !uri.includes('mongodb+srv://')) return uri;
  
  try {
    const withoutProtocol = uri.replace('mongodb+srv://', '');
    let auth = '';
    let host = '';
    let restOfUri = '';
    
    if (withoutProtocol.includes('@')) {
      [auth, host] = withoutProtocol.split('@');
    } else {
      host = withoutProtocol;
    }
    
    if (host.includes('/')) {
      const parts = host.split('/');
      host = parts[0];
      restOfUri = '/' + parts.slice(1).join('/');
    }
    
    // Parse the cluster ID (e.g., "ja3g2") from the hostname
    const clusterMatch = host.match(/([a-z0-9]+)\.mongodb\.net/i);
    const clusterId = clusterMatch && clusterMatch[1] ? clusterMatch[1] : '';
    
    // Get the base hostname (e.g., "el-roi-one-hardware")
    const baseHostname = host.replace(`.${clusterId}.mongodb.net`, '');
    
    const direct = `mongodb://${auth ? auth + '@' : ''}${
      baseHostname + `-shard-00-00.${clusterId}.mongodb.net:27017,` +
      baseHostname + `-shard-00-01.${clusterId}.mongodb.net:27017,` +
      baseHostname + `-shard-00-02.${clusterId}.mongodb.net:27017`
    }${restOfUri}${restOfUri.includes('?') ? '&' : '?'}ssl=true&replicaSet=atlas-${baseHostname.split('-')[0]}-shard-0&authSource=admin`;
    
    return direct;
  } catch (error) {
    console.error('Error converting to direct format:', error);
    return uri;
  }
}

// Get MongoDB Atlas IP whitelist from .env
async function testEnvFile() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    const envExists = await fs.access(envPath).then(() => true).catch(() => false);
    
    if (!envExists) {
      return {
        exists: false,
        message: 'No .env file found in the current directory'
      };
    }
    
    const envContent = await fs.readFile(envPath, 'utf8');
    const mongoUri = envContent.split('\n').find(line => line.startsWith('MONGODB_URI='));
    
    if (!mongoUri) {
      return {
        exists: true,
        hasMongoUri: false,
        message: 'No MONGODB_URI found in .env file'
      };
    }
    
    return {
      exists: true,
      hasMongoUri: true,
      uri: mongoUri.split('=')[1].trim().replace(/["']/g, '')
    };
  } catch (error) {
    return {
      exists: false,
      error: error.message
    };
  }
}

// Main function
async function main() {
  colorLog('blue', '========================================================');
  colorLog('blue', '       MongoDB Connection Diagnostics Tool');
  colorLog('blue', '========================================================');
  
  // Test environment
  colorLog('cyan', '\n1. Environment Information');
  console.log(`OS: ${os.type()} ${os.release()}`);
  console.log(`Node.js: ${process.version}`);
  console.log(`Mongoose: ${mongoose.version}`);
  console.log(`MongoDB Driver: ${mongoose.mongo.version}`);
  
  const ip = await getCurrentIp();
  console.log(`Current IP: ${ip}`);
  
  // Check .env file
  colorLog('cyan', '\n2. Checking .env file');
  const envTest = await testEnvFile();
  
  if (!envTest.exists) {
    colorLog('red', '❌ No .env file found');
    rl.question('Would you like to create a .env file now? (y/n): ', async (answer) => {
      if (answer.toLowerCase() === 'y') {
        rl.question('Please enter your MongoDB URI: ', async (uri) => {
          try {
            await fs.writeFile(path.join(process.cwd(), '.env'), `MONGODB_URI="${uri}"\n`);
            colorLog('green', '✅ .env file created successfully');
            process.env.MONGODB_URI = uri;
            continueTests();
          } catch (error) {
            colorLog('red', `❌ Failed to create .env file: ${error.message}`);
            rl.close();
          }
        });
      } else {
        rl.question('Please enter your MongoDB URI for testing: ', (uri) => {
          process.env.MONGODB_URI = uri;
          continueTests();
        });
      }
    });
  } else if (!envTest.hasMongoUri) {
    colorLog('yellow', '⚠️ No MONGODB_URI found in .env file');
    rl.question('Would you like to add MONGODB_URI to .env file? (y/n): ', async (answer) => {
      if (answer.toLowerCase() === 'y') {
        rl.question('Please enter your MongoDB URI: ', async (uri) => {
          try {
            const envPath = path.join(process.cwd(), '.env');
            const envContent = await fs.readFile(envPath, 'utf8');
            await fs.writeFile(envPath, `${envContent}\nMONGODB_URI="${uri}"\n`);
            colorLog('green', '✅ MONGODB_URI added to .env file');
            process.env.MONGODB_URI = uri;
            continueTests();
          } catch (error) {
            colorLog('red', `❌ Failed to update .env file: ${error.message}`);
            rl.close();
          }
        });
      } else {
        rl.question('Please enter your MongoDB URI for testing: ', (uri) => {
          process.env.MONGODB_URI = uri;
          continueTests();
        });
      }
    });
  } else {
    colorLog('green', '✅ MONGODB_URI found in .env file');
    continueTests();
  }
  
  async function continueTests() {
    if (!process.env.MONGODB_URI) {
      colorLog('red', '❌ No MongoDB URI provided');
      rl.close();
      return;
    }
    
    // Parse URI
    colorLog('cyan', '\n3. MongoDB URI Analysis');
    const secureUri = process.env.MONGODB_URI.replace(/:([^:@]+)@/, ':****@');
    console.log(`URI: ${secureUri}`);
    
    const parsedUri = parseMongoURI(process.env.MONGODB_URI);
    console.log(`Type: ${process.env.MONGODB_URI.startsWith('mongodb+srv://') ? 'SRV' : 'Standard'}`);
    console.log(`Hosts: ${parsedUri.hosts.join(', ')}`);
    console.log(`Database: ${parsedUri.database || 'None specified'}`);
    console.log(`Authentication: ${parsedUri.username ? 'Yes' : 'No'}`);
    
    // DNS tests
    colorLog('cyan', '\n4. DNS Resolution Tests');
    for (const host of parsedUri.hosts) {
      console.log(`\nTesting ${host}:`);
      
      // A record test
      const dnsTest = await testDnsResolution(host);
      if (dnsTest.success) {
        colorLog('green', `✅ DNS A Record: Success (${dnsTest.addresses.join(', ')})`);
      } else {
        colorLog('red', `❌ DNS A Record: Failed (${dnsTest.error})`);
      }
      
      // SRV record test (if applicable)
      if (host.includes('mongodb.net') && !host.includes('shard')) {
        const srvTest = await testSrvResolution(host);
        if (srvTest.success) {
          colorLog('green', `✅ SRV Record: Success (${srvTest.records.length} records found)`);
          srvTest.records.forEach(record => {
            console.log(`  - ${record.name}:${record.port} (priority: ${record.priority})`);
          });
        } else {
          colorLog('red', `❌ SRV Record: Failed (${srvTest.error})`);
        }
      }
      
      // Ping test
      const pingTest = await pingHost(host);
      if (pingTest.success) {
        colorLog('green', '✅ Ping: Success');
      } else {
        colorLog('yellow', `⚠️ Ping: Failed (${pingTest.error || 'host unreachable'})`);
        console.log('   Note: Some cloud providers block ICMP ping requests');
      }
    }
    
    // MongoDB connection tests
    colorLog('cyan', '\n5. MongoDB Connection Tests');
    
    // Test SRV connection (if applicable)
    if (process.env.MONGODB_URI.startsWith('mongodb+srv://')) {
      console.log('\nTesting SRV connection:');
      const srvResult = await testMongoConnection(process.env.MONGODB_URI);
      
      if (srvResult.success) {
        colorLog('green', `✅ SRV Connection: Success (MongoDB ${srvResult.version} on ${srvResult.host})`);
      } else {
        colorLog('red', `❌ SRV Connection: Failed (${srvResult.error})`);
      }
    }
    
    // Test direct connection
    console.log('\nTesting direct connection:');
    const directUri = convertToDirectFormat(process.env.MONGODB_URI);
    const directResult = await testMongoConnection(directUri);
    
    if (directResult.success) {
      colorLog('green', `✅ Direct Connection: Success (MongoDB ${directResult.version} on ${directResult.host})`);
    } else {
      colorLog('red', `❌ Direct Connection: Failed (${directResult.error})`);
    }
    
    // Summary and recommendations
    colorLog('cyan', '\n6. Diagnosis and Recommendations');
    
    const anyDnsSuccess = parsedUri.hosts.some(async (host) => (await testDnsResolution(host)).success);
    const srvSuccess = process.env.MONGODB_URI.startsWith('mongodb+srv://') ? 
      (await testSrvResolution(parsedUri.hosts[0])).success : true;
    const connectionSuccess = directResult.success || 
      (process.env.MONGODB_URI.startsWith('mongodb+srv://') && (await testMongoConnection(process.env.MONGODB_URI)).success);
    
    if (connectionSuccess) {
      colorLog('green', '✅ MongoDB connection successful!');
      console.log('Your application should be able to connect to MongoDB.');
    } else {
      colorLog('red', '❌ MongoDB connection failed');
      
      if (!anyDnsSuccess) {
        console.log('\nPossible DNS resolution issues:');
        console.log('1. Check your internet connection');
        console.log('2. Your DNS servers might be having issues');
        console.log('3. Try using Google DNS (8.8.8.8, 8.8.4.4) or Cloudflare DNS (1.1.1.1)');
        console.log('4. If using a VPN, try disabling it temporarily');
      }
      
      if (!srvSuccess && process.env.MONGODB_URI.startsWith('mongodb+srv://')) {
        console.log('\nSRV record lookup issues:');
        console.log('1. Try using direct connection format instead of SRV');
        console.log('2. Update your application to use this format:');
        console.log(`   ${directUri.replace(/:([^:@]+)@/, ':****@')}`);
      }
      
      // Atlas specific advice
      if (parsedUri.hosts.some(h => h.includes('mongodb.net'))) {
        console.log('\nMongoDB Atlas specific issues:');
        console.log('1. Make sure your IP address is whitelisted in Atlas');
        console.log('2. Check if your Atlas cluster is active (not paused)');
        console.log('3. Verify your username, password and database name');
        console.log('4. Check if your Atlas cluster allows connections from your current network');
        
        console.log('\nTo whitelist your IP in Atlas:');
        console.log(`1. Add this IP to your Atlas whitelist: ${ip}`);
        console.log('2. Or use 0.0.0.0/0 to allow connections from anywhere (not recommended for production)');
      }
    }
    
    // Create test connection script
    colorLog('cyan', '\n7. Connection Test Script');
    
    const testScript = `
const mongoose = require('mongoose');

async function testConnection() {
  try {
    console.log('Testing MongoDB connection...');
    await mongoose.connect('${process.env.MONGODB_URI}', {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 10000
    });
    
    console.log('✅ Connected to MongoDB successfully!');
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(\`Available collections: \${collections.map(c => c.name).join(', ')}\`);
    
    await mongoose.connection.close();
    console.log('Connection closed');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testConnection();
`;

    const testScriptPath = path.join(process.cwd(), 'testMongoConnection.js');
    try {
      await fs.writeFile(testScriptPath, testScript);
      colorLog('green', `✅ Test script created: ${testScriptPath}`);
      console.log('Run it with: node testMongoConnection.js');
    } catch (error) {
      colorLog('red', `❌ Failed to create test script: ${error.message}`);
    }
    
    colorLog('blue', '\n========================================================');
    colorLog('blue', '       Diagnostics Complete');
    colorLog('blue', '========================================================');
    
    rl.close();
  }
}

main().catch(error => {
  console.error('Error in diagnostics:', error);
  rl.close();
});
