/**
 * TajiCart-AI Recommendation Routes
 *
 * These routes handle recommendation-related API endpoints.
 */

const express = require('express');
const recommendationController = require('../controllers/recommendation.controller');
const { isAuthenticated } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/Admin');

const router = express.Router();

// Public routes (no authentication required)
router.get('/popular', recommendationController.getPopularProducts);

// Protected routes (user authentication required)
router.get('/user/:userId', isAuthenticated, recommendationController.getUserRecommendations);
router.get('/similar/:productId', recommendationController.getSimilarProducts);
router.get('/budget', recommendationController.getBudgetRecommendations);

// Admin routes
router.post('/admin/refresh-model', isAuthenticated, isAdmin, recommendationController.refreshModel);
router.post('/admin/cache-recommendations', isAuthenticated, isAdmin, recommendationController.cacheRecommendations);

module.exports = router;