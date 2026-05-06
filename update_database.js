import mongoose from "mongoose";
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Set up environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, 'server', '.env') });

// Import the Product model
import ProductModel from './server/models/product.model.js';

async function connectToMongoDB() {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            throw new Error('MONGODB_URI is not set in .env file');
        }

        console.log('Connecting to MongoDB...');
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 30000,
            connectTimeoutMS: 5000,
        });
        console.log('MongoDB connected successfully');
        return mongoose.connection;
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        throw error;
    }
}

async function updateDatabaseWithCorrectData() {
    let connection = null;
    try {
        // Connect to MongoDB
        connection = await connectToMongoDB();

        // Read the corrected data
        const correctedDataPath = path.join(__dirname, 'products_corrected.json');
        if (!fs.existsSync(correctedDataPath)) {
            throw new Error(`Corrected data file not found: ${correctedDataPath}`);
        }

        const correctedData = JSON.parse(fs.readFileSync(correctedDataPath, 'utf8'));
        console.log(`Found ${correctedData.length} corrected products`);

        // Get current products from database
        const currentProducts = await ProductModel.find({});
        console.log(`Current products in database: ${currentProducts.length}`);

        let updatedCount = 0;
        let createdCount = 0;
        let skippedCount = 0;

        for (let i = 0; i < correctedData.length; i++) {
            const productData = correctedData[i];

            if (i > 0 && i % 50 === 0) {
                console.log(`Processing product ${i}/${correctedData.length}...`);
            }

            try {
                // Check if product already exists by SKU
                const existingProduct = await ProductModel.findOne({ sku: productData.sku });

                if (existingProduct) {
                    // Update existing product
                    if (existingProduct.stock !== productData.stock) {
                        existingProduct.stock = productData.stock;
                        await existingProduct.save();
                        updatedCount++;
                        console.log(`Updated: ${productData.sku} (${existingProduct.stock} → ${productData.stock})`);
                    } else {
                        skippedCount++;
                    }
                } else {
                    // Create new product
                    const newProduct = new ProductModel(productData);
                    await newProduct.save();
                    createdCount++;
                    console.log(`Created: ${productData.sku} (stock: ${productData.stock})`);
                }
            } catch (error) {
                console.error(`Error processing ${productData.sku || 'unknown'}:`, error.message);
            }
        }

        console.log(`\nDatabase update complete!`);
        console.log(`   Created: ${createdCount}`);
        console.log(`   Updated: ${updatedCount}`);
        console.log(`   Skipped: ${skippedCount}`);
        console.log(`   Total processed: ${correctedData.length}`);

        // Show summary of changes
        const finalCount = await ProductModel.countDocuments();
        console.log(`\nFinal database status:`);
        console.log(`   Total products: ${finalCount}`);

    } catch (error) {
        console.error('Database update failed:', error);
        process.exit(1);
    } finally {
        if (connection && connection.readyState === 1) {
            await connection.close();
            console.log('MongoDB connection closed');
        }
        process.exit(0);
    }
}

// Run the update
updateDatabaseWithCorrectData().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
});