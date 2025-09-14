"""
Seed Data Generator for TajiCart-AI Recommendation System

This script populates the MongoDB database with sample data for testing
the recommendation system, including orders, cart products, and product views.
"""

import hashlib
import json
import logging
import os
import random
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Union

from bson import ObjectId
from dotenv import load_dotenv

# Add parent directory to path to import mongo_data_access
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from recommendation.mongo_data_access import MongoDataAccess

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('seed_data')

# Ensure logs directory exists
os.makedirs('logs', exist_ok=True)

class RecommendationDataSeeder:
    """Class to seed data for recommendation system."""

    def __init__(self, mongo_uri: Optional[str] = None, db_name: Optional[str] = None):
        """
        Initialize the data seeder.
        
        Parameters:
        -----------
        mongo_uri : str, optional
            MongoDB connection URI. If not provided, it will be read from the 
            MONGO_URI environment variable.
        db_name : str, optional
            Database name to connect to. If not provided, it will be extracted from the URI.
        """
        # Initialize MongoDB data access
        self.data_access = MongoDataAccess(uri=mongo_uri, db_name=db_name)
        logger.info(f"Connected to MongoDB database: {self.data_access.db_name}")
        
        # Cache for IDs
        self._product_ids = []
        self._user_ids = []

    def get_existing_products(self, limit: int = 10) -> List[Dict]:
        """Get existing products from the database."""
        try:
            collection_name = self.data_access.resolve_collection_name('products')
            products = list(self.data_access.db[collection_name].find({}).limit(limit))
            
            if products:
                logger.info(f"Found {len(products)} existing products")
                return products
            else:
                logger.warning("No existing products found")
                return []
                
        except ValueError as e:
            logger.error(f"Error resolving products collection: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"Error fetching products: {str(e)}")
            return []
    
    def get_existing_users(self, limit: int = 10) -> List[Dict]:
        """Get existing users from the database."""
        try:
            collection_name = self.data_access.resolve_collection_name('users')
            users = list(self.data_access.db[collection_name].find({}).limit(limit))
            
            if users:
                logger.info(f"Found {len(users)} existing users")
                return users
            else:
                logger.warning("No existing users found")
                return []
                
        except ValueError as e:
            logger.error(f"Error resolving users collection: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"Error fetching users: {str(e)}")
            return []
    
    def create_dummy_products(self, count: int = 5) -> List[Dict]:
        """Create dummy products if none exist."""
        try:
            collection_name = self.data_access.resolve_collection_name('products')
            
            # Sample categories
            categories = [
                ObjectId(), ObjectId(), ObjectId() 
            ]
            
            # Create product documents
            products = []
            for i in range(count):
                product = {
                    "_id": ObjectId(),
                    "name": f"Demo Product {i+1}",
                    "price": random.randint(10, 100),
                    "stock": random.randint(10, 50),
                    "category": [random.choice(categories)],
                    "description": f"This is a demo product {i+1} for testing the recommendation system",
                    "image": [f"demo_image_{i+1}.jpg"],
                    "createdAt": datetime.utcnow(),
                    "updatedAt": datetime.utcnow()
                }
                products.append(product)
            
            # Insert products
            result = self.data_access.db[collection_name].insert_many(products)
            if result.inserted_ids:
                logger.info(f"Successfully created {len(result.inserted_ids)} dummy products")
                return products
            else:
                logger.warning("Failed to create dummy products")
                return []
                
        except Exception as e:
            logger.error(f"Error creating dummy products: {str(e)}")
            return []
    
    def create_dummy_users(self, count: int = 3) -> List[Dict]:
        """Create dummy users if none exist."""
        try:
            collection_name = self.data_access.resolve_collection_name('users')
            
            # Create user documents
            users = []
            for i in range(count):
                user = {
                    "_id": ObjectId(),
                    "name": f"Demo User {i+1}",
                    "email": f"demo_user_{i+1}@example.com",
                    "password": "hashed_password",
                    "isAdmin": False,
                    "role": "user",
                    "status": "Active",
                    "verify_email": True,
                    "createdAt": datetime.utcnow(),
                    "updatedAt": datetime.utcnow()
                }
                users.append(user)
            
            # Insert users
            result = self.data_access.db[collection_name].insert_many(users)
            if result.inserted_ids:
                logger.info(f"Successfully created {len(result.inserted_ids)} dummy users")
                return users
            else:
                logger.warning("Failed to create dummy users")
                return []
                
        except Exception as e:
            logger.error(f"Error creating dummy users: {str(e)}")
            return []
    
    def ensure_users_and_products(self) -> bool:
        """Ensure users and products exist in the database."""
        # Get existing users and products
        products = self.get_existing_products()
        users = self.get_existing_users()
        
        # Create dummy data if needed
        if not products:
            logger.warning("No products found, creating dummy products")
            products = self.create_dummy_products(5)
        
        if not users:
            logger.warning("No users found, creating dummy users")
            users = self.create_dummy_users(3)
        
        # Cache IDs for reference
        self._product_ids = [p.get('_id') for p in products]
        self._user_ids = [u.get('_id') for u in users]
        
        # Return success if we have both users and products
        return bool(self._product_ids and self._user_ids)
    
    def seed_orders(self, count: int = 4) -> int:
        """
        Seed order data with non-empty items lists.
        
        Parameters:
        -----------
        count : int, optional
            Number of orders to create
            
        Returns:
        --------
        int
            Number of orders created
        """
        try:
            # Get collection name
            collection_name = None
            try:
                collection_name = self.data_access.resolve_collection_name('orders')
            except ValueError:
                # Create collection if it doesn't exist
                self.data_access.db.create_collection('orders')
                collection_name = 'orders'
            
            # Check if we have users and products
            if not self._user_ids or not self._product_ids:
                if not self.ensure_users_and_products():
                    logger.error("Cannot seed orders without users and products")
                    return 0
            
            # Create order documents
            orders = []
            for i in range(count):
                # Generate random dates within the last 30 days
                created_at = datetime.utcnow() - timedelta(days=random.randint(0, 30))
                
                # Generate order ID (format: ORD-YYYYMMDD-XXXX)
                order_id = f"ORD-{created_at.strftime('%Y%m%d')}-{random.randint(1000, 9999)}"
                
                # Create 1-3 items per order
                items = []
                item_count = random.randint(1, 3)
                
                for j in range(item_count):
                    product_id = random.choice(self._product_ids)
                    items.append({
                        "productId": product_id,
                        "quantity": random.randint(1, 5),
                        "price": random.randint(10, 100),
                    })
                
                # Create the order document
                order = {
                    "_id": ObjectId(),
                    "userId": random.choice(self._user_ids),
                    "orderId": order_id,
                    "items": items,
                    "totalAmount": sum(item["price"] * item["quantity"] for item in items),
                    "status": "delivered",
                    "createdAt": created_at,
                    "updatedAt": created_at,
                }
                orders.append(order)
            
            # Insert orders
            result = self.data_access.db[collection_name].insert_many(orders)
            if result.inserted_ids:
                logger.info(f"Successfully seeded {len(result.inserted_ids)} orders")
                return len(result.inserted_ids)
            else:
                logger.warning("Failed to seed orders")
                return 0
                
        except Exception as e:
            logger.error(f"Error seeding orders: {str(e)}")
            return 0
    
    def seed_cart_products(self, count: int = 5) -> int:
        """
        Seed cart product data.
        
        Parameters:
        -----------
        count : int, optional
            Number of cart products to create
            
        Returns:
        --------
        int
            Number of cart products created
        """
        try:
            # Get collection name
            collection_name = None
            try:
                collection_name = self.data_access.resolve_collection_name('cartproducts')
            except ValueError:
                # Try another common name
                try:
                    collection_name = self.data_access.resolve_collection_name('cartProduct')
                except ValueError:
                    # Create collection if it doesn't exist
                    self.data_access.db.create_collection('cartProduct')
                    collection_name = 'cartProduct'
            
            # Check if we have users and products
            if not self._user_ids or not self._product_ids:
                if not self.ensure_users_and_products():
                    logger.error("Cannot seed cart products without users and products")
                    return 0
            
            # Create cart product documents
            cart_products = []
            for i in range(count):
                # Generate random dates within the last 7 days
                created_at = datetime.utcnow() - timedelta(days=random.randint(0, 7))
                
                # Create the cart product document
                cart_product = {
                    "_id": ObjectId(),
                    "userId": random.choice(self._user_ids),
                    "productId": random.choice(self._product_ids),
                    "quantity": random.randint(1, 3),
                    "createdAt": created_at,
                    "updatedAt": created_at,
                }
                cart_products.append(cart_product)
            
            # Insert cart products
            result = self.data_access.db[collection_name].insert_many(cart_products)
            if result.inserted_ids:
                logger.info(f"Successfully seeded {len(result.inserted_ids)} cart products")
                return len(result.inserted_ids)
            else:
                logger.warning("Failed to seed cart products")
                return 0
                
        except Exception as e:
            logger.error(f"Error seeding cart products: {str(e)}")
            return 0
    
    def seed_product_views(self, count: int = 10) -> int:
        """
        Seed product view data.
        
        Parameters:
        -----------
        count : int, optional
            Number of product views to create
            
        Returns:
        --------
        int
            Number of product views created
        """
        try:
            # Get collection name or create it
            collection_name = 'productviews'
            try:
                # Try to see if collection exists
                self.data_access.resolve_collection_name('productviews')
            except ValueError:
                # Create collection if it doesn't exist
                self.data_access.db.create_collection('productviews')
                
            # Check if we have users and products
            if not self._user_ids or not self._product_ids:
                if not self.ensure_users_and_products():
                    logger.error("Cannot seed product views without users and products")
                    return 0
            
            # Create product view documents
            product_views = []
            for i in range(count):
                # Generate random dates within the last 14 days
                timestamp = datetime.utcnow() - timedelta(days=random.randint(0, 14))
                
                # Create session ID (format: SESSION-XXXX)
                session_id = f"SESSION-{random.randint(1000, 9999)}"
                
                # Create the product view document
                product_view = {
                    "_id": ObjectId(),
                    "userId": random.choice(self._user_ids),
                    "productId": random.choice(self._product_ids),
                    "timestamp": timestamp,
                    "viewDuration": random.randint(5, 300),  # 5-300 seconds
                    "sessionId": session_id,
                }
                product_views.append(product_view)
            
            # Insert product views
            result = self.data_access.db[collection_name].insert_many(product_views)
            if result.inserted_ids:
                logger.info(f"Successfully seeded {len(result.inserted_ids)} product views")
                return len(result.inserted_ids)
            else:
                logger.warning("Failed to seed product views")
                return 0
                
        except Exception as e:
            logger.error(f"Error seeding product views: {str(e)}")
            return 0
    
    def seed_all_data(self) -> Dict[str, int]:
        """
        Seed all types of data needed for the recommendation system.
        
        Returns:
        --------
        dict
            Dictionary with counts of each type of data created
        """
        # Make sure we have users and products
        self.ensure_users_and_products()
        
        # Seed data
        orders_created = self.seed_orders(4)
        cart_products_created = self.seed_cart_products(5)
        product_views_created = self.seed_product_views(10)
        
        return {
            'orders': orders_created,
            'cart_products': cart_products_created,
            'product_views': product_views_created,
            'users': len(self._user_ids),
            'products': len(self._product_ids)
        }
    
    def check_existing_data(self) -> Dict[str, int]:
        """
        Check how much data already exists in the database.
        
        Returns:
        --------
        dict
            Dictionary with counts of existing data
        """
        result = {}
        
        # Check products
        try:
            collection_name = self.data_access.resolve_collection_name('products')
            result['products'] = self.data_access.db[collection_name].count_documents({})
        except Exception as e:
            result['products'] = 0
        
        # Check users
        try:
            collection_name = self.data_access.resolve_collection_name('users')
            result['users'] = self.data_access.db[collection_name].count_documents({})
        except Exception as e:
            result['users'] = 0
        
        # Check orders
        try:
            collection_name = self.data_access.resolve_collection_name('orders')
            orders_count = self.data_access.db[collection_name].count_documents({})
            result['orders'] = orders_count
            
            # Check for orders with items
            orders_with_items = self.data_access.db[collection_name].count_documents({
                'items': {'$exists': True, '$ne': []}
            })
            result['orders_with_items'] = orders_with_items
            
        except Exception as e:
            result['orders'] = 0
            result['orders_with_items'] = 0
        
        # Check cart products
        try:
            try:
                collection_name = self.data_access.resolve_collection_name('cartproducts')
            except ValueError:
                try:
                    collection_name = self.data_access.resolve_collection_name('cartProduct')
                except ValueError:
                    collection_name = None
            
            result['cart_products'] = self.data_access.db[collection_name].count_documents({}) if collection_name else 0
        except Exception as e:
            result['cart_products'] = 0
        
        # Check product views
        try:
            try:
                collection_name = self.data_access.resolve_collection_name('productviews')
                result['product_views'] = self.data_access.db[collection_name].count_documents({})
            except ValueError:
                result['product_views'] = 0
        except Exception as e:
            result['product_views'] = 0
        
        return result


def main():
    """Main function to seed data."""
    # Load environment variables
    load_dotenv()
    
    logger.info("Starting data seeding process")
    
    # Initialize seeder
    seeder = RecommendationDataSeeder()
    
    # Check existing data
    existing_data = seeder.check_existing_data()
    logger.info(f"Existing data in database: {existing_data}")
    
    # If there's already enough data, ask whether to continue
    if (existing_data.get('orders_with_items', 0) >= 3 and 
        existing_data.get('cart_products', 0) >= 3 and 
        existing_data.get('product_views', 0) >= 3):
        
        logger.info("Database already has some interaction data.")
        answer = input("Continue with seeding additional data? (y/n): ").strip().lower()
        if answer != 'y':
            logger.info("Seeding process cancelled by user")
            return
    
    # Seed data
    logger.info("Seeding data...")
    result = seeder.seed_all_data()
    
    # Print summary
    logger.info("Data seeding completed!")
    logger.info(f"Created data summary: {result}")
    logger.info(f"Users: {result.get('users', 0)}")
    logger.info(f"Products: {result.get('products', 0)}")
    logger.info(f"Orders: {result.get('orders', 0)}")
    logger.info(f"Cart Products: {result.get('cart_products', 0)}")
    logger.info(f"Product Views: {result.get('product_views', 0)}")
    
    # Check data after seeding
    existing_data = seeder.check_existing_data()
    logger.info(f"Total data after seeding: {existing_data}")


if __name__ == "__main__":
    main()
