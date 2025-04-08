// Local chatbot service that doesn't require external APIs
// This rule-based approach uses predefined patterns and responses

import {
  checkProductStock,
  getCategories,
  getProduct,
  getProductReviews,
  getProducts,
  getProductsByBudget,
  getPromotions,
  searchProducts
} from './databaseQuery.js';

/**
 * Find a response based on user input by matching keywords
 * @param {string} message - User input
 * @param {object} context - Optional context including user info, product data, etc.
 * @returns {string} The chatbot response
 */
export const generateResponse = async (message, context = {}) => {
  // Convert message to lowercase for easier matching
  const input = message.toLowerCase();
  
  // Extract any available context
  const { user, sessionData = {} } = context;
  
  // Set KES as default currency if not already set
  if (!sessionData.preferredCurrency) {
    sessionData.preferredCurrency = 'KES';
  }
  
  // Check for currency preference
  const usesKenyanShillings = input.includes('kenyan') || 
                             input.includes('shilling') || 
                             input.includes('kes') || 
                             sessionData.preferredCurrency === 'KES';
  
  // If user mentions Kenyan Shillings, store this preference
  if (usesKenyanShillings) {
    sessionData.preferredCurrency = 'KES';
  }
  
  // Greeting patterns
  if (containsAny(input, ['hello', 'hi', 'hey', 'greetings', 'howdy'])) {
    if (user && user.name) {
      return `Hello ${user.name}! How can I help you with your shopping today? Feel free to ask me about products or even share your budget, and I'll find options that work for you.`;
    }
    return "Hello there! Welcome to Taji Cart AI. I'm your personal shopping assistant. How can I help you today? If you have a specific budget in mind, I can recommend products that fit it perfectly.";
  }
  
  // Check if user was previously asked about product category with budget
  if (sessionData.needsCategorySelection && sessionData.pendingBudget) {
    // First, check if user responded with a number
    const numericChoice = parseInt(input.trim());
    
    if (!isNaN(numericChoice) && 
        sessionData.availableCategories && 
        numericChoice > 0 && 
        numericChoice <= sessionData.availableCategories.length) {
      
      try {
        // User selected a category by number
        const selectedCategory = sessionData.availableCategories[numericChoice - 1];
        console.log(`User selected category #${numericChoice}: "${selectedCategory}"`);
        
        // Store the selected category in session data
        sessionData.preferredCategory = selectedCategory;
        
        // Clear the pending flags
        delete sessionData.needsCategorySelection;
        
        // Add a loading message to the context to inform the user that we're searching
        const loadingResponse = `Searching for ${selectedCategory} that fit your budget of ${
          sessionData.preferredCurrency === 'KES' ? 
          `KES ${sessionData.pendingBudget.toLocaleString()}` : 
          `$${sessionData.pendingBudget.toLocaleString()}`
        }...`;
        
        // Now get product recommendations with the category and budget
        console.log(`Getting product recommendations for category "${selectedCategory}" with budget ${sessionData.pendingBudget}`);
        const recommendations = await getProductRecommendationsForBudget(
          sessionData.pendingBudget, 
          selectedCategory, 
          sessionData.preferredCurrency, 
          sessionData
        );
        
        return recommendations;
      } catch (error) {
        console.error('Error processing category selection:', error);
        return `I'm sorry, I encountered an issue while searching for products in that category. Please try again or select a different category.`;
      }
    }
    
    // If not a number, try to extract category from user's response
    let detectedCategory = null;
    
    // Category mapping
    const categoryMap = {
      'graphics': 'Graphics Cards', 
      'graphic': 'Graphics Cards',
      'gpu': 'Graphics Cards',
      'card': 'Graphics Cards',
      'pc': 'Gaming PCs',
      'desktop': 'Gaming PCs',
      'gaming pc': 'Gaming PCs',
      'computer': 'Gaming PCs',
      'laptop': 'Laptops',
      'notebook': 'Laptops',
      'monitor': 'Monitors',
      'display': 'Monitors',
      'screen': 'Monitors',
      'keyboard': 'Gaming Keyboards',
      'mouse': 'Peripherals',
      'mice': 'Peripherals',
      'headphone': 'Peripherals',
      'headset': 'Peripherals',
      'peripheral': 'Peripherals',
      'accessory': 'Peripherals',
      'accessories': 'Peripherals',
      'rgb': 'RGB Lighting Accessories',
      'lighting': 'RGB Lighting Accessories',
      'light': 'RGB Lighting Accessories',
      'chair': 'Gaming Chairs',
      'audio': 'Headsets & Audio',
      'controller': 'Controllers & Gamepads',
      'gamepad': 'Controllers & Gamepads'
    };
    
    // Check for category keywords in user response
    for (const [keyword, category] of Object.entries(categoryMap)) {
      if (input.includes(keyword)) {
        detectedCategory = category;
        break;
      }
    }
    
    if (detectedCategory) {
      // Save the detected category
      sessionData.preferredCategory = detectedCategory;
      // Clear the pending flags
      delete sessionData.needsCategorySelection;
      
      // Now get product recommendations with the category and budget
      return await getProductRecommendationsForBudget(
        sessionData.pendingBudget, 
        detectedCategory, 
        sessionData.preferredCurrency, 
        sessionData
      );
    } else {
      // Unable to detect a category, ask more explicitly
      return "I'm not sure which category you're interested in. Could you please specify if you're looking for Graphics Cards, Gaming PCs, Laptops, Monitors, Gaming Keyboards, RGB Lighting Accessories, Gaming Chairs, Headsets & Audio, or Controllers & Gamepads?";
    }
  }
  
  // Budget handling
  if (containsAny(input, ['budget', 'afford', 'can spend', 'looking to spend', 'price range', 'spending'])) {
    const budgetInfo = extractBudgetAmount(input);
    
    if (budgetInfo) {
      // Store the budget in the session for future reference
      sessionData.budget = budgetInfo.amount;
      
      // Update currency if explicitly mentioned in budget query
      if (budgetInfo.currency) {
        sessionData.preferredCurrency = budgetInfo.currency;
      }
      
      const budgetResponse = await handleBudgetRequest(budgetInfo.amount, sessionData);
      
      // If the function added recent product list info, keep it in sessionData
      if (sessionData.recentProductList && sessionData.recentProductList.length > 0) {
        context.sessionData.recentProductList = sessionData.recentProductList;
      }
      
      // Also preserve any pending budget/category flags
      if (sessionData.pendingBudget) {
        context.sessionData.pendingBudget = sessionData.pendingBudget;
      }
      if (sessionData.needsCategorySelection) {
        context.sessionData.needsCategorySelection = sessionData.needsCategorySelection;
      }
      if (sessionData.preferredCategory) {
        context.sessionData.preferredCategory = sessionData.preferredCategory;
      }
      
      return budgetResponse;
    }
  }
  
  // Check if user wants recommendations based on stored budget
  if (sessionData.budget && containsAny(input, ['recommend', 'suggest', 'show me', 'what can i get', 'options'])) {
    return await getProductRecommendationsForBudget(sessionData.budget, sessionData.preferredCategory, sessionData.preferredCurrency, sessionData);
  }
  
  // Product search functionality
  if (containsAny(input, ['find', 'search', 'looking for', 'where can i find', 'do you have', 'do you sell'])) {
    const searchQuery = input.replace(/find|search|looking for|where can i find|do you have|do you sell/gi, '').trim();
    
    if (searchQuery) {
      // Search directly in the database
      const foundProducts = await searchProducts(searchQuery, 5);
      
      if (foundProducts.length > 0) {
        // Format with line breaks between products
        const productDetails = foundProducts.map(p => {
          const price = formatPrice(p.price, sessionData.preferredCurrency);
          return `${p.name}\n(${price})${p.stock !== undefined ? ` - ${getStockStatusMessage(p.stock)}` : ''}`;
        }).join('\n\n');
        
        return `I found these products that match your search:\n\n${productDetails}\n\nWould you like more details about any of these?`;
      } else {
        return `I couldn't find any products matching "${searchQuery}". Can you try different keywords or let me know what kind of product you're looking for?`;
      }
    }
  }
  
  // Product details request - also handle numeric selections
  if (containsAny(input, ['tell me about', 'details', 'information', 'specs', 'description', 'the third product', 'third one', 'last one']) || 
      /^[1-3]$/.test(input.trim())) {
    let productName = extractProductName(input);
    let productIndex = -1;
    
    // Direct numeric selection
    if (/^[1-3]$/.test(input.trim())) {
      productIndex = parseInt(input.trim()) - 1;
    } 
    // Check for references to products by position (first, second, third, etc.)
    else if (input.includes('third') || input.includes('3rd') || input.includes('last one')) {
      productIndex = 2; // 0-based index, so 2 is the third product
    } else if (input.includes('second') || input.includes('2nd') || input.includes('middle one')) {
      productIndex = 1;
    } else if (input.includes('first') || input.includes('1st')) {
      productIndex = 0;
    }
    
    // If we identified a product by index and have recent product list in context
    if (productIndex >= 0 && sessionData.recentProductList && sessionData.recentProductList.length > productIndex) {
      const product = await getProduct(sessionData.recentProductList[productIndex]);
      
      if (product) {
        // Create a concise product description
        const stockStatus = getStockStatusMessage(product.stock);
        const price = formatPrice(product.price, sessionData.preferredCurrency);
        
        // Store product ID in session for follow-up questions
        if (product._id) {
          sessionData.lastProductViewed = product._id.toString();
        }

        // Format specs in a concise way if available
        let specsInfo = '';
        if (product.specs && Object.keys(product.specs).length > 0) {
          const keySpecs = Object.entries(product.specs).slice(0, 3);
          specsInfo = `\n\nKey specs: ${keySpecs.map(([key, val]) => `${key}: ${val}`).join(', ')}`;
        }
        
        // Return concise product info with interactive prompt
        return `${product.name}\n${price} - ${stockStatus}\n${truncateText(product.description, 100)}${specsInfo}\n\nWould you like to add this to your cart, see more specifications, or check customer reviews?`;
      }
    }
    
    // If we couldn't find by index, try to find by name
    if (productName) {
      // Query the product directly from the database
      const product = await getProduct({ name: productName });
      
      if (product) {
        // Create a concise product description
        const stockStatus = getStockStatusMessage(product.stock);
        const price = formatPrice(product.price, sessionData.preferredCurrency);
        
        // Store product ID in session for follow-up questions
        if (product._id) {
          sessionData.lastProductViewed = product._id.toString();
        }

        // Format specs in a concise way if available
        let specsInfo = '';
        if (product.specs && Object.keys(product.specs).length > 0) {
          const keySpecs = Object.entries(product.specs).slice(0, 3);
          specsInfo = `\n\nKey specs: ${keySpecs.map(([key, val]) => `${key}: ${val}`).join(', ')}`;
        }
        
        // Return concise product info with interactive prompt
        return `${product.name}\n${price} - ${stockStatus}\n${truncateText(product.description, 100)}${specsInfo}\n\nWould you like to add this to your cart, see more specifications, or check customer reviews?`;
      }
    }
  }

  // Price check - make more interactive
  if (containsAny(input, ['how much is', 'how much does', 'price of', 'cost of'])) {
    const productName = extractProductName(input);
    
    if (productName) {
      // Get real-time pricing from database
      const product = await getProduct({ name: productName });
      
      if (product) {
        const stockStatus = getStockStatusMessage(product.stock);
        const price = formatPrice(product.price, sessionData.preferredCurrency);
        return `The ${product.name} is priced at ${price} and is ${stockStatus}. Would you like to add this to your cart or see more details about this product?`;
      }
    }
  }

  // Stock check
  if (containsAny(input, ['stock', 'available', 'in stock', 'how many', 'availability'])) {
    // First check if we have a lastProductViewed to reference
    if (sessionData.lastProductViewed) {
      const stockInfo = await checkProductStock(sessionData.lastProductViewed);
      if (stockInfo.exists) {
        return getStockResponseFromInfo(stockInfo);
      }
    }
    
    // If no context, try to extract product name from query
    const productName = extractProductName(input);
    if (productName) {
      const product = await getProduct({ name: productName });
      if (product) {
        const stockInfo = await checkProductStock(product._id);
        return getStockResponseFromInfo(stockInfo);
      }
    }
  }
  
  // Additional personalized follow-up
  if (sessionData.lastProductViewed && 
      (containsAny(input, ['yes', 'sure', 'tell me more', 'more details', 'specifications', 'specs']) ||
       input.trim() === 'more')) {
    // Get full product details including reviews
    const product = await getProduct(sessionData.lastProductViewed);
    if (product) {
      // Get reviews
      const reviews = await getProductReviews(product._id, 2);
      
      // Provide more detailed information on follow-up
      let detailedSpecs = '';
      if (product.specs && Object.keys(product.specs).length > 0) {
        detailedSpecs = '\n\nSpecifications:\n' + Object.entries(product.specs)
          .map(([key, val]) => `• ${key}: ${val}`)
          .join('\n');
      }
      
      let additionalInfo = '';
      if (product.brand) {
        additionalInfo += `\nBrand: ${product.brand}`;
      }
      
      // Add review snippets if available
      let reviewsText = '';
      if (reviews && reviews.length > 0) {
        reviewsText = '\n\nCustomer Reviews:\n' + reviews.map(r => 
          `"${truncateText(r.comment, 100)}" - ${r.user?.name || 'Customer'} (${r.rating}/5)`
        ).join('\n');
      }
      
      const price = formatPrice(product.price, sessionData.preferredCurrency);
      return `Here's more about the ${product.name}:\n\nPrice: ${price}${additionalInfo}${detailedSpecs}${reviewsText}\n\nWould you like to add this to your cart?`;
    }
  }

  // Add to cart response - enhanced interaction
  if (sessionData.lastProductViewed && containsAny(input, ['add to cart', 'buy', 'purchase', 'get it', 'buy now', 'add this'])) {
    // Check real-time stock before suggesting add to cart
    const stockInfo = await checkProductStock(sessionData.lastProductViewed);
    
    if (stockInfo.exists) {
      if (stockInfo.inStock) {
        return `Great choice! I've added the ${stockInfo.name} to your cart. Would you like to checkout now, continue shopping, or see similar products that might interest you?`;
      } else {
        return `I'm sorry, the ${stockInfo.name} is currently out of stock. Would you like me to notify you when it's back in stock or suggest similar products instead?`;
      }
    }
  }
  
  // Product comparison
  if (containsAny(input, ['compare', 'difference between', 'better', 'which one'])) {
    if (sessionData.recentProductList && sessionData.recentProductList.length >= 2) {
      return "I can help you compare these products. What specific aspects are you interested in comparing? The price, performance, specifications, or customer ratings?";
    }
    return "I can help you compare products. Could you specify which items you'd like to compare?";
  }
  
  // Product recommendations - store products in session
  if (containsAny(input, ['recommend', 'suggest', 'best', 'top', 'popular'])) {
    // Try to determine the category they're interested in
    let category = null;
    
    if (containsAny(input, ['gpu', 'graphics card', 'rtx', 'nvidia', 'amd'])) category = 'Graphics Cards';
    else if (containsAny(input, ['pc', 'computer', 'desktop', 'gaming pc'])) category = 'Gaming PCs';
    else if (containsAny(input, ['laptop', 'gaming laptop', 'notebook'])) category = 'Laptops';
    else if (containsAny(input, ['monitor', 'display', 'screen'])) category = 'Monitors';
    else if (containsAny(input, ['keyboard', 'mouse', 'headset', 'peripheral'])) category = 'Peripherals';
    
    // Get popular products directly from database
    const filters = {};
    if (category) {
      filters.category = category;
    }
    
    const popularProducts = await getProducts(filters, 3);
    
    if (popularProducts.length > 0) {
      // Store product IDs in session for future reference
      sessionData.recentProductList = popularProducts.map(p => p._id.toString());
      
      // Format as a numbered list
      const productList = popularProducts.map((p, index) => {
        const price = formatPrice(p.price, sessionData.preferredCurrency);
        return `${index + 1}. ${p.name}\n   (${price})${p.stock !== undefined ? ` - ${getStockStatusMessage(p.stock)}` : ''}`;
      }).join('\n\n');
      
      if (category) {
        return `For ${category}, our top recommendations are:\n\n${productList}\n\nReply with the number (1, 2, or 3) to see more details about any of these products.`;
      } else {
        return `Our most popular gaming products include:\n\n${productList}\n\nWhich one would you like to learn more about? Just reply with the number.`;
      }
    }
    
    return "I'd be happy to recommend gaming equipment. Could you tell me what specific type of gaming gear you're looking for? Graphics cards, gaming PCs, laptops, monitors or peripherals?";
  }

  // Currency setting - only allow switching to USD, as KES is default
  if (containsAny(input, ['dollar', 'usd', 'us dollar'])) {
    sessionData.preferredCurrency = 'USD';
    return "I'll show all prices in US Dollars (USD). How can I help you with your shopping today?";
  }
  
  // Ensure user is aware we're using KES if they mention currency generally
  if (containsAny(input, ['currency', 'price', 'cost', 'pricing'])) {
    if (sessionData.preferredCurrency === 'KES') {
      return "I'm showing all prices in Kenyan Shillings (KES) by default. Let me know if you'd prefer US Dollars instead.";
    }
  }
  
  // Promotions and deals
  if (containsAny(input, ['promotion', 'deal', 'discount', 'offer', 'sale'])) {
    // Get active promotions from database
    const promotions = await getPromotions(true);
    
    if (promotions && promotions.length > 0) {
      const promoList = promotions.map(p => {
        // Format promotion details
        const endDate = new Date(p.endDate).toLocaleDateString();
        let productText = '';
        
        if (p.products && p.products.length > 0) {
          productText = `\nIncludes: ${p.products.slice(0, 3).map(prod => prod.name).join(', ')}`;
          if (p.products.length > 3) productText += ', and more';
        }
        
        return `${p.name} (${p.discountPercentage}% off)${productText}\nEnds: ${endDate}`;
      }).join('\n\n');
      
      return `Here are our current promotions and deals:\n\n${promoList}\n\nWould you like more details about any specific promotion?`;
    } else {
      return "We don't have any active promotions at the moment. Check back soon for our upcoming sales events!";
    }
  }
  
  // Handle checkout request
  if (containsAny(input, ['checkout', 'complete purchase', 'buy now', 'complete my order', 'check out'])) {
    return "Great! To complete your purchase, I'll redirect you to the checkout page. Would you like to proceed to checkout now or continue shopping?";
  }
  
  // Handle confirmation for checkout
  if (containsAny(input, ['proceed to checkout', 'go to checkout', 'complete purchase']) ||
      (sessionData.checkoutPrompted && containsAny(input, ['yes', 'proceed', 'ok', 'sure']))) {
    // Mark that we've prompted for checkout in session
    sessionData.checkoutRequested = true;
    return "Perfect! I'm redirecting you to the checkout page now. Thank you for shopping with us! If you need any assistance during checkout, just let me know.";
  }
  
  // Continue shopping flow
  if (containsAny(input, ['continue shopping', 'not ready to checkout', 'look for more'])) {
    return "No problem! What else would you like to shop for? You can tell me your budget or the type of product you're interested in.";
  }

  // Default response
  return "I'm your personal shopping assistant. Feel free to ask about specific products, share your budget, or let me know if you'd like recommendations. I can also add items to your cart directly from our chat - just let me know what you'd like to purchase!";
};

