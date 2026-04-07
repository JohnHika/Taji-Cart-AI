import dotenv from 'dotenv';
import mongoose from 'mongoose';

import CategoryModel from '../models/category.model.js';
import SubCategoryModel from '../models/subCategory.model.js';

dotenv.config();

async function clearCatalogTaxonomy() {
  await mongoose.connect(process.env.MONGODB_URI);

  const [subCategoriesDeleted, categoriesDeleted] = await Promise.all([
    SubCategoryModel.deleteMany({}),
    CategoryModel.deleteMany({})
  ]);

  console.log('Catalog taxonomy cleanup complete.');
  console.log(`Subcategories deleted: ${subCategoriesDeleted.deletedCount}`);
  console.log(`Categories deleted: ${categoriesDeleted.deletedCount}`);

  await mongoose.disconnect();
}

clearCatalogTaxonomy().catch(async (error) => {
  console.error('Failed to clear catalog taxonomy:', error.message);
  try {
    await mongoose.disconnect();
  } catch {
    // no-op
  }
  process.exit(1);
});
