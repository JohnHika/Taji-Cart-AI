"""
Data Collector Module for TajiCart-AI Recommendation System

This module handles data collection and preparation for the recommendation system.
It provides functionality to fetch user-item interactions from MongoDB and transform
them into the format required by LightFM.
"""

import hashlib
import json
import logging
import os
import pickle
import shutil
import threading
import time
from datetime import datetime
from functools import lru_cache

import numpy as np
import pandas as pd
from scipy.sparse import coo_matrix

# Local imports
from .mongo_data_access import MongoDataAccess

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join('logs', f'data_collector_{datetime.now().strftime("%Y%m%d")}.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('data_collector')

# Try to import schedule, but make it optional
try:
    import schedule
    SCHEDULE_AVAILABLE = True
except ImportError:
    logger.warning("Schedule package not available. Background scheduling will be disabled. Run 'pip install schedule' to enable this feature.")
    SCHEDULE_AVAILABLE = False

# Ensure necessary directories exist
for directory in ['logs', 'cache', 'training_data']:
    os.makedirs(directory, exist_ok=True)

class DataCollector:
    """Class to collect and prepare data for the recommendation system"""
    
    def __init__(self, mongo_uri=None, cache_dir=None, cache_ttl=3600):
        """
        Initialize the DataCollector
        
        Parameters:
        -----------
        mongo_uri : str, optional
            MongoDB connection URI. If not provided, it will be read from the 
            MONGO_URI environment variable.
        cache_dir : str, optional
            Directory to store cache files. Default is 'cache' subdirectory.
        cache_ttl : int, optional
            Cache time-to-live in seconds. Default is 1 hour.
        """
        # Initialize MongoDB data access
        self.data_access = MongoDataAccess(uri=mongo_uri)
        
        # Set up caching
        self.cache_ttl = cache_ttl
        self.cache_dir = cache_dir or os.path.join(os.path.dirname(__file__), 'cache')
        
        # Create cache directory if it doesn't exist
        os.makedirs(self.cache_dir, exist_ok=True)
            
        # Cache timestamps
        self.cache_timestamps = {}
        
        # Start background scheduler for periodic data extraction if available
        if SCHEDULE_AVAILABLE:
            self._start_scheduler()
            logger.info(f"DataCollector initialized with cache TTL: {cache_ttl} seconds and background scheduler")
        else:
            logger.info(f"DataCollector initialized with cache TTL: {cache_ttl} seconds (no background scheduler)")

    def _start_scheduler(self):
        """Set up and start the background scheduler for periodic tasks"""
        if not SCHEDULE_AVAILABLE:
            logger.warning("Cannot start scheduler: schedule package is not available")
            return

        # Define background job to refresh cache
        def refresh_cache_job():
            logger.info("Running scheduled cache refresh")
            self.refresh_all_cached_data()

        # Define background job to extract data for model training
        def extract_training_data_job():
            logger.info("Running scheduled data extraction for model training")
            self.extract_data_for_training()

        # Schedule jobs
        schedule.every().day.at("03:00").do(refresh_cache_job)  # Refresh cache every day at 3 AM
        schedule.every().monday.at("02:00").do(extract_training_data_job)  # Extract training data every Monday at 2 AM

        # Start scheduler in background thread
        def run_scheduler():
            while True:
                schedule.run_pending()
                time.sleep(60)  # Check every minute

        # Start scheduler thread as daemon so it exits when the main program exits
        scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
        scheduler_thread.start()
        logger.info("Background scheduler started for periodic data tasks")

    def _get_cache_path(self, cache_key):
        """Get the file path for a cache item"""
        return os.path.join(self.cache_dir, f"{cache_key}.pkl")

    def _is_cache_valid(self, cache_key):
        """Check if cache is valid (exists and not expired)"""
        cache_path = self._get_cache_path(cache_key)
        
        # Check if file exists
        if not os.path.exists(cache_path):
            return False
            
        # Check if cache is expired
        last_modified = os.path.getmtime(cache_path)
        return time.time() - last_modified < self.cache_ttl

    def _save_to_cache(self, cache_key, data):
        """Save data to cache"""
        cache_path = self._get_cache_path(cache_key)
        
        try:
            with open(cache_path, 'wb') as f:
                pickle.dump(data, f)
            
            self.cache_timestamps[cache_key] = time.time()
            logger.debug(f"Data saved to cache: {cache_key}")
            return True
        except Exception as e:
            logger.error(f"Error saving data to cache ({cache_key}): {str(e)}")
            return False

    def _load_from_cache(self, cache_key):
        """Load data from cache if valid"""
        if not self._is_cache_valid(cache_key):
            return None
            
        cache_path = self._get_cache_path(cache_key)
        
        try:
            with open(cache_path, 'rb') as f:
                data = pickle.load(f)
            
            logger.debug(f"Data loaded from cache: {cache_key}")
            return data
        except Exception as e:
            logger.error(f"Error loading data from cache ({cache_key}): {str(e)}")
            return None

    def refresh_all_cached_data(self):
        """Force refresh all cached data"""
        logger.info("Refreshing all cached data")
        
        # Get fresh interactions
        _ = self.get_user_item_interactions(use_cache=False)
        
        # Get fresh item features
        _ = self.get_item_features(use_cache=False)
        
        # Get fresh user features
        _ = self.get_user_features(use_cache=False)
        
        logger.info("All cached data refreshed successfully")

    def get_user_item_interactions(self, interaction_types=None, filters=None, days_limit=None, 
                                  use_cache=True, min_interactions_per_user=None):
        """
        Collect user-item interactions from various sources
        
        Parameters:
        -----------
        interaction_types : list, optional
            Types of interactions to collect. Default is ['purchase', 'view', 'cart', 'wishlist']
        filters : dict, optional
            Additional filters to apply to the interactions query
        days_limit : int, optional
            Limit to interactions from the last N days
        use_cache : bool, optional
            Whether to use cached data if available
        min_interactions_per_user : int, optional
            Filter out users with fewer than this many interactions
        
        Returns:
        --------
        pd.DataFrame
            DataFrame with columns: user_id, item_id, interaction_type, weight
        """
        # Create safe cache key using JSON serialization and MD5 hashing
        interaction_types_str = json.dumps(interaction_types, sort_keys=True) if interaction_types else "none"
        filters_str = json.dumps(filters, sort_keys=True) if filters else "none"
        days_limit_str = str(days_limit) if days_limit is not None else "none"
        
        # Create key string and hash it
        key_str = f"interactions_{interaction_types_str}_{days_limit_str}_{filters_str}"
        cache_key = hashlib.md5(key_str.encode()).hexdigest()
        
        # Try loading from cache
        if use_cache:
            cached_data = self._load_from_cache(cache_key)
            if cached_data is not None:
                return cached_data
        
        try:
            # Use MongoDataAccess to fetch interactions - explicitly request DataFrame
            interactions_df = self.data_access.get_all_interactions(days_limit=days_limit, as_dataframe=True)
            
            # Check if the result is empty or not a DataFrame
            if not isinstance(interactions_df, pd.DataFrame):
                logger.warning("Interactions not returned as DataFrame, converting...")
                interactions_df = pd.DataFrame(interactions_df) if interactions_df else pd.DataFrame(
                    columns=['user_id', 'item_id', 'interaction_type', 'weight', 'timestamp']
                )
            
            # Check if DataFrame is empty
            if interactions_df.empty:
                logger.warning("No interactions found")
                return pd.DataFrame(columns=['user_id', 'item_id', 'interaction_type', 'weight', 'timestamp'])
            
            # Check if required columns exist
            required_columns = ['user_id', 'item_id', 'interaction_type', 'weight']
            missing_columns = [col for col in required_columns if col not in interactions_df.columns]
            if missing_columns:
                logger.error(f"Missing required columns in interactions data: {missing_columns}")
                return pd.DataFrame(columns=['user_id', 'item_id', 'interaction_type', 'weight', 'timestamp'])
            
            # Filter by interaction types if specified
            if interaction_types:
                interactions_df = interactions_df[interactions_df['interaction_type'].isin(interaction_types)]
            
            # Apply custom filters if specified
            if filters:
                for field, value in filters.items():
                    if field in interactions_df.columns:
                        if isinstance(value, (list, tuple)):
                            interactions_df = interactions_df[interactions_df[field].isin(value)]
                        elif isinstance(value, dict) and ('min' in value or 'max' in value):
                            if 'min' in value:
                                interactions_df = interactions_df[interactions_df[field] >= value['min']]
                            if 'max' in value:
                                interactions_df = interactions_df[interactions_df[field] <= value['max']]
                        else:
                            interactions_df = interactions_df[interactions_df[field] == value]
            
            # Filter users with too few interactions
            if min_interactions_per_user and not interactions_df.empty:
                user_counts = interactions_df['user_id'].value_counts()
                valid_users = user_counts[user_counts >= min_interactions_per_user].index
                interactions_df = interactions_df[interactions_df['user_id'].isin(valid_users)]
            
            logger.info(f"Collected {len(interactions_df)} interactions")
            
            # Save to cache
            if use_cache:
                self._save_to_cache(cache_key, interactions_df)
            
            return interactions_df
            
        except Exception as e:
            logger.error(f"Error collecting user-item interactions: {str(e)}")
            return pd.DataFrame(columns=['user_id', 'item_id', 'interaction_type', 'weight', 'timestamp'])
    
    def get_item_features(self, filters=None, use_cache=True):
        """
        Collect item (product) features
        
        Parameters:
        -----------
        filters : dict, optional
            Filters to apply to the products query
        use_cache : bool, optional
            Whether to use cached data if available
        
        Returns:
        --------
        dict
            Dictionary mapping item IDs to feature dictionaries
        """
        # Create safe cache key using JSON serialization and MD5 hashing
        filters_str = json.dumps(filters, sort_keys=True) if filters else "none"
        key_str = f"item_features_{filters_str}"
        cache_key = hashlib.md5(key_str.encode()).hexdigest()
        
        # Try loading from cache
        if use_cache:
            cached_data = self._load_from_cache(cache_key)
            if cached_data is not None:
                return cached_data
                
        try:
            # Explicitly request as DataFrame
            products_df = self.data_access.get_products(as_dataframe=True)
            
            # Check if the result is empty or not a DataFrame
            if not isinstance(products_df, pd.DataFrame):
                logger.warning("Products not returned as DataFrame, converting...")
                products_df = pd.DataFrame(products_df) if products_df else pd.DataFrame()
            
            # Apply filters if specified and DataFrame is not empty
            if filters and not products_df.empty:
                for field, value in filters.items():
                    if field in products_df.columns:
                        if isinstance(value, (list, tuple)):
                            products_df = products_df[products_df[field].isin(value)]
                        elif isinstance(value, dict) and ('min' in value or 'max' in value):
                            if 'min' in value:
                                products_df = products_df[products_df[field] >= value['min']]
                            if 'max' in value:
                                products_df = products_df[products_df[field] <= value['max']]
                        else:
                            products_df = products_df[products_df[field] == value]
            
            # Convert DataFrame to feature dictionary
            item_features = {}
            
            # Only process if DataFrame is not empty and has '_id' column
            if not products_df.empty and '_id' in products_df.columns:
                for _, row in products_df.iterrows():
                    product_id = str(row.get('_id'))
                    
                    # Extract features
                    features = {}
                    
                    # Category features
                    category = row.get('category')
                    if category:
                        if isinstance(category, list):
                            for cat in category:
                                cat_id = str(cat)
                                features[f'category_{cat_id}'] = 1.0
                        else:
                            features[f'category_{category}'] = 1.0
                    
                    # Brand feature
                    brand = row.get('brand')
                    if brand:
                        features[f'brand_{brand}'] = 1.0
                    
                    # Tags features
                    tags = row.get('tags', [])
                    if tags and isinstance(tags, list):
                        for tag in tags:
                            features[f'tag_{tag}'] = 1.0
                    
                    # Price feature (normalized)
                    price = row.get('price')
                    if price and isinstance(price, (int, float)):
                        features['price'] = float(price)
                    
                    # Stock availability
                    stock = row.get('stock')
                    if stock and isinstance(stock, (int, float)):
                        features['in_stock'] = 1.0 if stock > 0 else 0.0
                    
                    # Rating feature if available
                    rating = row.get('rating')
                    if rating and isinstance(rating, (int, float)):
                        features['rating'] = float(rating)
                    
                    item_features[product_id] = features
            
            logger.info(f"Collected features for {len(item_features)} products")
            
            # Save to cache
            if use_cache:
                self._save_to_cache(cache_key, item_features)
            
            return item_features
            
        except Exception as e:
            logger.error(f"Error collecting item features: {str(e)}")
            return {}
    
    def get_user_features(self, filters=None, use_cache=True):
        """
        Collect user features
        
        Parameters:
        -----------
        filters : dict, optional
            Filters to apply to the users query
        use_cache : bool, optional
            Whether to use cached data if available
        
        Returns:
        --------
        dict
            Dictionary mapping user IDs to feature dictionaries
        """
        # Create safe cache key using JSON serialization and MD5 hashing
        filters_str = json.dumps(filters, sort_keys=True) if filters else "none"
        key_str = f"user_features_{filters_str}"
        cache_key = hashlib.md5(key_str.encode()).hexdigest()
        
        # Try loading from cache
        if use_cache:
            cached_data = self._load_from_cache(cache_key)
            if cached_data is not None:
                return cached_data
                
        try:
            # Explicitly request as DataFrame
            users_df = self.data_access.get_users(as_dataframe=True)
            
            # Check if the result is empty or not a DataFrame
            if not isinstance(users_df, pd.DataFrame):
                logger.warning("Users not returned as DataFrame, converting...")
                users_df = pd.DataFrame(users_df) if users_df else pd.DataFrame()
            
            # Apply filters if specified and DataFrame is not empty
            if filters and not users_df.empty:
                for field, value in filters.items():
                    if field in users_df.columns:
                        if isinstance(value, (list, tuple)):
                            users_df = users_df[users_df[field].isin(value)]
                        elif isinstance(value, dict) and ('min' in value or 'max' in value):
                            if 'min' in value:
                                users_df = users_df[users_df[field] >= value['min']]
                            if 'max' in value:
                                users_df = users_df[users_df[field] <= value['max']]
                        else:
                            users_df = users_df[users_df[field] == value]
            
            # Convert DataFrame to feature dictionary
            user_features = {}
            
            # Only process if DataFrame is not empty and has '_id' column
            if not users_df.empty and '_id' in users_df.columns:
                for _, row in users_df.iterrows():
                    user_id = str(row.get('_id'))
                    
                    # Extract features
                    features = {}
                    
                    # User preferences
                    preferences = row.get('preferences', {})
                    if preferences:
                        # Category preferences
                        preferred_categories = preferences.get('categories', [])
                        if preferred_categories and isinstance(preferred_categories, list):
                            for cat in preferred_categories:
                                features[f'prefers_category_{cat}'] = 1.0
                        
                        # Brand preferences
                        preferred_brands = preferences.get('brands', [])
                        if preferred_brands and isinstance(preferred_brands, list):
                            for brand in preferred_brands:
                                features[f'prefers_brand_{brand}'] = 1.0
                    
                    # Loyalty information
                    loyalty_card = row.get('loyaltyCard')
                    if loyalty_card:
                        tier = loyalty_card.get('tier', 'Basic')
                        points = loyalty_card.get('points', 0)
                        
                        tier_mapping = {
                            'Basic': 0,
                            'Bronze': 1,
                            'Silver': 2,
                            'Gold': 3,
                            'Platinum': 4
                        }
                        
                        tier_value = tier_mapping.get(tier, 0)
                        features['loyalty_tier'] = tier_value / 4.0  # Normalize to [0, 1]
                        
                        # Add loyalty points as a feature (normalized)
                        if points > 0:
                            features['loyalty_points'] = min(1.0, points / 10000.0)  # Cap at 10,000 points
                    
                    user_features[user_id] = features
            
            logger.info(f"Collected features for {len(user_features)} users")
            
            # Save to cache
            if use_cache:
                self._save_to_cache(cache_key, user_features)
            
            return user_features
            
        except Exception as e:
            logger.error(f"Error collecting user features: {str(e)}")
            return {}

    def get_orders(self, days_limit=None, as_dataframe=True):
        """
        Fetch order data from the database with improved error handling.
        
        Parameters:
        -----------
        days_limit : int, optional
            Limit orders to those created within the specified number of days
        as_dataframe : bool, optional
            If True, returns data as a pandas DataFrame, otherwise as a list of dicts
            
        Returns:
        --------
        pd.DataFrame or list
            Order data as interactions
        """
        try:
            # Create a dry-run counter for interactions
            interaction_count = 0
            
            query = {}
            if days_limit:
                # Calculate date threshold
                date_threshold = datetime.now()
                date_threshold = date_threshold.replace(
                    hour=0, minute=0, second=0, microsecond=0
                )
                date_threshold = date_threshold - pd.Timedelta(days=days_limit)
                
                query = {'createdAt': {'$gte': date_threshold}}
                logger.info(f"Fetching orders from the last {days_limit} days...")
            else:
                logger.info("Fetching all orders...")
            
            # Define projection to include only needed fields
            projection = {
                '_id': 1,
                'userId': 1,
                'items': 1,
                'totalAmount': 1,
                'createdAt': 1,
                'status': 1
            }
            
            try:
                # Resolve collection name
                collection_name = self.data_access.resolve_collection_name('orders')
                
                # Fetch orders
                orders = list(self.data_access.db[collection_name].find(query, projection))
                logger.info(f"Found {len(orders)} orders in database")
                
            except ValueError as e:
                logger.warning(f"Error resolving orders collection: {str(e)}")
                return pd.DataFrame() if as_dataframe else []
                
            # Convert ObjectIds to strings
            orders = self.data_access._convert_objectids_to_str(orders)
            
            # Extract user-item interactions from orders
            interactions = []
            orders_with_no_items = 0
            orders_with_invalid_items = 0
            
            for order in orders:
                user_id = order.get('userId')
                order_id = order.get('_id', 'unknown')
                created_at = order.get('createdAt', datetime.now())
                
                # Skip orders with missing user ID
                if not user_id:
                    logger.warning(f"Order {order_id} has no userId, skipping")
                    continue
                
                # Check if order has items
                items = order.get('items', [])
                if not items:
                    orders_with_no_items += 1
                    continue
                
                has_valid_items = False
                for item in items:
                    if 'productId' in item:
                        has_valid_items = True
                        interaction_count += 1
                        interactions.append({
                            'user_id': user_id,
                            'item_id': item['productId'],
                            'interaction_type': 'purchase',
                            'quantity': item.get('quantity', 1),
                            'timestamp': created_at,
                            'order_id': order_id
                        })
                
                if not has_valid_items:
                    orders_with_invalid_items += 1
                    logger.warning(f"Order {order_id} has items but no productId fields")
            
            # Log summary information
            if orders_with_no_items > 0:
                logger.warning(f"{orders_with_no_items} orders had no items array")
            if orders_with_invalid_items > 0:
                logger.warning(f"{orders_with_invalid_items} orders had items but no valid productId fields")
            
            logger.info(f"Successfully extracted {len(interactions)} purchase interactions from {len(orders)} orders")
            
            if as_dataframe and interactions:
                return pd.DataFrame(interactions)
            else:
                return interactions
                
        except Exception as e:
            logger.error(f"Error fetching order data: {str(e)}")
            return pd.DataFrame() if as_dataframe else []

    def get_cart_items(self, days_limit=None, as_dataframe=True):
        """
        Fetch cart data from MongoDB with improved error handling.
        
        Parameters:
        -----------
        days_limit : int, optional
            Limit cart items to those created within the specified number of days
        as_dataframe : bool, optional
            If True, returns data as a pandas DataFrame, otherwise as a list of dicts
            
        Returns:
        --------
        pd.DataFrame or list
            Cart data as interactions
        """
        try:
            # Create a dry-run counter for interactions
            interaction_count = 0
            
            query = {}
            if days_limit:
                # Calculate date threshold
                date_threshold = datetime.now() - pd.Timedelta(days=days_limit)
                query = {'createdAt': {'$gte': date_threshold}}
                logger.info(f"Fetching cart items from the last {days_limit} days...")
            else:
                logger.info("Fetching all cart items...")
            
            try:
                # Resolve collection name
                collection_name = self.data_access.resolve_collection_name('cartproducts')
                
                # Fetch cart items
                cart_items = list(self.data_access.db[collection_name].find(query))
                logger.info(f"Found {len(cart_items)} cart items in database")
                
            except ValueError as e:
                logger.warning(f"Error resolving cart products collection: {str(e)}")
                return pd.DataFrame() if as_dataframe else []
                
            # Convert ObjectIds to strings
            cart_items = self.data_access._convert_objectids_to_str(cart_items)
            
            # Convert to interactions format
            interactions = []
            items_missing_user = 0
            items_missing_product = 0
            
            for item in cart_items:
                user_id = item.get('userId')
                product_id = item.get('productId')
                
                # Skip entries without user or product IDs
                if not user_id:
                    items_missing_user += 1
                    continue
                    
                if not product_id:
                    items_missing_product += 1
                    logger.warning(f"Cart item for user {user_id} has no productId")
                    continue
                
                interaction_count += 1
                interactions.append({
                    'user_id': user_id,
                    'item_id': product_id,
                    'interaction_type': 'cart',
                    'count': item.get('quantity', 1),
                    'timestamp': item.get('createdAt', datetime.now())
                })
            
            # Log summary information
            if items_missing_user > 0:
                logger.warning(f"{items_missing_user} cart items had no userId")
            if items_missing_product > 0:
                logger.warning(f"{items_missing_product} cart items had no productId")
            
            logger.info(f"Successfully extracted {len(interactions)} cart item interactions")
            
            if as_dataframe and interactions:
                return pd.DataFrame(interactions)
            else:
                return interactions
                
        except Exception as e:
            logger.error(f"Error fetching cart item data: {str(e)}")
            return pd.DataFrame() if as_dataframe else []

    def get_product_views(self, days_limit=None, as_dataframe=True):
        """
        Fetch product view data from MongoDB with improved error handling.
        
        Parameters:
        -----------
        days_limit : int, optional
            Limit views to those created within the specified number of days
        as_dataframe : bool, optional
            If True, returns data as a pandas DataFrame, otherwise as a list of dicts
            
        Returns:
        --------
        pd.DataFrame or list
            Product view data as interactions
        """
        try:
            # Create a dry-run counter for interactions
            interaction_count = 0
            
            query = {}
            if days_limit:
                # Calculate date threshold
                date_threshold = datetime.now() - pd.Timedelta(days=days_limit)
                query = {'timestamp': {'$gte': date_threshold}}
                logger.info(f"Fetching product views from the last {days_limit} days...")
            else:
                logger.info("Fetching all product views...")
            
            # Define projection to include only needed fields
            projection = {
                '_id': 1,
                'userId': 1,
                'productId': 1,
                'timestamp': 1,
                'viewDuration': 1,
                'sessionId': 1
            }
            
            # Try multiple possible collection names for product views
            collection_found = False
            views = []
            
            for collection_name in ['productviews', 'productViews', 'ProductViews', 'product_views']:
                try:
                    # Resolve collection name
                    actual_name = self.data_access.resolve_collection_name(collection_name)
                    
                    # Fetch product views
                    views = list(self.data_access.db[actual_name].find(query, projection))
                    logger.info(f"Found {len(views)} product views in collection '{actual_name}'")
                    collection_found = True
                    break
                    
                except ValueError:
                    continue
            
            if not collection_found:
                logger.warning("Product views collection not found. Tried: productviews, productViews, ProductViews, product_views")
                return pd.DataFrame() if as_dataframe else []
                
            # Convert ObjectIds to strings
            views = self.data_access._convert_objectids_to_str(views)
            
            # Convert to interactions format
            interactions = []
            views_missing_user = 0
            views_missing_product = 0
            
            for view in views:
                user_id = view.get('userId')
                product_id = view.get('productId')
                
                # Skip entries without user or product IDs
                if not user_id:
                    views_missing_user += 1
                    continue
                    
                if not product_id:
                    views_missing_product += 1
                    logger.warning(f"View for user {user_id} has no productId")
                    continue
                
                interaction_count += 1
                interactions.append({
                    'user_id': user_id,
                    'item_id': product_id,
                    'interaction_type': 'view',
                    'count': 1,  # Count each view as 1 interaction
                    'timestamp': view.get('timestamp', datetime.now()),
                    'duration': view.get('viewDuration', 0),
                    'session_id': view.get('sessionId')
                })
            
            # Log summary information
            if views_missing_user > 0:
                logger.warning(f"{views_missing_user} product views had no userId")
            if views_missing_product > 0:
                logger.warning(f"{views_missing_product} product views had no productId")
            
            logger.info(f"Successfully extracted {len(interactions)} product view interactions")
            
            if as_dataframe and interactions:
                return pd.DataFrame(interactions)
            else:
                return interactions
                
        except Exception as e:
            logger.error(f"Error fetching product view data: {str(e)}")
            return pd.DataFrame() if as_dataframe else []

    def get_all_interactions(self, days_limit=None, as_dataframe=True):
        """
        Fetch all user-item interactions from the database.
        
        Parameters:
        -----------
        days_limit : int, optional
            Limit interactions to those created within the specified number of days
        as_dataframe : bool, optional
            If True, returns data as a pandas DataFrame, otherwise as a list of dicts
            
        Returns:
        --------
        pd.DataFrame or list
            All user-item interactions
        """
        try:
            logger.info("Fetching all interactions...")
            
            # Get interactions from different sources
            purchase_interactions = self.get_orders(days_limit=days_limit, as_dataframe=False)
            cart_interactions = self.get_cart_items(days_limit=days_limit, as_dataframe=False)
            view_interactions = self.get_product_views(days_limit=days_limit, as_dataframe=False)
            
            # Log counts for each interaction type (dry-run information)
            logger.info(f"Interaction counts by type: Purchases: {len(purchase_interactions)}, "
                       f"Cart: {len(cart_interactions)}, Views: {len(view_interactions)}")
            
            # Combine all interactions
            all_interactions = purchase_interactions + cart_interactions + view_interactions
            
            # Assign weights based on interaction type
            for interaction in all_interactions:
                if interaction['interaction_type'] == 'purchase':
                    interaction['weight'] = 5.0
                elif interaction['interaction_type'] == 'cart':
                    interaction['weight'] = 3.0
                elif interaction['interaction_type'] == 'view':
                    view_count = interaction.get('count', 1)
                    interaction['weight'] = min(2.0, 0.5 + (0.1 * view_count))
                else:
                    interaction['weight'] = 1.0
            
            logger.info(f"Successfully compiled {len(all_interactions)} total interactions")
            
            if as_dataframe and all_interactions:
                return pd.DataFrame(all_interactions)
            else:
                return all_interactions
                
        except Exception as e:
            logger.error(f"Error fetching all interactions: {str(e)}")
            return pd.DataFrame() if as_dataframe else []

    def prepare_lightfm_data(self, interactions_df):
        """
        Convert interactions DataFrame to LightFM-compatible interaction matrix
        
        Parameters:
        -----------
        interactions_df : pd.DataFrame
            DataFrame with columns: user_id, item_id, weight
        
        Returns:
        --------
        tuple
            (interaction_matrix, user_mapping, item_mapping)
        """
        try:
            # Check if DataFrame is empty
            if interactions_df.empty:
                logger.warning("Empty interactions DataFrame, returning empty matrix")
                return coo_matrix((0, 0)), {}, {}
                
            # Check if required columns exist
            required_columns = ['user_id', 'item_id', 'weight']
            missing_columns = [col for col in required_columns if col not in interactions_df.columns]
            if missing_columns:
                logger.error(f"Missing required columns in interactions data: {missing_columns}")
                return coo_matrix((0, 0)), {}, {}
            
            # Create mappings from IDs to indices
            unique_users = interactions_df['user_id'].unique()
            unique_items = interactions_df['item_id'].unique()
            
            user_mapping = {user_id: idx for idx, user_id in enumerate(unique_users)}
            item_mapping = {item_id: idx for idx, item_id in enumerate(unique_items)}
            
            # Map IDs to indices
            interactions_df['user_idx'] = interactions_df['user_id'].map(user_mapping)
            interactions_df['item_idx'] = interactions_df['item_id'].map(item_mapping)
            
            # Create COO matrix for interactions
            interaction_matrix = coo_matrix(
                (
                    interactions_df['weight'].values,
                    (interactions_df['user_idx'].values, interactions_df['item_idx'].values)
                ),
                shape=(len(user_mapping), len(item_mapping))
            )
            
            logger.info(f"Created interaction matrix with shape {interaction_matrix.shape}")
            return interaction_matrix, user_mapping, item_mapping
            
        except Exception as e:
            logger.error(f"Error preparing LightFM data: {str(e)}")
            return coo_matrix((0, 0)), {}, {}

    def extract_data_for_training(self, output_dir=None):
        """
        Extract and save data for model training
        
        Parameters:
        -----------
        output_dir : str, optional
            Directory to save extracted data. Default is 'training_data' subdirectory.
        """
        output_dir = output_dir or os.path.join(os.path.dirname(__file__), 'training_data')
        
        # Create directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
            
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        try:
            # Get fresh data
            interactions_df = self.get_user_item_interactions(use_cache=False)
            item_features_dict = self.get_item_features(use_cache=False)
            user_features_dict = self.get_user_features(use_cache=False)
            
            # Prepare data for LightFM
            interaction_matrix, user_mapping, item_mapping = self.prepare_lightfm_data(interactions_df)
            
            # Save all data
            data_package = {
                'interactions_df': interactions_df,
                'item_features': item_features_dict,
                'user_features': user_features_dict,
                'interaction_matrix': interaction_matrix,
                'user_mapping': user_mapping,
                'item_mapping': item_mapping,
                'timestamp': datetime.now(),
                'metadata': {
                    'num_users': len(user_mapping),
                    'num_items': len(item_mapping),
                    'num_interactions': len(interactions_df)
                }
            }
            
            # Save to file
            output_path = os.path.join(output_dir, f"training_data_{timestamp}.pkl")
            with open(output_path, 'wb') as f:
                pickle.dump(data_package, f)
            
            # Create symbolic link or copy latest file
            latest_path = os.path.join(output_dir, "latest.pkl")
            try:
                if os.path.exists(latest_path):
                    if os.path.islink(latest_path):
                        os.unlink(latest_path)
                    else:
                        os.remove(latest_path)
                
                # On Windows, symbolic links may not work or require admin privileges,
                # so use shutil.copy instead of os.symlink
                shutil.copy(output_path, latest_path)
                logger.info(f"Created copy of latest training data at {latest_path}")
                
            except PermissionError as e:
                logger.warning(f"Permission error creating latest link: {str(e)}")
                # Try making a copy instead
                try:
                    shutil.copy(output_path, latest_path)
                    logger.info(f"Created copy of latest training data at {latest_path}")
                except Exception as e2:
                    logger.error(f"Failed to create latest data file: {str(e2)}")
            except Exception as e:
                logger.error(f"Error creating latest link: {str(e)}")
                # Try making a copy instead
                try:
                    shutil.copy(output_path, latest_path)
                    logger.info(f"Created copy of latest training data at {latest_path}")
                except Exception as e2:
                    logger.error(f"Failed to create latest data file: {str(e2)}")
            
            logger.info(f"Training data extracted and saved to {output_path}")
            
            # Return metadata
            return data_package['metadata']
            
        except Exception as e:
            logger.error(f"Error extracting training data: {str(e)}")
            return None

    def get_recent_active_users(self, days=30, min_interactions=2, limit=None):
        """
        Get recently active users for targeted recommendations
        
        Parameters:
        -----------
        days : int, optional
            Number of days to look back for user activity
        min_interactions : int, optional
            Minimum number of interactions required
        limit : int, optional
            Maximum number of users to return
            
        Returns:
        --------
        list
            List of user IDs
        """
        try:
            # Get recent interactions
            interactions_df = self.get_user_item_interactions(days_limit=days, use_cache=True)
            
            # Count interactions per user
            user_counts = interactions_df['user_id'].value_counts()
            
            # Filter users with minimum interactions
            active_users = user_counts[user_counts >= min_interactions].index.tolist()
            
            # Apply limit if specified
            if limit and len(active_users) > limit:
                active_users = active_users[:limit]
                
            logger.info(f"Found {len(active_users)} recently active users (last {days} days)")
            return active_users
            
        except Exception as e:
            logger.error(f"Error getting recent active users: {str(e)}")
            return []

    def get_trending_products(self, days=7, limit=20):
        """
        Get trending products based on recent interactions with improved pandas handling.
        
        Parameters:
        -----------
        days : int, optional
            Number of days to look back
        limit : int, optional
            Maximum number of products to return
            
        Returns:
        --------
        list
            List of trending product IDs with interaction counts
        """
        try:
            # Get recent interactions
            interactions_df = self.get_user_item_interactions(days_limit=days, use_cache=True)
            
            # If DataFrame is empty, return empty list
            if interactions_df.empty:
                logger.warning("No interactions available for trending products calculation")
                return []
            
            # Weight interactions by type
            weighted_interactions = interactions_df.copy()
            weights = {
                'purchase': 5.0,
                'cart': 2.0,
                'view': 1.0
            }
            
            # Apply type-based weighting
            weighted_interactions['weight_factor'] = weighted_interactions['interaction_type'].map(
                lambda x: weights.get(x, 1.0)
            )
            
            weighted_interactions['score'] = weighted_interactions['weight'] * weighted_interactions['weight_factor']
            
            # Compute interaction score per product using proper aggregation
            # Fix: Use group_keys=False and specify 'by' parameter in sort_values
            product_scores = weighted_interactions.groupby('item_id', group_keys=False).agg(
                score=('score', 'sum')
            ).sort_values(by='score', ascending=False)
            
            # Apply limit
            trending_products = product_scores.head(limit).reset_index()
            
            # Ensure we have the right column names
            if 'score' not in trending_products.columns:
                logger.warning("Score column missing in trending products")
                trending_products['score'] = 0.0
            
            logger.info(f"Found {len(trending_products)} trending products (last {days} days)")
            return trending_products.to_dict('records')
            
        except Exception as e:
            logger.error(f"Error getting trending products: {str(e)}")
            return []

    def debug_mongodb_collections(self):
        """
        Debug MongoDB collections to identify data structure issues.
        This helps diagnose why we're not extracting interactions correctly.
        """
        try:
            logger.info("==== DEBUGGING MONGODB COLLECTIONS ====")
            
            # 1. List all collections in the database
            collections = self.data_access.db.list_collection_names()
            logger.info(f"Available collections in database: {collections}")
            
            # 2. Sample orders to identify structure issues
            try:
                orders_collection = self.data_access.resolve_collection_name('orders')
                sample_orders = list(self.data_access.db[orders_collection].find().limit(3))
                
                if sample_orders:
                    logger.info("Sample order document structure:")
                    for i, order in enumerate(sample_orders):
                        order_id = order.get('_id', 'unknown')
                        user_id = order.get('userId', None)
                        items = order.get('items', [])
                        
                        logger.info(f"Order {i+1} (ID: {order_id}):")
                        logger.info(f"  - userId field exists: {user_id is not None}")
                        logger.info(f"  - userId value: {user_id}")
                        logger.info(f"  - items field exists: {isinstance(items, list)}")
                        logger.info(f"  - items count: {len(items)}")
                        
                        # Check items structure
                        if items and isinstance(items, list):
                            for j, item in enumerate(items[:2]):  # First 2 items for brevity
                                product_id = item.get('productId', None)
                                logger.info(f"    - Item {j+1} productId exists: {product_id is not None}")
                                logger.info(f"    - Item {j+1} productId value: {product_id}")
                                
                                # Log all keys in the item to check field names
                                logger.info(f"    - Item {j+1} keys: {list(item.keys())}")
                else:
                    logger.warning("No orders found to sample")
            except Exception as e:
                logger.error(f"Error examining orders collection: {str(e)}")
            
            # 3. Check cart products collection
            try:
                cart_collection = self.data_access.resolve_collection_name('cartproducts')
                cart_count = self.data_access.db[cart_collection].count_documents({})
                sample_cart = list(self.data_access.db[cart_collection].find().limit(2))
                
                logger.info(f"Cart collection contains {cart_count} documents")
                if sample_cart:
                    logger.info("Sample cart document structure:")
                    for i, item in enumerate(sample_cart):
                        item_id = item.get('_id', 'unknown')
                        user_id = item.get('userId', None)
                        product_id = item.get('productId', None)
                        
                        logger.info(f"Cart item {i+1} (ID: {item_id}):")
                        logger.info(f"  - userId field exists: {user_id is not None}")
                        logger.info(f"  - productId field exists: {product_id is not None}")
                        # Log all keys to check field names
                        logger.info(f"  - All keys: {list(item.keys())}")
                else:
                    logger.warning("No cart items found to sample")
            except Exception as e:
                logger.error(f"Error examining cart collection: {str(e)}")
            
            # 4. Search for any collection that might contain product views
            view_collections = []
            for collection_name in collections:
                lower_name = collection_name.lower()
                if 'view' in lower_name or 'product' in lower_name:
                    view_collections.append(collection_name)
            
            logger.info(f"Potential product view collections: {view_collections}")
            
            # If we found potential view collections, examine them
            for collection_name in view_collections:
                try:
                    count = self.data_access.db[collection_name].count_documents({})
                    logger.info(f"Collection '{collection_name}' contains {count} documents")
                    
                    if count > 0:
                        sample = list(self.data_access.db[collection_name].find().limit(1))
                        if sample:
                            logger.info(f"Sample from '{collection_name}': {list(sample[0].keys())}")
                except Exception as e:
                    logger.error(f"Error examining collection {collection_name}: {str(e)}")
            
            logger.info("==== DEBUGGING COMPLETE ====")
            
        except Exception as e:
            logger.error(f"Error in debug_mongodb_collections: {str(e)}")
    
    def fix_order_extraction(self, enable_debug=True):
        """
        Attempt to fix order extraction by analyzing document structure and adapting to it.
        
        Parameters:
        -----------
        enable_debug : bool
            Whether to print detailed debug information
            
        Returns:
        --------
        list
            List of extracted interactions
        """
        try:
            logger.info("Attempting to fix order extraction...")
            
            # Resolve collection name
            collection_name = self.data_access.resolve_collection_name('orders')
            
            # Get all orders with flexible projection
            orders = list(self.data_access.db[collection_name].find({}))
            logger.info(f"Found {len(orders)} orders in database")
            
            if enable_debug and orders:
                # Examine field names in the first order
                first_order = orders[0]
                logger.info(f"First order fields: {list(first_order.keys())}")
                
                # Check for possible userId alternatives
                potential_user_fields = ['userId', 'user_id', 'user', 'customer', 'customerId', 'buyerId']
                found_user_fields = [field for field in potential_user_fields if field in first_order]
                logger.info(f"Potential user ID fields found: {found_user_fields}")
                
                # Check for items field alternatives
                potential_item_fields = ['items', 'products', 'orderItems', 'productItems', 'cart', 'cartItems']
                found_item_fields = [field for field in potential_item_fields if field in first_order]
                logger.info(f"Potential item array fields found: {found_item_fields}")
                
                # If we found items, check their structure
                if found_item_fields and isinstance(first_order.get(found_item_fields[0]), list):
                    items = first_order.get(found_item_fields[0])
                    if items:
                        logger.info(f"First item in first order fields: {list(items[0].keys())}")
                        
                        # Check for possible productId alternatives
                        potential_product_fields = ['productId', 'product_id', 'product', 'itemId', 'item_id', 'id']
                        found_product_fields = [field for field in potential_product_fields if items[0] and field in items[0]]
                        logger.info(f"Potential product ID fields found: {found_product_fields}")
            
            # Extract interactions with adaptive field recognition
            interactions = []
            for order in orders:
                # Try to find user ID
                user_id = None
                for field in ['userId', 'user_id', 'user', 'customer', 'customerId', 'buyerId']:
                    if field in order and order[field]:
                        user_id = order[field]
                        break
                
                if not user_id:
                    logger.warning(f"Order {order.get('_id', 'unknown')} has no recognizable user ID field")
                    continue
                
                # Try to find items array
                items = None
                for field in ['items', 'products', 'orderItems', 'productItems', 'cart', 'cartItems']:
                    if field in order and isinstance(order[field], list):
                        items = order[field]
                        break
                
                if not items:
                    logger.warning(f"Order {order.get('_id', 'unknown')} has no recognizable items array")
                    continue
                
                # Extract interactions from items
                items_extracted = 0
                for item in items:
                    # Try to find product ID
                    product_id = None
                    for field in ['productId', 'product_id', 'product', 'itemId', 'item_id', 'id']:
                        if isinstance(item, dict) and field in item and item[field]:
                            product_id = item[field]
                            break
                    
                    if product_id:
                        items_extracted += 1
                        interactions.append({
                            'user_id': str(user_id),
                            'item_id': str(product_id),
                            'interaction_type': 'purchase',
                            'quantity': item.get('quantity', 1) if isinstance(item, dict) else 1,
                            'timestamp': order.get('createdAt', datetime.now()),
                            'order_id': str(order.get('_id', 'unknown'))
                        })
                
                if items_extracted == 0:
                    logger.warning(f"Order {order.get('_id', 'unknown')} had {len(items)} items but none with recognizable product ID field")
            
            logger.info(f"Fixed extraction yielded {len(interactions)} interactions from {len(orders)} orders")
            return interactions
            
        except Exception as e:
            logger.error(f"Error in fix_order_extraction: {str(e)}")
            return []

# Example usage
if __name__ == '__main__':
    collector = DataCollector()
    
    # Example usage with new features
    interactions_df = collector.get_user_item_interactions(
        days_limit=30,
        filters={'weight': {'min': 2.0}},
        min_interactions_per_user=3
    )
    
    # Get trending products
    trending_products = collector.get_trending_products(days=7, limit=10)
    print(f"Top trending products: {trending_products}")
    
    # Extract training data
    metadata = collector.extract_data_for_training()
    
    print(f"Collected {len(interactions_df)} interactions")
    print(f"Training data metadata: {metadata}")