/**
 * TajiCart-AI Recommendation Controller
 *
 * This controller handles recommendation-related operations and integrates
 * with the Python-based recommendation engine.
 */

const { getRecommender } = require('../recommendation/direct_recommender');

// Initialize recommender when server starts
let recommender = null;

/**
 * Initialize the recommendation service
 * Should be called when the server starts
 */
const initializeRecommender = async () => {
  try {
    if (!recommender) {
      console.log('Initializing recommendation service...');
      recommender = getRecommender();
      await recommender.initialize();
      console.log('Recommendation service initialized successfully');
    }
    return true;
  } catch (error) {
    console.error('Failed to initialize recommendation service:', error.message);
    return false;
  }
};

// Call initialize on server start
initializeRecommender();

/**
 * Get personalized recommendations for a user
 * @route GET /api/recommendations/user/:userId
 */
exports.getUserRecommendations = async (req, res) => {
  try {
    // Ensure recommender is initialized
    if (!recommender) {
      await initializeRecommender();
      if (!recommender) {
        return res.status(500).json({
          success: false,
          message: 'Recommendation service is not available',
        });
      }
    }

    const { userId } = req.params;
    const { n, category, excludePurchased, useCache } = req.query;

    // Prepare options for the recommender
    const options = {};
    if (n) options.n = parseInt(n);
    if (category) options.category = category;
    if (excludePurchased !== undefined) options.excludePurchased = excludePurchased === 'true';
    if (useCache !== undefined) options.useCache = useCache === 'true';

    // Get recommendations
    const result = await recommender.getUserRecommendations(userId, options);

    if (result.error) {
      return res.status(500).json({
        success: false,
        message: result.error,
        recommendations: [],
      });
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error getting recommendations:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to get recommendations',
      error: error.message,
    });
  }
};

/**
 * Get similar products to a given product
 * @route GET /api/recommendations/similar/:productId
 */
exports.getSimilarProducts = async (req, res) => {
  try {
    // Ensure recommender is initialized
    if (!recommender) {
      await initializeRecommender();
      if (!recommender) {
        return res.status(500).json({
          success: false,
          message: 'Recommendation service is not available',
        });
      }
    }

    const { productId } = req.params;
    const { n } = req.query;

    // Prepare options for the recommender
    const options = {};
    if (n) options.n = parseInt(n);

    // Get similar products
    const result = await recommender.getSimilarProducts(productId, options);

    if (result.error) {
      return res.status(500).json({
        success: false,
        message: result.error,
        similar_products: [],
      });
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error getting similar products:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to get similar products',
      error: error.message,
    });
  }
};

/**
 * Get budget-based recommendations
 * @route GET /api/recommendations/budget
 */
exports.getBudgetRecommendations = async (req, res) => {
  try {
    // Ensure recommender is initialized
    if (!recommender) {
      await initializeRecommender();
      if (!recommender) {
        return res.status(500).json({
          success: false,
          message: 'Recommendation service is not available',
        });
      }
    }

    const { userId, budget, category, n } = req.query;

    if (!budget) {
      return res.status(400).json({
        success: false,
        message: 'Budget parameter is required',
      });
    }

    // Prepare options for the recommender
    const options = {
      budget: parseFloat(budget),
    };

    if (userId) options.userId = userId;
    if (category) options.category = category;
    if (n) options.n = parseInt(n);

    // Get budget recommendations
    const result = await recommender.getBudgetRecommendations(options);

    if (result.error) {
      return res.status(500).json({
        success: false,
        message: result.error,
        recommendations: [],
      });
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error getting budget recommendations:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to get budget recommendations',
      error: error.message,
    });
  }
};

/**
 * Get popular products
 * @route GET /api/recommendations/popular
 */
exports.getPopularProducts = async (req, res) => {
  try {
    // Ensure recommender is initialized
    if (!recommender) {
      await initializeRecommender();
      if (!recommender) {
        return res.status(500).json({
          success: false,
          message: 'Recommendation service is not available',
        });
      }
    }

    const { n, category } = req.query;

    // Prepare options for the recommender
    const options = {};
    if (n) options.n = parseInt(n);
    if (category) options.category = category;

    // Get popular products
    const result = await recommender.getPopularProducts(options);

    if (result.error) {
      return res.status(500).json({
        success: false,
        message: result.error,
        popular_products: [],
      });
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error getting popular products:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to get popular products',
      error: error.message,
    });
  }
};

/**
 * Refresh the recommendation model (admin only)
 * @route POST /api/recommendations/admin/refresh-model
 */
exports.refreshModel = async (req, res) => {
  try {
    // Ensure recommender is initialized
    if (!recommender) {
      await initializeRecommender();
      if (!recommender) {
        return res.status(500).json({
          success: false,
          message: 'Recommendation service is not available',
        });
      }
    }

    // Refresh the model
    const result = await recommender.refreshModel();

    if (result.status === 'error') {
      return res.status(500).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Model refreshed successfully',
    });
  } catch (error) {
    console.error('Error refreshing model:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to refresh model',
      error: error.message,
    });
  }
};

/**
 * Cache recommendations for users (admin only)
 * @route POST /api/recommendations/admin/cache-recommendations
 */
exports.cacheRecommendations = async (req, res) => {
  try {
    // Ensure recommender is initialized
    if (!recommender) {
      await initializeRecommender();
      if (!recommender) {
        return res.status(500).json({
          success: false,
          message: 'Recommendation service is not available',
        });
      }
    }

    const { userIds, count } = req.body;

    // Cache recommendations
    const result = await recommender.cacheRecommendations({
      userIds,
      count: count ? parseInt(count) : undefined,
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error caching recommendations:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to cache recommendations',
      error: error.message,
    });
  }
};