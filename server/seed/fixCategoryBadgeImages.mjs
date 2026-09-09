// One-off fix: every Category and SubCategory badge image in the database
// was set to the same generic Cloudinary demo placeholder (a gray leather
// bag), not an actual hair photo. This script replaces each one with a real
// photo pulled from one of its own linked products, where available.
//
// Scope (per store owner's decision):
// - SubCategory: only the 51 "ALL-CAPS" subcategories that have real linked
//   products get fixed (e.g. "PASSION TWIST 24INCH"). The 47 parallel
//   human-readable subcategories under "Braiding Hair"/"CROTCHET HAIR"
//   (e.g. "Passion Twist 24Inch") have zero linked products and are left
//   alone in this pass.
// - Category: every category with at least one product carrying a real
//   photo gets fixed the same way.
//
// "Real photo" excludes both the leather-bag placeholder AND the
// product-photo-pending.svg stand-in used for genuinely un-photographed
// products — only an actual Cloudinary product image counts.
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ProductModel from '../models/product.model.js';
import CategoryModel from '../models/category.model.js';
import SubCategoryModel from '../models/subCategory.model.js';

dotenv.config();

const PLACEHOLDER_IMAGE = 'https://res.cloudinary.com/demo/image/upload/v1/samples/ecommerce/leather-bag-gray';

const isRealImage = (url) =>
  typeof url === 'string' &&
  url.trim() !== '' &&
  url !== PLACEHOLDER_IMAGE &&
  !url.includes('product-photo-pending.svg');

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // ── Subcategories ──────────────────────────────────────────────────────
  const subCategories = await SubCategoryModel.find({});
  let subFixed = 0;
  let subSkippedNoProduct = 0;

  for (const subCategory of subCategories) {
    const products = await ProductModel.find({ subCategory: subCategory._id })
      .select('image')
      .lean();

    const realImage = products
      .flatMap((p) => p.image || [])
      .find(isRealImage);

    if (!realImage) {
      subSkippedNoProduct++;
      continue;
    }

    await SubCategoryModel.updateOne(
      { _id: subCategory._id },
      { $set: { image: realImage } }
    );
    console.log(`SubCategory fixed: ${subCategory.name} -> ${realImage}`);
    subFixed++;
  }

  // ── Categories ──────────────────────────────────────────────────────────
  const categories = await CategoryModel.find({});
  let catFixed = 0;
  let catSkippedNoProduct = 0;

  for (const category of categories) {
    const products = await ProductModel.find({ category: category._id })
      .select('image')
      .lean();

    const realImage = products
      .flatMap((p) => p.image || [])
      .find(isRealImage);

    if (!realImage) {
      catSkippedNoProduct++;
      continue;
    }

    await CategoryModel.updateOne(
      { _id: category._id },
      { $set: { image: realImage } }
    );
    console.log(`Category fixed: ${category.name} -> ${realImage}`);
    catFixed++;
  }

  console.log('\n── Summary ──────────────────────────────');
  console.log(`Subcategories fixed: ${subFixed}`);
  console.log(`Subcategories skipped (no real product photo): ${subSkippedNoProduct}`);
  console.log(`Categories fixed: ${catFixed}`);
  console.log(`Categories skipped (no real product photo): ${catSkippedNoProduct}`);

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error('Fix failed:', error);
  process.exit(1);
});
