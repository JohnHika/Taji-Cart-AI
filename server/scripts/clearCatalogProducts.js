import dotenv from 'dotenv';
import mongoose from 'mongoose';

import CartProductModel from '../models/cartproduct.model.js';
import ProductModel from '../models/product.model.js';
import ProductEmbedding from '../models/productEmbedding.model.js';
import Review from '../models/review.model.js';

dotenv.config();

async function clearCatalogProducts() {
  await mongoose.connect(process.env.MONGODB_URI);

  const [productsDeleted, cartItemsDeleted, embeddingsDeleted, reviewsDeleted] = await Promise.all([
    ProductModel.deleteMany({}),
    CartProductModel.deleteMany({}),
    ProductEmbedding.deleteMany({}),
    Review.deleteMany({})
  ]);

  console.log('Catalog cleanup complete.');
  console.log(`Products deleted: ${productsDeleted.deletedCount}`);
  console.log(`Cart items deleted: ${cartItemsDeleted.deletedCount}`);
  console.log(`Embeddings deleted: ${embeddingsDeleted.deletedCount}`);
  console.log(`Reviews deleted: ${reviewsDeleted.deletedCount}`);

  await mongoose.disconnect();
}

clearCatalogProducts().catch(async (error) => {
  console.error('Failed to clear catalog products:', error.message);
  try {
    await mongoose.disconnect();
  } catch {
    // no-op
  }
  process.exit(1);
});
