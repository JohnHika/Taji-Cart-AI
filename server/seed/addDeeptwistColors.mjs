// One-off seed script: adds two new Deeptwist color variants ("Red" and
// "Pink") to the existing "Deep Twist" category, following the same
// pattern used for "Deeptwist - T530" in addNewHairProducts.mjs. The standard
// 22-inch variants sell at KSh 650; stock is left at 0 until it is counted.
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ProductModel from '../models/product.model.js';
import CategoryModel from '../models/category.model.js';
import SubCategoryModel from '../models/subCategory.model.js';
import { reserveNextProductBarcode } from '../utils/catalogBarcode.js';

dotenv.config();

const NEW_COLORS = ['Red', 'Pink'];

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

  const category = await CategoryModel.findOne({ name: 'Deep Twist' });
  if (!category) {
    throw new Error('Expected existing "Deep Twist" category was not found');
  }
  const subCategory = await SubCategoryModel.findOne({ name: 'DEEP TWIST', category: category._id });
  if (!subCategory?.image) {
    throw new Error('Expected the existing "DEEP TWIST" subcategory and product image were not found');
  }

  const results = [];
  for (const color of NEW_COLORS) {
    const name = `Deeptwist - ${color}`;
    const sku = toSku(name);
    const existing = await ProductModel.findOne({ sku });
    if (existing) {
      console.log(`Skipped (SKU already exists): ${sku}`);
      results.push({ sku, status: 'skipped' });
      continue;
    }

    const created = await ProductModel.create({
      handle: toHandle(name),
      name,
      sku,
      barcode: await reserveNextProductBarcode(),
      image: [subCategory.image],
      category: [category._id],
      subCategory: [subCategory._id],
      unit: 'bundle',
      costPrice: 0,
      // The existing 22-inch Deep Twist variants sell at KSh 650.
      price: 650,
      discount: 0,
      stock: 0,
      description: `Deep Twist hair in ${color}, with a defined twisted texture for protective twist and crochet hairstyles. Sold as a bundle.`,
      publish: true,
      variants: { color, length: '22 INCH' },
      more_details: {},
    });

    console.log(`Created: ${created.name} (SKU: ${created.sku}, _id: ${created._id}, category: Deep Twist)`);
    results.push({ sku, status: 'created', id: created._id.toString() });
  }

  console.log('\nSummary:', JSON.stringify(results, null, 2));

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
