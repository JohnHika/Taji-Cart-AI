import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import Category from '../models/category.model.js';
import ChatSession from '../models/chat.model.js';
import Product from '../models/product.model.js';
import User from '../models/user.model.js';
import { generateResponse } from '../utils/localChatbot.js';
// Remove Deepgram import and add Whisper
import { transcribeAudioWithWhisper } from '../utils/whisperTranscription.js';
// Import ffmpeg packages
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { spawn } from 'child_process';
import ffprobeStatic from 'ffprobe-static';
import ffmpeg from 'fluent-ffmpeg';

// Set ffmpeg binary path explicitly
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Cache popular products and categories for quick reference
let productCache = null;
let categoryCache = null;
let lastCacheUpdate = null;

// Refresh cache every hour
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

// Auto-close inactive sessions after 48 hours
const INACTIVE_SESSION_THRESHOLD = 48 * 60 * 60 * 1000; // 48 hours in milliseconds

// Configure multer for file uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed!'), false);
    }
  }
});

// Function to auto-close inactive chat sessions
export const closeInactiveSessions = async () => {
  try {
    const cutoffDate = new Date(Date.now() - INACTIVE_SESSION_THRESHOLD);
    
    const result = await ChatSession.updateMany(
      { isActive: true, lastActive: { $lt: cutoffDate } },
      { isActive: false }
    );
    
    console.log(`Auto-closed ${result.modifiedCount} inactive chat sessions`);
    return result.modifiedCount;
  } catch (error) {
    console.error('Error closing inactive chat sessions:', error);
    throw error;
  }
};

// Refresh the cache with current products and categories
const refreshCache = async () => {
  try {
    // Get all products with relevant fields for the chatbot
    const products = await Product.find({})
      .populate('category', 'name')
      .sort({ soldCount: -1 })
      .select('name price description tags category subcategory stock brand specs');
    
    // Get all categories
    const categories = await Category.find({});
    
    productCache = products;
    categoryCache = categories;
    lastCacheUpdate = Date.now();
    console.log('Chatbot cache refreshed successfully');
  } catch (error) {
    console.error('Error refreshing chatbot cache:', error);
  }
};

// Get cached product and category data
const getCacheData = async () => {
  // Initialize or refresh cache if needed
  if (!productCache || !categoryCache || !lastCacheUpdate || (Date.now() - lastCacheUpdate > CACHE_TTL)) {
    await refreshCache();
  }
  return {
    products: productCache,
    categories: categoryCache
  };
};

// Get user information for personalization
const getUserInfo = async (userId) => {
  if (!userId || userId === 'guest') return null;
  
  try {
    const user = await User.findById(userId).select('name email orderHistory');
    return user ? { name: user.name } : null;
  } catch (error) {
    console.error('Error getting user info for chatbot:', error);
    return null;
  }
};

/**
 * Process a message from the chat interface
 * @param {Object} req - Request object with message and userId
 * @param {Object} res - Response object
 */
