import dotenv from 'dotenv';
import mongoose from 'mongoose';
import CategoryModel from '../models/category.model.js';
import ProductModel from '../models/product.model.js';
import SubCategoryModel from '../models/subCategory.model.js';

dotenv.config({ path: '../.env' });
dotenv.config({ path: './.env', override: false });

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
const dryRun = process.argv.includes('--dry-run');

const isLengthCategory = (name = '') => /\b\d+\s*inch\b/i.test(String(name));

const extractLengthKey = (...values) => {
  for (const value of values) {
    const match = String(value || '').match(/(\d+)\s*inch/i);
    if (match?.[1]) {
      return match[1];
    }
  }

  return '';
};

const normalizeId = (item) => {
  if (!item) {
    return '';
  }

  if (typeof item === 'string') {
    return item;
  }

  if (item._id) {
    return String(item._id);
  }

  return String(item);
};

const uniqueIds = (items = []) => [...new Set(items.map((item) => normalizeId(item)).filter(Boolean))];

const run = async () => {
  if (!uri) {
    throw new Error('No MongoDB connection string found in env');
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });

  const [braidingHair, virginHairExtensions, allCategories, allSubcategories] = await Promise.all([
    CategoryModel.findOne({ name: /^Braiding Hair$/i }),
    CategoryModel.findOne({ name: /^Virgin Hair Extensions$/i }),
    CategoryModel.find().lean(),
    SubCategoryModel.find().lean(),
  ]);

  if (!braidingHair || !virginHairExtensions) {
    throw new Error('Expected target categories `Braiding Hair` and `Virgin Hair Extensions` to exist.');
  }

  const lengthCategories = allCategories.filter((category) => isLengthCategory(category.name));
  const lengthCategoryIds = lengthCategories.map((category) => category._id);
  const lengthCategoryIdStrings = new Set(lengthCategoryIds.map((id) => String(id)));

  const targetFrenchSubcategories = new Map();
  for (const lengthKey of ['14', '18', '24']) {
    const target = allSubcategories.find((subcategory) =>
      new RegExp(`^French Curl\\s*${lengthKey}\\s*Inch$`, 'i').test(subcategory.name)
    );

    if (target) {
      targetFrenchSubcategories.set(lengthKey, target);
    }
  }

  const legacySubcategories = allSubcategories.filter((subcategory) =>
    (subcategory.category || []).some((categoryId) => lengthCategoryIdStrings.has(String(categoryId)))
  );

  const productsInLengthCategories = await ProductModel.find({
    category: { $in: lengthCategoryIds },
  })
    .populate('category subCategory');

  const migrationSummary = {
    lengthCategories: lengthCategories.map((category) => ({ id: String(category._id), name: category.name })),
    movedProducts: [],
    updatedSubcategories: [],
    deletedSubcategories: [],
    deletedCategories: [],
  };

  for (const product of productsInLengthCategories) {
    const existingCategoryIds = uniqueIds(product.category || []);
    const existingSubcategoryIds = uniqueIds(product.subCategory || []);
    const currentCategoryNames = (product.category || []).map((category) => category.name).join(' ');
    const currentSubcategoryNames = (product.subCategory || []).map((subcategory) => subcategory.name).join(' ');
    const lengthKey = extractLengthKey(currentCategoryNames, currentSubcategoryNames, product.name, product.variants?.length);

    const targetCategoryId = String(braidingHair._id);
    const targetFrenchSubcategory = targetFrenchSubcategories.get(lengthKey);

    const nextCategoryIds = uniqueIds([
      ...existingCategoryIds.filter((categoryId) => !lengthCategoryIdStrings.has(String(categoryId))),
      targetCategoryId,
    ]);

    let nextSubcategoryIds = existingSubcategoryIds.filter((subcategoryId) => {
      const subcategory = legacySubcategories.find((item) => String(item._id) === String(subcategoryId));
      return !subcategory;
    });

    if (targetFrenchSubcategory) {
      nextSubcategoryIds = uniqueIds([...nextSubcategoryIds, targetFrenchSubcategory._id]);
    }

    migrationSummary.movedProducts.push({
      id: String(product._id),
      name: product.name,
      fromCategories: (product.category || []).map((category) => category.name),
      toCategory: braidingHair.name,
      toSubCategory: targetFrenchSubcategory?.name || null,
    });

    if (!dryRun) {
      product.category = nextCategoryIds;
      product.subCategory = nextSubcategoryIds;
      await product.save();
    }
  }

  for (const subcategory of legacySubcategories) {
    const nextCategoryIds = uniqueIds(
      (subcategory.category || []).filter((categoryId) => !lengthCategoryIdStrings.has(String(categoryId)))
    );

    const productCount = await ProductModel.countDocuments({
      subCategory: subcategory._id,
    });

    if (nextCategoryIds.length > 0 || productCount > 0) {
      migrationSummary.updatedSubcategories.push({
        id: String(subcategory._id),
        name: subcategory.name,
        remainingCategoryIds: nextCategoryIds,
        productCount,
      });

      if (!dryRun) {
        await SubCategoryModel.updateOne(
          { _id: subcategory._id },
          { $set: { category: nextCategoryIds } }
        );
      }
    } else {
      migrationSummary.deletedSubcategories.push({
        id: String(subcategory._id),
        name: subcategory.name,
      });

      if (!dryRun) {
        await SubCategoryModel.deleteOne({ _id: subcategory._id });
      }
    }
  }

  for (const category of lengthCategories) {
    const [productCount, subcategoryCount] = await Promise.all([
      ProductModel.countDocuments({ category: category._id }),
      SubCategoryModel.countDocuments({ category: category._id }),
    ]);

    if (productCount === 0 && subcategoryCount === 0) {
      migrationSummary.deletedCategories.push({
        id: String(category._id),
        name: category.name,
      });

      if (!dryRun) {
        await CategoryModel.deleteOne({ _id: category._id });
      }
    }
  }

  console.log(JSON.stringify({ dryRun, migrationSummary }, null, 2));
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error('normalizeCatalogTaxonomy failed:', error);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  process.exit(1);
});
