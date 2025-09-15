"""
Test script for the Nawiri Hair chatbot functionality.

This script verifies that the chatbot can understand various intents
and provide appropriate responses.
"""

import json
import os
import pprint
import sys

# Add parent directories to path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)
sys.path.append(os.path.dirname(parent_dir))

# Import chatbot components
from recommendation.recommendation_engine import RecommendationEngine

# Test queries
test_queries = [
    "Hello",
    "What's trending right now?",
    "Recommend some gaming keyboards",
    "What can I get for 50000?",
    "Add RTX 4080 to my cart",
    "What's in my cart?",
    "Search for gaming laptops",
    "Help",
    "Tell me more about the first product",
    "What do you have under 100000 shillings?"
]

def test_chatbot():
    """Run test queries through the chatbot and print responses."""
    # Initialize the recommendation engine
    engine = RecommendationEngine()
    
    # Use a consistent session ID for testing
    session_id = "test-session-123"
    user_id = "guest"  # Change this to a real user ID to test personalization
    
    print("🧪 Testing Nawiri Hair Shopping Assistant")
    print("==========================================\n")
    
    for query in test_queries:
        print(f"👤 User: {query}")
        
        # Process the message
        response = engine.process_message(query, user_id, session_id)
        
        # Print the response
        print(f"🤖 Bot: {response.get('text', 'No response')}\n")
        
        # Print product recommendations if any
        if response.get('products'):
            print(f"Products recommended:")
            for i, product in enumerate(response['products'][:3], 1):
                print(f"  {i}. {product.get('name')} - KES {product.get('price', 0):,}")
            print()
        
        # Print cart info if available
        if response.get('cart'):
            print(f"Cart items: {len(response['cart'].get('items', []))}")
            print(f"Cart total: KES {response['cart'].get('total', 0):,}\n")
        
        print("-" * 60 + "\n")

if __name__ == "__main__":
    test_chatbot()
