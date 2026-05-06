import mongoose from "mongoose";
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Set up environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory
dotenv.config({ path: path.resolve(__dirname, 'server', '.env') });

console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Not set');

// Simple MongoDB connection
async function connectToMongoDB() {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            throw new Error('MONGODB_URI is not set in .env file');
        }

        console.log('🔌 Connecting to MongoDB...');

        // Connect with basic options
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 30000,
            connectTimeoutMS: 5000,
        });

        console.log('✅ MongoDB connected successfully');
        return mongoose.connection;
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        throw error;
    }
}

// Import model dynamically
async function importProductModel() {
    const { default: ProductModel } = await import('./server/models/product.model.js');
    return ProductModel;
}

async function seedProducts() {
    let connection = null;
    try {
        // Connect to MongoDB
        connection = await connectToMongoDB();

        // Import the Product model
        const ProductModel = await importProductModel();

        // Read the seed data
        const seedDataPath = path.join(__dirname, 'products_seed.json');
        if (!fs.existsSync(seedDataPath)) {
            throw new Error(`Seed data file not found: ${seedDataPath}`);
        }

        const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf8'));
        console.log(`📊 Found ${seedData.length} products to seed`);

        // Check existing products
        const existingProducts = await ProductModel.find({});
        console.log(`💾 Found ${existingProducts.length} existing products in database`);

        let createdCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;

        // Process each product
        for (let i = 0; i < seedData.length; i++) {
            const productData = seedData[i];

            if (i > 0 && i % 50 === 0) {
                console.log(`📈 Processing product ${i}/${seedData.length}...`);
            }

            try {
                // Check if product already exists by SKU
                const existingProduct = await ProductModel.findOne({ sku: productData.sku });

                if (existingProduct) {
                    // Update existing product with new stock quantity
                    if (existingProduct.stock !== productData.stock) {
                        existingProduct.stock = productData.stock;
                        await existingProduct.save();
                        updatedCount++;
                        console.log(`🔄 Updated: ${productData.sku} (stock: ${existingProduct.stock} → ${productData.stock})`);
                    } else {
                        skippedCount++;
                    }
                } else {
                    // Create new product
                    const newProduct = new ProductModel(productData);
                    await newProduct.save();
                    createdCount++;
                    console.log(`✅ Created: ${productData.sku} (stock: ${productData.stock})`);
                }
            } catch (error) {
                console.error(`❌ Error processing ${productData.sku || 'unknown'}:`, error.message);
            }
        }

        console.log(`\n🎉 Seeding complete!`);
        console.log(`   Created: ${createdCount}`);
        console.log(`   Updated: ${updatedCount}`);
        console.log(`   Skipped: ${skippedCount}`);
        console.log(`   Total processed: ${seedData.length}`);

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    } finally {
        if (connection && connection.readyState === 1) {
            await connection.close();
            console.log('🔌 MongoDB connection closed');
        }
        process.exit(0);
    }
}

// Run the seeding
seedProducts().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
});