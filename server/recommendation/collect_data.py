#!/usr/bin/env python
"""
Simple Data Collection Script for Nawiri Hair Recommendation System

This script collects data from MongoDB for the recommendation system
without using the schedule package.
"""

import logging
import os
import sys
from datetime import datetime

# Add parent directory to path to allow imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Local imports
from recommendation.data_collector import DataCollector
from recommendation.mongo_data_access import MongoDataAccess

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('collect_data')

# Create logs directory if it doesn't exist
if not os.path.exists('logs'):
    os.makedirs('logs')

# Add file handler
file_handler = logging.FileHandler(
    os.path.join('logs', f'data_collection_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')
)
file_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
logger.addHandler(file_handler)

def main():
    """Main function to collect data for the recommendation system"""
    try:
        logger.info("Starting data collection process")
        
        # Create DataCollector instance without schedule dependency
        collector = DataCollector(cache_ttl=3600)  # 1-hour cache
        
        # Extract data for training
        logger.info("Extracting data for training")
        days_limit = 90  # Use last 90 days of data
        min_interactions = 2  # Only users with at least 2 interactions
        
        # Get interactions
        interactions_df = collector.get_user_item_interactions(
            days_limit=days_limit,
            use_cache=False,
            min_interactions_per_user=min_interactions
        )
        logger.info(f"Collected {len(interactions_df)} interactions")
        
        # Get item and user features
        item_features = collector.get_item_features(use_cache=False)
        logger.info(f"Collected features for {len(item_features)} items")
        
        user_features = collector.get_user_features(use_cache=False)
        logger.info(f"Collected features for {len(user_features)} users")
        
        # Save extracted data for training
        metadata = collector.extract_data_for_training()
        
        # Print summary
        if metadata:
            logger.info("Data collection completed successfully")
            print("=" * 40)
            print("DATA COLLECTION SUMMARY")
            print("=" * 40)
            print(f"Users: {metadata['num_users']}")
            print(f"Items: {metadata['num_items']}")
            print(f"Interactions: {metadata['num_interactions']}")
            print("=" * 40)
        else:
            logger.error("Data collection failed")
            print("Data collection failed. See logs for details.")
    
    except Exception as e:
        logger.exception(f"Error collecting data: {str(e)}")
        print(f"Error collecting data: {str(e)}")

if __name__ == "__main__":
    main()