export const processMessage = async (req, res) => {
  try {
    const { message, userId, sessionId } = req.body;
    
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }
    
    // Get cached product and category data
    const cacheData = await getCacheData();
    
    // Get user info for personalization
    const userInfo = await getUserInfo(userId);
    
    // Identifier for the user (actual ID or guest identifier)
    const userIdentifier = userId && userId !== 'guest' ? userId : req.ip || 'guest-user';
    
    // Find or create chat session
    let chatSession;
    if (sessionId) {
      chatSession = await ChatSession.findById(sessionId);
      
      // Verify session belongs to this user if they're logged in
      if (chatSession && userId && userId !== 'guest' && 
          chatSession.userIdentifier !== userIdentifier) {
        // If session doesn't belong to this user, create a new one
        chatSession = new ChatSession({
          user: userId !== 'guest' ? userId : null,
          userIdentifier,
          messages: []
        });
      } else if (!chatSession) {
        // Create new if session ID not found
        chatSession = new ChatSession({
          user: userId !== 'guest' ? userId : null,
          userIdentifier,
          messages: []
        });
      }
    } else {
      // Find the most recent active session for this user or create a new one
      chatSession = await ChatSession.findOne({ 
        userIdentifier, 
        isActive: true 
      }).sort({ lastActive: -1 });
      
      if (!chatSession) {
        chatSession = new ChatSession({
          user: userId !== 'guest' ? userId : null,
          userIdentifier,
          messages: []
        });
      }
    }
    
    // Extract budget information if present
    const budget = extractBudgetFromMessage(message);
    
    // Check for currency preference in the message
    if (message.toLowerCase().includes('kenyan') || 
        message.toLowerCase().includes('shilling') || 
        message.toLowerCase().includes('kes') || 
        message.toLowerCase().includes('ksh')) {
      chatSession.metadata.preferredCurrency = 'KES';
    }
    
    // If this is a short single word or very short response (e.g., "more", "yes", "specs")
    // and we have context from previous conversation, enhance it
    if (message.trim().length < 10 && chatSession.messages.length > 0) {
      // Get the last bot message for context
      const lastBotMessage = [...chatSession.messages]
        .reverse()
        .find(msg => msg.role === 'assistant');
      
      // Get the last user message (not including this one) for context
      const previousUserMessages = [...chatSession.messages]
        .filter(msg => msg.role === 'user')
        .slice(-3); // Last 3 user messages
      
      // Update context in metadata
      if (lastBotMessage) {
        chatSession.metadata.lastBotMessage = lastBotMessage.content;
      }
      
      if (previousUserMessages.length > 0) {
        chatSession.metadata.previousUserQueries = previousUserMessages.map(m => m.content);
      }
    }
    
    // Add this message to context for processing responses to short queries
    if (chatSession.messages.length > 0) {
      const recentMessages = chatSession.messages.slice(-5); // Get the last 5 messages
      chatSession.metadata.recentMessages = recentMessages.map(m => ({
        role: m.role,
        content: m.content
      }));
    }
    
    // Update session metadata if not already present
    if (!chatSession.metadata) {
      chatSession.metadata = {};
    }
    
    // Set KES as default currency if not already set
    if (!chatSession.metadata.preferredCurrency) {
      chatSession.metadata.preferredCurrency = 'KES';
    }
    
    // If a budget was mentioned, store it in the session
    if (budget) {
      chatSession.metadata.budget = budget;
    }
    
    // Extract numeric input (like category selection) if present
    const numericInput = message.trim().match(/^(\d+)$/);
    if (numericInput && 
        chatSession.metadata && 
        chatSession.metadata.needsCategorySelection &&
        chatSession.metadata.availableCategories) {
      const choice = parseInt(numericInput[1]);
      console.log(`User selected option number ${choice}`);
      
      if (choice > 0 && choice <= chatSession.metadata.availableCategories.length) {
        const selectedCategory = chatSession.metadata.availableCategories[choice - 1];
        console.log(`Category selected: "${selectedCategory}"`);
        chatSession.metadata.input = message + ` (Category: ${selectedCategory})`;
      }
    } else {
      chatSession.metadata.input = message;
    }
    
    // Keep track of the input for context
    chatSession.metadata.lastInput = message;
    
    // Add user message to session
    chatSession.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });
    
    // Update last active timestamp
    chatSession.lastActive = new Date();
    
    try {
      // Use our local chatbot service with enhanced context - now with async/await
      const reply = await generateResponse(message, {
        user: userInfo,
        sessionData: {
          budget: chatSession.metadata.budget,
          lastProductViewed: chatSession.metadata.lastProductViewed,
          preferredCategory: chatSession.metadata.preferredCategory,
          preferredCurrency: chatSession.metadata.preferredCurrency || 'KES', // Default to KES
          lastBotMessage: chatSession.metadata.lastBotMessage,
          previousUserQueries: chatSession.metadata.previousUserQueries,
          recentMessages: chatSession.metadata.recentMessages,
          input: chatSession.metadata.input,
          availableCategories: chatSession.metadata.availableCategories,
          needsCategorySelection: chatSession.metadata.needsCategorySelection,
          pendingBudget: chatSession.metadata.pendingBudget,
          messages: chatSession.messages // Send full message history for context
        }
      });
      
      // Store the last bot message for future context
      chatSession.metadata.lastBotMessage = reply;
      
      // Check for product ID references in the reply and store for context
      const productIdMatch = reply.match(/product ID: ([a-f0-9]{24})/i);
      if (productIdMatch && productIdMatch[1]) {
        chatSession.metadata.lastProductViewed = productIdMatch[1];
      }
      
      // Extract category preference if mentioned
      if (message.toLowerCase().includes('graphics card') || 
          message.toLowerCase().includes('gpu') || 
          message.toLowerCase().includes('rtx') || 
          message.toLowerCase().includes('radeon')) {
        chatSession.metadata.preferredCategory = 'Graphics Cards';
      } else if (message.toLowerCase().includes('computer') || 
                 message.toLowerCase().includes('pc') || 
                 message.toLowerCase().includes('desktop')) {
        chatSession.metadata.preferredCategory = 'Gaming PCs';
      } else if (message.toLowerCase().includes('laptop') || 
                 message.toLowerCase().includes('notebook')) {
        chatSession.metadata.preferredCategory = 'Laptops';
      } else if (message.toLowerCase().includes('monitor') || 
                 message.toLowerCase().includes('display') || 
                 message.toLowerCase().includes('screen')) {
        chatSession.metadata.preferredCategory = 'Monitors';
      } else if (message.toLowerCase().includes('keyboard') || 
                 message.toLowerCase().includes('mouse') || 
                 message.toLowerCase().includes('mice') || 
                 message.toLowerCase().includes('headset') || 
                 message.toLowerCase().includes('peripheral') || 
                 message.toLowerCase().includes('accessory')) {
        chatSession.metadata.preferredCategory = 'Peripherals';
      }
      
      // Store pending budget and category selection flags
      if (chatSession.metadata && reply.includes("What type of product are you looking for?")) {
        if (chatSession.metadata.budget) {
          chatSession.metadata.pendingBudget = chatSession.metadata.budget;
          chatSession.metadata.needsCategorySelection = true;
        }
      }
      
      // Add assistant's reply to the chat session
      chatSession.messages.push({
        role: 'assistant',
        content: reply,
        timestamp: new Date()
      });
      
      // Save the updated chat session including metadata
      await chatSession.save();
      
      // Return the reply to the client with the session ID
      return res.status(200).json({ 
        success: true, 
        message: reply, 
        sessionId: chatSession._id,
        metadata: chatSession.metadata
      });
      
    } catch (error) {
      console.error('Error generating chatbot response:', error);
      
      // Generate fallback response
      const fallbackMessage = "I'm sorry, I'm having trouble processing your request right now. Please try again later or contact our customer support for assistance.";
      
      // Add fallback response to chat session
      chatSession.messages.push({
        role: 'assistant',
        content: fallbackMessage,
        timestamp: new Date()
      });
      
      // Save the updated chat session
      await chatSession.save();
      
      return res.status(200).json({ 
        success: true, 
        message: fallbackMessage,
        sessionId: chatSession._id,
        error: 'processing_error'
      });
    }
    
  } catch (error) {
    console.error('Error processing chat message:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'An error occurred while processing your message. Please try again later.'
    });
  }
};

