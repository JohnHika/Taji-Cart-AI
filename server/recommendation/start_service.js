/**
 * TajiCart-AI Recommendation System Startup Script
 * 
 * This script starts the recommendation service and monitors its status.
 * Run with: node start_service.js
 */

const { getRecommender } = require('./direct_recommender');
const port = process.env.RECOMMENDATION_API_PORT || 5000;

console.log(`
===================================================
TajiCart-AI Recommendation System Startup
===================================================
Starting recommendation service on port ${port}...
`);

// Start the recommender service
async function startService() {
  try {
    const recommender = getRecommender({ 
      autoStart: true,
      port: port 
    });
    
    // Initialize the recommender (this will start the API service if needed)
    const success = await recommender.initialize();
    
    if (success) {
      console.log(`
===================================================
✅ Recommendation service started successfully!
   API is running at http://localhost:${port}
   
   Available endpoints:
   - GET /health - Check API health
   - GET /recommendations/user/:userId - Get user recommendations
   - GET /recommendations/similar/:productId - Get similar products
   - GET /recommendations/budget - Get budget recommendations
   - GET /recommendations/popular - Get popular products
   - POST /admin/refresh-model - Refresh the recommendation model
   - POST /admin/cache-recommendations - Cache recommendations for users
===================================================
      `);
      
      // Keep the process running
      process.stdin.resume();
      
      // Handle graceful shutdown
      const shutdown = async () => {
        console.log('\nShutting down recommendation service...');
        await recommender.stopApiService();
        process.exit(0);
      };
      
      // Listen for termination signals
      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    } else {
      console.error('Failed to start recommendation service.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error starting recommendation service:', error.message);
    process.exit(1);
  }
}

// Start the service
startService();