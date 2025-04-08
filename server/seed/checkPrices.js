import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Product from '../models/product.model.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

/**
 * Check product prices and print diagnostic info
 */
const checkProductPrices = async () => {
  try {
    console.log("Checking product prices...");
    
    // Count total products
    const totalCount = await Product.countDocuments({});
    console.log(`Database has ${totalCount} products in total`);
    
    // Get price statistics
    const allProducts = await Product.find().select('name price');
    
    if (allProducts.length === 0) {
      console.log("No products found in database!");
      return;
    }
    
    // Calculate min, max, avg prices
    const prices = allProducts.map(p => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    
    console.log(`Price range: KES ${minPrice} - KES ${maxPrice}`);
    console.log(`Average price: KES ${avgPrice.toFixed(2)}`);
    
    // Count products by price range in KES
    const priceRanges = [
      { range: 'KES 0-5,000', count: 0 },
      { range: 'KES 5,000-10,000', count: 0 },
      { range: 'KES 10,000-20,000', count: 0 },
      { range: 'KES 20,000-50,000', count: 0 },
      { range: 'KES 50,000-100,000', count: 0 },
      { range: 'KES 100,000+', count: 0 }
    ];
    
    prices.forEach(price => {
      if (price <= 5000) priceRanges[0].count++;
      else if (price <= 10000) priceRanges[1].count++;
      else if (price <= 20000) priceRanges[2].count++;
      else if (price <= 50000) priceRanges[3].count++;
      else if (price <= 100000) priceRanges[4].count++;
      else priceRanges[5].count++;
    });
    
    // Display price distribution
    console.log("Price distribution:");
    priceRanges.forEach(range => {
      console.log(`${range.range}: ${range.count} products (${((range.count / totalCount) * 100).toFixed(1)}%)`);
    });
    
    // Check for unusually high-priced products (potential data errors)
    const highPricedProducts = await Product.find({ price: { $gt: 200000 } })
      .sort({ price: -1 })
      .limit(5);
    
    if (highPricedProducts.length > 0) {
      console.log("\nPotential price anomalies (>KES 200,000):");
      highPricedProducts.forEach(p => {
        console.log(`- ${p.name}: KES ${p.price.toLocaleString()} (USD $${(p.price / 128).toFixed(2)})`);
      });
    }
    
    // Check products with lowest prices
    const lowestPricedProducts = await Product.find()
      .sort({ price: 1 })
      .limit(5);
    
    console.log("\nLowest priced products:");
    lowestPricedProducts.forEach(p => {
      console.log(`- ${p.name}: KES ${p.price.toLocaleString()} (USD $${(p.price / 128).toFixed(2)})`);
    });
    
  } catch (error) {
    console.error('Error checking product prices:', error);
  } finally {
    mongoose.disconnect();
  }
};

// Run the price check
checkProductPrices();