/**
 * Extract budget amount from a message
 * @param {string} message - The user's message
 * @returns {number|null} - The extracted budget or null
 */
function extractBudgetFromMessage(message) {
  if (!message) return null;
  
  const input = message.toLowerCase();
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
      const budget = parseInt(match[1].replace(/,/g, ''), 10);
      return budget;
    }
  }
  
  return null;
}

/**
 * Process a message from the chat interface with streaming response
 * @param {Object} req - Request object with message and userId
 * @param {Object} res - Response object
 */
export const processMessageStream = async (req, res) => {
  // Set appropriate headers for a streaming response
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  try {
    const { message, userId, sessionId } = req.body;
    
    if (!message) {
      res.write(`data: ${JSON.stringify({ error: 'Message is required' })}\n\n`);
      return res.end();
    }
    
    // Get cached product and category data
    const cacheData = await getCacheData();
    
    // Get user info for personalization
    const userInfo = await getUserInfo(userId);
    
    // Identifier for the user (actual ID or guest identifier)
    const userIdentifier = userId && userId !== 'guest' ? userId : req.ip || 'guest-user';
    
    // Find or create chat session
    let chatSession;
    if (sessionId) {
      chatSession = await ChatSession.findById(sessionId);
      
      // Verify session belongs to this user if they're logged in
      if (chatSession && userId && userId !== 'guest' && 
          chatSession.userIdentifier !== userIdentifier) {
        // If session doesn't belong to this user, create a new one
        chatSession = new ChatSession({
          user: userId !== 'guest' ? userId : null,
          userIdentifier,
          messages: []
        });
      } else if (!chatSession) {
        chatSession = new ChatSession({
          user: userId !== 'guest' ? userId : null,
          userIdentifier,
          messages: []
        });
      }
    } else {
      // Find the most recent active session for this user or create a new one
      chatSession = await ChatSession.findOne({ 
        userIdentifier, 
        isActive: true 
      }).sort({ lastActive: -1 });
      
      if (!chatSession) {
        chatSession = new ChatSession({
          user: userId !== 'guest' ? userId : null,
          userIdentifier,
          messages: []
        });
      }
    }
    
    // Extract budget information if present
    const budget = extractBudgetFromMessage(message);
    
    // Check for currency preference in the message
    if (message.toLowerCase().includes('kenyan') || 
        message.toLowerCase().includes('shilling') || 
        message.toLowerCase().includes('kes') || 
        message.toLowerCase().includes('ksh')) {
      chatSession.metadata.preferredCurrency = 'KES';
    }
    
    // If this is a short single word or very short response, enhance with context
    if (message.trim().length < 10 && chatSession.messages.length > 0) {
      // Get the last bot message for context
      const lastBotMessage = [...chatSession.messages]
        .reverse()
        .find(msg => msg.role === 'assistant');
      
      // Get the last user message (not including this one) for context
      const previousUserMessages = [...chatSession.messages]
        .filter(msg => msg.role === 'user')
        .slice(-3); // Last 3 user messages
      
      // Update context in metadata
      if (lastBotMessage) {
        chatSession.metadata.lastBotMessage = lastBotMessage.content;
      }
      
      if (previousUserMessages.length > 0) {
        chatSession.metadata.previousUserQueries = previousUserMessages.map(m => m.content);
      }
    }
    
    // Add this message to context for processing responses to short queries
    if (chatSession.messages.length > 0) {
      const recentMessages = chatSession.messages.slice(-5); // Get the last 5 messages
      chatSession.metadata.recentMessages = recentMessages.map(m => ({
        role: m.role,
        content: m.content
      }));
    }
    
    // Update session metadata if not already present
    if (!chatSession.metadata) {
      chatSession.metadata = {};
    }
    
    // Set KES as default currency if not already set
    if (!chatSession.metadata.preferredCurrency) {
      chatSession.metadata.preferredCurrency = 'KES';
    }
    
    // If a budget was mentioned, store it in the session
    if (budget) {
      chatSession.metadata.budget = budget;
    }
    
    // Keep track of the input for context
    chatSession.metadata.lastInput = message;
    
    // Add user message to session
    chatSession.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });
    
    // Update last active timestamp
    chatSession.lastActive = new Date();
    
    try {
      // Send session ID to client immediately
      res.write(`data: ${JSON.stringify({ 
        type: 'session', 
        sessionId: chatSession._id.toString(),
        metadata: chatSession.metadata
      })}\n\n`);
      
      // Generate response using local chatbot with enhanced context - now with async/await
      const reply = await generateResponse(message, {
        user: userInfo,
        sessionData: {
          budget: chatSession.metadata.budget,
          lastProductViewed: chatSession.metadata.lastProductViewed,
          preferredCategory: chatSession.metadata.preferredCategory,
          preferredCurrency: chatSession.metadata.preferredCurrency || 'KES', // Default to KES
          lastBotMessage: chatSession.metadata.lastBotMessage,
          previousUserQueries: chatSession.metadata.previousUserQueries,
          recentMessages: chatSession.metadata.recentMessages,
          input: message,
          messages: chatSession.messages // Send full message history for context
        }
      });
      
      // Store the last bot message for future context
      chatSession.metadata.lastBotMessage = reply;
      
      // Check for product ID references in the reply and store for context
      const productIdMatch = reply.match(/product ID: ([a-f0-9]{24})/i);
      if (productIdMatch && productIdMatch[1]) {
        chatSession.metadata.lastProductViewed = productIdMatch[1];
      }
      
      // Extract category preference if mentioned
      if (message.toLowerCase().includes('graphics card') || 
          message.toLowerCase().includes('gpu') || 
          message.toLowerCase().includes('rtx') || 
          message.toLowerCase().includes('radeon')) {
        chatSession.metadata.preferredCategory = 'Graphics Cards';
      } else if (message.toLowerCase().includes('computer') || 
                 message.toLowerCase().includes('pc') || 
                 message.toLowerCase().includes('desktop')) {
        chatSession.metadata.preferredCategory = 'Gaming PCs';
      } else if (message.toLowerCase().includes('laptop') || 
                 message.toLowerCase().includes('notebook')) {
        chatSession.metadata.preferredCategory = 'Laptops';
      } else if (message.toLowerCase().includes('monitor') || 
                 message.toLowerCase().includes('display') || 
                 message.toLowerCase().includes('screen')) {
        chatSession.metadata.preferredCategory = 'Monitors';
      } else if (message.toLowerCase().includes('keyboard') || 
                 message.toLowerCase().includes('mouse') || 
                 message.toLowerCase().includes('mice') || 
                 message.toLowerCase().includes('headset') || 
                 message.toLowerCase().includes('peripheral') || 
                 message.toLowerCase().includes('accessory')) {
        chatSession.metadata.preferredCategory = 'Peripherals';
      }
      
      // Store pending budget and category selection flags
      if (chatSession.metadata && reply.includes("What type of product are you looking for?")) {
        if (chatSession.metadata.budget) {
          chatSession.metadata.pendingBudget = chatSession.metadata.budget;
          chatSession.metadata.needsCategorySelection = true;
        }
      }
      
      // Simulate a streaming response by sending chunks of text
      const words = reply.split(' ');
      let currentChunk = '';
      
      for (let i = 0; i < words.length; i++) {
        currentChunk += words[i] + ' ';
        
        if (i % 3 === 0 || i === words.length - 1) {
          res.write(`data: ${JSON.stringify({ 
            type: 'chunk', 
            content: currentChunk.trim() 
          })}\n\n`);
          
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      
      chatSession.messages.push({
        role: 'assistant',
        content: reply,
        timestamp: new Date()
      });
      
      await chatSession.save();
      
      return res.end();
      
    } catch (error) {
      console.error('Error generating streaming chatbot response:', error);
      
      const fallbackMessage = "I'm sorry, I'm having trouble processing your request right now. Please try again later or contact our customer support for assistance.";
      
      res.write(`data: ${JSON.stringify({ 
        type: 'error',
        content: fallbackMessage
      })}\n\n`);
      
      chatSession.messages.push({
        role: 'assistant',
        content: fallbackMessage,
        timestamp: new Date()
      });
      
      await chatSession.save();
      
      return res.end();
    }
    
  } catch (error) {
    console.error('Error processing streaming chat message:', error);
    res.write(`data: ${JSON.stringify({ 
      type: 'error',
      content: 'An error occurred while processing your message. Please try again later.'
    })}\n\n`);
    return res.end();
  }
};

