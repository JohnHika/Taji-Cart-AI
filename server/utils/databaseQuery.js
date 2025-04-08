import Category from '../models/category.model.js';
import Product from '../models/product.model.js';

// Import models with try/catch to handle missing models
let Review, Promotion, Order;
try {
  Review = (await import('../models/review.model.js')).default;
} catch (error) {
  console.warn('Review model not available:', error.message);
}

try {
  Promotion = (await import('../models/promotion.model.js')).default;
} catch (error) {
  console.warn('Promotion model not available:', error.message);
}

try {
  Order = (await import('../models/order.model.js')).default;
} catch (error) {
  console.warn('Order model not available:', error.message);
}

/**
 * Get real-time product data with optional filters
 * @param {Object} filters - Query filters (optional)
 * @param {Number} limit - Maximum number of results to return
 * @returns {Promise<Array>} - Array of product documents
 */
export const getProducts = async (filters = {}, limit = 50) => {
  try {
    // Build query from filters
    const query = {};
    
    // Add name search if provided
    if (filters.name) {
      query.name = { $regex: filters.name, $options: 'i' };
    }
    
    // Add category filter if provided
    if (filters.category) {
      // First find the category
      const category = await Category.findOne({ 
        name: { $regex: filters.category, $options: 'i' } 
      });
      
      if (category) {
        query.category = category._id;
      }
    }
    
    // Add price range filter if provided
    if (filters.minPrice !== undefined) {
      query.price = { ...query.price, $gte: filters.minPrice };
    }
    
    if (filters.maxPrice !== undefined) {
      query.price = { ...query.price, $lte: filters.maxPrice };
    }
    
    // Add stock filter if provided
    if (filters.inStock) {
      query.stock = { $gt: 0 };
    }
    
    // Execute query with population
    const products = await Product.find(query)
      .populate('category', 'name')
      .sort({ soldCount: -1 })
      .limit(limit);
      
    return products;
  } catch (error) {
    console.error('Database query error:', error);
    return [];
  }
};

/**
 * Get single product by ID or search for it by name
 * @param {String|Object} identifier - Product ID or search object
 * @returns {Promise<Object|null>} - Product document or null
 */
export const getProduct = async (identifier) => {
  try {
    let product = null;
    
    if (typeof identifier === 'string') {
      // If it's a string, try to find by ID
      product = await Product.findById(identifier).populate('category', 'name');
    } else if (typeof identifier === 'object' && identifier.name) {
      // If it's an object with name, search by name
      product = await Product.findOne({ 
        name: { $regex: identifier.name, $options: 'i' } 
      }).populate('category', 'name');
    }
    
    return product;
  } catch (error) {
    console.error('Database query error:', error);
    return null;
  }
};

/**
 * Get all categories or search for categories
 * @param {String} search - Optional search term
 * @returns {Promise<Array>} - Array of category documents
 */
export const getCategories = async (search = null) => {
  try {
    let query = {};
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    const categories = await Category.find(query).sort({ name: 1 });
    
    // Log available categories for debugging
    if (!search) {
      console.log('Available categories:', categories.map(c => c.name).join(', '));
    }
    
    return categories;
  } catch (error) {
    console.error('Database query error:', error);
    return [];
  }
};

/**
 * Get current promotions and deals
 * @param {Boolean} activeOnly - Whether to return only active promotions
 * @returns {Promise<Array>} - Array of promotion documents
 */
export const getPromotions = async (activeOnly = true) => {
  try {
    // Check if Promotion model is available
    if (!Promotion) {
      console.warn('Promotion model not available');
      return [];
    }
    
    let query = {};
    
    if (activeOnly) {
      const now = new Date();
      query = {
        startDate: { $lte: now },
        endDate: { $gte: now }
      };
    }
    
    const promotions = await Promotion.find(query)
      .populate('products', 'name price')
      .sort({ endDate: 1 });
      
    return promotions;
  } catch (error) {
    console.error('Database query error:', error);
    return [];
  }
};

/**
 * Get product reviews
 * @param {String} productId - Product ID
 * @param {Number} limit - Maximum number of reviews to return
 * @returns {Promise<Array>} - Array of review documents
 */
