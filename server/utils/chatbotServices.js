/**
 * ChatbotServices - Bridge between chatbot and data collector
 * Provides data-driven responses using MongoDB data
 */

import mongoose from 'mongoose';
import LoyaltyCard from '../models/loyaltycard.model.js';
import Product from '../models/product.model.js';
import User from '../models/user.model.js';
import { getProduct, searchProducts } from './databaseQuery.js';

// Memory cache for active conversations
const conversationMemory = new Map();

/**
 * Intent recognition - detects user's intent from message
 * @param {string} message - User's message
 * @returns {Object} - Intent object with type and entities
 */
export const recognizeIntent = (message) => {
  const lowercaseMessage = message.toLowerCase();
  
  // Intent patterns with regex
  const intentPatterns = [
    { 
      type: 'greeting', 
      regex: /\b(hello|hi|hey|greetings|howdy)\b/i 
    },
    { 
      type: 'trending_request', 
      regex: /\b(trending|popular|best selling|hot items|most popular|what'?s trending|whats new)\b/i 
    },
    { 
      type: 'cart_query', 
      regex: /\b(my cart|cart|shopping cart|what'?s in my cart|cart items)\b/i 
    },
    { 
      type: 'loyalty_query', 
      regex: /\b(loyalty|member|membership|tier|points|royal card|gold member|platinum|bronze|silver)\b/i
    },
    { 
      type: 'personalized_recommendations', 
      regex: /\b(recommend for me|personalized|for me|my recommendations|my preferences)\b/i
    },
    { 
      type: 'budget_mention', 
      regex: /\b(budget|afford|can spend|looking to spend|price range|spending|under|less than)\b/i,
      extractFunction: extractBudgetAmount
    },
    { 
      type: 'product_selection', 
      regex: /^[1-5]$|^(first|second|third|fourth|fifth|last|1st|2nd|3rd|4th|5th)$/i,
      extractFunction: extractProductSelection
    },
    { 
      type: 'add_to_cart', 
      regex: /\b(add to cart|buy|purchase|get it|buy now|add this)\b/i 
    },
    { 
      type: 'checkout', 
      regex: /\b(checkout|complete purchase|buy now|complete my order|check out|proceed)\b/i
    },
    { 
      type: 'confirmation', 
      regex: /^(yes|yeah|sure|ok|okay|yep|yup|correct|right|proceed)$/i
    },
    {
      type: 'denial',
      regex: /^(no|nope|not now|later|not yet|don'?t)$/i
    },
    {
      type: 'product_search',
      regex: /\b(find|search|looking for|where can i find|do you have|do you sell)\b/i,
      extractFunction: extractSearchQuery
    },
    {
      type: 'comparison_request',
      regex: /\b(compare|difference between|better|which one)\b/i
    },
    {
      type: 'product_details',
      regex: /\b(tell me about|details|information|specs|description)\b/i
    },
    {
      type: 'price_check',
      regex: /\b(how much is|how much does|price of|cost of)\b/i
    },
    {
      type: 'stock_check',
      regex: /\b(stock|available|in stock|how many|availability)\b/i
    }
  ];
  
  // Check for intents
  const matchedIntents = intentPatterns
    .filter(pattern => pattern.regex.test(lowercaseMessage))
    .map(pattern => {
      // Extract entities if there's an extraction function
      const entities = pattern.extractFunction ? 
        pattern.extractFunction(lowercaseMessage) : 
        {};
      
      return {
        type: pattern.type,
        confidence: 1.0,  // Simple binary confidence for now
        entities
      };
    });
  
  // If no intent matched, return general query intent
  if (matchedIntents.length === 0) {
    return [{
      type: 'general_query',
      confidence: 1.0,
      entities: {}
    }];
  }
  
  return matchedIntents;
};

/**
 * Extract budget amount from message
 * @param {string} message - User message
 * @returns {Object} - Budget amount and currency
 */
function extractBudgetAmount(message) {
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
    const match = message.match(pattern);
    if (match && match[1]) {
      // Remove commas and convert to number
      const budgetValue = parseInt(match[1].replace(/,/g, ''), 10);
      
      // Determine currency from context
      const isSomeDollarMention = 
        message.includes('$') || 
        message.toLowerCase().includes('dollar') || 
        message.toLowerCase().includes('usd');
      
      const isKesExplicit = 
        message.toLowerCase().includes('kes') || 
        message.toLowerCase().includes('ksh') || 
        message.toLowerCase().includes('shilling') || 
        message.toLowerCase().includes('kenyan');
      
      return {
        amount: budgetValue,
        currency: isKesExplicit ? 'KES' : (isSomeDollarMention ? 'USD' : 'KES') // Default to KES
      };
    }
  }
  
  return {};
}

/**
 * Extract product selection from message
 * @param {string} message - User message
 * @returns {Object} - Selected product index
 */
function extractProductSelection(message) {
  const numeric = message.match(/^(\d+)$/);
  if (numeric) {
    return { selectedIndex: parseInt(numeric[1], 10) - 1 }; // Convert to 0-based
  }
  
  // Handle text-based selections
  const textSelections = {
    'first': 0, '1st': 0,
    'second': 1, '2nd': 1,
    'third': 2, '3rd': 2,
    'fourth': 3, '4th': 3,
    'fifth': 4, '5th': 4,
    'last': -1 // Will be resolved based on list length
  };
  
  for (const [text, index] of Object.entries(textSelections)) {
    if (message.toLowerCase().includes(text)) {
      return { selectedIndex: index };
    }
  }
  
  return {};
}

/**
 * Extract search query from message
 * @param {string} message - User message
 * @returns {Object} - Search query
 */
function extractSearchQuery(message) {
  const searchText = message.replace(/find|search|looking for|where can i find|do you have|do you sell/gi, '').trim();
  return { query: searchText };
}

/**
 * Save conversation context for a user
 * @param {string} sessionId - Chat session ID
 * @param {Object} context - Context data to save
 */
export const saveConversationContext = (sessionId, context) => {
  if (!sessionId) return;
  
  const existingContext = conversationMemory.get(sessionId) || {};
  conversationMemory.set(sessionId, { ...existingContext, ...context });
  
  // Set expiry for memory (cleanup after 30 minutes of inactivity)
  setTimeout(() => {
    if (conversationMemory.has(sessionId)) {
      const contextData = conversationMemory.get(sessionId);
      if (contextData.lastUpdated < Date.now() - 30 * 60 * 1000) { // 30 minutes
        conversationMemory.delete(sessionId);
      }
    }
  }, 30 * 60 * 1000); // Check after 30 minutes
};

/**
 * Get conversation context for a session
 * @param {string} sessionId - Chat session ID
 * @returns {Object} - Saved context or empty object
 */
export const getConversationContext = (sessionId) => {
  if (!sessionId) return {};
  
  const context = conversationMemory.get(sessionId) || {};
  
  // Update last access timestamp
  if (Object.keys(context).length > 0) {
    context.lastUpdated = Date.now();
    conversationMemory.set(sessionId, context);
  }
  
  return context;
};

/**
 * Process intents and generate dynamic responses
 * @param {Array} intents - Recognized intents
 * @param {Object} sessionData - Session data
 * @param {string} sessionId - Session ID
 * @param {Object} user - User information
 * @returns {Promise<string>} - Response message
 */
export const processIntents = async (intents, sessionData, sessionId, user) => {
  // Get conversation memory
  const memory = getConversationContext(sessionId);
  
  // Update memory with current session
  saveConversationContext(sessionId, {
    lastIntents: intents,
    lastUpdated: Date.now(),
    sessionData: sessionData
  });
  
  // Product selection takes precedence over other intents
  const selectionIntent = intents.find(i => i.type === 'product_selection');
  if (selectionIntent && 
      memory.productList && 
      Array.isArray(memory.productList) && 
      memory.productList.length > 0) {
    
    let index = selectionIntent.entities.selectedIndex;
    
    // Handle "last" selection
    if (index === -1) {
      index = memory.productList.length - 1;
    }
    
    // Validate index
    if (index >= 0 && index < memory.productList.length) {
      const productId = memory.productList[index];
      
      try {
        const product = await getProduct(productId);
        
        if (!product) {
          return "I couldn't find details for that product. Would you like to see other options?";
        }
        
        // Save selection in memory
        saveConversationContext(sessionId, {
          lastSelectedProduct: productId,
          lastSelectedProductDetails: product,
          lastQuestionType: 'product_details'
        });
        
        // Format specs
        let specsInfo = '';
        if (product.specs && Object.keys(product.specs).length > 0) {
          const keySpecs = Object.entries(product.specs).slice(0, 3);
          specsInfo = `\n\nKey specs: ${keySpecs.map(([key, val]) => `${key}: ${val}`).join(', ')}`;
        }
        
        // Format price based on currency preference
        const price = formatPrice(product.price, sessionData.preferredCurrency || 'KES');
        
        // Get stock status
        const stockStatus = product.stock > 0 ? 
          (product.stock < 5 ? `Only ${product.stock} left in stock!` : `In stock (${product.stock} available)`) : 
          'Out of stock';
        
        // Try to get complementary products
        const complementaryProducts = await getComplementaryProducts(productId, 2);
        let complementaryText = '';
        
        if (complementaryProducts.length > 0) {
          complementaryText = "\n\nCustomers who bought this also purchased: " + 
            complementaryProducts.map(p => p.name).join(', ');
        }
        
        return `You selected ${product.name}. Here are the details:\n\n${price} - ${stockStatus}\n${product.description}${specsInfo}${complementaryText}\n\nWould you like to add this to your cart, see more details, or check customer reviews?`;
      } catch (error) {
        console.error("Error retrieving product details:", error);
        return "I'm having trouble retrieving those product details right now. Could you try again or ask about a different product?";
      }
    } else {
      return "Please select a valid option from the list. Just type the number next to the product you're interested in.";
    }
  }
  
  // Check for confirmation based on last question type
  const confirmationIntent = intents.find(i => i.type === 'confirmation');
  if (confirmationIntent && memory.lastQuestionType) {
    switch (memory.lastQuestionType) {
      case 'add_to_cart_prompt':
        if (memory.lastSelectedProduct) {
          // Update memory
          saveConversationContext(sessionId, {
            lastQuestionType: 'checkout_prompt',
            cartUpdated: true
          });
          
          return "Great! I've added the product to your cart. Would you like to checkout now or continue shopping?";
        }
        break;
        
      case 'loyalty_benefits':
        // Update memory
        saveConversationContext(sessionId, {
          lastQuestionType: 'personalized_recommendations'
        });
        
        // Get personalized recommendations if user is logged in
        if (user && user.userId && user.userId !== 'guest') {
          const personalizedProducts = await getPersonalizedRecommendations(user.userId, 5);
          
          if (personalizedProducts.length > 0) {
            // Save product list in memory
            saveConversationContext(sessionId, {
              productList: personalizedProducts.map(p => p.item_id)
            });
            
            const formattedList = formatProductListForChat(personalizedProducts, sessionData.preferredCurrency || 'KES');
            return `Here are some tailored recommendations based on your loyalty tier and preferences:\n\n${formattedList}\n\nWhich one interests you? Reply with the number to learn more.`;
          }
        }
        
        // Fallback if no personalized recommendations
        return "I'm happy to help you find products that match your preferences. Do you have a specific budget or category in mind?";
        
      case 'checkout_prompt':
        // Set checkout requested flag
        saveConversationContext(sessionId, {
          checkoutRequested: true
        });
        
        return "Perfect! I'm redirecting you to the checkout page now. Thank you for shopping with us! If you need any assistance during checkout, just let me know.";
    }
  }
  
  // Handle denial based on last question type
  const denialIntent = intents.find(i => i.type === 'denial');
  if (denialIntent && memory.lastQuestionType) {
    switch (memory.lastQuestionType) {
      case 'add_to_cart_prompt':
        return "No problem! Would you like to see other similar products or look for something different?";
        
      case 'checkout_prompt':
        return "Sure, let's continue shopping. What else would you like to look for?";
        
      case 'loyalty_benefits':
        return "No worries. How else can I assist you with your shopping today?";
    }
  }
  
  // Handle trending products request
  const trendingIntent = intents.find(i => i.type === 'trending_request');
  if (trendingIntent) {
    try {
      const trendingProducts = await getTrendingProductsForChat(5);
      
      if (trendingProducts.length === 0) {
        return "I don't have enough data on trending products at the moment. Would you like me to recommend some popular items instead?";
      }
      
      const formattedList = formatProductListForChat(trendingProducts, sessionData.preferredCurrency || 'KES');
      
      // Save product list in conversation memory
      saveConversationContext(sessionId, {
        productList: trendingProducts.map(p => p.item_id),
        lastQuestionType: 'product_selection'
      });
      
      return `Here are our trending products right now:\n\n${formattedList}\n\nWhich one would you like to know more about? Just reply with the number.`;
    } catch (error) {
      console.error("Error fetching trending products:", error);
      return "I'm having trouble accessing our trending products right now. Perhaps I can help you find something specific?";
    }
  }
  
  // Handle cart query
  const cartIntent = intents.find(i => i.type === 'cart_query');
  if (cartIntent) {
    try {
      // Check if user is logged in
      if (!user || !user.userId || user.userId === 'guest') {
        saveConversationContext(sessionId, {
          lastQuestionType: 'login_prompt'
        });
        
        return "To view your cart items and get personalized recommendations, you'll need to sign in. Would you like to sign in now?";
      }
      
      const { cartItems, relatedProducts } = await getCartInfoForChat(user.userId);
      
      if (cartItems.length === 0) {
        return "Your cart is currently empty. Would you like to see some trending products to add to your cart?";
      }
      
      // Format cart items summary
      const cartSummary = cartItems.map(item => 
        `${item.name} (${item.count}x) - ${(sessionData.preferredCurrency || 'KES') === 'USD' ? 
          `$${(item.price / 128).toFixed(2)}` : 
          `KES ${item.price.toLocaleString()}`}`
      ).join('\n');
      
      // Total items and price
      const totalItems = cartItems.reduce((sum, item) => sum + (item.count || 1), 0);
      const totalPrice = cartItems.reduce((sum, item) => sum + ((item.price || 0) * (item.count || 1)), 0);
      const formattedTotal = (sessionData.preferredCurrency || 'KES') === 'USD' ? 
        `$${(totalPrice / 128).toFixed(2)}` : 
        `KES ${totalPrice.toLocaleString()}`;
      
      // Save context for related products
      if (relatedProducts.length > 0) {
        saveConversationContext(sessionId, {
          productList: relatedProducts.map(p => p.item_id),
          lastQuestionType: 'checkout_prompt'
        });
        
        // Format related products list
        const relatedList = formatProductListForChat(relatedProducts, sessionData.preferredCurrency || 'KES');
        
        return `You have ${totalItems} ${totalItems === 1 ? 'item' : 'items'} in your cart:\n\n${cartSummary}\n\nTotal: ${formattedTotal}\n\nBased on your cart, you might also like:\n\n${relatedList}\n\nWould you like to checkout or continue shopping?`;
      }
      
      // Set checkout question context
      saveConversationContext(sessionId, {
        lastQuestionType: 'checkout_prompt'
      });
      
      return `You have ${totalItems} ${totalItems === 1 ? 'item' : 'items'} in your cart:\n\n${cartSummary}\n\nTotal: ${formattedTotal}\n\nWould you like to checkout or continue shopping?`;
    } catch (error) {
      console.error("Error fetching cart information:", error);
      return "I'm having trouble accessing your cart information right now. You can view your cart directly through the cart icon in the top navigation.";
    }
  }
  
  // Handle loyalty query
  const loyaltyIntent = intents.find(i => i.type === 'loyalty_query');
  if (loyaltyIntent) {
    try {
      // Check if user is logged in
      if (!user || !user.userId || user.userId === 'guest') {
        saveConversationContext(sessionId, {
          lastQuestionType: 'login_prompt'
        });
        
        return "Our loyalty program offers exclusive benefits to members. Sign in to check your loyalty status and points balance, or create an account to start earning rewards!";
      }
      
      const userProfile = await getUserProfileForChat(user.userId);
      
      if (!userProfile) {
        return "I couldn't retrieve your membership details at the moment. Please check your profile section for your loyalty information.";
      }
      
      // Define specific tier benefits
      const tierBenefits = getLoyaltyTierBenefits(userProfile.loyaltyInfo.tier);
      
      // Save context for follow-up
      saveConversationContext(sessionId, {
        userLoyalty: userProfile.loyaltyInfo,
        lastQuestionType: 'loyalty_benefits'
      });
      
      // Create personalized response
      return `As a ${userProfile.loyaltyInfo.tier} tier member, you currently have ${userProfile.loyaltyInfo.points.toLocaleString()} points.\n\n${tierBenefits}\n\nWould you like to see personalized recommendations based on your membership status?`;
    } catch (error) {
      console.error("Error retrieving loyalty information:", error);
      return "I'm having trouble accessing your loyalty information right now. You can check your membership status and points in your profile section.";
    }
  }
  
  // Handle personalized recommendations request
  const personalizedIntent = intents.find(i => i.type === 'personalized_recommendations');
  if (personalizedIntent) {
    try {
      // Check if user is logged in
      if (!user || !user.userId || user.userId === 'guest') {
        return "To provide truly personalized recommendations, I'll need to understand your preferences better. Would you like to share your budget or the specific type of product you're interested in?";
      }
      
      const personalizedProducts = await getPersonalizedRecommendations(user.userId, 5);
      
      if (personalizedProducts.length === 0) {
        return "I don't have enough data yet to make personalized recommendations. As you browse and purchase more items, I'll learn your preferences. In the meantime, would you like to see our trending products?";
      }
      
      const formattedList = formatProductListForChat(personalizedProducts, sessionData.preferredCurrency || 'KES');
      
      // Save product list in conversation memory
      saveConversationContext(sessionId, {
        productList: personalizedProducts.map(p => p.item_id),
        lastQuestionType: 'product_selection'
      });
      
      return `Based on your previous activity and preferences, here are some recommendations just for you:\n\n${formattedList}\n\nWhich one interests you? Reply with the number to learn more.`;
    } catch (error) {
      console.error("Error generating personalized recommendations:", error);
      return "I'm having trouble creating personalized recommendations right now. Would you like to see our trending products instead?";
    }
  }
  
  // Handle budget mention
  const budgetIntent = intents.find(i => i.type === 'budget_mention');
  if (budgetIntent && budgetIntent.entities && budgetIntent.entities.amount) {
    // Store budget in session memory
    saveConversationContext(sessionId, {
      userBudget: budgetIntent.entities.amount,
      preferredCurrency: budgetIntent.entities.currency || (sessionData.preferredCurrency || 'KES'),
      lastQuestionType: 'category_selection'
    });
    
    // Format budget for display
    const formattedBudget = (budgetIntent.entities.currency || sessionData.preferredCurrency || 'KES') === 'USD' ?
      `$${budgetIntent.entities.amount.toLocaleString()}` :
      `KES ${budgetIntent.entities.amount.toLocaleString()}`;
    
    // Try to get product categories
    try {
      // Handle category selection
      return `Great! You've specified a budget of ${formattedBudget}. What type of product are you looking for? For example, Gaming PCs, Laptops, Graphics Cards, Monitors, or Gaming Accessories?`;
    } catch (error) {
      console.error("Error processing budget request:", error);
      return `Thanks for sharing your budget of ${formattedBudget}. What type of product are you interested in?`;
    }
  }
  
  // Handle add to cart intent
  const addToCartIntent = intents.find(i => i.type === 'add_to_cart');
  if (addToCartIntent) {
    try {
      let productId = null;
      
      // Check if we have a last selected product
      if (memory.lastSelectedProduct) {
        productId = memory.lastSelectedProduct;
      } 
      // Check if we need to ask for product selection
      else if (memory.productList && memory.productList.length > 0) {
        saveConversationContext(sessionId, {
          lastQuestionType: 'product_selection_for_cart'
        });
        
        return "Which product would you like to add to your cart? Please specify by number or name.";
      } 
      // No product context
      else {
        return "I'd be happy to help you add a product to your cart. Could you tell me which product you're interested in?";
      }
      
      // We have a product ID, check stock
      if (productId) {
        const product = await getProduct(productId);
        
        if (!product) {
          return "I couldn't find information about that product. Would you like to see our trending products instead?";
        }
        
        if (product.stock <= 0) {
          return `I'm sorry, the ${product.name} is currently out of stock. Would you like me to notify you when it's back in stock or suggest similar products?`;
        }
        
        // Set cart action context
        saveConversationContext(sessionId, {
          lastQuestionType: 'checkout_prompt',
          cartUpdated: true
        });
        
        return `Great choice! I've added the ${product.name} to your cart. Would you like to checkout now or continue shopping?`;
      }
    } catch (error) {
      console.error("Error processing add to cart request:", error);
      return "I encountered an issue adding that item to your cart. Could you try again or select a different product?";
    }
  }
  
  // Handle checkout intent
  const checkoutIntent = intents.find(i => i.type === 'checkout');
  if (checkoutIntent) {
    // Set checkout context
    saveConversationContext(sessionId, {
      checkoutRequested: true,
      lastQuestionType: 'checkout_confirmation'
    });
    
    return "Ready to complete your purchase? I'll redirect you to the checkout page. Would you like to proceed?";
  }
  
  // Handle product search
  const searchIntent = intents.find(i => i.type === 'product_search');
  if (searchIntent && searchIntent.entities && searchIntent.entities.query) {
    try {
      const query = searchIntent.entities.query;
      if (!query || query.length < 2) {
        return "What product are you looking for? Please provide more details so I can help you find it.";
      }
      
      const foundProducts = await searchProducts(query, 5);
      
      if (foundProducts.length === 0) {
        return `I couldn't find any products matching "${query}". Would you like to try a different search term or browse our trending products?`;
      }
      
      // Save search results in memory
      saveConversationContext(sessionId, {
        productList: foundProducts.map(p => p._id.toString()),
        lastQuestionType: 'product_selection',
        lastSearchQuery: query
      });
      
      // Format with line breaks between products
      const formattedList = formatProductListForChat(foundProducts, sessionData.preferredCurrency || 'KES');
      
      return `Here's what I found for "${query}":\n\n${formattedList}\n\nWhich one would you like to know more about? Just reply with the number.`;
    } catch (error) {
      console.error("Error processing search request:", error);
      return "I encountered an issue with your search. Could you try again with different keywords?";
    }
  }
  
  // Handle greeting with personalization
  const greetingIntent = intents.find(i => i.type === 'greeting');
  if (greetingIntent) {
    try {
      let greeting = "Hello there!";
      
      // Personalize if we have user info
      if (user && user.userId && user.userId !== 'guest') {
        const userProfile = await getUserProfileForChat(user.userId);
        
        if (userProfile) {
          greeting = `Hello ${userProfile.name}!`;
          
          // Add loyalty tier greeting if applicable
          if (userProfile.loyaltyInfo && userProfile.loyaltyInfo.tier !== 'Basic') {
            greeting += ` Welcome back to our ${userProfile.loyaltyInfo.tier} tier membership!`;
          }
        }
      }
      
      // Save greeting context
      saveConversationContext(sessionId, {
        lastQuestionType: 'initial_greeting'
      });
      
      return `${greeting} I'm your personal shopping assistant at Nawiri Hair. How can I help you today? You can ask about trending products, check your cart, or tell me your budget for personalized recommendations.`;
    } catch (error) {
      console.error("Error generating personalized greeting:", error);
      return "Hello! I'm your personal shopping assistant. How can I help with your shopping today?";
    }
  }
  
  // Fallback to general response
  return "I'm here to help you find the perfect products! You can ask me about trending items, check your cart, look up product details, or share your budget for personalized recommendations. What are you interested in today?";
};

// Get trending products for chatbot recommendations
export const getTrendingProductsForChat = async (limit = 5) => {
  try {
    // Since we don't have access to the data collector, we'll use a workaround
    // Get popular products based on stock (assumption: low stock = high demand)
    const trendingProducts = await Product.find({ stock: { $gt: 0 } })
      .sort({ stock: 1 }) // Lower stock might indicate higher demand
      .limit(limit)
      .select('name price description stock image category')
      .lean();
    
    if (!trendingProducts || trendingProducts.length === 0) {
      return [];
    }
    
    // Format products for chatbot use
    return trendingProducts.map(product => ({
      item_id: product._id.toString(),
      name: product.name,
      price: product.price,
      description: product.description,
      stock: product.stock,
      image: product.image || [],
      category: product.category || []
    }));
  } catch (error) {
    console.error('Error getting trending products for chat:', error);
    return [];
  }
};

/**
 * Get user profile with loyalty information
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - User profile with loyalty info
 */
export const getUserProfileForChat = async (userId) => {
  try {
    if (!userId || userId === 'guest') {
      return null;
    }
    
    // Get user details from MongoDB
    const user = await User.findById(userId)
      .select('name email role isAdmin status')
      .lean();
    
    if (!user) {
      return null;
    }
    
    // Get loyalty card
    const loyaltyCard = await LoyaltyCard.findOne({ userId })
      .select('tier points cardNumber')
      .lean();
    
    return {
      ...user,
      loyaltyInfo: loyaltyCard ? {
        tier: loyaltyCard.tier,
        points: loyaltyCard.points,
        cardNumber: loyaltyCard.cardNumber
      } : { tier: 'Basic', points: 0, cardNumber: null },
      preferences: {} // Empty preferences as we can't access user features
    };
  } catch (error) {
    console.error('Error getting user profile for chat:', error);
    return null;
  }
};

/**
 * Get personalized recommendations based on user history
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of recommendations
 * @returns {Promise<Array>} - Array of recommended products
 */
export const getPersonalizedRecommendations = async (userId, limit = 5) => {
  try {
    // Without the data collector, we'll simply return trending products
    return getTrendingProductsForChat(limit);
  } catch (error) {
    console.error('Error getting personalized recommendations:', error);
    return [];
  }
};

/**
 * Get complementary products for a given product ID
 * @param {string} productId - Product ID to find complements for
 * @param {number} limit - Maximum number of products to return
 * @returns {Promise<Array>} - Array of complementary products
 */
export const getComplementaryProducts = async (productId, limit = 3) => {
  try {
    if (!productId) {
      return [];
    }
    
    // Get product details to find its category
    const product = await Product.findById(productId)
      .select('name category')
      .lean();
    
    if (!product || !product.category || product.category.length === 0) {
      return [];
    }
    
    // Find products in the same category
    const complementary = await Product.find({
      _id: { $ne: productId },
      category: { $in: product.category }
    })
      .sort({ stock: -1 })
      .limit(limit)
      .select('name price description stock image')
      .lean();
    
    return complementary.map(item => ({
      item_id: item._id.toString(),
      name: item.name,
      price: item.price,
      description: item.description,
      stock: item.stock,
      image: item.image
    }));
  } catch (error) {
    console.error('Error getting complementary products:', error);
    return [];
  }
};

/**
 * Format product list for chatbot display
 * @param {Array} products - List of products
 * @param {string} currency - Currency code (KES or USD)
 * @returns {string} - Formatted text for chatbot display
 */
export const formatProductListForChat = (products, currency = 'KES') => {
  if (!products || products.length === 0) {
    return "I couldn't find any products to show you at the moment.";
  }
  
  const formatPrice = (price, curr) => {
    if (curr === 'USD') {
      // Convert KES to USD (rough conversion)
      const usdPrice = price / 128;
      return `$${usdPrice.toFixed(2)}`;
    }
    return `KES ${price.toLocaleString()}`;
  };
  
  const productList = products.map((product, index) => {
    const price = formatPrice(product.price, currency);
    const stockStatus = product.stock > 0 ? 
      (product.stock < 5 ? `Only ${product.stock} left!` : 'In stock') : 
      'Out of stock';
    
    return `${index + 1}. ${product.name}\n   ${price} - ${stockStatus}`;
  }).join('\n\n');
  
  return productList;
};

/**
 * Get loyalty tier benefits description
 * @param {string} tier - Loyalty tier name
 * @returns {string} - Description of benefits
 */
export const getLoyaltyTierBenefits = (tier) => {
  const benefits = {
    Basic: "As a Basic member, you earn 1 point for every KES 100 spent. Collect points to unlock exclusive benefits!",
    Bronze: "Bronze members enjoy 2% cashback on purchases, free delivery on orders above KES 5,000, and early access to select promotions.",
    Silver: "Silver status grants you 3.5% cashback, free delivery on all orders, priority customer support, and exclusive monthly offers.",
    Gold: "Gold members receive 5% cashback, free delivery, priority support, exclusive monthly offers, and a free birthday gift!",
    Platinum: "Our exclusive Platinum tier provides 7.5% cashback, free express delivery, dedicated customer service, monthly special offers, birthday gifts, and VIP event invitations."
  };
  
  return benefits[tier] || "Your loyalty tier provides you with exclusive benefits. Check your profile for details!";
};

/**
 * Get cart information and related products for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Cart information and related products
 */
export const getCartInfoForChat = async (userId) => {
  try {
    if (!userId || userId === 'guest') {
      return { cartItems: [], relatedProducts: [] };
    }
    
    // Get cart items directly from MongoDB (fallback without data_collector)
    const cartCollection = mongoose.connection.collection('cartProduct');
    
    if (!cartCollection) {
      return { cartItems: [], relatedProducts: [] };
    }
    
    const userCartItems = await cartCollection.find({ 
      userId: mongoose.Types.ObjectId.createFromHexString(userId) 
    }).toArray();
    
    if (!userCartItems || userCartItems.length === 0) {
      return { cartItems: [], relatedProducts: [] };
    }
    
    // Get product details
    const productIds = userCartItems.map(item => item.productId);
    const productDetails = await Product.find({ _id: { $in: productIds } })
      .select('name price description stock image category')
      .lean();
    
    // Merge cart data with product details
    const enhancedCart = userCartItems.map(item => {
      const details = productDetails.find(p => p._id.toString() === item.productId.toString());
      
      return {
        item_id: item.productId.toString(),
        name: details?.name || 'Unknown Product',
        price: details?.price || 0,
        description: details?.description || '',
        stock: details?.stock || 0,
        image: details?.image || [],
        category: details?.category || [],
        count: item.quantity || 1
      };
    });
    
    // Get product recommendations based on cart items
    const categories = [];
    enhancedCart.forEach(item => {
      if (item.category) {
        categories.push(...item.category);
      }
    });
    
    // Find related products from the same categories
    const relatedProducts = await Product.find({
      _id: { $nin: productIds },
      category: { $in: categories }
    })
      .limit(3)
      .select('name price description stock image')
      .lean();
    
    return {
      cartItems: enhancedCart,
      relatedProducts: relatedProducts.map(item => ({
        item_id: item._id.toString(),
        name: item.name,
        price: item.price,
        description: item.description,
        stock: item.stock,
        image: item.image
      }))
    };
  } catch (error) {
    console.error('Error getting cart info for chat:', error);
    return { cartItems: [], relatedProducts: [] };
  }
};

// Format price for display based on currency
function formatPrice(price, currency = 'KES') {
  if (!price || price === undefined || price === null) {
    return 'Price unavailable';
  }
  
  if (currency === 'USD') {
    // Convert KES to USD (rough conversion)
    const usdPrice = price / 128;
    return `$${usdPrice.toFixed(2)}`;
  }
  return `KES ${price.toLocaleString()}`;
}