/**
 * Format price based on currency preference
 * @param {number} price - Price value (in KES from database)
 * @param {string} currency - Preferred currency code
 * @returns {string} - Formatted price string
 */
function formatPrice(price, currency = 'KES') {
  if (price === undefined || price === null) {
    return 'Price varies';
  }
  
  // Current rough conversion rate
  const CONVERSION_RATE = 128; // 1 USD = ~128 KES
  
  // DEBUG LOG
  console.log(`Formatting price: ${price} KES to ${currency}`);
  
  if (currency === 'USD') {
    // Convert KES to USD since database stores in KES
    const usdPrice = price / CONVERSION_RATE;
    return `$${usdPrice.toFixed(2).toLocaleString()}`;
  } else {
    // Already in KES, just format it
    return `KES ${price.toLocaleString()}`;
  }
}

/**
 * Handle a budget-related request
 * @param {number} budget - User's specified budget
 * @param {Object} sessionData - Current session data
 * @returns {string} - Response message
 */
async function handleBudgetRequest(budget, sessionData = {}) {
  // Check if we already have a preferred category
  let preferredCategory = null;
  
  if (sessionData.preferredCategory) {
    preferredCategory = sessionData.preferredCategory;
  } else if (sessionData.input) {
    // Try to extract category mention from input
    const categoryMentions = {
      'graphics card': 'Graphics Cards',
      'gpu': 'Graphics Cards',
      'card': 'Graphics Cards',
      'pc': 'Gaming PCs',
      'computer': 'Gaming PCs',
      'desktop': 'Gaming PCs',
      'laptop': 'Laptops',
      'notebook': 'Laptops',
      'monitor': 'Monitors',
      'display': 'Monitors',
      'keyboard': 'Gaming Keyboards',
      'mouse': 'Peripherals',
      'headset': 'Peripherals',
      'headphone': 'Peripherals',
      'rgb': 'RGB Lighting Accessories',
      'lighting': 'RGB Lighting Accessories',
      'light': 'RGB Lighting Accessories',
      'chair': 'Gaming Chairs',
      'audio': 'Headsets & Audio',
      'controller': 'Controllers & Gamepads',
      'gamepad': 'Controllers & Gamepads'
    };
    
    // Extract category preference from input
    for (const [keyword, category] of Object.entries(categoryMentions)) {
      if (sessionData.input.toLowerCase().includes(keyword)) {
        preferredCategory = category;
        break;
      }
    }
  }
  
  // If no category was mentioned, ask the user about categories
  if (!preferredCategory) {
    try {
      // Store the budget for later use
      sessionData.pendingBudget = budget;
      sessionData.needsCategorySelection = true;
      
      // Get available categories from database - fetch all to ensure we get the complete list
      const categories = await getCategories();
      const formattedBudget = sessionData.preferredCurrency === 'KES' ? 
        `KES ${budget.toLocaleString()}` : 
        `$${budget.toLocaleString()}`;

      let categoryOptions = '';
      if (categories && categories.length > 0) {
        // Sort categories to ensure consistent ordering
        const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name));
        
        // Store all available categories in session for later reference
        sessionData.availableCategories = sortedCategories.map(cat => cat.name);
        
        // Format category options as a numbered list - now with ALL categories
        categoryOptions = sortedCategories.map((cat, index) => 
          `${index + 1}. ${cat.name}`
        ).join('\n');
        
        return `Great! You have a budget of ${formattedBudget}. What type of product are you looking for? Just reply with the number:\n\n${categoryOptions}\n\nOr type the name of any category you're interested in.`;
      } else {
        // Fallback if categories can't be retrieved - now including all your mentioned categories
        const defaultCategories = [
          'Graphics Cards', 'Gaming PCs', 'Laptops', 
          'Monitors', 'Gaming Keyboards', 'Peripherals', 
          'RGB Lighting Accessories', 'Gaming Chairs',
          'Headsets & Audio', 'Controllers & Gamepads'
        ];
        
        sessionData.availableCategories = defaultCategories;
        
        categoryOptions = defaultCategories.map((cat, index) => 
          `${index + 1}. ${cat}`
        ).join('\n');
        
        return `Thanks for sharing your budget of ${formattedBudget}. What are you looking for? Reply with the number:\n\n${categoryOptions}`;
      }
    } catch (error) {
      console.error('Error handling budget request:', error);
      return `I noticed you've shared your budget, but I'm having trouble accessing our product categories right now. Could you please specify what type of gaming product you're looking for?`;
    }
  }
  
  // If we have a category, proceed with recommendations
  try {
    return await getProductRecommendationsForBudget(budget, preferredCategory, sessionData.preferredCurrency, sessionData);
  } catch (error) {
    console.error('Error getting recommendations for budget and category:', error);
    return `I'm sorry, I encountered an issue while searching for ${preferredCategory} within your budget. Please try again or specify a different category.`;
  }
}

