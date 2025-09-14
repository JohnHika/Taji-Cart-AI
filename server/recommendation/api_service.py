"""
API Service for TajiCart-AI Recommendation System

This module provides API endpoints for recommendations, chat, and other
related functionality for the TajiCart-AI system.
"""

import hashlib
import json
import logging
import os
import sys
from datetime import datetime
from typing import Any, Dict, List, Optional, Union

import uvicorn
from fastapi import Body, Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Add parent directory to path to import local modules
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from recommendation.data_collector import DataCollector
# Local imports
from recommendation.lightfm_recommendation import LightFMRecommender
from recommendation.mongo_data_access import MongoDataAccess
from recommendation.recommendation_engine import recommendation_engine

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('api_service')

# Initialize FastAPI app
app = FastAPI(
    title="TajiCart-AI Recommendation API",
    description="API for product recommendations and chatbot functionality",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update with your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize MongoDB client
db_access = MongoDataAccess()
data_collector = DataCollector(db_access)


@app.get("/")
async def read_root():
    """Root endpoint"""
    return {"message": "Welcome to TajiCart-AI Recommendation API"}


@app.get("/healthcheck")
async def healthcheck():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.get("/recommendations/trending")
async def get_trending_products(limit: int = 10):
    """Get trending products"""
    try:
        trending_products = recommendation_engine._get_trending_products(limit)
        
        # Format response
        formatted_products = []
        for product in trending_products:
            formatted_products.append({
                'id': str(product.get('_id')),
                'name': product.get('name', 'Unknown Product'),
                'price': product.get('price', 0),
                'description': product.get('description', ''),
                'stock': product.get('stock', 0),
                'image': product.get('image', []),
                'category': [str(cat) for cat in product.get('category', [])]
            })
        
        return {
            "success": True,
            "data": formatted_products
        }
    except Exception as e:
        logger.error(f"Error getting trending products: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred while fetching trending products"
        )


@app.get("/recommendations/user/{user_id}")
async def get_user_recommendations(user_id: str, limit: int = 10, category: Optional[str] = None):
    """Get personalized recommendations for a user"""
    try:
        recommendations = recommendation_engine.get_recommendations(
            user_id=user_id,
            limit=limit,
            category=category
        )
        
        return {
            "success": True,
            "data": recommendations
        }
    except Exception as e:
        logger.error(f"Error getting user recommendations: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred while fetching recommendations"
        )


@app.get("/search")
async def search_products(q: str, limit: int = 10):
    """Search products by query"""
    try:
        results = recommendation_engine.search_products(q, limit)
        
        return {
            "success": True,
            "data": results
        }
    except Exception as e:
        logger.error(f"Error searching products: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred while searching products"
        )


@app.post("/chat")
async def chat_endpoint(
    request: Dict = Body(...)
):
    """
    Chat endpoint that processes user messages and returns intelligent responses
    
    Request body should include:
    - message: User's input message
    - userId: User ID (or 'guest' for anonymous users)
    - sessionId: Session identifier for tracking conversation context
    """
    try:
        message = request.get('message', '')
        user_id = request.get('userId', 'guest')
        session_id = request.get('sessionId', '')
        
        # Generate a consistent session ID if not provided
        if not session_id:
            # Create a hash of user ID and timestamp for anonymous sessions
            session_id = hashlib.md5(f"{user_id}:{datetime.now().timestamp()}".encode()).hexdigest()
        
        if not message:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Message is required"}
            )
        
        # Log user interaction for later analysis
        logger.info(f"User {user_id} message: {message[:50]}...")
        
        # Process message through recommendation engine
        response = recommendation_engine.process_message(message, user_id, session_id)
        
        # Return the enhanced response
        return {
            "success": True,
            "message": response.get('text', 'Sorry, I could not process your request.'),
            "products": response.get('products', []),
            "cart": response.get('cart', None),
            "followUpSuggestions": response.get('follow_up_suggestions', []),
            "category": response.get('category', None),
            "query": response.get('query', None),
            "budget": response.get('budget', None),
            "sessionId": session_id
        }
    except Exception as e:
        logger.error(f"Error processing chat message: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "An error occurred while processing your message.",
                "followUpSuggestions": ["Try again", "Show me trending products", "Help"]
            }
        )


@app.get("/cart/{user_id}")
async def get_user_cart(user_id: str, session_id: Optional[str] = "default"):
    """Get a user's cart contents"""
    try:
        cart = recommendation_engine.get_cart(user_id, session_id)
        
        return {
            "success": True,
            "data": cart
        }
    except Exception as e:
        logger.error(f"Error fetching cart: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred while fetching cart information"
        )


@app.post("/cart/add")
async def add_to_cart(
    request: Dict = Body(...)
):
    """Add a product to user's cart"""
    try:
        user_id = request.get('userId', 'guest')
        product_name = request.get('productName', '')
        session_id = request.get('sessionId', 'default')
        
        if not product_name:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Product name is required"}
            )
        
        result = recommendation_engine.add_to_cart(user_id, product_name, session_id)
        
        return {
            "success": result.get('success', False),
            "message": result.get('message', ''),
            "product": result.get('product', None)
        }
    except Exception as e:
        logger.error(f"Error adding to cart: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "An error occurred while adding to cart."
            }
        )


@app.post("/retrain")
async def trigger_retraining():
    """Trigger retraining of the recommendation models"""
    try:
        # Start a background task for retraining
        # This would typically be handled by a task queue in production
        return {"success": True, "message": "Retraining has been scheduled"}
    except Exception as e:
        logger.error(f"Error scheduling retraining: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred while scheduling retraining"
        )


if __name__ == "__main__":
    uvicorn.run("api_service:app", host="0.0.0.0", port=8000, reload=True)