export const getProductReviews = async (productId, limit = 5) => {
  try {
    // Check if Review model is available
    if (!Review) {
      console.warn('Review model not available');
      return [];
    }
    
    const reviews = await Review.find({ product: productId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('user', 'name');
      
    return reviews;
  } catch (error) {
    console.error('Database query error:', error);
    return [];
  }
};

/**
 * Check if a product is in stock
 * @param {String} productId - Product ID
 * @returns {Promise<Object>} - Stock information
 */
export const checkProductStock = async (productId) => {
  try {
    const product = await Product.findById(productId).select('name stock');
    
    if (!product) {
      return { exists: false, inStock: false, stock: 0 };
    }
    
    return {
      exists: true,
      inStock: product.stock > 0,
      stock: product.stock,
      name: product.name
    };
  } catch (error) {
    console.error('Database query error:', error);
    return { exists: false, inStock: false, stock: 0, error: true };
  }
};

/**
 * Search products by keywords
 * @param {String} searchQuery - Search query
 * @param {Number} limit - Maximum number of results
 * @returns {Promise<Array>} - Array of matching products
 */
export const searchProducts = async (searchQuery, limit = 10) => {
  try {
    // Split the search query into keywords
    const keywords = searchQuery.split(' ')
      .filter(word => word.length > 2)
      .map(word => new RegExp(word, 'i'));
    
    // If no valid keywords, return empty array
    if (keywords.length === 0) {
      return [];
    }
    
    // Create a query to search in name, description, and tags
    const query = {
      $or: [
        { name: { $in: keywords.map(k => ({ $regex: k })) } },
        { description: { $in: keywords.map(k => ({ $regex: k })) } },
        { tags: { $in: keywords.map(k => ({ $regex: k })) } }
      ]
    };
    
    // Execute the search
    const products = await Product.find(query)
      .populate('category', 'name')
      .limit(limit);
      
    return products;
  } catch (error) {
    console.error('Database search error:', error);
    return [];
  }
};

/**
 * Get products by budget range
 * @param {Number} budget - Maximum budget
 * @param {String} categoryName - Optional category name
 * @param {String} currency - Currency code (USD or KES)
 * @returns {Promise<Array>} - Array of products within budget
 */
export const getProductsByBudget = async (budget, categoryName = null, currency = 'KES') => {
  try {
    // Database already stores prices in KES, so no conversion needed for KES
    let maxPrice = budget;
    
    // If currency is USD, convert to KES since database stores in KES
    if (currency === 'USD') {
      // Convert USD to KES for database query
      maxPrice = budget * 128;
      console.log(`Converting budget from ${currency} ${budget} to KES ${maxPrice.toFixed(2)}`);
    }
    
    // Create query using the price (already in KES or converted to KES)
    const query = {
      price: { $lte: maxPrice * 1.1 } // Allow 10% above budget for options
    };
    
    // Add category filter if provided - more flexible matching using regex
    if (categoryName) {
      console.log(`Searching for category: "${categoryName}"`);
      
      // First try exact match (case-sensitive)
      let category = await Category.findOne({ 
        name: categoryName
      });
      
      // If not found, try case-insensitive exact match
      if (!category) {
        category = await Category.findOne({ 
          name: { $regex: new RegExp(`^${categoryName}$`, 'i') }
        });
      }
      
      // If still not found, try case-insensitive partial match
      if (!category) {
        // Special handling for "Graphics Cards" which might be stored as "Graphics Cards" or just "Graphics"
        if (categoryName.toLowerCase().includes('graphics')) {
          category = await Category.findOne({
            name: { $regex: 'graphics', $options: 'i' }
          });
        } else {
          category = await Category.findOne({ 
            name: { $regex: categoryName, $options: 'i' } 
          });
        }
      }
      
      // Log category search results for debugging
      console.log(`Category search for "${categoryName}" result:`, category ? category.name : 'Not found');
      
      if (category) {
        console.log(`Found category: "${category.name}" with ID: ${category._id}`);
        query.category = category._id;
      } else {
        // If category not found, check for partial matches in category name
        console.log(`No exact category match found, trying partial matches...`);
        
        // If the category name has multiple words, try matching on first word
        const firstWord = categoryName.split(' ')[0];
        console.log(`Trying partial match with first word: "${firstWord}"`);
        
        const partialMatches = await Category.find({
          name: { $regex: firstWord, $options: 'i' }
        });
        
        if (partialMatches.length > 0) {
          // If we have multiple partial matches, use all of them as OR condition
          query.category = { $in: partialMatches.map(c => c._id) };
          console.log(`Found ${partialMatches.length} partial category matches:`, 
            partialMatches.map(c => c.name).join(', '));
        } else {
          // No category match found - try ONE MORE attempt with a more flexible match
          // This should handle cases like "Graphics Card" vs "Graphics Cards"
          const similarCategories = await Category.find({});
          console.log(`Checking all ${similarCategories.length} categories for similarity...`);
          
          // Log all available categories for debugging
          console.log('Available categories:', similarCategories.map(c => c.name).join(', '));
          
          const potentialMatch = similarCategories.find(c => 
            c.name.toLowerCase().includes(categoryName.toLowerCase()) || 
            categoryName.toLowerCase().includes(c.name.toLowerCase())
          );
          
          if (potentialMatch) {
            console.log(`Found potential match: "${potentialMatch.name}"`);
            query.category = potentialMatch._id;
          } else {
            // Really no category match found - return empty array
            console.log(`No category match found for "${categoryName}" after all attempts`);
            return []; 
          }
        }
      }
    }
    
    console.log(`Executing budget query with filters:`, JSON.stringify(query, null, 2));
    
    // Get products within budget, sort by price (best value first)
    const products = await Product.find(query)
      .populate('category', 'name')
      .sort({ price: -1 })
      .limit(10);
    
    // Debug logging - print actual prices for debugging
    console.log(`Budget query results: ${products.length} products found`);
    if (products.length > 0) {
      console.log("Sample prices (KES):");
      products.slice(0, 3).forEach(p => {
        console.log(`- ${p.name}: KES ${p.price} (Category: ${p.category?.name || 'Unknown'})`);
      });
    } else {
      // If no products found, check if the category exists but has no products in budget
      if (query.category) {
        const categoryCheck = await Category.findById(
          query.category.$in ? query.category.$in[0] : query.category
        );
        
        if (categoryCheck) {
          console.log(`Category "${categoryCheck.name}" exists but no products found within budget ${currency} ${budget}`);
          
          // Check for any products in this category regardless of price
          const anyProducts = await Product.find({ 
            category: query.category 
          }).limit(1);
          
          if (anyProducts.length === 0) {
            console.log(`Category "${categoryCheck.name}" has no products at all`);
          } else {
            console.log(`Category "${categoryCheck.name}" has products, but none within budget`);
            
            // Get cheapest product in this category
            const cheapestProduct = await Product.find({ 
              category: query.category 
            })
            .sort({ price: 1 })
            .limit(1);
            
            if (cheapestProduct.length > 0) {
              console.log(`Cheapest product in category: ${cheapestProduct[0].name} at KES ${cheapestProduct[0].price}`);
            }
          }
        }
      }
    }
    
    return products;
  } catch (error) {
    console.error('Budget query error:', error);
    return [];
  }
};