/**
 * Get product recommendations based on budget
 * @param {number} budget - User's budget
 * @param {string|null} category - Preferred category (optional)
 * @param {string} currency - Preferred currency code
 * @param {Object} contextData - Context data for storing results
 * @returns {string} - Recommendation message
 */
async function getProductRecommendationsForBudget(budget, category = null, currency = 'KES', contextData = null) {
  // Debug log for budget conversion 
  console.log(`Budget query: ${currency} ${budget} for category: ${category || 'Any'}`);
  
  try {
    // Try to find matching products within budget
    const budgetProducts = await getProductsByBudget(budget, category, currency);
    
    // Debug log for results
    console.log(`Found ${budgetProducts?.length || 0} products for budget ${currency} ${budget} in category "${category || 'Any'}"`);
    
    if (!budgetProducts || budgetProducts.length === 0) {
      // No products found at this budget level for this category
      return `I couldn't find any ${category || 'products'} within your budget of ${
        currency === 'KES' ? `KES ${budget.toLocaleString()}` : `$${budget.toLocaleString()}`
      }. Would you like to explore options in other categories or consider a slightly higher budget?`;
    }
    
    // We found products within budget - show recommendations
    const topRecs = budgetProducts.slice(0, 3);
    
    // Store product IDs in context data for future reference
    const productIds = topRecs.map(p => p._id.toString());
    if (contextData) {
      contextData.recentProductList = productIds;
    }
    
    // Format products as a numbered list
    const productList = topRecs.map((p, index) => {
      const price = formatPrice(p.price, currency);
      return `${index + 1}. ${p.name}\n   (${price})${p.stock !== undefined ? ` - ${getStockStatusMessage(p.stock)}` : ''}`;
    }).join('\n\n');
    
    const categoryText = category ? ` in the ${category} category` : '';
    const formattedBudget = currency === 'KES' ? `KES ${budget.toLocaleString()}` : `$${budget.toLocaleString()}`;
    
    return `Based on your budget of ${formattedBudget}${categoryText}, here are some great options:\n\n${productList}\n\nWhich one interests you the most? Reply with the number (1, 2, or 3) to see more details, or ask me anything about these products.`;
  } catch (error) {
    console.error('Error getting product recommendations:', error);
    return `I'm sorry, I encountered an error while searching for products that match your budget. Please try again or specify a different category.`;
  }
}

