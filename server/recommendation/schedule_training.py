#!/usr/bin/env python
"""
Scheduled Data Extraction and Model Training Script for TajiCart-AI

This script handles periodic data extraction and model training for the recommendation system.
It can be run manually or scheduled using cron or Windows Task Scheduler.
"""

import argparse
import logging
import os
import pickle
import sys
from datetime import datetime

# Add parent directory to path to allow imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import recommendation.train_model as train_model
# Local imports
from recommendation.data_collector import DataCollector

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join('logs', f'schedule_training_{datetime.now().strftime("%Y%m%d")}.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('schedule_training')

def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description='Schedule data extraction and model training')
    parser.add_argument('--extract-only', action='store_true',
                        help='Only extract data, do not train model')
    parser.add_argument('--train-only', action='store_true',
                        help='Only train model using latest extracted data')
    parser.add_argument('--days', type=int, default=90,
                        help='Number of days of interaction data to use (default: 90)')
    parser.add_argument('--min-interactions', type=int, default=3,
                        help='Minimum interactions per user (default: 3)')
    parser.add_argument('--output-dir', type=str,
                        help='Directory to save extracted data and trained models')
    parser.add_argument('--force', action='store_true',
                        help='Force execution even if already run today')
    return parser.parse_args()

def check_if_run_today():
    """Check if script has already been run today"""
    today = datetime.now().strftime('%Y-%m-%d')
    status_file = os.path.join('logs', 'last_training.txt')
    
    if os.path.exists(status_file):
        with open(status_file, 'r') as f:
            last_run = f.read().strip()
            if last_run == today:
                return True
    
    # Update last run date
    with open(status_file, 'w') as f:
        f.write(today)
    
    return False

def extract_training_data(days, min_interactions, output_dir):
    """Extract training data using DataCollector"""
    logger.info("Starting data extraction...")
    collector = DataCollector(cache_ttl=3600)  # 1-hour cache TTL
    
    # Get interactions with filtering
    interactions_df = collector.get_user_item_interactions(
        days_limit=days,
        use_cache=False,
        min_interactions_per_user=min_interactions
    )
    
    # Get item and user features
    item_features = collector.get_item_features(use_cache=False)
    user_features = collector.get_user_features(use_cache=False)
    
    # Prepare LightFM data
    interaction_matrix, user_mapping, item_mapping = collector.prepare_lightfm_data(interactions_df)
    
    # Create feature matrices
    user_features_matrix, item_features_matrix = collector.create_feature_matrices(
        user_features, item_features, user_mapping, item_mapping
    )
    
    # Save data for model training
    metadata = collector.extract_data_for_training(output_dir=output_dir)
    
    logger.info(f"Data extraction complete: {metadata}")
    return metadata

def train_recommendation_model(output_dir=None):
    """Train recommendation model using the latest extracted data"""
    logger.info("Starting model training...")
    
    # Default training data directory
    if not output_dir:
        output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'training_data')
    
    # Find latest data file
    latest_data_path = os.path.join(output_dir, 'latest.pkl')
    if not os.path.exists(latest_data_path):
        logger.error(f"No training data found at {latest_data_path}")
        return False
    
    try:
        # Load training data
        with open(latest_data_path, 'rb') as f:
            training_data = pickle.load(f)
        
        # Train model
        model_info = train_model.train_model_from_data(
            training_data['interaction_matrix'],
            training_data['user_mapping'],
            training_data['item_mapping'],
            user_features=training_data.get('user_features_matrix'),
            item_features=training_data.get('item_features_matrix')
        )
        
        logger.info(f"Model training complete: {model_info}")
        return True
    
    except Exception as e:
        logger.error(f"Error training model: {str(e)}")
        return False

def main():
    """Main function to run scheduled tasks"""
    # Create logs directory if it doesn't exist
    if not os.path.exists('logs'):
        os.makedirs('logs')

    args = parse_args()
    
    # Check if already run today (unless forced)
    if not args.force and check_if_run_today():
        logger.warning("Script already run today. Use --force to run again.")
        return
    
    # Set default output directory if not specified
    if not args.output_dir:
        args.output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'training_data')
    
    # Create output directory if it doesn't exist
    if not os.path.exists(args.output_dir):
        os.makedirs(args.output_dir)
    
    # Run requested tasks
    if args.train_only:
        # Train model only
        train_recommendation_model(args.output_dir)
    elif args.extract_only:
        # Extract data only
        extract_training_data(args.days, args.min_interactions, args.output_dir)
    else:
        # Run both extraction and training
        metadata = extract_training_data(args.days, args.min_interactions, args.output_dir)
        if metadata:
            train_recommendation_model(args.output_dir)
    
    logger.info("Scheduled tasks completed successfully")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        logger.exception(f"Unhandled error: {str(e)}")
        sys.exit(1)