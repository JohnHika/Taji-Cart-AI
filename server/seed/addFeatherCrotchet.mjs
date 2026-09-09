// One-off seed script: adds "Feather Crotchet 16inch" to the existing
// "CROTCHET HAIR" category. Price/stock left at 0 (not yet priced/stocked),
// same as the batch in addNewHairProducts.mjs — hidden from the Sales
// Counter grid until priced (existing, intentional filtering).
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ProductModel from '../models/product.model.js';
import CategoryModel from '../models/category.model.js';

dotenv.config();

const NAME = 'Feather Crotchet 16inch';

const toHandle = (name) =>
  name
    .toLowerCase()
    .replace(/["#]/g, '')
    .replace(/\//g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const toSku = (name) =>
  name
    .toUpperCase()
    .replace(/["#]/g, '')
    .replace(/\//g, '-')
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const category = await CategoryModel.findOne({ name: 'CROTCHET HAIR' });
  if (!category) {
    throw new Error('Expected existing "CROTCHET HAIR" category was not found');
  }

  const sku = toSku(NAME);
  const existing = await ProductModel.findOne({ sku });
  if (existing) {
    console.log(`Skipped (SKU already exists): ${sku}`);
    await mongoose.disconnect();
    return;
  }

  const created = await ProductModel.create({
    handle: toHandle(NAME),
    name: NAME,
    sku,
    image: [],
    category: [category._id],
    subCategory: [],
    unit: 'bundle',
    costPrice: 0,
    price: 0,
    discount: 0,
    stock: 0,
    description: NAME,
    publish: true,
    variants: { color: '', length: '16"' },
    more_details: {},
  });

  console.log(`Created: ${created.name} (SKU: ${created.sku}, _id: ${created._id}, category: CROTCHET HAIR)`);

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
