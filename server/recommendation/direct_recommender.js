/**
 * TajiCart-AI Recommendation System - Node.js Bridge
 *
 * This module provides a bridge between the Node.js backend and the Python recommendation API.
 * It handles communication with the API and provides methods for getting recommendations.
 */

const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

/**
 * RecommenderClient - Client for the Python recommendation API
 */
class RecommenderClient {
  /**
   * Create a new RecommenderClient
   * @param {Object} options Configuration options
   * @param {string} options.apiBaseUrl Base URL for the recommendation API
   * @param {boolean} options.autoStart Whether to auto-start the API if not available
   * @param {number} options.port Port for the recommendation API
   * @param {number} options.startupTimeout Timeout for API startup in ms
   */
  constructor(options = {}) {
    // Default configuration
    this.config = {
      apiBaseUrl: options.apiBaseUrl || process.env.RECOMMENDATION_API_URL || 'http://localhost:5000',
      autoStart: options.autoStart !== false,
      port: options.port || parseInt(process.env.RECOMMENDATION_API_PORT || '5000'),
      startupTimeout: options.startupTimeout || 30000, // 30 seconds default
    };

    this.apiProcess = null;
    this.initialized = false;

    // Bind methods
    this.initialize = this.initialize.bind(this);
    this.startApiService = this.startApiService.bind(this);
    this.stopApiService = this.stopApiService.bind(this);
    this.checkApiHealth = this.checkApiHealth.bind(this);
    this.handleApiExit = this.handleApiExit.bind(this);
  }

