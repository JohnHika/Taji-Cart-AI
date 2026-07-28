import dotenv from 'dotenv';
import mongoose from 'mongoose';
import ProductModel from '../models/product.model.js';

dotenv.config({ path: '../.env' });
dotenv.config({ path: './.env', override: false });

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
const dryRun = process.argv.includes('--dry-run');

const OLD_PLACEHOLDER = 'https://res.cloudinary.com/demo/image/upload/v1/samples/ecommerce/leather-bag-gray';
const NEW_PLACEHOLDER = 'https://nawirihairke.com/images/product-photo-pending.svg';

const run = async () => {
  if (!uri) {
    console.error('Missing MONGODB_URI / MONGO_URI in environment.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log(`Connected. dryRun=${dryRun}`);

  const affected = await ProductModel.find({ image: OLD_PLACEHOLDER }, '_id name image').lean();
  console.log(`Found ${affected.length} product(s) using the old placeholder image.`);

  for (const p of affected) {
    console.log(` - ${p.name} (${p._id})`);
  }

  if (!dryRun && affected.length > 0) {
    const result = await ProductModel.updateMany(
      { image: OLD_PLACEHOLDER },
      { $set: { 'image.$[elem]': NEW_PLACEHOLDER } },
      { arrayFilters: [{ elem: OLD_PLACEHOLDER }] }
    );
    console.log(`Updated ${result.modifiedCount} product(s).`);
  } else if (dryRun) {
    console.log('Dry run — no changes written. Re-run without --dry-run to apply.');
  }

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