// Endpoint to manually refresh the cache (admin only)
export const refreshChatCache = async (req, res) => {
  try {
    await refreshCache();
    return res.status(200).json({ success: true, message: 'Chat cache refreshed successfully' });
  } catch (error) {
    console.error('Error refreshing chat cache:', error);
    return res.status(500).json({ success: false, message: 'Error refreshing chat cache' });
  }
};

// Admin endpoints for chat management
// Get all chat sessions (admin only)
export const getAllChatSessions = async (req, res) => {
  try {
    const { limit = 20, offset = 0, active } = req.query;
    
    let query = {};
    if (active === 'true') query.isActive = true;
    if (active === 'false') query.isActive = false;
    
    const sessions = await ChatSession.find(query)
      .sort({ lastActive: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .populate('user', 'name email')
      .exec();
    
    const total = await ChatSession.countDocuments(query);
    
    return res.status(200).json({
      success: true,
      data: {
        sessions,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch chat sessions'
    });
  }
};

// Get single chat session by ID (admin only)
export const getChatSessionById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const session = await ChatSession.findById(id)
      .populate('user', 'name email')
      .exec();
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Chat session not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Error fetching chat session:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch chat session'
    });
  }
};

// Close a chat session (mark as inactive)
export const closeChatSession = async (req, res) => {
  try {
    const { id } = req.params;
    
    const session = await ChatSession.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Chat session not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Chat session closed successfully',
      data: session
    });
  } catch (error) {
    console.error('Error closing chat session:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to close chat session'
    });
  }
};

