# TajiCart-AI Recommendation System

A hybrid recommendation system built using Python, LightFM, and Flask to provide personalized product recommendations for the TajiCart-AI e-commerce platform.

## Overview

This recommendation system combines collaborative filtering and content-based approaches using the LightFM library to provide personalized product recommendations. It integrates seamlessly with the TajiCart-AI Node.js backend through a REST API and offers features like user-specific recommendations, similar product suggestions, budget-based recommendations, and more.

## Architecture

The system consists of the following components:

1. **Data Collection Module** (`data_collector.py`): Collects and processes user-item interactions and metadata from MongoDB
2. **Model Training Module** (`train_model.py`): Trains and evaluates LightFM recommendation models
3. **Recommendation Engine** (`recommendation_engine.py`): Generates personalized product recommendations using trained models
4. **API Service** (`api_service.py`): Exposes recommendations through a Flask REST API
5. **Node.js Bridge** (`direct_recommender.js`): Provides a seamless integration with the Node.js backend

## Requirements

- Python 3.10+
- Node.js 14+ (for the Node.js integration)
- MongoDB (for data storage)

## Installation

### 1. Setting up the Python environment

```bash
# Navigate to the recommendation directory
cd server/recommendation

# Create a virtual environment
python -m venv rec-env

# Activate the virtual environment
# On Windows:
rec-env\Scripts\activate
# On Unix/macOS:
source rec-env/bin/activate

# Install required packages
pip install -r requirements.txt
```

### 2. Node.js dependencies

The Node.js bridge requires the following dependencies:

```bash
npm install axios dotenv
```

## Usage

### Starting the Recommendation Service

You can start the recommendation service using either:

1. **Node.js Startup Script**:

```bash
node start_service.js
```

2. **Direct Python API**:

```bash
python api_service.py
```

The service will run by default on port 5000. You can configure a different port using the `RECOMMENDATION_API_PORT` environment variable.

### Training a Recommendation Model

To train a new recommendation model:

```bash
python -m train_model
```

This will:
1. Collect user-item interactions from MongoDB
2. Create train/test splits
3. Train a LightFM model
4. Evaluate the model
5. Save the model and mappings to the `models/` directory

### Integrating with Node.js Backend

The recommendation system provides a convenient Node.js client that handles communication with the API:

```javascript
const { getRecommender } = require('./recommendation/direct_recommender');

async function getRecommendations() {
  // Initialize the recommender (starts the service if needed)
  const recommender = getRecommender();
  await recommender.initialize();
  
  // Get recommendations for a user
  const userId = '12345';
  const recommendations = await recommender.getUserRecommendations(userId, {
    n: 10,
    category: 'electronics'
  });
  
  return recommendations;
}
```

## API Endpoints

The recommendation service exposes the following REST API endpoints:

### User Recommendations

```
GET /recommendations/user/:userId
```

Query parameters:
- `n`: Number of recommendations to return (default: 10)
- `category`: Filter by category (optional)
- `exclude_purchased`: Whether to exclude purchased items (default: true)
- `use_cache`: Whether to use cached recommendations (default: true)

### Similar Products

```
GET /recommendations/similar/:productId
```

Query parameters:
- `n`: Number of similar products to return (default: 5)

### Budget-Based Recommendations

```
GET /recommendations/budget
```

Query parameters:
- `user_id`: User ID for personalized recommendations (optional)
- `budget`: Maximum price for recommended products (required)
- `category`: Filter by category (optional)
- `n`: Number of recommendations to return (default: 5)

### Popular Products

```
GET /recommendations/popular
```

Query parameters:
- `n`: Number of popular products to return (default: 10)
- `category`: Filter by category (optional)

### Admin Endpoints

```
POST /admin/refresh-model
```

Reloads the latest trained model from disk.

```
POST /admin/cache-recommendations
```

Pre-computes and caches recommendations for users.

Request body:
- `user_ids`: Array of user IDs to generate recommendations for (optional)
- `count`: Number of recommendations per user (default: 10)

## Handling Cold-Start Problems

The recommendation system employs several strategies to handle cold-start problems:

### New Users

For new users without sufficient interaction history, the system:

1. Falls back to popularity-based recommendations
2. Uses any available demographic or preference information
3. Gradually incorporates user feedback as it becomes available

### New Products

For new products without sufficient interaction history, the system:

1. Incorporates product metadata (category, brand, tags)
2. Uses content-based similarity to make recommendations
3. Prioritizes exploration of new items through strategic placement

## Performance Optimization

### Caching Strategy

The system uses multi-level caching to optimize performance:

1. **Model-level cache**: Trained models are loaded into memory
2. **User-level cache**: Pre-computed recommendations for users are stored in MongoDB
3. **Request-level cache**: Commonly requested data is cached during the API request lifecycle

### Scaling for Large Datasets

For large datasets, consider:

1. Increasing server resources (memory, CPU)
2. Using periodic batch processing for model training
3. Implementing a distributed computing approach for very large datasets
4. Setting up a dedicated recommendation server separate from the main application

## Integration Examples

### Express.js Controller

```javascript
// recommendation.controller.js
const { getRecommender } = require('../recommendation/direct_recommender');
const recommender = getRecommender();

// Initialize the recommender when the server starts
recommender.initialize();

exports.getUserRecommendations = async (req, res) => {
  try {
    const { userId } = req.params;
    const { category, limit } = req.query;
    
    const result = await recommender.getUserRecommendations(userId, {
      n: limit ? parseInt(limit) : 10,
      category
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
};
```

### React Component

```jsx
// RecommendedProducts.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ProductCard from './ProductCard';

const RecommendedProducts = ({ userId, category }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/recommendations/user/${userId}`, {
          params: { category }
        });
        setProducts(response.data.recommendations);
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecommendations();
  }, [userId, category]);
  
  if (loading) return <div>Loading recommendations...</div>;
  
  return (
    <div className="recommended-products">
      <h2>Recommended for You</h2>
      <div className="product-grid">
        {products.map(product => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </div>
  );
};

export default RecommendedProducts;
```

## Troubleshooting

### Common Issues

1. **API not starting**: Check Python environment and dependencies
2. **Model training errors**: Ensure MongoDB connection is working
3. **Empty recommendations**: Check if there's enough user interaction data
4. **Slow response time**: Consider increasing caching and optimizing model size

### Logs

Logs are available in the `logs/` directory:
- `data_collector_YYYYMMDD.log`: Data collection logs
- `model_trainer_YYYYMMDD.log`: Model training logs
- `recommendation_engine_YYYYMMDD.log`: Recommendation generation logs
- `api_service_YYYYMMDD.log`: API service logs

## License

This project is part of the TajiCart-AI e-commerce platform.