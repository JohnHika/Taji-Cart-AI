import mongoose from "mongoose";
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import the Product model
import ProductModel from './server/models/product.model.js';
import connectDB from './server/config/connectDB.js';

dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seedProducts() {
    try {
        // Connect to MongoDB
        console.log('🔌 Connecting to MongoDB...');
        await connectDB();

        // Read the seed data
        const seedDataPath = path.join(__dirname, 'products_seed.json');
        const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf8'));

        console.log(`📊 Found ${seedData.length} products to seed`);

        // Check existing products
        const existingProducts = await ProductModel.find({});
        console.log(`💾 Found ${existingProducts.length} existing products in database`);

        let createdCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;

        for (const productData of seedData) {
            try {
                // Check if product already exists by SKU
                const existingProduct = await ProductModel.findOne({ sku: productData.sku });

                if (existingProduct) {
                    // Update existing product with new stock quantity
                    if (existingProduct.stock !== productData.stock) {
                        existingProduct.stock = productData.stock;
                        await existingProduct.save();
                        updatedCount++;
                        console.log(`🔄 Updated: ${productData.sku} (stock: ${productData.stock})`);
                    } else {
                        skippedCount++;
                        console.log(`⏭️  Skipped: ${productData.sku} (no changes)`);
                    }
                } else {
                    // Create new product
                    const newProduct = new ProductModel(productData);
                    await newProduct.save();
                    createdCount++;
                    console.log(`✅ Created: ${productData.sku} (stock: ${productData.stock})`);
                }
            } catch (error) {
                console.error(`❌ Error processing ${productData.sku}:`, error.message);
            }
        }

        console.log(`\n📈 Seeding complete!`);
        console.log(`   Created: ${createdCount}`);
        console.log(`   Updated: ${updatedCount}`);
        console.log(`   Skipped: ${skippedCount}`);
        console.log(`   Total processed: ${seedData.length}`);

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    } finally {
        // Close the database connection
        await mongoose.connection.close();
        console.log('🔌 MongoDB connection closed');
        process.exit(0);
    }
}

// Run the seeding
seedProducts();