// Add a function to get paginated messages for a chat session
export const getPaginatedChatMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const session = await ChatSession.findById(id);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Chat session not found'
      });
    }
    
    // Get total messages count
    const totalMessages = session.messages.length;
    
    // Get paginated messages (most recent first)
    const paginatedMessages = session.messages
      .slice()
      .reverse()
      .slice(skip, skip + parseInt(limit))
      .reverse(); // Put back in chronological order
    
    return res.status(200).json({
      success: true,
      data: {
        messages: paginatedMessages,
        total: totalMessages,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalMessages / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching paginated chat messages:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch chat messages'
    });
  }
};

/**
 * Convert WebM file to WAV using fluent-ffmpeg
 * @param {string} inputPath - Path to input WebM file 
 * @param {string} outputPath - Path to output WAV file
 * @returns {Promise<string>} - Path to converted WAV file
 */
const convertWebMToWav = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      // Use more explicit output options for maximum compatibility
      .outputOptions([
        '-acodec pcm_s16le',    // Use linear PCM encoding (16-bit)
        '-ac 1',                // Mono (1 channel)
        '-ar 16000',            // 16kHz sample rate - optimal for speech recognition
        '-f wav',               // Force WAV format
        '-bits_per_raw_sample 16', // Explicitly set bit depth
        '-y'                    // Overwrite output files without asking
      ])
      .on('start', (commandLine) => {
        console.log('FFmpeg conversion started:', commandLine);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log('FFmpeg progress:', Math.round(progress.percent), '% done');
        } else {
          console.log('FFmpeg processing...');
        }
      })
      .on('end', () => {
        console.log('Audio converted to WAV successfully');
        
        // Verify the output file exists and has content
        try {
          const stats = fs.statSync(outputPath);
          console.log(`Output file size: ${stats.size} bytes`);
          if (stats.size === 0) {
            reject(new Error('Conversion produced an empty file'));
            return;
          }
        } catch (err) {
          reject(new Error(`Failed to verify output file: ${err.message}`));
          return;
        }
        
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('Error converting audio:', err);
        reject(err);
      })
      .save(outputPath);
  });
};