  /**
   * Initialize the recommender client
   * @returns {Promise<boolean>} Whether initialization was successful
   */
  async initialize() {
    try {
      if (this.initialized) {
        return true;
      }

      // Check if API is already running
      const isHealthy = await this.checkApiHealth().catch(() => false);

      if (!isHealthy && this.config.autoStart) {
        // Start the API service
        await this.startApiService();
      } else if (!isHealthy) {
        throw new Error('Recommendation API is not available and autoStart is disabled');
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize recommender client:', error.message);
      return false;
    }
  }

  /**
   * Check if the API service is healthy
   * @returns {Promise<boolean>} Whether the API is healthy
   */
  async checkApiHealth() {
    try {
      const response = await axios.get(`${this.config.apiBaseUrl}/health`);
      return response.status === 200 && response.data.status === 'ok';
    } catch (error) {
      return false;
    }
  }

  /**
   * Start the Python API service
   * @returns {Promise<boolean>} Whether the service started successfully
   */
  async startApiService() {
    return new Promise((resolve, reject) => {
      // Check if service is already running
      this.checkApiHealth().then((isHealthy) => {
        if (isHealthy) {
          console.log('Recommendation API is already running.');
          return resolve(true);
        }

        console.log('Starting recommendation API service...');
        
        // Determine Python executable path
        const pythonEnvPath = path.join(process.cwd(), 'recommendation', 'rec-env');
        const pythonExecutable = process.platform === 'win32' 
          ? path.join(pythonEnvPath, 'Scripts', 'python.exe')
          : path.join(pythonEnvPath, 'bin', 'python');
        
        // Use virtual environment python if exists, otherwise use system python
        const pythonExec = fs.existsSync(pythonExecutable) ? pythonExecutable : 'python';

        // Path to the API service script
        const apiScriptPath = path.join(process.cwd(), 'recommendation', 'api_service.py');

        // Environment variables for the child process
        const env = {
          ...process.env,
          RECOMMENDATION_API_PORT: this.config.port.toString(),
        };

        // Spawn the Python process
        this.apiProcess = spawn(pythonExec, [apiScriptPath], {
          env,
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        // Track startup status
        let started = false;
        const startTime = Date.now();

        // Handle process output
        this.apiProcess.stdout.on('data', (data) => {
          console.log(`Recommendation API: ${data.toString().trim()}`);
          
          // Check if the API has started
          if (!started && data.toString().includes('Running on')) {
            started = true;
            console.log('Recommendation API started successfully');
            resolve(true);
          }
        });

        // Handle errors
        this.apiProcess.stderr.on('data', (data) => {
          console.error(`Recommendation API error: ${data.toString().trim()}`);
        });

        // Handle process exit
        this.apiProcess.on('exit', this.handleApiExit);

        // Handle process errors
        this.apiProcess.on('error', (error) => {
          console.error('Failed to start recommendation API:', error.message);
          reject(error);
        });

        // Check health until timeout
        const checkInterval = setInterval(async () => {
          try {
            const isHealthy = await this.checkApiHealth();
            
            if (isHealthy) {
              clearInterval(checkInterval);
              console.log('Recommendation API is healthy');
              started = true;
              resolve(true);
              return;
            }
            
            // Check if we've timed out
            if (Date.now() - startTime > this.config.startupTimeout) {
              clearInterval(checkInterval);
              if (!started) {
                console.error('Recommendation API failed to start within timeout');
                reject(new Error('API service startup timeout'));
              }
            }
          } catch (err) {
            // Ignore errors during startup checks
          }
        }, 1000); // Check every second
      });
    });
  }

  /**
   * Handle API process exit
   * @param {number} code Exit code
   * @param {string} signal Signal that caused the exit
   */
  handleApiExit(code, signal) {
    if (code !== 0) {
      console.error(`Recommendation API process exited with code ${code} and signal ${signal}`);
      this.initialized = false;
    } else {
      console.log('Recommendation API process exited normally');
    }
    
    this.apiProcess = null;
  }

  /**
   * Stop the Python API service
   */
  async stopApiService() {
    if (this.apiProcess) {
      console.log('Stopping recommendation API service...');
      
      // Try graceful shutdown first on Windows
      if (process.platform === 'win32') {
        try {
          // Send CTRL+C to the process
          this.apiProcess.kill('SIGINT');
          
          // Wait for process to exit gracefully
          await new Promise(resolve => {
            const timeout = setTimeout(() => {
              // Force kill if still running
              if (this.apiProcess) {
                this.apiProcess.kill('SIGKILL');
              }
              resolve();
            }, 5000); // Give it 5 seconds to shut down
            
            this.apiProcess.once('exit', () => {
              clearTimeout(timeout);
              resolve();
            });
          });
        } catch (error) {
          // Fallback to force kill
          if (this.apiProcess) {
            this.apiProcess.kill('SIGKILL');
          }
        }
      } else {
        // On Unix-like systems, SIGTERM should work fine
        this.apiProcess.kill('SIGTERM');
      }
      
      this.apiProcess = null;
      this.initialized = false;
      console.log('Recommendation API service stopped');
    }
  }

  /**
   * Make a request to the recommendation API
   * @param {string} endpoint API endpoint path
   * @param {Object} options Request options
   * @returns {Promise<Object>} API response
   */
  async apiRequest(endpoint, options = {}) {
    try {
      // Ensure client is initialized
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Build request config
      const config = {
        method: options.method || 'get',
        url: `${this.config.apiBaseUrl}${endpoint}`,
        ...options,
      };
      
      // Make the request
      const response = await axios(config);
      return response.data;
    } catch (error) {
      // If API is down, try to restart it once
      if ((error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') && this.config.autoStart) {
        console.log('API connection failed. Attempting to restart...');
        await this.initialize();
        
        // Retry the request once
        const config = {
          method: options.method || 'get',
          url: `${this.config.apiBaseUrl}${endpoint}`,
          ...options,
        };
        
        const response = await axios(config);
        return response.data;
      }
      
      // Re-throw any other errors or if restart didn't help
      throw error;
    }
  }

  /**
   * Get personalized recommendations for a user
   * @param {string} userId User ID
   * @param {Object} options Options for recommendations
   * @param {number} options.n Number of recommendations to return
   * @param {string} options.category Category filter
   * @param {boolean} options.excludePurchased Whether to exclude purchased products
   * @param {boolean} options.useCache Whether to use cached recommendations
   * @returns {Promise<Object>} Recommendations
   */
  async getUserRecommendations(userId, options = {}) {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (options.n) params.append('n', options.n);
      if (options.category) params.append('category', options.category);
      if (options.excludePurchased !== undefined) params.append('exclude_purchased', options.excludePurchased);
      if (options.useCache !== undefined) params.append('use_cache', options.useCache);
      
      const queryString = params.toString();
      const endpoint = `/recommendations/user/${userId}${queryString ? `?${queryString}` : ''}`;
      
      return await this.apiRequest(endpoint);
    } catch (error) {
      console.error(`Failed to get recommendations for user ${userId}:`, error.message);
      return { 
        error: error.message,
        userId,
        recommendations: [] 
      };
    }
  }

  /**
   * Get similar products
   * @param {string} productId Product ID
   * @param {Object} options Options for similar products
   * @param {number} options.n Number of similar products to return
   * @returns {Promise<Object>} Similar products
   */
  async getSimilarProducts(productId, options = {}) {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (options.n) params.append('n', options.n);
      
      const queryString = params.toString();
      const endpoint = `/recommendations/similar/${productId}${queryString ? `?${queryString}` : ''}`;
      
      return await this.apiRequest(endpoint);
    } catch (error) {
      console.error(`Failed to get similar products for ${productId}:`, error.message);
      return { 
        error: error.message,
        productId,
        similar_products: [] 
      };
    }
  }

  /**
   * Get budget recommendations
   * @param {Object} options Options for budget recommendations
   * @param {string} options.userId User ID for personalized recommendations
   * @param {number} options.budget Maximum price for recommended products
   * @param {string} options.category Category filter
   * @param {number} options.n Number of recommendations to return
   * @returns {Promise<Object>} Budget recommendations
   */
  async getBudgetRecommendations(options = {}) {
    try {
      if (!options.budget) {
        throw new Error('Budget parameter is required');
      }
      
      // Build query parameters
      const params = new URLSearchParams();
      if (options.userId) params.append('user_id', options.userId);
      params.append('budget', options.budget);
      if (options.category) params.append('category', options.category);
      if (options.n) params.append('n', options.n);
      
      const endpoint = `/recommendations/budget?${params.toString()}`;
      
      return await this.apiRequest(endpoint);
    } catch (error) {
      console.error('Failed to get budget recommendations:', error.message);
      return { 
        error: error.message,
        recommendations: [] 
      };
    }
  }

  /**
   * Get popular products
   * @param {Object} options Options for popular products
   * @param {number} options.n Number of products to return
   * @param {string} options.category Category filter
   * @returns {Promise<Object>} Popular products
   */
  async getPopularProducts(options = {}) {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (options.n) params.append('n', options.n);
      if (options.category) params.append('category', options.category);
      
      const queryString = params.toString();
      const endpoint = `/recommendations/popular${queryString ? `?${queryString}` : ''}`;
      
      return await this.apiRequest(endpoint);
    } catch (error) {
      console.error('Failed to get popular products:', error.message);
      return { 
        error: error.message,
        popular_products: [] 
      };
    }
  }

  /**
   * Refresh the recommendation model
   * @returns {Promise<Object>} Refresh result
   */
  async refreshModel() {
    try {
      return await this.apiRequest('/admin/refresh-model', { method: 'post' });
    } catch (error) {
      console.error('Failed to refresh model:', error.message);
      return { 
        status: 'error',
        message: error.message 
      };
    }
  }

  /**
   * Cache recommendations for users
   * @param {Object} options Options for caching
   * @param {Array<string>} options.userIds List of user IDs
   * @param {number} options.count Number of recommendations per user
   * @returns {Promise<Object>} Cache result
   */
  async cacheRecommendations(options = {}) {
    try {
      return await this.apiRequest('/admin/cache-recommendations', { 
        method: 'post',
        data: {
          user_ids: options.userIds,
          count: options.count
        }
      });
    } catch (error) {
      console.error('Failed to cache recommendations:', error.message);
      return { 
        success: false,
        error: error.message 
      };
    }
  }
}

// Singleton instance
let recommenderInstance = null;

/**
 * Get the recommender client instance (singleton)
 * @param {Object} options Configuration options
 * @returns {RecommenderClient} Recommender client instance
 */
function getRecommender(options = {}) {
  if (!recommenderInstance) {
    recommenderInstance = new RecommenderClient(options);
  }
  return recommenderInstance;
}

// Export the client factory function
module.exports = { getRecommender };