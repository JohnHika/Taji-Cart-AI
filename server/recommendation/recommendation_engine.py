"""
Recommendation Engine for TajiCart-AI

Provides intelligent product recommendations based on user interactions,
preferences, and intent detection using LightFM models.
"""

import hashlib
import json
import logging
import os
import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
import pandas as pd
from recommendation.data_collector import DataCollector
# Local imports
from recommendation.lightfm_recommendation import LightFMRecommender
from recommendation.mongo_data_access import MongoDataAccess

# Configure logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('recommendation_engine')

class RecommendationEngine:
    """
    Main recommendation engine that handles intent detection and recommendation generation.
    Serves as the central component for the AI-powered shopping assistant.
    """
    
    def __init__(self, mongo_uri=None, db_name=None):
        """
        Initialize the recommendation engine.
        
        Parameters:
        -----------
        mongo_uri : str, optional
            MongoDB connection URI.
        db_name : str, optional
            MongoDB database name.
        """
        # Initialize data access components
        self.db_access = MongoDataAccess(uri=mongo_uri, db_name=db_name)
        self.data_collector = DataCollector(self.db_access)
        self.recommender = LightFMRecommender()
        
        # Session memory - stores user contexts by session ID
        self.session_memory = {}
        
        # Product cache to reduce database hits
        self.product_cache = {}
        self.category_cache = {}
        self.search_cache = {}
        self.cache_expiry = {}
        self.cache_ttl = 3600  # Cache time-to-live in seconds (1 hour)
        
        # Load pre-trained models if available
        self.load_models()
        
        # Intent patterns for the chatbot
        self.intent_patterns = {
            'trending': r'\b(trending|popular|what\'?s hot|best sell(ing|ers?)|most popular)\b',
            'recommend_general': r'\b(recommend|suggest|show me|what (would|should) I|what do you recommend)\b',
            'recommend_category': r'\b(recommend|suggest|show me).{1,20}\b(gaming|laptop|monitor|keyboard|mouse|computer|pc|graphics card|gpu)\b',
            'budget_query': r'\b(budget|afford|spend|under|less than|cheaper than|max price|maximum price).{1,10}([0-9,.]+)',
            'add_to_cart': r'\badd\b.{1,30}(cart|basket)\b',
            'view_cart': r'\b(view|show|what\'?s in|check).{1,10}(cart|basket)\b',
            'product_info': r'\b(tell me about|info|information|details|specs|specifications|features).{1,30}',
            'greeting': r'\b(hello|hi|hey|greetings)\b',
            'goodbye': r'\b(bye|goodbye|exit|quit|end)\b',
            'help': r'\b(help|assist|how to|how do I|what can you do)\b',
            'search': r'\b(search|find|look for)\b.{1,30}'
        }
    
    def load_models(self):
        """
        Load pre-trained LightFM models if available.
        """
        try:
            model_path = os.path.join('training_data', 'lightfm_model.npz')
            if os.path.exists(model_path):
                self.recommender.load_model(model_path)
                logger.info("Loaded pre-trained LightFM model")
            else:
                logger.warning("No pre-trained model found at: %s", model_path)
            
            # Load user and item mappings
            user_mapping_path = os.path.join('training_data', 'user_mapping.json')
            item_mapping_path = os.path.join('training_data', 'item_mapping.json')
            
            if os.path.exists(user_mapping_path) and os.path.exists(item_mapping_path):
                with open(user_mapping_path, 'r') as f:
                    self.recommender.user_id_mapping = json.load(f)
                    
                with open(item_mapping_path, 'r') as f:
                    self.recommender.item_id_mapping = json.load(f)
                    
                logger.info("Loaded user and item mappings")
            else:
                logger.warning("User and item mappings not found")
        except Exception as e:
            logger.error(f"Error loading models: {str(e)}")
    
    def detect_intent(self, message: str) -> Dict:
        """
        Detect the user's intent from the message.
        
        Parameters:
        -----------
        message : str
            User's message text
            
        Returns:
        --------
        dict
            Intent information including type and extracted entities
        """
        message = message.lower()
        intent = {'type': 'unknown', 'entities': {}}
        
        # Check for each intent pattern
        for intent_name, pattern in self.intent_patterns.items():
            match = re.search(pattern, message)
            if match:
                intent['type'] = intent_name
                
                # Extract budget if present
                if intent_name == 'budget_query' and len(match.groups()) >= 2:
                    budget_str = match.group(2).replace(',', '')
                    try:
                        budget = float(budget_str)
                        intent['entities']['budget'] = budget
                    except ValueError:
                        pass
                
                # Extract product name for add_to_cart intent
                if intent_name == 'add_to_cart':
                    product_name = self._extract_product_name(message)
                    if product_name:
                        intent['entities']['product_name'] = product_name
                
                # Extract category for recommend_category intent
                if intent_name == 'recommend_category':
                    categories = ['gaming', 'laptop', 'monitor', 'keyboard', 'mouse', 
                                 'computer', 'pc', 'graphics card', 'gpu', 'phones', 'tablets',
                                 'headphones', 'speakers', 'cameras', 'tvs', 'accessories']
                    for category in categories:
                        if category in message:
                            intent['entities']['category'] = category
                            break
                
                # Extract search query
                if intent_name == 'search':
                    search_query = self._extract_search_query(message)
                    if search_query:
                        intent['entities']['search_query'] = search_query
                        
                break
                
        # Check for index reference (e.g., "the first one", "second item")
        index_match = re.search(r'\b(first|second|third|fourth|fifth|last|1st|2nd|3rd|4th|5th)\b\s*(one|item|product)?', message)
        if index_match:
            index_word = index_match.group(1).lower()
            index_mapping = {
                'first': 0, '1st': 0,
                'second': 1, '2nd': 1,
                'third': 2, '3rd': 2,
                'fourth': 3, '4th': 3,
                'fifth': 4, '5th': 4,
                'last': -1
            }
            intent['entities']['product_index'] = index_mapping.get(index_word, 0)
            
            # If we have product index but no clear intent, check for context-specific actions
            if intent['type'] == 'unknown':
                if re.search(r'\b(tell me|about|details|more info|description)\b', message):
                    intent['type'] = 'product_info'
                elif re.search(r'\b(add|buy|purchase|get)\b', message):
                    intent['type'] = 'add_to_cart'
        
        # Check for pronoun references ("this", "that", "it")
        pronoun_match = re.search(r'\b(this|that|it)\b', message)
        if pronoun_match and intent['type'] == 'unknown':
            if re.search(r'\b(add|buy|purchase|get)\b.*\b(this|that|it)\b', message) or \
               re.search(r'\b(this|that|it)\b.*\b(add|buy|purchase|get)\b', message):
                intent['type'] = 'add_to_cart'
                intent['entities']['use_last_product'] = True
            elif re.search(r'\b(tell|about|details|more|info|description)\b.*\b(this|that|it)\b', message) or \
                 re.search(r'\b(this|that|it)\b.*\b(tell|about|details|more|info|description)\b', message):
                intent['type'] = 'product_info'
                intent['entities']['use_last_product'] = True
            
        return intent
    
    def _extract_product_name(self, message: str) -> Optional[str]:
        """Extract product name from an add to cart message."""
        # Look for patterns like "add X to cart"
        match = re.search(r'add\s+(.+?)\s+to\s+cart', message)
        if match:
            return match.group(1).strip()
        
        # Handle "add to cart X"
        match = re.search(r'add\s+to\s+cart\s+(.+)', message)
        if match:
            return match.group(1).strip()
        
        return None
    
    def _extract_search_query(self, message: str) -> Optional[str]:
        """Extract search query from message."""
        match = re.search(r'search\s+for\s+(.+)', message)
        if match:
            return match.group(1).strip()
        
        match = re.search(r'find\s+(.+)', message)
        if match:
            return match.group(1).strip()
        
        match = re.search(r'look\s+for\s+(.+)', message)
        if match:
            return match.group(1).strip()
        
        return None
    
    def get_session_memory(self, session_id: str) -> Dict:
        """
        Get or create session memory for user interaction tracking.
        
        Parameters:
        -----------
        session_id : str
            Unique session identifier
            
        Returns:
        --------
        dict
            Session memory with context information
        """
        if (session_id not in self.session_memory):
            self.session_memory[session_id] = {
                'last_message': None,
                'last_intent': None,
                'last_products': [],
                'last_selected_product': None,  # Track last product user focused on
                'last_index_mentioned': None,   # Track index of product mentioned (for "first one", "second one")
                'current_category': None,      # Track category context
                'current_budget': None,        # Track budget context
                'budget_history': [],          # Track history of budgets
                'search_history': [],          # Track search history 
                'viewed_products': [],         # Track products user asked details about
                'cart_items': [],              # Track current cart items
                'preferences': {               # Explicit preferences
                    'categories': [],          # Categories user has shown interest in
                    'price_range': {'min': None, 'max': None},  # Preferred price range
                    'brands': [],              # Brands user has shown interest in
                    'features': []             # Features user has mentioned interest in
                },
                'conversation_state': 'greeting',  # Track conversation flow state
                'last_updated': datetime.now()
            }
        return self.session_memory[session_id]
    
    def update_session_memory(self, session_id: str, updates: Dict) -> None:
        """
        Update session memory with new information.
        
        Parameters:
        -----------
        session_id : str
            Unique session identifier
        updates : dict
            New information to update in session memory
        """
        memory = self.get_session_memory(session_id)
        memory.update(updates)
        memory['last_updated'] = datetime.now()
        
        # Clean up old sessions (older than 30 minutes)
        self._cleanup_old_sessions()
    
    def _cleanup_old_sessions(self) -> None:
        """Remove old sessions to prevent memory leaks."""
        current_time = datetime.now()
        expired_sessions = []
        
        for session_id, memory in self.session_memory.items():
            if (current_time - memory['last_updated']) > timedelta(minutes=30):
                expired_sessions.append(session_id)
        
        for session_id in expired_sessions:
            del self.session_memory[session_id]
    
    def get_recommendations(self, user_id: str = None, limit: int = 5, 
                           category: str = None, budget: float = None) -> List[Dict]:
        """
        Get personalized recommendations for a user.
        
        Parameters:
        -----------
        user_id : str, optional
            User ID to get recommendations for
        limit : int, optional
            Number of recommendations to return
        category : str, optional
            Filter by product category
        budget : float, optional
            Maximum budget constraint
            
        Returns:
        --------
        list of dict
            List of recommended products with details
        """
        try:
            # Generate cache key
            cache_key = f"rec_{user_id or 'guest'}_{category or 'all'}_{budget or 0}_{limit}"
            
            # Check cache first
            cached_recs = self._get_from_cache(cache_key, 'category' if category else 'product')
            if cached_recs:
                logger.info(f"Using cached recommendations for user {user_id}")
                # Filter by budget if needed (in case the budget changed since caching)
                if budget and budget > 0:
                    cached_recs = [p for p in cached_recs if p.get('price', float('inf')) <= budget]
                return cached_recs[:limit]  # Ensure we don't return more than requested
            
            recommendations = []
            
            # Case 1: User exists and model is loaded - use LightFM
            if user_id and user_id != 'guest' and self.recommender.model is not None:
                # Map user ID to internal ID
                if user_id in self.recommender.user_id_mapping:
                    mapped_user_id = self.recommender.user_id_mapping[user_id]
                    
                    # Get recommendations from model
                    recs = self.recommender.recommend_for_user(mapped_user_id, limit * 2)
                    
                    # Map internal IDs back to MongoDB IDs
                    product_ids = [key for key in self.recommender.item_id_mapping.keys() 
                                  if self.recommender.item_id_mapping[key] in recs]
                    
                    # Apply category filter if needed
                    if category:
                        products = self.db_access.get_products_by_ids_and_category(product_ids, category, limit)
                    else:
                        products = self.db_access.get_products_by_ids(product_ids, limit)
                    
                    recommendations = products
                else:
                    # User not in model - fall back to trending
                    recommendations = self._get_trending_products(limit)
            else:
                # Case 2: No user or model - use trending products
                recommendations = self._get_trending_products(limit)
            
            # Apply budget filter if needed
            if budget and budget > 0:
                recommendations = [p for p in recommendations if p.get('price', float('inf')) <= budget]
            
            # Format for response
            formatted_recs = []
            for product in recommendations[:limit]:
                formatted_recs.append({
                    'id': str(product.get('_id')),
                    'name': product.get('name', 'Unknown Product'),
                    'price': product.get('price', 0),
                    'description': product.get('description', ''),
                    'stock': product.get('stock', 0),
                    'image': product.get('image', []),
                    'category': [str(cat) for cat in product.get('category', [])]
                })
            
            # Add to cache - shorter TTL for personalized recommendations
            cache_ttl = 1800 if user_id and user_id != 'guest' else 3600  # 30 min for logged-in users, 1 hour for guests
            self._add_to_cache(cache_key, formatted_recs, 'category' if category else 'product', cache_ttl)
            
            return formatted_recs
        except Exception as e:
            logger.error(f"Error getting recommendations: {str(e)}")
            return []
    
    def _get_trending_products(self, limit: int = 5) -> List[Dict]:
        """
        Get trending products based on recent views and orders.
        
        Parameters:
        -----------
        limit : int, optional
            Number of trending products to return
            
        Returns:
        --------
        list of dict
            List of trending products
        """
        try:
            # Check cache first
            cache_key = f"trending_products_{limit}"
            cached_products = self._get_from_cache(cache_key, 'product')
            if cached_products:
                logger.info("Using cached trending products")
                return cached_products
            
            # Get recent interactions
            recent_interactions = self.data_collector.get_user_item_interactions(
                interaction_types=['purchase', 'view'],
                days_limit=7,
                use_cache=True
            )
            
            # If no interactions, fall back to highest stock products
            if recent_interactions.empty:
                products = self.db_access.get_products_by_stock(limit)
            else:
                # Count interactions per product
                product_counts = recent_interactions['item_id'].value_counts().head(limit * 2)
                product_ids = product_counts.index.tolist()
                
                # Get product details
                products = self.db_access.get_products_by_ids(product_ids, limit)
            
            # Add to cache with shorter TTL since trends change frequently
            self._add_to_cache(cache_key, products, 'product', 1800)  # 30 minutes TTL
            return products
        except Exception as e:
            logger.error(f"Error getting trending products: {str(e)}")
            # Fallback to newest products if interactions fail
            return self.db_access.get_products_by_date(limit)
    
    def search_products(self, query: str, limit: int = 5) -> List[Dict]:
        """
        Search products by name or description.
        
        Parameters:
        -----------
        query : str
            Search query
        limit : int, optional
            Maximum number of results to return
            
        Returns:
        --------
        list of dict
            List of matching products
        """
        try:
            # Check cache first
            cache_key = f"search_{query.lower()}_{limit}"
            cached_results = self._get_from_cache(cache_key, 'search')
            if cached_results:
                logger.info(f"Using cached search results for '{query}'")
                return cached_results
            
            # If not in cache, perform search
            products = self.db_access.search_products(query, limit)
            
            formatted_products = []
            for product in products:
                formatted_products.append({
                    'id': str(product.get('_id')),
                    'name': product.get('name', 'Unknown Product'),
                    'price': product.get('price', 0),
                    'description': product.get('description', ''),
                    'stock': product.get('stock', 0),
                    'image': product.get('image', []),
                    'category': [str(cat) for cat in product.get('category', [])]
                })
            
            # Add to cache
            self._add_to_cache(cache_key, formatted_products, 'search', 3600)  # 1 hour TTL
            return formatted_products
        except Exception as e:
            logger.error(f"Error searching products: {str(e)}")
            return []

    def add_to_cart(self, user_id: str, product_name: str, session_id: str) -> Dict:
        """
        Add a product to the user's cart.
        
        Parameters:
        -----------
        user_id : str
            User ID
        product_name : str
            Product name to search for
        session_id : str
            Session identifier for tracking context
            
        Returns:
        --------
        dict
            Result with success status and message
        """
        try:
            # Search for the product
            products = self.db_access.search_products(product_name, 3)
            
            if not products:
                return {
                    'success': False,
                    'message': f"I couldn't find any product matching '{product_name}'. Could you try a different product name?"
                }
            
            # Use the first match
            product = products[0]
            
            # Update session memory
            memory = self.get_session_memory(session_id)
            cart_item = {
                'product_id': str(product.get('_id')),
                'name': product.get('name'),
                'price': product.get('price', 0),
                'quantity': 1
            }
            
            # Check if already in cart
            existing_item = next((item for item in memory['cart_items'] 
                                if item['product_id'] == cart_item['product_id']), None)
            
            if existing_item:
                existing_item['quantity'] += 1
                message = f"I've updated the quantity of {product.get('name')} in your cart to {existing_item['quantity']}."
            else:
                memory['cart_items'].append(cart_item)
                message = f"I've added {product.get('name')} to your cart."
            
            self.update_session_memory(session_id, {'cart_items': memory['cart_items']})
            
            # Also update in database if user is logged in
            if user_id and user_id != 'guest':
                self.db_access.update_cart(user_id, str(product.get('_id')), 1)
            
            return {
                'success': True,
                'message': message,
                'product': {
                    'id': str(product.get('_id')),
                    'name': product.get('name'),
                    'price': product.get('price', 0)
                }
            }
        except Exception as e:
            logger.error(f"Error adding to cart: {str(e)}")
            return {
                'success': False,
                'message': "I encountered an error while adding this item to your cart. Please try again."
            }
    
    def get_cart(self, user_id: str, session_id: str) -> Dict:
        """
        Get the current cart contents.
        
        Parameters:
        -----------
        user_id : str
            User ID
        session_id : str
            Session identifier for tracking context
            
        Returns:
        --------
        dict
            Cart information including items and total
        """
        try:
            memory = self.get_session_memory(session_id)
            
            # If not in session memory but user is logged in, get from database
            if not memory['cart_items'] and user_id and user_id != 'guest':
                db_cart = self.db_access.get_user_cart(user_id)
                
                if (db_cart):
                    memory['cart_items'] = [{
                        'product_id': str(item.get('productId')),
                        'name': item.get('name', 'Unknown Product'),
                        'price': item.get('price', 0),
                        'quantity': item.get('quantity', 1)
                    } for item in db_cart]
                    
                    self.update_session_memory(session_id, {'cart_items': memory['cart_items']})
            
            # Calculate total
            total = sum(item['price'] * item['quantity'] for item in memory['cart_items'])
            
            return {
                'items': memory['cart_items'],
                'total': total,
                'count': len(memory['cart_items'])
            }
        except Exception as e:
            logger.error(f"Error getting cart: {str(e)}")
            return {
                'items': [],
                'total': 0,
                'count': 0
            }
    
    def process_message(self, message: str, user_id: str, session_id: str) -> Dict:
        """
        Process a user message and generate a response.
        
        Parameters:
        -----------
        message : str
            User's message text
        user_id : str
            User identifier
        session_id : str
            Session identifier for tracking context
            
        Returns:
        --------
        dict
            Response with message, recommended products, and other data
        """
        try:
            # Get session memory
            memory = self.get_session_memory(session_id)
            
            # Update session with this message
            memory['last_message'] = message
            
            # Detect intent
            intent = self.detect_intent(message)
            memory['last_intent'] = intent
            
            # Process based on intent
            if intent['type'] == 'greeting':
                response = self._handle_greeting(user_id)
            
            elif intent['type'] == 'trending':
                recommendations = self._get_trending_products(5)
                memory['last_products'] = recommendations
                response = self._format_trending_response(recommendations)
            
            elif intent['type'] == 'recommend_general':
                recommendations = self.get_recommendations(user_id, 5)
                memory['last_products'] = recommendations
                response = self._format_recommendation_response(recommendations)
            
            elif intent['type'] == 'recommend_category' and 'category' in intent['entities']:
                category = intent['entities']['category']
                memory['current_category'] = category
                memory['preferences']['categories'].append(category)
                recommendations = self.get_recommendations(user_id, 5, category=category)
                memory['last_products'] = recommendations
                response = self._format_category_recommendation(recommendations, category)
            
            elif intent['type'] == 'budget_query' and 'budget' in intent['entities']:
                budget = intent['entities']['budget']
                memory['current_budget'] = budget
                memory['budget_history'].append(budget)
                # Update price range preferences
                if not memory['preferences']['price_range']['max'] or budget < memory['preferences']['price_range']['max']:
                    memory['preferences']['price_range']['max'] = budget
                    
                # If category context exists, filter by both budget and category
                category = memory.get('current_category')
                recommendations = self.get_recommendations(user_id, 5, category=category, budget=budget)
                memory['last_products'] = recommendations
                response = self._format_budget_recommendation(recommendations, budget)
            
            elif intent['type'] == 'add_to_cart':
                product_to_add = None
                
                # Case 1: Product name explicitly mentioned
                if 'product_name' in intent['entities']:
                    product_name = intent['entities']['product_name']
                    result = self.add_to_cart(user_id, product_name, session_id)
                    response = {
                        'text': result['message'],
                        'follow_up_suggestions': ["Show me my cart", "Continue shopping", "Checkout now"]
                    }
                    if result.get('success'):
                        response['products'] = [result.get('product')]
                
                # Case 2: Product index mentioned ("add the first one")
                elif 'product_index' in intent['entities'] and memory['last_products']:
                    index = intent['entities']['product_index']
                    if index == -1:  # "last one"
                        index = len(memory['last_products']) - 1
                    
                    if 0 <= index < len(memory['last_products']):
                        product = memory['last_products'][index]
                        memory['last_selected_product'] = product
                        memory['last_index_mentioned'] = index
                        
                        result = self.add_to_cart(user_id, product.get('name', ''), session_id)
                        response = {
                            'text': result['message'],
                            'follow_up_suggestions': ["Show me my cart", "Continue shopping", "Checkout now"]
                        }
                        if result.get('success'):
                            response['products'] = [result.get('product')]
                    else:
                        response = {
                            'text': "I'm not sure which product you want to add to your cart. Could you specify which one?",
                            'follow_up_suggestions': ["Show me trending products", "Search for a product"]
                        }
                
                # Case 3: Using last selected product ("add this")
                elif 'use_last_product' in intent['entities'] and memory['last_selected_product']:
                    product = memory['last_selected_product']
                    result = self.add_to_cart(user_id, product.get('name', ''), session_id)
                    response = {
                        'text': result['message'] + " Would you like to continue shopping or proceed to checkout?",
                        'follow_up_suggestions': ["Show me my cart", "Continue shopping", "Checkout now"]
                    }
                    if result.get('success'):
                        response['products'] = [result.get('product')]
                else:
                    # No product information available
                    response = {
                        'text': "I'd be happy to add an item to your cart. Could you tell me which product you're interested in?",
                        'follow_up_suggestions': ["Show trending products", "Show me my cart"]
                    }
            
            elif intent['type'] == 'product_info':
                product_to_show = None
                
                # Case 1: Product index mentioned ("tell me about the first one")
                if 'product_index' in intent['entities'] and memory['last_products']:
                    index = intent['entities']['product_index']
                    if index == -1:  # "last one"
                        index = len(memory['last_products']) - 1
                    
                    if 0 <= index < len(memory['last_products']):
                        product_to_show = memory['last_products'][index]
                        memory['last_selected_product'] = product_to_show
                        memory['last_index_mentioned'] = index
                        memory['viewed_products'].append(product_to_show.get('id'))
                
                # Case 2: Using last selected product ("tell me more about this")
                elif 'use_last_product' in intent['entities'] and memory['last_selected_product']:
                    product_to_show = memory['last_selected_product']
                    if product_to_show.get('id') not in memory['viewed_products']:
                        memory['viewed_products'].append(product_to_show.get('id'))
                
                if product_to_show:
                    response = self._format_product_details(product_to_show)
                else:
                    response = {
                        'text': "I'd be happy to tell you more about a product. Which one are you interested in?",
                        'follow_up_suggestions': ["Show trending products", "Search for something specific"]
                    }
            
            elif intent['type'] == 'view_cart':
                cart = self.get_cart(user_id, session_id)
                response = self._format_cart_response(cart)
            
            elif intent['type'] == 'search' and 'search_query' in intent['entities']:
                query = intent['entities']['search_query']
                memory['search_history'].append(query)
                results = self.search_products(query)
                memory['last_products'] = results
                response = self._format_search_response(results, query)
            
            elif intent['type'] == 'help':
                response = {
                    'text': "I can help you with: finding trending products, recommending items based on your preferences, "
                           "searching for specific products, managing your cart, and answering questions about our store. "
                           "Try asking me things like 'What's trending?', 'Recommend gaming laptops', "
                           "'What can I get for 50,000 KES', or 'Add RTX 4080 to my cart'.",
                    'follow_up_suggestions': ["Show trending products", "What's on sale?", "Search for a product"]
                }
            
            else:
                # Unknown intent - check for context to generate a follow-up response
                response = self._generate_follow_up_response(memory)
            
            # Update session memory
            self.update_session_memory(session_id, memory)
            
            return response
        
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
            return {
                'text': "I apologize, but I encountered an error while processing your request. "
                        "Could you please try again or rephrase your question?",
                'follow_up_suggestions': ["Show me trending products", "Help"]
            }
    
    def _generate_follow_up_response(self, memory: Dict) -> Dict:
        """Generate contextually relevant follow-up responses based on session memory."""
        last_intent = memory.get('last_intent', {}).get('type')
        
        # If we have category context, suggest products in that category
        if memory.get('current_category'):
            category = memory.get('current_category')
            return {
                'text': f"I'm not quite sure what you're asking. Since you were looking at {category} products, "
                       f"would you like to see more options, or perhaps products in a different category?",
                'follow_up_suggestions': [f"Show more {category} products", "Show trending products", 
                                        "Show me a different category"]
            }
        
        # If we have budget context, reference it
        elif memory.get('current_budget'):
            budget = memory.get('current_budget')
            return {
                'text': f"I'm not sure I understand. You mentioned a budget of KES {budget:,}. "
                       f"Would you like to see more products within this budget, or perhaps adjust your price range?",
                'follow_up_suggestions': ["Show more within my budget", "I want to spend less", 
                                        "I can spend more"]
            }
        
        # If user has viewed products recently
        elif memory.get('last_products'):
            return {
                'text': "I'm not quite sure what you're looking for. Based on the products you were viewing, "
                       "would you like more details on any of them, or should I show you different options?",
                'follow_up_suggestions': ["Tell me more about the first one", "Show me different products", 
                                        "What's trending?"]
            }
        
        # Default response if no context
        else:
            return {
                'text': "I'm not sure I understand. Would you like to see our trending products, "
                       "search for something specific, or get personalized recommendations?",
                'follow_up_suggestions': ["Show trending products", "Search for a product", 
                                        "Give me recommendations"]
            }
    
    def _handle_greeting(self, user_id: str) -> Dict:
        """Generate a greeting response."""
        if (user_id and user_id != 'guest'):
            # Try to get user's name
            user = self.db_access.get_user_by_id(user_id)
            if user and 'name' in user:
                return {
                    'text': f"Hello {user['name']}! Welcome to Taji-Cart. How can I assist you today? "
                           f"I can recommend products, check your cart, or help you find specific items."
                }
        
        return {
            'text': "Hello! Welcome to Taji-Cart. I'm your AI shopping assistant. "
                   "How can I help you today? I can show you trending products, "
                   "make recommendations, or help you find specific items."
        }
    
    def _format_trending_response(self, products: List[Dict]) -> Dict:
        """Format trending products response."""
        if not products:
            return {
                'text': "Hmm, I don't seem to have any trending products to show right now. "
                       "Would you like me to recommend something based on your browsing history instead?",
                'follow_up_suggestions': ["Show recommendations", "Search for a specific product"]
            }
        
        response_text = "Here are some trending products that customers are loving right now:\n\n"
        for i, product in enumerate(products[:5], 1):
            price = product.get('price', 0)
            formatted_price = f"KES {price:,}"
            response_text += f"{i}. {product.get('name')} - {formatted_price}\n"
        
        response_text += "\nSee anything you like? I can tell you more about any of these!"
        
        return {
            'text': response_text,
            'products': products[:5],
            'follow_up_suggestions': ["Tell me more about the first one", "Show me more trending products", 
                                     "I'm looking for something else"]
        }
    
    def _format_recommendation_response(self, products: List[Dict]) -> Dict:
        """Format general recommendation response."""
        if not products:
            return {
                'text': "I don't have enough information yet to make personalized recommendations. "
                       "Mind telling me what kind of products you're interested in?",
                'follow_up_suggestions': ["Show trending products", "What's on sale?"]
            }
        
        response_text = "Based on your preferences, I think you might love these:\n\n"
        for i, product in enumerate(products[:5], 1):
            price = product.get('price', 0)
            formatted_price = f"KES {price:,}"
            response_text += f"{i}. {product.get('name')} - {formatted_price}\n"
        
        response_text += "\nAny of these catch your eye? Just let me know which one interests you!"
        
        return {
            'text': response_text,
            'products': products[:5],
            'follow_up_suggestions': ["Tell me about number 2", "Add the first one to my cart", 
                                     "Show me something different"]
        }
    
    def _format_category_recommendation(self, products: List[Dict], category: str) -> Dict:
        """Format category-specific recommendation response."""
        if not products:
            return {
                'text': f"I looked, but couldn't find any {category} products right now. "
                       f"Would you like to see what's popular in other categories?",
                'follow_up_suggestions': [f"Show me popular products", "What's on sale?"]
            }
        
        category_name = category.capitalize()
        response_text = f"I found some amazing {category_name} products that might be perfect for you:\n\n"
        for i, product in enumerate(products[:5], 1):
            price = product.get('price', 0)
            formatted_price = f"KES {price:,}"
            response_text += f"{i}. {product.get('name')} - {formatted_price}\n"
        
        response_text += f"\nThese are our best {category_name} options. Want to know more about any of them?"
        
        return {
            'text': response_text,
            'products': products[:5],
            'category': category,
            'follow_up_suggestions': ["Tell me more about item 3", f"What else do you have in {category_name}?", 
                                     "Add number 1 to my cart"]
        }
    
    def _format_budget_recommendation(self, products: List[Dict], budget: float) -> Dict:
        """Format budget-constrained recommendation response."""
        if not products:
            return {
                'text': f"I couldn't find anything within your budget of KES {budget:,}. "
                       f"Would you like me to show options slightly above this price range, or something else?",
                'follow_up_suggestions': ["Increase my budget", "Show me different products"]
            }
        
        response_text = f"Great news! Here's what fits your budget of KES {budget:,}:\n\n"
        for i, product in enumerate(products[:5], 1):
            price = product.get('price', 0)
            formatted_price = f"KES {price:,}"
            response_text += f"{i}. {product.get('name')} - {formatted_price}\n"
        
        response_text += "\nAny of these options work for you? I can give you more details on any item."
        
        return {
            'text': response_text,
            'products': products[:5],
            'budget': budget,
            'follow_up_suggestions': ["Tell me more about number 2", "Add the first one to my cart", 
                                     "Find something cheaper"]
        }
    
    def _format_cart_response(self, cart: Dict) -> Dict:
        """Format cart contents response."""
        if not cart['items']:
            return {
                'text': "Your shopping cart is empty at the moment. Ready to discover something amazing?",
                'follow_up_suggestions': ["Show me trending products", "What do you recommend?"]
            }
        
        response_text = f"Here's what's in your cart ({cart['count']} item{'s' if cart['count'] > 1 else ''}):\n\n"
        for i, item in enumerate(cart['items'], 1):
            price = item['price']
            quantity = item['quantity']
            subtotal = price * quantity
            formatted_price = f"KES {price:,}"
            formatted_subtotal = f"KES {subtotal:,}"
            response_text += f"{i}. {item['name']} - {formatted_price} x {quantity} = {formatted_subtotal}\n"
        
        formatted_total = f"KES {cart['total']:,}"
        response_text += f"\nTotal: {formatted_total}"
        
        if cart['count'] > 0:
            response_text += "\n\nReady to checkout or would you like to keep shopping?"
        
        return {
            'text': response_text,
            'cart': cart,
            'follow_up_suggestions': ["Checkout now", "Continue shopping", "Remove an item"]
        }
    
    def _format_search_response(self, products: List[Dict], query: str) -> Dict:
        """Format search results response."""
        if not products:
            return {
                'text': f"I searched for '{query}' but couldn't find any matches. "
                       f"Want to try different keywords or browse our categories instead?",
                'query': query,
                'follow_up_suggestions': ["Show trending products", "Browse categories"]
            }
        
        response_text = f"Here's what I found for '{query}':\n\n"
        for i, product in enumerate(products[:5], 1):
            price = product.get('price', 0)
            formatted_price = f"KES {price:,}"
            response_text += f"{i}. {product.get('name')} - {formatted_price}\n"
        
        response_text += "\nSee something you like? I can provide more details on any product."
        
        return {
            'text': response_text,
            'products': products[:5],
            'query': query,
            'follow_up_suggestions': ["Tell me more about the first one", f"Show more results for '{query}'", 
                                     "I'm looking for something else"]
        }

    def _format_product_details(self, product: Dict) -> Dict:
        """Format detailed information about a specific product."""
        if not product:
            return {
                'text': "I'm sorry, but I couldn't find any details about that product. Would you like to see other options?",
                'follow_up_suggestions': ["Show me trending products", "Browse categories"]
            }
        
        # Format price nicely
        price = product.get('price', 0)
        formatted_price = f"KES {price:,}"
        
        # Create a detailed response
        details = []
        if 'description' in product and product['description']:
            details.append(product['description'])
        if 'specs' in product and product['specs']:
            specs = product['specs']
            if isinstance(specs, dict):
                for key, value in specs.items():
                    details.append(f"• {key}: {value}")
            elif isinstance(specs, str):
                details.append(f"• Specifications: {specs}")
        
        # Add stock information
        stock = product.get('stock', 0)
        stock_text = "In Stock" if stock > 0 else "Out of Stock"
        if stock > 0 and stock <= 5:
            stock_text = f"Only {stock} left in stock!"
        
        # Compile full response
        response_text = f"**{product.get('name')}**\n\n"
        response_text += f"Price: {formatted_price}\n"
        response_text += f"Availability: {stock_text}\n\n"
        
        if details:
            response_text += "**Product Details:**\n" + "\n".join(details)
        
        # Add review summary if available
        if 'avg_rating' in product:
            rating = product.get('avg_rating')
            response_text += f"\n\nCustomer Rating: {rating}/5"
            
        return {
            'text': response_text,
            'product': product,
            'follow_up_suggestions': ["Add this to my cart", "Show me similar products", "Go back to all products"]
        }

    def _get_from_cache(self, cache_key: str, cache_type: str = 'product') -> Optional[Any]:
        """
        Get data from cache if it exists and hasn't expired.
        
        Parameters:
        -----------
        cache_key : str
            Unique key for the cached item
        cache_type : str
            Type of cache to use ('product', 'category', or 'search')
            
        Returns:
        --------
        Any or None
            Cached data if available and fresh, None otherwise
        """
        cache = None
        if cache_type == 'product':
            cache = self.product_cache
        elif cache_type == 'category':
            cache = self.category_cache
        elif cache_type == 'search':
            cache = self.search_cache
        
        if not cache or cache_key not in cache:
            return None
        
        # Check expiry
        if cache_key not in self.cache_expiry:
            return None
        
        if datetime.now() > self.cache_expiry[cache_key]:
            # Expired cache entry
            return None
        
        return cache[cache_key]
    
    def _add_to_cache(self, cache_key: str, data: Any, cache_type: str = 'product', ttl: int = None) -> None:
        """
        Add data to cache with expiry time.
        
        Parameters:
        -----------
        cache_key : str
            Unique key for the cached item
        data : Any
            Data to store in cache
        cache_type : str
            Type of cache to use ('product', 'category', or 'search')
        ttl : int, optional
            Time to live in seconds, uses default if None
        """
        if ttl is None:
            ttl = self.cache_ttl
        
        cache = None
        if cache_type == 'product':
            cache = self.product_cache
        elif cache_type == 'category':
            cache = self.category_cache
        elif cache_type == 'search':
            cache = self.search_cache
        
        if cache is not None:
            cache[cache_key] = data
            # Set expiry time
            self.cache_expiry[cache_key] = datetime.now() + timedelta(seconds=ttl)
            
            # Clean up old cache entries to prevent memory growth
            self._cleanup_cache()
    
    def _cleanup_cache(self) -> None:
        """Removes expired cache entries."""
        current_time = datetime.now()
        expired_keys = []
        
        for key, expiry_time in self.cache_expiry.items():
            if current_time > expiry_time:
                expired_keys.append(key)
        
        for key in expired_keys:
            self.cache_expiry.pop(key, None)
            self.product_cache.pop(key, None)
            self.category_cache.pop(key, None)
            self.search_cache.pop(key, None)
            
        # If cache is getting too large, remove oldest entries
        max_cache_size = 1000  # Limit cache size to prevent memory issues
        if len(self.cache_expiry) > max_cache_size:
            # Sort by expiry time and remove oldest entries
            oldest_entries = sorted(self.cache_expiry.items(), key=lambda x: x[1])[:len(self.cache_expiry) - max_cache_size]
            for key, _ in oldest_entries:
                self.cache_expiry.pop(key, None)
                self.product_cache.pop(key, None)
                self.category_cache.pop(key, None)
                self.search_cache.pop(key, None)

# Create a singleton instance for import
recommendation_engine = RecommendationEngine()