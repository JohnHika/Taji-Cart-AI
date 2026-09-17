/**
 * Inserts one minimal, fully-valid sample product into whichever database
 * MONGODB_URI points at — used to seed the isolated test database with
 * something purchasable for an end-to-end checkout test. Idempotent (skipped
 * if a product with this sku already exists).
 *
 * Run with: node --env-file=.env.test scripts/one-off/seedTestCheckoutProduct.js
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import CategoryModel from '../../models/category.model.js';
import ProductModel from '../../models/product.model.js';

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!uri) throw new Error('MONGODB_URI is not configured');

await mongoose.connect(uri);
console.log(`Connected to: ${mongoose.connection.name}`);

const existing = await ProductModel.findOne({ sku: 'TEST-CHECKOUT-001' });
if (existing) {
  console.log(`Test product already exists (stock: ${existing.stock}). Nothing to do.`);
  await mongoose.disconnect();
  process.exit(0);
}

const category = await CategoryModel.findOne();
if (!category) throw new Error('No category found — run the category seed first.');

const product = await ProductModel.create({
  handle: 'test-checkout-product',
  name: 'TEST — Checkout Verification Item (safe to buy)',
  sku: 'TEST-CHECKOUT-001',
  category: [category._id],
  costPrice: 500,
  price: 1000,
  stock: 100,
  unit: 'piece',
  description: 'Internal test product used only to verify the checkout flow end-to-end. Not a real item.',
  publish: true,
});

console.log(`Created test product: ${product.name} (id: ${product._id}, stock: ${product.stock}, price: KES ${product.price})`);
await mongoose.disconnect();
