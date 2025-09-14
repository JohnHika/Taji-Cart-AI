#!/usr/bin/env python
"""
Unit Tests for MongoDataAccess

This module contains tests for the MongoDataAccess class methods.
"""

import os
import sys
import unittest
from unittest.mock import MagicMock, patch

import pandas as pd

# Add parent directory to path to allow imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from recommendation.mongo_data_access import MongoDataAccess


class TestMongoDataAccess(unittest.TestCase):
    """Tests for MongoDataAccess class"""

    def setUp(self):
        """Set up test fixtures"""
        # Create a mock MongoDB client
        self.mock_client_patcher = patch('recommendation.mongo_data_access.MongoClient')
        self.mock_client = self.mock_client_patcher.start()
        
        # Mock the db and collections
        self.mock_db = MagicMock()
        self.mock_client.return_value.__getitem__.return_value = self.mock_db
        
        # Create test instance with mock MongoDB
        self.data_access = MongoDataAccess(uri="mongodb://test")
    
    def tearDown(self):
        """Tear down test fixtures"""
        self.mock_client_patcher.stop()
    
    def test_get_user_interactions(self):
        """Test get_user_interactions method"""
        # Mock the find result
        mock_cursor = MagicMock()
        mock_cursor.to_list.return_value = [
            {
                'userId': 'user1',
                'productId': 'item1',
                'type': 'view',
                'timestamp': '2025-04-25T12:00:00Z'
            },
            {
                'userId': 'user1',
                'productId': 'item2',
                'type': 'purchase',
                'timestamp': '2025-04-26T12:00:00Z'
            }
        ]
        self.mock_db.interactions.find.return_value = mock_cursor
        
        # Call the method
        result = self.data_access.get_user_interactions(days_limit=30)
        
        # Assert correct data was returned
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0]['userId'], 'user1')
        self.assertEqual(result[1]['productId'], 'item2')
        
        # Assert the find was called with correct parameters
        self.mock_db.interactions.find.assert_called_once()
    
    def test_get_product_features(self):
        """Test get_product_features method"""
        # Mock the find result
        mock_cursor = MagicMock()
        mock_cursor.to_list.return_value = [
            {
                '_id': 'item1',
                'name': 'Test Product',
                'category': 'Electronics',
                'price': 99.99,
                'brand': 'TestBrand'
            }
        ]
        self.mock_db.products.find.return_value = mock_cursor
        
        # Call the method
        result = self.data_access.get_product_features()
        
        # Assert correct data was returned
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['_id'], 'item1')
        self.assertEqual(result[0]['category'], 'Electronics')
        
        # Assert the find was called with correct parameters
        self.mock_db.products.find.assert_called_once()
    
    def test_get_user_features(self):
        """Test get_user_features method"""
        # Mock the find result
        mock_cursor = MagicMock()
        mock_cursor.to_list.return_value = [
            {
                '_id': 'user1',
                'preferences': ['Electronics', 'Books'],
                'age': 30
            }
        ]
        self.mock_db.users.find.return_value = mock_cursor
        
        # Call the method
        result = self.data_access.get_user_features()
        
        # Assert correct data was returned
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['_id'], 'user1')
        self.assertEqual(result[0]['preferences'][0], 'Electronics')
        
        # Assert the find was called with correct parameters
        self.mock_db.users.find.assert_called_once()


if __name__ == '__main__':
    unittest.main()