/**
 * Suggest related categories that have products within budget
 * @param {string} currentCategory - Current category that had no results
 * @param {number} budget - User's budget
 * @param {string} currency - Preferred currency
 * @returns {Promise<Array>} - Array of related category names
 */
async function suggestRelatedCategories(currentCategory, budget, currency) {
  try {
    // Get all categories
    const allCategories = await getCategories();
    if (!allCategories || allCategories.length === 0) return [];
    
    const relatedCategories = [];
    const categoryNames = allCategories.map(c => c.name);
    
    // For each category, check if it has products within budget
    for (const categoryName of categoryNames) {
      // Skip the current category
      if (categoryName === currentCategory) continue;
      
      // Check if this category has products within budget
      const productsInCategory = await getProductsByBudget(budget, categoryName, currency);
      if (productsInCategory && productsInCategory.length > 0) {
        relatedCategories.push(categoryName);
      }
      
      // Limit to 5 related categories
      if (relatedCategories.length >= 5) break;
    }
    
    return relatedCategories;
  } catch (error) {
    console.error('Error suggesting related categories:', error);
    return [];
  }
}

/**
 * Extract budget amount from user input
 * @param {string} input - User input text
 * @returns {Object|null} - Extracted budget amount and currency or null
 */
function extractBudgetAmount(input) {
  // Common patterns for budget mentions with currency
  const patterns = [
    /my budget is [\$]?(\d+[\d,]*)/i,
    /budget of [\$]?(\d+[\d,]*)/i,
    /can spend [\$]?(\d+[\d,]*)/i,
    /looking to spend [\$]?(\d+[\d,]*)/i,
    /around [\$]?(\d+[\d,]*)/i,
    /about [\$]?(\d+[\d,]*)/i,
    /up to [\$]?(\d+[\d,]*)/i,
    /maximum [\$]?(\d+[\d,]*)/i,
    /less than [\$]?(\d+[\d,]*)/i,
    /under [\$]?(\d+[\d,]*)/i,
    /\$(\d+[\d,]*)/,
    /kes\s+(\d+[\d,]*)/i,
    /ksh\s+(\d+[\d,]*)/i,
    /shillings\s+(\d+[\d,]*)/i
  ];
  
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match && match[1]) {
      // Remove commas and convert to number
      const budgetValue = parseInt(match[1].replace(/,/g, ''), 10);
      
      // Determine currency from context
      const isSomeDollarMention = 
        input.includes('$') || 
        input.toLowerCase().includes('dollar') || 
        input.toLowerCase().includes('usd');
      
      const isKesExplicit = 
        input.toLowerCase().includes('kes') || 
        input.toLowerCase().includes('ksh') || 
        input.toLowerCase().includes('shilling') || 
        input.toLowerCase().includes('kenyan');
      
      return {
        amount: budgetValue,
        currency: isKesExplicit ? 'KES' : (isSomeDollarMention ? 'USD' : 'KES') // Default to KES
      };
    }
  }
  
  return null;
}

