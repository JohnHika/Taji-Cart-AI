import mongoose from "mongoose";
import dotenv from 'dotenv';
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

        console.log('🔌 Connecting to MongoDB for verification...');
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

async function verifySeededData() {
    let connection = null;
    try {
        // Connect to MongoDB
        connection = await connectToMongoDB();

        console.log('🔍 Verifying seeded data...\n');

        // 1. Get total count of products
        const totalProducts = await ProductModel.countDocuments();
        console.log(`📊 Total products in database: ${totalProducts}`);

        // 2. Get some sample products
        console.log('\n📝 Sample products:');
        const sampleProducts = await ProductModel.find({}).limit(5).lean();

        sampleProducts.forEach((product, index) => {
            console.log(`\n${index + 1}. ${product.name}`);
            console.log(`   SKU: ${product.sku}`);
            console.log(`   Barcode: ${product.barcode}`);
            console.log(`   Stock: ${product.stock}`);
            console.log(`   Variants: ${JSON.stringify(product.variants)}`);
            console.log(`   Handle: ${product.handle}`);
        });

        // 3. Get product category statistics
        console.log('\n📈 Product category statistics:');
        const pipeline = [
            {
                $group: {
                    _id: "$name",
                    count: { $sum: 1 },
                    totalStock: { $sum: "$stock" }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ];

        const categoryStats = await ProductModel.aggregate(pipeline);

        categoryStats.forEach((stat, index) => {
            console.log(`${index + 1}. ${stat._id}: ${stat.count} variants, ${stat.totalStock} total stock`);
        });

        // 4. Check for any products with potential issues
        console.log('\n🔍 Data quality check:');

        const missingBarcode = await ProductModel.countDocuments({ barcode: { $in: ["", null, undefined] } });
        const missingSku = await ProductModel.countDocuments({ sku: { $in: ["", null, undefined] } });
        const negativeStock = await ProductModel.countDocuments({ stock: { $lt: 0 } });

        console.log(`   Products with missing barcodes: ${missingBarcode}`);
        console.log(`   Products with missing SKUs: ${missingSku}`);
        console.log(`   Products with negative stock: ${negativeStock}`);

        if (negativeStock > 0) {
            console.log('\n   ⚠️  Products with negative stock (may need review):');
            const negativeStockProducts = await ProductModel.find({ stock: { $lt: 0 } }).select('name sku stock').lean();
            negativeStockProducts.slice(0, 5).forEach(product => {
                console.log(`      - ${product.name}: ${product.stock}`);
            });
        }

        // 5. Summary
        console.log('\n✅ Verification complete!');
        console.log(`   Total products verified: ${totalProducts}`);
        console.log(`   Data quality: ${missingBarcode + missingSku === 0 ? 'Excellent ✅' : 'Needs review ⚠️'}`);

    } catch (error) {
        console.error('❌ Verification failed:', error);
        process.exit(1);
    } finally {
        if (connection && connection.readyState === 1) {
            await connection.close();
            console.log('🔌 MongoDB connection closed');
        }
        process.exit(0);
    }
}

// Run the verification
verifySeededData().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
});