/**
 * Verify audio file format and properties using ffprobe-static
 * @param {string} filePath - Path to audio file
 * @returns {Promise<object>} - Audio file info
 */
const verifyAudioFile = (filePath) => {
  return new Promise((resolve, reject) => {
    // Use ffprobe-static's path for cross-platform compatibility
    const ffprobe = spawn(ffprobeStatic.path, [
      '-v', 'error',
      '-show_entries', 'stream=codec_name,channels,sample_rate,bit_rate',
      '-of', 'json',
      filePath
    ]);
    
    let output = '';
    let errorOutput = '';
    
    ffprobe.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    ffprobe.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    ffprobe.on('close', (code) => {
      if (code === 0) {
        try {
          const info = JSON.parse(output);
          console.log('Audio file info:', info);
          resolve(info);
        } catch (err) {
          reject(new Error(`Failed to parse audio info: ${err.message}`));
        }
      } else {
        reject(new Error(`ffprobe exited with code ${code}: ${errorOutput}`));
      }
    });
  });
};

/**
 * Transcribe audio to text
 * @param {Object} req - Request object with audio file
 * @param {Object} res - Response object
 */
export const transcribeAudio = async (req, res) => {
  console.log('Transcription endpoint hit');
  
  // Use multer middleware for handling file upload
  const uploadMiddleware = upload.single('audio');
  
  uploadMiddleware(req, res, async function(err) {
    if (err) {
      console.error('Error uploading file:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'Error uploading file'
      });
    }
    
    // Check if file exists
    if (!req.file) {
      console.error('No audio file in request');
      return res.status(400).json({
        success: false,
        message: 'No audio file provided'
      });
    }
    
    console.log('File uploaded successfully:', req.file.filename, 'Mimetype:', req.file.mimetype);
    
    let audioFilePath = req.file.path;
    let needsCleanup = false;
    
    try {
      // Always convert to WAV regardless of input format
      console.log('Converting to WAV...');
      const wavFilePath = req.file.path.replace(/\.\w+$/, '.wav');
      
      try {
        audioFilePath = await convertWebMToWav(req.file.path, wavFilePath);
        needsCleanup = true;
        console.log('Conversion successful, new file:', audioFilePath);
        
        // Verify the audio file format for debugging
        try {
          const audioInfo = await verifyAudioFile(audioFilePath);
          console.log('Audio verification successful:', audioInfo);
        } catch (verifyError) {
          console.warn('Audio verification warning (continuing anyway):', verifyError.message);
        }
      } catch (conversionError) {
        console.error('Error converting audio:', conversionError);
        throw new Error('Audio conversion failed: ' + conversionError.message);
      }
      
      // Process the audio file with our transcription service
      try {
        console.log('Starting transcription...');
        const { text, confidence } = await transcribeAudioWithWhisper(audioFilePath);
        console.log('Transcription successful:', text);
        
        // Delete the temporary files when done
        try {
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
          if (needsCleanup && audioFilePath !== req.file.path && fs.existsSync(audioFilePath)) {
            fs.unlinkSync(audioFilePath);
          }
          console.log('Temporary files deleted');
        } catch (cleanupError) {
          console.error('Error during file cleanup:', cleanupError);
          // Continue even if cleanup fails
        }
        
        // Return the transcription result
        return res.status(200).json({
          success: true,
          transcription: text.trim(),
          confidence: confidence
        });
      } catch (transcriptionError) {
        console.error('Transcription failed:', transcriptionError);
        throw new Error('Failed to transcribe audio: ' + transcriptionError.message);
      }
      
    } catch (error) {
      // Handle errors and clean up
      console.error('Error in transcription process:', error);
      
      // Try to clean up temporary files
      try {
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        if (needsCleanup && audioFilePath !== req.file.path && fs.existsSync(audioFilePath)) {
          fs.unlinkSync(audioFilePath);
        }
      } catch (cleanupError) {
        console.error('Error during file cleanup:', cleanupError);
      }
      
      // Return error response
      return res.status(500).json({
        success: false,
        message: 'Error processing audio: ' + error.message
      });
    }
  });
};