/**
 * Check if the input string contains any of the keywords
 * @param {string} input - Input string to check
 * @param {array} keywords - Array of keywords to match
 * @returns {boolean} True if any keyword is found
 */
function containsAny(input, keywords) {
  return keywords.some(keyword => input.includes(keyword));
}

/**
 * Truncate text to a specified length and add ellipsis if needed
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} - Truncated text
 */
function truncateText(text, maxLength) {
  if (!text) return "No description available.";
  
  // If text is already shorter than max length, return it as is
  if (text.length <= maxLength) return text;
  
  // Find the last space before the maxLength to avoid cutting words
  const lastSpace = text.substring(0, maxLength).lastIndexOf(' ');
  const truncatedText = text.substring(0, lastSpace > 0 ? lastSpace : maxLength);
  
  return truncatedText + '...';
}

/**
 * Extract a product name from user input
 * @param {string} input - User input text
 * @returns {string|null} - Extracted product name or null
 */
function extractProductName(input) {
  // Common patterns for product inquiries
  const patterns = [
    /tell me about (the )?(.+)/i,
    /details (on|about|for) (the )?(.+)/i,
    /information (on|about) (the )?(.+)/i,
    /how much (is|does) (the )?(.+) cost/i,
    /price of (the )?(.+)/i,
    /cost of (the )?(.+)/i
  ];
  
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      // The last capture group should contain the product name
      return match[match.length - 1].trim();
    }
  }
  
  return null;
}

/**
 * Get an appropriate stock status message based on stock level
 * @param {number} stockLevel - Current stock level
 * @returns {string} - Stock status message
 */
function getStockStatusMessage(stockLevel) {
  if (stockLevel === undefined || stockLevel === null) {
    return "stock status unknown";
  }
  
  if (stockLevel <= 0) {
    return "out of stock";
  } else if (stockLevel < 5) {
    return `low stock (only ${stockLevel} left)`;
  } else if (stockLevel < 20) {
    return `limited stock (${stockLevel} available)`;
  } else {
    return `in stock (${stockLevel} available)`;
  }
}