// One-off seed script: adds 8 new hair products requested by the store
// owner. Run once with `node seed/addNewHairProducts.mjs` from server/.
// Prices intentionally left at 0 (not yet priced) and stock at 0 (not yet
// stocked) — the store owner will set both later via the admin UI. Products
// with price <= 0 are hidden from the Sales Counter grid by existing,
// intentional filtering, so this is safe: they simply won't be sellable
// until priced.
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ProductModel from '../models/product.model.js';
import CategoryModel from '../models/category.model.js';

dotenv.config();

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

const getOrCreateCategory = async (name) => {
  let category = await CategoryModel.findOne({ name });
  if (!category) {
    category = await CategoryModel.create({ name });
    console.log(`Created new category: ${name} (${category._id})`);
  }
  return category;
};

const buildProduct = ({ name, color, length, categoryId }) => ({
  handle: toHandle(name),
  name,
  sku: toSku(name),
  image: [],
  category: [categoryId],
  subCategory: [],
  unit: 'bundle',
  costPrice: 0,
  price: 0,
  discount: 0,
  stock: 0,
  description: name,
  publish: true,
  variants: {
    color: color || '',
    length: length || '',
  },
  more_details: {},
});

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const frenchCurlCategory = await getOrCreateCategory('French Curl');
  const passionTwistCategory = await getOrCreateCategory('Passion Twist');
  const deepTwistCategory = await getOrCreateCategory('Deep Twist');
  const vixenCategory = await getOrCreateCategory('Vixen Hair');
  const kinkyCurlCategory = await getOrCreateCategory('Kinky Curl');

  const products = [
    buildProduct({
      name: 'FRENCH CURL 18INCH - D4',
      color: 'D4',
      length: '18"',
      categoryId: frenchCurlCategory._id,
    }),
    buildProduct({
      name: 'Passion twist 18inch - 1B',
      color: '1B',
      length: '18"',
      categoryId: passionTwistCategory._id,
    }),
    buildProduct({
      name: 'Deeptwist - T530',
      color: 'T530',
      length: '',
      categoryId: deepTwistCategory._id,
    }),
    buildProduct({
      name: 'Vixen - 1B',
      color: '1B',
      length: '',
      categoryId: vixenCategory._id,
    }),
    buildProduct({
      name: 'KINKY CURL HUMAN HAIR 12INCH - 1B',
      color: '1B',
      length: '12"',
      categoryId: kinkyCurlCategory._id,
    }),
    buildProduct({
      name: 'KINKY CURL HUMAN HAIR 12INCH - OT30',
      color: 'OT30',
      length: '12"',
      categoryId: kinkyCurlCategory._id,
    }),
    buildProduct({
      name: 'Kinky curl Human hair 16inch - 1B',
      color: '1B',
      length: '16"',
      categoryId: kinkyCurlCategory._id,
    }),
    buildProduct({
      name: 'Kinky curl Human hair 16inch - OT30',
      color: 'OT30',
      length: '16"',
      categoryId: kinkyCurlCategory._id,
    }),
  ];

  const results = [];
  for (const product of products) {
    const existing = await ProductModel.findOne({ sku: product.sku });
    if (existing) {
      console.log(`Skipped (SKU already exists): ${product.sku}`);
      results.push({ sku: product.sku, status: 'skipped' });
      continue;
    }
    const created = await ProductModel.create(product);
    console.log(`Created: ${created.name} (SKU: ${created.sku}, _id: ${created._id})`);
    results.push({ sku: product.sku, status: 'created', id: created._id.toString() });
  }

  console.log('\nSummary:', JSON.stringify(results, null, 2));

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
