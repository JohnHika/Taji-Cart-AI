"""
MongoDB Data Access Module for TajiCart-AI

This module provides a class for accessing MongoDB data to be used
in the recommendation system.
"""

import logging
import os
from datetime import datetime

import pandas as pd
from bson import ObjectId
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, OperationFailure

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('mongo_data_access')

# Ensure logs directory exists
if not os.path.exists('logs'):
    os.makedirs('logs')

# Add file handler
file_handler = logging.FileHandler(
    os.path.join('logs', f'mongo_data_access_{datetime.now().strftime("%Y%m%d")}.log')
)
file_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
logger.addHandler(file_handler)


class MongoDataAccess:
    """
    Class to access data from MongoDB for recommendation system.
    """

    def __init__(self, uri=None, db_name=None):
        """
        Initialize the MongoDB connection.

        Parameters:
        -----------
        uri : str, optional
            MongoDB connection URI. If not provided, it will be read from environment variables.
        db_name : str, optional
            Database name to connect to. If not provided, it will be extracted from the URI.
        """
        # Load environment variables
        load_dotenv()

        try:
            # Get MongoDB URI from environment variables if not provided
            self.uri = uri or os.environ.get('MONGO_URI') or os.environ.get('MONGODB_URI')
            if not self.uri:
                raise ValueError("MongoDB URI not found in environment variables")
            
            # Connect to MongoDB
            logger.info("Connecting to MongoDB...")
            self.client = MongoClient(self.uri)
            
            # Test connection
            self.client.admin.command('ping')
            logger.info("Successfully connected to MongoDB")
            
            # Select database based on provided parameters or URI
            if db_name:
                # If db_name is explicitly provided, use it
                self.db_name = db_name
                logger.info(f"Using explicitly provided database: {self.db_name}")
            else:
                # Extract database name from URI
                # Format: mongodb+srv://username:password@cluster.domain.com/db_name?options
                uri_parts = self.uri.split('/')
                
                # Check if URI has enough parts to contain a database name
                if len(uri_parts) >= 4:
                    # Get the part that might contain the database name
                    db_part = uri_parts[3]
                    
                    # Extract everything before the "?" if it exists
                    if '?' in db_part:
                        extracted_db_name = db_part.split('?')[0]
                    else:
                        extracted_db_name = db_part
                    
                    # If we have a name, use it; otherwise default to "test"
                    if extracted_db_name:
                        self.db_name = extracted_db_name
                        logger.info(f"Using database name from URI: {self.db_name}")
                    else:
                        self.db_name = 'test'
                        logger.info(f"Empty database name in URI, defaulting to: {self.db_name}")
                else:
                    # URI doesn't contain a database name
                    self.db_name = 'test'
                    logger.info(f"No database name found in URI, defaulting to: {self.db_name}")
            
            # Connect to the selected database
            self.db = self.client[self.db_name]
            logger.info(f"Connected to database: {self.db_name}")
            
            # Cache for collection name resolution
            self._collection_name_cache = {}
            
        except ConnectionFailure as e:
            logger.error(f"Failed to connect to MongoDB: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error initializing MongoDB connection: {str(e)}")
            raise

    def __del__(self):
        """
        Close MongoDB connection when object is destroyed.
        """
        try:
            if hasattr(self, 'client'):
                self.client.close()
                logger.info("MongoDB connection closed")
        except Exception as e:
            logger.error(f"Error closing MongoDB connection: {str(e)}")

    def resolve_collection_name(self, collection_base_name):
        """
        Resolve the actual MongoDB collection name in a case-insensitive way.
        
        Parameters:
        -----------
        collection_base_name : str
            The base name of the collection to resolve (e.g., 'productviews')
            
        Returns:
        --------
        str
            The actual collection name as it exists in the database
            
        Raises:
        -------
        ValueError
            If collection name cannot be resolved
        """
        # Check cache first
        if collection_base_name in self._collection_name_cache:
            logger.debug(f"Using cached collection name for '{collection_base_name}': '{self._collection_name_cache[collection_base_name]}'")
            return self._collection_name_cache[collection_base_name]
        
        # Get all collection names
        collections = self.db.list_collection_names()
        
        # First check for exact match
        if collection_base_name in collections:
            self._collection_name_cache[collection_base_name] = collection_base_name
            logger.info(f"Resolved collection name '{collection_base_name}' (exact match)")
            return collection_base_name
        
        # Try case-insensitive match
        collection_lower = collection_base_name.lower()
        for name in collections:
            if name.lower() == collection_lower:
                self._collection_name_cache[collection_base_name] = name
                logger.info(f"Resolved collection name '{collection_base_name}' to actual collection '{name}' (case-insensitive match)")
                return name
                
        # Try different common casing patterns
        potential_names = [
            collection_base_name,                                 # as provided
            collection_base_name.lower(),                         # all lowercase
            collection_base_name.upper(),                         # all uppercase
            collection_base_name.capitalize(),                    # First letter capitalized
            ''.join(word.capitalize() for word in collection_base_name.split('_')),  # CamelCase
            # Add more patterns as needed...
        ]
        
        for name in potential_names:
            if name in collections:
                self._collection_name_cache[collection_base_name] = name
                logger.info(f"Resolved collection name '{collection_base_name}' to actual collection '{name}' (pattern match)")
                return name
        
        # If not found, log a warning and return the original name
        logger.warning(f"Collection '{collection_base_name}' not found in the database")
        raise ValueError(f"Collection '{collection_base_name}' not found in the database")

    def _convert_objectids_to_str(self, data_list):
        """
        Convert ObjectId to string in all documents in a list.
        
        Parameters:
        -----------
        data_list : list
            List of MongoDB documents
            
        Returns:
        --------
        list
            List of documents with ObjectIds converted to strings
        """
        if not data_list:
            return []
        
        converted_data = []
        for doc in data_list:
            converted_doc = {}
            for key, value in doc.items():
                if isinstance(value, ObjectId):
                    converted_doc[key] = str(value)
                elif isinstance(value, list):
                    converted_doc[key] = [str(item) if isinstance(item, ObjectId) else item for item in value]
                elif isinstance(value, dict):
                    sub_dict = {}
                    for sub_key, sub_value in value.items():
                        if isinstance(sub_value, ObjectId):
                            sub_dict[sub_key] = str(sub_value)
                        else:
                            sub_dict[sub_key] = sub_value
                    converted_doc[key] = sub_dict
                else:
                    converted_doc[key] = value
            converted_data.append(converted_doc)
        
        return converted_data

    def get_products(self, limit=None, as_dataframe=True):
        """
        Fetch product data from the database.
        
        Parameters:
        -----------
        limit : int, optional
            Maximum number of products to fetch
        as_dataframe : bool, optional
            If True, returns data as a pandas DataFrame, otherwise as a list of dicts
            
        Returns:
        --------
        pd.DataFrame or list
            Product data
        """
        try:
            logger.info(f"Fetching product data (limit: {limit})...")
            
            # Define projection to include only needed fields
            projection = {
                '_id': 1,
                'name': 1,
                'brand': 1,
                'price': 1,
                'stock': 1,
                'category': 1,
                'tags': 1,
                'rating': 1,
                'description': 1,
                'viewCount': 1,
                'purchaseCount': 1
            }
            
            # Resolve collection name
            collection_name = self.resolve_collection_name('products')
            
            # Fetch products
            if limit:
                products = list(self.db[collection_name].find({}, projection).limit(limit))
            else:
                products = list(self.db[collection_name].find({}, projection))
            
            # Convert ObjectIds to strings
            products = self._convert_objectids_to_str(products)
            
            logger.info(f"Successfully fetched {len(products)} products")
            
            if as_dataframe and products:
                return pd.DataFrame(products)
            else:
                return products
                
        except ValueError as e:
            logger.error(f"Collection error while fetching products: {str(e)}")
            return pd.DataFrame() if as_dataframe else []
        except OperationFailure as e:
            logger.error(f"Database operation failed while fetching products: {str(e)}")
            return pd.DataFrame() if as_dataframe else []
        except Exception as e:
            logger.error(f"Error fetching product data: {str(e)}")
            return pd.DataFrame() if as_dataframe else []

    def get_users(self, limit=None, as_dataframe=True):
        """
        Fetch user data from the database.
        
        Parameters:
        -----------
        limit : int, optional
            Maximum number of users to fetch
        as_dataframe : bool, optional
            If True, returns data as a pandas DataFrame, otherwise as a list of dicts
            
        Returns:
        --------
        pd.DataFrame or list
            User data
        """
        try:
            logger.info(f"Fetching user data (limit: {limit})...")
            
            # Define projection to include only needed fields
            projection = {
                '_id': 1,
                'fullName': 1,
                'email': 1,
                'preferences': 1,
                'isActive': 1
            }
            
            # Resolve collection names
            users_collection = self.resolve_collection_name('users')
            loyalty_collection = self.resolve_collection_name('loyaltycards')
            
            # Fetch users
            if limit:
                users = list(self.db[users_collection].find({}, projection).limit(limit))
            else:
                users = list(self.db[users_collection].find({}, projection))
            
            # Convert ObjectIds to strings
            users = self._convert_objectids_to_str(users)
            
            # Fetch loyalty cards for users
            user_ids = [user['_id'] for user in users]
            loyalty_cards = list(self.db[loyalty_collection].find({
                'userId': {'$in': user_ids}
            }, {
                'userId': 1,
                'tier': 1,
                'points': 1
            }))
            
            # Convert loyalty card ObjectIds to strings
            loyalty_cards = self._convert_objectids_to_str(loyalty_cards)
            
            # Create a mapping of user IDs to loyalty cards
            loyalty_map = {card['userId']: card for card in loyalty_cards}
            
            # Add loyalty card info to user data
            for user in users:
                user_id = user['_id']
                if user_id in loyalty_map:
                    user['loyaltyCard'] = loyalty_map[user_id]
                else:
                    user['loyaltyCard'] = None
            
            logger.info(f"Successfully fetched {len(users)} users with loyalty information")
            
            if as_dataframe and users:
                return pd.DataFrame(users)
            else:
                return users
                
        except ValueError as e:
            logger.error(f"Collection error while fetching users: {str(e)}")
            return pd.DataFrame() if as_dataframe else []
        except OperationFailure as e:
            logger.error(f"Database operation failed while fetching users: {str(e)}")
            return pd.DataFrame() if as_dataframe else []
        except Exception as e:
            logger.error(f"Error fetching user data: {str(e)}")
            return pd.DataFrame() if as_dataframe else []

    def get_orders(self, days_limit=None, as_dataframe=True):
        """
        Fetch order data from the database.
        
        Parameters:
        -----------
        days_limit : int, optional
            Limit orders to those created within the specified number of days
        as_dataframe : bool, optional
            If True, returns data as a pandas DataFrame, otherwise as a list of dicts
            
        Returns:
        --------
        pd.DataFrame or list
            Order data
        """
        try:
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
            
            # Resolve collection name
            collection_name = self.resolve_collection_name('orders')
            
            # Fetch orders
            orders = list(self.db[collection_name].find(query, projection))
            
            # Convert ObjectIds to strings
            orders = self._convert_objectids_to_str(orders)
            
            # Extract user-item interactions from orders
            interactions = []
            for order in orders:
                user_id = order['userId']
                created_at = order.get('createdAt', datetime.now())
                
                for item in order.get('items', []):
                    if 'productId' in item:
                        interactions.append({
                            'user_id': user_id,
                            'item_id': item['productId'],
                            'interaction_type': 'purchase',
                            'quantity': item.get('quantity', 1),
                            'timestamp': created_at,
                            'order_id': order['_id']
                        })
            
            logger.info(f"Successfully extracted {len(interactions)} purchase interactions from {len(orders)} orders")
            
            if as_dataframe and interactions:
                return pd.DataFrame(interactions)
            else:
                return interactions
                
        except ValueError as e:
            logger.error(f"Collection error while fetching orders: {str(e)}")
            return pd.DataFrame() if as_dataframe else []
        except OperationFailure as e:
            logger.error(f"Database operation failed while fetching orders: {str(e)}")
            return pd.DataFrame() if as_dataframe else []
        except Exception as e:
            logger.error(f"Error fetching order data: {str(e)}")
            return pd.DataFrame() if as_dataframe else []

    def get_cart_items(self, days_limit=None, as_dataframe=True):
        """
        Fetch cart data from MongoDB.
        
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
                collection_name = self.resolve_collection_name('cartproducts')
                
                # Fetch cart items
                cart_items = list(self.db[collection_name].find(query))
                
            except ValueError as e:
                logger.warning(f"Error resolving cart products collection: {str(e)}")
                return pd.DataFrame() if as_dataframe else []
                
            # Convert ObjectIds to strings
            cart_items = self._convert_objectids_to_str(cart_items)
            
            # Convert to interactions format
            interactions = []
            for item in cart_items:
                # Skip entries without user or product IDs
                if not item.get('userId') or not item.get('productId'):
                    continue
                    
                interactions.append({
                    'user_id': item['userId'],
                    'item_id': item['productId'],
                    'interaction_type': 'cart',
                    'count': item.get('quantity', 1),
                    'timestamp': item.get('createdAt', datetime.now())
                })
            
            logger.info(f"Successfully fetched {len(interactions)} cart item interactions")
            
            if as_dataframe and interactions:
                return pd.DataFrame(interactions)
            else:
                return interactions
                
        except OperationFailure as e:
            logger.error(f"Database operation failed while fetching cart items: {str(e)}")
            return pd.DataFrame() if as_dataframe else []
        except Exception as e:
            logger.error(f"Error fetching cart item data: {str(e)}")
            return pd.DataFrame() if as_dataframe else []

    def get_product_views(self, days_limit=None, as_dataframe=True):
        """
        Fetch product view data from MongoDB.
        
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
            
            try:
                # Resolve collection name
                collection_name = self.resolve_collection_name('productviews')
                
                # Fetch product views
                views = list(self.db[collection_name].find(query, projection))
                
            except ValueError as e:
                logger.warning(f"Error resolving product views collection: {str(e)}")
                return pd.DataFrame() if as_dataframe else []
                
            # Convert ObjectIds to strings
            views = self._convert_objectids_to_str(views)
            
            # Convert to interactions format
            interactions = []
            for view in views:
                # Skip entries without user or product IDs
                if not view.get('userId') or not view.get('productId'):
                    continue
                    
                interactions.append({
                    'user_id': view['userId'],
                    'item_id': view['productId'],
                    'interaction_type': 'view',
                    'count': 1,  # Count each view as 1 interaction
                    'timestamp': view.get('timestamp', datetime.now()),
                    'duration': view.get('viewDuration', 0),
                    'session_id': view.get('sessionId')
                })
            
            logger.info(f"Successfully fetched {len(interactions)} product view interactions")
            
            if as_dataframe and interactions:
                return pd.DataFrame(interactions)
            else:
                return interactions
                
        except OperationFailure as e:
            logger.error(f"Database operation failed while fetching product views: {str(e)}")
            return pd.DataFrame() if as_dataframe else []
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
            cart_interactions = self.get_cart_items(as_dataframe=False)
            view_interactions = self.get_product_views(days_limit=days_limit, as_dataframe=False)
            
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

    def get_products_by_ids(self, product_ids, limit=10):
        """
        Get product details by their IDs.
        
        Parameters:
        -----------
        product_ids : list
            List of product IDs to fetch
        limit : int, optional
            Maximum number of products to return
            
        Returns:
        --------
        list
            List of product documents
        """
        try:
            collection_name = self.resolve_collection_name('products')
            
            # Convert string IDs to ObjectId if needed
            object_ids = []
            for pid in product_ids:
                if isinstance(pid, str):
                    try:
                        object_ids.append(ObjectId(pid))
                    except:
                        # Skip invalid IDs
                        continue
                else:
                    object_ids.append(pid)
                    
            if not object_ids:
                return []
                
            products = list(self.db[collection_name].find(
                {"_id": {"$in": object_ids}}
            ).limit(limit))
            
            return products
        except Exception as e:
            logger.error(f"Error getting products by IDs: {str(e)}")
            return []

    def get_products_by_ids_and_category(self, product_ids, category, limit=10):
        """
        Get product details by their IDs and category.
        
        Parameters:
        -----------
        product_ids : list
            List of product IDs to fetch
        category : str
            Category name or keyword to match
        limit : int, optional
            Maximum number of products to return
            
        Returns:
        --------
        list
            List of product documents
        """
        try:
            collection_name = self.resolve_collection_name('products')
            
            # Convert string IDs to ObjectId if needed
            object_ids = []
            for pid in product_ids:
                if isinstance(pid, str):
                    try:
                        object_ids.append(ObjectId(pid))
                    except:
                        # Skip invalid IDs
                        continue
                else:
                    object_ids.append(pid)
            
            if not object_ids:
                return []
                
            # Create a text search query for the category
            products = list(self.db[collection_name].find({
                "_id": {"$in": object_ids},
                "$or": [
                    {"category": {"$regex": category, "$options": "i"}},
                    {"name": {"$regex": category, "$options": "i"}},
                    {"description": {"$regex": category, "$options": "i"}}
                ]
            }).limit(limit))
            
            return products
        except Exception as e:
            logger.error(f"Error getting products by IDs and category: {str(e)}")
            return []

    def get_products_by_stock(self, limit=10):
        """
        Get products ordered by stock level (highest first).
        
        Parameters:
        -----------
        limit : int, optional
            Maximum number of products to return
            
        Returns:
        --------
        list
            List of product documents
        """
        try:
            collection_name = self.resolve_collection_name('products')
            products = list(self.db[collection_name].find(
                {"stock": {"$gt": 0}}
            ).sort("stock", -1).limit(limit))
            
            return products
        except Exception as e:
            logger.error(f"Error getting products by stock: {str(e)}")
            return []

    def get_products_by_date(self, limit=10):
        """
        Get newest products by creation date.
        
        Parameters:
        -----------
        limit : int, optional
            Maximum number of products to return
            
        Returns:
        --------
        list
            List of product documents
        """
        try:
            collection_name = self.resolve_collection_name('products')
            products = list(self.db[collection_name].find().sort("createdAt", -1).limit(limit))
            
            return products
        except Exception as e:
            logger.error(f"Error getting products by date: {str(e)}")
            return []

    def search_products(self, query, limit=10):
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
        list
            List of matching products
        """
        try:
            collection_name = self.resolve_collection_name('products')
            
            # Create a text search query
            products = list(self.db[collection_name].find({
                "$or": [
                    {"name": {"$regex": query, "$options": "i"}},
                    {"description": {"$regex": query, "$options": "i"}}
                ]
            }).limit(limit))
            
            return products
        except Exception as e:
            logger.error(f"Error searching products: {str(e)}")
            return []

    def get_user_by_id(self, user_id):
        """
        Get user details by ID.
        
        Parameters:
        -----------
        user_id : str
            User ID to look up
            
        Returns:
        --------
        dict
            User document or None if not found
        """
        try:
            if not user_id or user_id == 'guest':
                return None
                
            collection_name = self.resolve_collection_name('users')
            user = self.db[collection_name].find_one({"_id": ObjectId(user_id)})
            
            return user
        except Exception as e:
            logger.error(f"Error getting user by ID: {str(e)}")
            return None

    def get_user_cart(self, user_id):
        """
        Get user's cart contents.
        
        Parameters:
        -----------
        user_id : str
            User ID to get cart for
            
        Returns:
        --------
        list
            List of cart items with product details
        """
        try:
            if not user_id or user_id == 'guest':
                return []
                
            cart_collection_name = self.resolve_collection_name('cartproducts')
            product_collection_name = self.resolve_collection_name('products')
            
            # Get cart items
            cart_items = list(self.db[cart_collection_name].find({"userId": ObjectId(user_id)}))
            
            # Enrich with product details
            result = []
            for item in cart_items:
                product = self.db[product_collection_name].find_one({"_id": item.get('productId')})
                if product:
                    result.append({
                        "productId": item.get('productId'),
                        "name": product.get('name', 'Unknown Product'),
                        "price": product.get('price', 0),
                        "quantity": item.get('quantity', 1)
                    })
            
            return result
        except Exception as e:
            logger.error(f"Error getting user cart: {str(e)}")
            return []

    def update_cart(self, user_id, product_id, quantity=1):
        """
        Add or update product in user's cart.
        
        Parameters:
        -----------
        user_id : str
            User ID
        product_id : str
            Product ID to add/update
        quantity : int, optional
            Quantity to add (default=1)
            
        Returns:
        --------
        bool
            True if successful, False otherwise
        """
        try:
            if not user_id or user_id == 'guest' or not product_id:
                return False
                
            cart_collection_name = self.resolve_collection_name('cartproducts')
            
            # Check if product is already in cart
            existing_item = self.db[cart_collection_name].find_one({
                "userId": ObjectId(user_id),
                "productId": ObjectId(product_id)
            })
            
            if existing_item:
                # Update quantity
                new_quantity = existing_item.get('quantity', 0) + quantity
                self.db[cart_collection_name].update_one(
                    {"_id": existing_item["_id"]},
                    {"$set": {"quantity": new_quantity}}
                )
            else:
                # Add new item
                self.db[cart_collection_name].insert_one({
                    "userId": ObjectId(user_id),
                    "productId": ObjectId(product_id),
                    "quantity": quantity,
                    "createdAt": datetime.utcnow(),
                    "updatedAt": datetime.utcnow()
                })
            
            return True
        except Exception as e:
            logger.error(f"Error updating cart: {str(e)}")
            return False


# Example usage
if __name__ == '__main__':
    try:
        # Create data access object
        data_access = MongoDataAccess()
        
        # Fetch products
        products_df = data_access.get_products(limit=10)
        print(f"Fetched {len(products_df)} products")
        
        # Fetch users
        users_df = data_access.get_users(limit=10)
        print(f"Fetched {len(users_df)} users")
        
        # Fetch interactions
        interactions_df = data_access.get_all_interactions(days_limit=30)
        print(f"Fetched {len(interactions_df)} interactions")
        
    except Exception as e:
        logger.error(f"Error in example usage: {str(e)}")