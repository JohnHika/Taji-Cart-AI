"""
Model Training Module for TajiCart-AI Recommendation System

This module handles the training of LightFM recommendation models.
"""

import logging
import os
import time
from datetime import datetime

import joblib
import numpy as np
import pandas as pd
# Local imports
from data_collector import DataCollector
from lightfm import LightFM
from lightfm.evaluation import auc_score, precision_at_k, recall_at_k
from tqdm import tqdm

# Configure logging
if not os.path.exists('logs'):
    os.makedirs('logs')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join('logs', f'model_trainer_{datetime.now().strftime("%Y%m%d")}.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('model_trainer')


class ModelTrainer:
    """Class to train and evaluate LightFM recommendation models"""
    
    def __init__(self, data_collector=None):
        """
        Initialize the ModelTrainer
        
        Parameters:
        -----------
        data_collector : DataCollector, optional
            Instance of DataCollector class. If not provided, a new one will be created.
        """
        self.data_collector = data_collector if data_collector is not None else DataCollector()
        self.models_dir = os.path.join(os.getcwd(), 'models')
        
        # Ensure models directory exists
        if not os.path.exists(self.models_dir):
            os.makedirs(self.models_dir)
            
        logger.info("ModelTrainer initialized")
    
    def create_train_test_split(self, interactions_df, test_size=0.2):
        """
        Split interactions into train and test sets
        
        Parameters:
        -----------
        interactions_df : pd.DataFrame
            DataFrame with columns: user_id, item_id, interaction_type, weight
        test_size : float, optional
            Proportion of interactions to include in test set
        
        Returns:
        --------
        tuple
            (train_df, test_df)
        """
        try:
            # Sort by timestamp if available
            if 'timestamp' in interactions_df.columns:
                interactions_df = interactions_df.sort_values('timestamp')
            
            # For each user, split their interactions
            train_interactions = []
            test_interactions = []
            
            for user_id, user_data in interactions_df.groupby('user_id'):
                # If user has only one interaction, put it in training set
                if len(user_data) == 1:
                    train_interactions.append(user_data)
                    continue
                
                # Otherwise, split interactions
                n_test = max(1, int(len(user_data) * test_size))
                
                # Last n_test interactions go to test set
                user_test = user_data.iloc[-n_test:]
                user_train = user_data.iloc[:-n_test]
                
                train_interactions.append(user_train)
                test_interactions.append(user_test)
            
            # Combine all users' train and test sets
            train_df = pd.concat(train_interactions, ignore_index=True)
            test_df = pd.concat(test_interactions, ignore_index=True) if test_interactions else pd.DataFrame()
            
            logger.info(f"Split interactions: {len(train_df)} train, {len(test_df)} test")
            return train_df, test_df
            
        except Exception as e:
            logger.error(f"Error splitting data: {str(e)}")
            # Return empty DataFrames on error
            return pd.DataFrame(), pd.DataFrame()
    
    def train_model(self, train_matrix, user_features=None, item_features=None, 
                    epochs=30, num_components=64, learning_rate=0.05,
                    loss='warp', no_components=None):
        """
        Train a LightFM model
        
        Parameters:
        -----------
        train_matrix : scipy.sparse matrix
            Training interaction matrix
        user_features : scipy.sparse matrix, optional
            User features matrix
        item_features : scipy.sparse matrix, optional
            Item features matrix
        epochs : int, optional
            Number of training epochs
        num_components : int, optional
            Dimensionality of the feature latent embeddings
        learning_rate : float, optional
            Learning rate for training
        loss : str, optional
            Loss function to use
        no_components : int, optional
            Legacy parameter, use num_components instead
            
        Returns:
        --------
        lightfm.LightFM
            Trained model
        """
        # Handle legacy parameter
        if no_components is not None:
            num_components = no_components
            
        try:
            # Initialize model
            model = LightFM(no_components=num_components, learning_rate=learning_rate, loss=loss)
            
            logger.info(f"Training LightFM model with {epochs} epochs, {num_components} components, loss={loss}")
            start_time = time.time()
            
            # Set up progress bar
            with tqdm(total=epochs, desc="Training") as pbar:
                for _ in range(epochs):
                    model.fit_partial(
                        train_matrix,
                        user_features=user_features,
                        item_features=item_features,
                        epochs=1, 
                        verbose=False
                    )
                    pbar.update(1)
            
            training_time = time.time() - start_time
            logger.info(f"Model training completed in {training_time:.2f} seconds")
            
            return model
        
        except Exception as e:
            logger.error(f"Error training model: {str(e)}")
            # Return a simple model with minimal training as fallback
            simple_model = LightFM(no_components=32, loss='warp')
            simple_model.fit_partial(train_matrix, epochs=5, verbose=False)
            return simple_model
    
    def evaluate_model(self, model, test_matrix, train_matrix=None, k=10):
        """
        Evaluate model performance
        
        Parameters:
        -----------
        model : lightfm.LightFM
            Trained LightFM model
        test_matrix : scipy.sparse matrix
            Test interaction matrix
        train_matrix : scipy.sparse matrix, optional
            Training interaction matrix, used to exclude seen items
        k : int, optional
            Number of recommendations to consider for metrics
            
        Returns:
        --------
        dict
            Dictionary of evaluation metrics
        """
        try:
            # Calculate precision@k and recall@k
            train_precision = precision_at_k(model, train_matrix, k=k).mean() if train_matrix is not None else None
            test_precision = precision_at_k(model, test_matrix, k=k).mean()
            test_recall = recall_at_k(model, test_matrix, k=k).mean()
            
            # Calculate AUC
            test_auc = auc_score(model, test_matrix).mean()
            
            metrics = {
                'train_precision_at_k': train_precision,
                'test_precision_at_k': test_precision,
                'test_recall_at_k': test_recall,
                'test_auc': test_auc
            }
            
            logger.info(f"Evaluation metrics: {metrics}")
            return metrics
            
        except Exception as e:
            logger.error(f"Error evaluating model: {str(e)}")
            return {'error': str(e)}
    
    def save_model(self, model, user_mapping, item_mapping, model_name=None):
        """
        Save trained model and mappings
        
        Parameters:
        -----------
        model : lightfm.LightFM
            Trained LightFM model
        user_mapping : dict
            Dictionary mapping user IDs to indices
        item_mapping : dict
            Dictionary mapping item IDs to indices
        model_name : str, optional
            Name to use for saved model files
            
        Returns:
        --------
        str
            Path to the saved model directory
        """
        try:
            # Generate model name with timestamp if not provided
            if model_name is None:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                model_name = f"lightfm_model_{timestamp}"
            
            # Create model directory
            model_dir = os.path.join(self.models_dir, model_name)
            if not os.path.exists(model_dir):
                os.makedirs(model_dir)
            
            # Save model and mappings
            model_path = os.path.join(model_dir, 'model.joblib')
            user_mapping_path = os.path.join(model_dir, 'user_mapping.joblib')
            item_mapping_path = os.path.join(model_dir, 'item_mapping.joblib')
            
            joblib.dump(model, model_path)
            joblib.dump(user_mapping, user_mapping_path)
            joblib.dump(item_mapping, item_mapping_path)
            
            # Create metadata file
            metadata = {
                'created_at': datetime.now().isoformat(),
                'model_type': 'LightFM',
                'num_users': len(user_mapping),
                'num_items': len(item_mapping)
            }
            
            metadata_path = os.path.join(model_dir, 'metadata.joblib')
            joblib.dump(metadata, metadata_path)
            
            logger.info(f"Model saved to {model_dir}")
            
            # Create a symlink to the latest model
            latest_link = os.path.join(self.models_dir, 'latest')
            if os.path.exists(latest_link):
                if os.path.islink(latest_link):
                    os.unlink(latest_link)
                else:
                    # If it's a directory, remove it
                    import shutil
                    shutil.rmtree(latest_link)
            
            # Create relative symlink
            os.symlink(os.path.basename(model_dir), latest_link)
            
            return model_dir
            
        except Exception as e:
            logger.error(f"Error saving model: {str(e)}")
            return None
    
    def load_latest_model(self):
        """
        Load the latest trained model and mappings
        
        Returns:
        --------
        tuple
            (model, user_mapping, item_mapping, metadata)
        """
        try:
            # Check for latest model symlink
            latest_link = os.path.join(self.models_dir, 'latest')
            if not os.path.exists(latest_link):
                # Find the most recent model directory
                model_dirs = [d for d in os.listdir(self.models_dir) 
                             if os.path.isdir(os.path.join(self.models_dir, d)) and d != 'latest']
                if not model_dirs:
                    logger.error("No trained models found")
                    return None, None, None, None
                
                # Sort by modification time (most recent first)
                model_dirs.sort(key=lambda d: os.path.getmtime(os.path.join(self.models_dir, d)), reverse=True)
                latest_model_dir = os.path.join(self.models_dir, model_dirs[0])
            else:
                # Use the symlink
                latest_model_dir = os.path.realpath(latest_link)
            
            # Load model and mappings
            model_path = os.path.join(latest_model_dir, 'model.joblib')
            user_mapping_path = os.path.join(latest_model_dir, 'user_mapping.joblib')
            item_mapping_path = os.path.join(latest_model_dir, 'item_mapping.joblib')
            metadata_path = os.path.join(latest_model_dir, 'metadata.joblib')
            
            model = joblib.load(model_path)
            user_mapping = joblib.load(user_mapping_path)
            item_mapping = joblib.load(item_mapping_path)
            metadata = joblib.load(metadata_path) if os.path.exists(metadata_path) else {}
            
            logger.info(f"Loaded model from {latest_model_dir}")
            return model, user_mapping, item_mapping, metadata
            
        except Exception as e:
            logger.error(f"Error loading latest model: {str(e)}")
            return None, None, None, None
    
    def train_and_save_model(self, interactions_df=None, include_features=False, model_name=None):
        """
        Train a LightFM model using collected data and save it
        
        Parameters:
        -----------
        interactions_df : pd.DataFrame, optional
            Interactions DataFrame. If not provided, data will be collected.
        include_features : bool, optional
            Whether to include user and item features in training
        model_name : str, optional
            Name for the saved model
            
        Returns:
        --------
        tuple
            (model, model_path, evaluation_metrics)
        """
        try:
            # Collect data if not provided
            if interactions_df is None:
                interactions_df = self.data_collector.get_user_item_interactions()
                
            # Create train/test split
            train_df, test_df = self.create_train_test_split(interactions_df)
            
            # Prepare data for LightFM
            train_matrix, user_mapping, item_mapping = self.data_collector.prepare_lightfm_data(train_df)
            
            # Prepare test data with the same mappings
            # Merge test data with user_id and item_id from training to ensure consistency
            if not test_df.empty:
                test_df = test_df.merge(
                    train_df[['user_id', 'user_idx']].drop_duplicates(),
                    on='user_id',
                    how='inner'
                )
                test_df = test_df.merge(
                    train_df[['item_id', 'item_idx']].drop_duplicates(),
                    on='item_id',
                    how='inner'
                )
                
                # Create test matrix
                test_matrix = None
                if len(test_df) > 0:
                    from scipy.sparse import coo_matrix
                    test_matrix = coo_matrix(
                        (
                            test_df['weight'].values,
                            (test_df['user_idx'].values, test_df['item_idx'].values)
                        ),
                        shape=train_matrix.shape
                    )
            else:
                test_matrix = None
            
            # Collect and prepare feature data if requested
            user_features_matrix = None
            item_features_matrix = None
            
            if include_features:
                user_features = self.data_collector.get_user_features()
                item_features = self.data_collector.get_item_features()
                
                user_features_matrix, item_features_matrix = self.data_collector.create_feature_matrices(
                    user_features, item_features, user_mapping, item_mapping
                )
            
            # Train model
            model = self.train_model(
                train_matrix,
                user_features=user_features_matrix,
                item_features=item_features_matrix
            )
            
            # Evaluate model
            evaluation_metrics = {}
            if test_matrix is not None:
                evaluation_metrics = self.evaluate_model(model, test_matrix, train_matrix)
            
            # Save model
            model_path = self.save_model(model, user_mapping, item_mapping, model_name)
            
            return model, model_path, evaluation_metrics
            
        except Exception as e:
            logger.error(f"Error in train_and_save_model: {str(e)}")
            return None, None, {'error': str(e)}


# Example usage
if __name__ == '__main__':
    trainer = ModelTrainer()
    
    # Train and save model
    model, model_path, metrics = trainer.train_and_save_model(include_features=False)
    
    print(f"Model saved to: {model_path}")
    print(f"Evaluation metrics: {metrics}")