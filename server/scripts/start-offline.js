#!/usr/bin/env node

/**
 * Script to start the server in offline mode without MongoDB Atlas
 * This is useful when developing without an internet connection
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

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

async function main() {
  colorLog('blue', '========================================================');
  colorLog('blue', '        Nawiri Hair Server - Offline Mode');
  colorLog('blue', '========================================================');
  
  colorLog('yellow', '\n⚠️  Starting server in OFFLINE MODE');
  colorLog('yellow', '⚠️  Using in-memory MongoDB database');
  colorLog('yellow', '⚠️  All data will be lost when the server stops');
  
  // Export special environment variable to force offline mode
  process.env.NAWIRI_OFFLINE_MODE = 'true';
  
  try {
    // Start nodemon with environment variable
    const child = exec('NAWIRI_OFFLINE_MODE=true nodemon index.js', { cwd: rootDir });
    
    // Forward stdout and stderr to console
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
    
    // Handle process termination
    process.on('SIGINT', () => {
      colorLog('red', '\nShutting down offline server...');
      child.kill('SIGINT');
      process.exit(0);
    });
    
    child.on('exit', (code) => {
      if (code !== 0) {
        colorLog('red', `Server exited with code ${code}`);
      }
      process.exit(code);
    });
  } catch (error) {
    colorLog('red', 'Failed to start server in offline mode:');
    console.error(error);
    process.exit(1);
  }
}

main();
