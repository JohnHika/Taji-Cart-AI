# Add these methods to your LightFMRecommender class

def save_model(self, file_path='training_data/lightfm_model.npz'):
    """
    Save the trained LightFM model to a file.
    
    Parameters:
    -----------
    file_path : str, optional
        Path where to save the model
    """
    try:
        # Make sure directory exists
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        # Save the model
        with open(file_path, 'wb') as f:
            pickle.dump(self.model, f)
        
        # Save mappings
        with open(os.path.join(os.path.dirname(file_path), 'user_mapping.json'), 'w') as f:
            json.dump(self.user_id_mapping, f)
            
        with open(os.path.join(os.path.dirname(file_path), 'item_mapping.json'), 'w') as f:
            json.dump(self.item_id_mapping, f)
            
        logger.info(f"Model saved to {file_path}")
        return True
    except Exception as e:
        logger.error(f"Error saving model: {str(e)}")
        return False

def load_model(self, file_path='training_data/lightfm_model.npz'):
    """
    Load a trained LightFM model from a file.
    
    Parameters:
    -----------
    file_path : str, optional
        Path where to load the model from
        
    Returns:
    --------
    bool
        True if successfully loaded, False otherwise
    """
    try:
        # Check if file exists
        if not os.path.exists(file_path):
            logger.warning(f"Model file not found: {file_path}")
            return False
        
        # Load the model
        with open(file_path, 'rb') as f:
            self.model = pickle.load(f)
            
        # Load mappings if they exist
        user_mapping_path = os.path.join(os.path.dirname(file_path), 'user_mapping.json')
        item_mapping_path = os.path.join(os.path.dirname(file_path), 'item_mapping.json')
        
        if os.path.exists(user_mapping_path):
            with open(user_mapping_path, 'r') as f:
                self.user_id_mapping = json.load(f)
        
        if os.path.exists(item_mapping_path):
            with open(item_mapping_path, 'r') as f:
                self.item_id_mapping = json.load(f)
                
        logger.info(f"Model loaded from {file_path}")
        return True
    except Exception as e:
        logger.error(f"Error loading model: {str(e)}")
        return False

def recommend_for_user(self, user_id, n=5):
    """
    Get recommendations for a specific user.
    
    Parameters:
    -----------
    user_id : int
        Internal user ID
    n : int, optional
        Number of recommendations to return
        
    Returns:
    --------
    list
        List of recommended internal item IDs
    """
    if self.model is None:
        logger.error("Model not trained yet")
        return []
    
    try:
        # Get scores for all items for this user
        scores = self.model.predict(user_id, np.arange(self.num_items))
        
        # Get indices of top N items
        top_items = np.argsort(-scores)[:n]
        
        return top_items.tolist()
    except Exception as e:
        logger.error(f"Error getting recommendations: {str(e)}")
        return []
