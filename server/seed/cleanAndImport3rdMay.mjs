/**
 * cleanAndImport3rdMay.mjs
 *
 * Authoritative sync for the "3RDMAY" sheet in NAWIRI STOCK 2026.xlsx.
 *
 * 1. Parses the sheet into canonical Hair Type + Color identities
 * 2. Upserts stock/category/subcategory data for matching products
 * 3. Removes duplicate canonical matches while keeping the strongest existing record
 * 4. Prunes products that are not represented in the 3RDMAY sheet
 * 5. Verifies that names/stocks now match the sheet exactly
 *
 * Notes:
 * - Hair Type (carry-forward) + Color → product name e.g. "PASSION TWIST 24INCH - 1B"
 * - Stock is set from the sheet
 * - Price is preserved if the product already exists, otherwise defaults to 0
 * - Category is derived from the Hair Type family name
 *
 * Usage (from project root):
 *   node server/seed/cleanAndImport3rdMay.mjs
 */

import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import mongoose from 'mongoose';

import CategoryModel    from '../models/category.model.js';
import SubCategoryModel from '../models/subCategory.model.js';
import ProductModel     from '../models/product.model.js';

const require     = createRequire(import.meta.url);
const XLSX        = require('xlsx');
const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const XLSX_PATH   = path.resolve(__dirname, '../../NAWIRI STOCK 2026.xlsx');
const PLACEHOLDER = 'https://res.cloudinary.com/demo/image/upload/v1/samples/ecommerce/leather-bag-gray';
const SHEET_NAME  = '3RDMAY';

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeHairType(value = '') {
  return String(value ?? '')
    .replace(/[—–]/g, '-')
    .replace(/["“”]/g, '')
    .replace(/\b(\d+)\s*INCH(?:ES)?\b/gi, '$1INCH')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function normalizeColor(value = '') {
  return String(value ?? '')
    .replace(/[—–]/g, '-')
    .replace(/["“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function buildCanonicalKey(hairType, color) {
  const normalizedHairType = normalizeHairType(hairType);
  const normalizedColor = normalizeColor(color);

  if (!normalizedHairType || !normalizedColor) {
    return '';
  }

  return `${normalizedHairType}::${normalizedColor}`;
}

function extractLength(hairType = '') {
  const match = normalizeHairType(hairType).match(/(\d+)INCH/);
  return match ? `${match[1]}"` : 'N/A';
}

function buildDesiredName(hairType, color) {
  return `${normalizeHairType(hairType)} - ${normalizeColor(color)}`;
}

function extractIdentityFromName(name = '') {
  const normalizedName = String(name ?? '')
    .replace(/[—–]/g, '-')
    .replace(/["“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const parts = normalizedName.split(/\s+-\s+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) {
    return null;
  }

  const hairType = normalizeHairType(parts[0]);
  const color = normalizeColor(parts[1]);
  const key = buildCanonicalKey(hairType, color);

  if (!key) {
    return null;
  }

  return { hairType, color, key };
}

function buildVariants(hairType, color, existingVariants = {}) {
  return {
    ...existingVariants,
    color: normalizeColor(color),
    length: extractLength(hairType),
  };
}

function hasArrayValues(value) {
  return Array.isArray(value) && value.length > 0;
}

function selectKeeper(candidates, desiredName) {
  const desiredNameRegex = new RegExp(`^${escapeRegex(desiredName)}$`, 'i');

  return [...candidates].sort((a, b) => {
    const score = (candidate) => {
      const exactName = desiredNameRegex.test(candidate?.name || '') ? 1 : 0;
      const hasCategory = hasArrayValues(candidate?.category) ? 1 : 0;
      const hasSubCategory = hasArrayValues(candidate?.subCategory) ? 1 : 0;
      const hasImage = hasArrayValues(candidate?.image) ? 1 : 0;
      const isPublished = candidate?.publish ? 1 : 0;
      const updatedAt = new Date(candidate?.updatedAt || candidate?.createdAt || 0).getTime();

      return [exactName, hasCategory, hasSubCategory, hasImage, isPublished, updatedAt];
    };

    const aScore = score(a);
    const bScore = score(b);

    for (let index = 0; index < aScore.length; index += 1) {
      if (aScore[index] !== bScore[index]) {
        return bScore[index] - aScore[index];
      }
    }

    return String(a?._id).localeCompare(String(b?._id));
  })[0] || null;
}

function deriveCategoryName(hairType) {
  const words = normalizeHairType(hairType).split(/\s+/);
  const meaningful = words.filter((word) => !/^\d+INCH$/i.test(word));
  return meaningful.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

async function findOrCreateCategory(name) {
  let cat = await CategoryModel.findOne({ name });
  if (!cat) {
    cat = await CategoryModel.create({ name, image: PLACEHOLDER });
    console.log(`    + Category created: "${name}"`);
  }
  return cat;
}

async function findOrCreateSubCategory(name, categoryId) {
  let sub = await SubCategoryModel.findOne({ name });
  if (!sub) {
    sub = await SubCategoryModel.create({ name, image: PLACEHOLDER, category: [categoryId] });
    console.log(`      + SubCategory created: "${name}"`);
  }
  return sub;
}

// ── Step 1: Parse sheet ───────────────────────────────────────────────────────

function parseSheet() {
  const wb   = XLSX.readFile(XLSX_PATH);
  const ws   = wb.Sheets[SHEET_NAME];
  if (!ws) throw new Error(`Sheet "${SHEET_NAME}" not found in workbook`);

  const raw  = XLSX.utils.sheet_to_json(ws, { defval: '', header: 1 });
  const itemsByKey = new Map();
  let currentHairType = '';

  for (let i = 1; i < raw.length; i++) {  // skip header row
    const [col0, col1, col2] = raw[i];

    const hairType = String(col0 ?? '').trim();
    const color    = String(col1 ?? '').trim();
    const qty      = parseInt(String(col2 ?? '').replace(/[^0-9]/g, ''), 10);

    if (hairType) currentHairType = normalizeHairType(hairType);
    if (!color || !currentHairType || isNaN(qty)) continue;

    const normalizedColor = normalizeColor(color);
    const productName = buildDesiredName(currentHairType, normalizedColor);
    const category    = deriveCategoryName(currentHairType);
    const key = buildCanonicalKey(currentHairType, normalizedColor);

    itemsByKey.set(key, {
      key,
      name: productName,
      category,
      hairType: currentHairType,
      color: normalizedColor,
      stock: qty
    });
  }

  const items = Array.from(itemsByKey.values());
  console.log(`\n📊 Parsed ${items.length} products from sheet "${SHEET_NAME}"`);
  return items;
}

async function removeExactNameDuplicates() {
  const groups = await ProductModel.aggregate([
    { $group: { _id: { $toLower: '$name' }, ids: { $push: '$_id' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }
  ]);

  let removed = 0;
  for (const group of groups) {
    const docs = await ProductModel.find({ _id: { $in: group.ids } }).lean();
    if (docs.length <= 1) {
      continue;
    }

    const keeper = selectKeeper(docs, docs[0]?.name || '');
    const keeperId = String(keeper?._id || '');
    const toDelete = docs.filter((doc) => String(doc._id) !== keeperId).map((doc) => doc._id);

    if (!toDelete.length) {
      continue;
    }

    await ProductModel.deleteMany({ _id: { $in: toDelete } });
    removed += toDelete.length;
    console.log(`  ✂  Exact-name duplicate "${group._id}" — kept 1, removed ${toDelete.length}`);
  }

  console.log(`\n✂  Removed ${removed} exact-name duplicate product(s)`);
  return removed;
}

async function removeProductsNotInSheet(items) {
  const sheetKeys = new Set(items.map((item) => item.key));
  const products = await ProductModel.find({}).select('_id name').lean();

  const productsToDelete = products
    .filter((product) => {
      const identity = extractIdentityFromName(product.name);
      return !identity || !sheetKeys.has(identity.key);
    })
    .map((product) => product._id);

  if (!productsToDelete.length) {
    console.log('🧹 No non-sheet products found to prune');
    return 0;
  }

  await ProductModel.deleteMany({ _id: { $in: productsToDelete } });
  console.log(`🧹 Pruned ${productsToDelete.length} product(s) that are not in the ${SHEET_NAME} sheet`);
  return productsToDelete.length;
}

// ── Step 2: Sync products to sheet identity ───────────────────────────────────

async function syncProductsToSheet(items) {
  const sheetKeys = new Set(items.map((item) => item.key));
  const existingProducts = await ProductModel.find({}).lean();
  const productsByKey = new Map();

  existingProducts.forEach((product) => {
    const identity = extractIdentityFromName(product.name);
    if (!identity || !sheetKeys.has(identity.key)) {
      return;
    }

    if (!productsByKey.has(identity.key)) {
      productsByKey.set(identity.key, []);
    }

    productsByKey.get(identity.key).push(product);
  });

  let created = 0;
  let updated = 0;
  let removed = 0;
  let skipped = 0;

  for (const item of items) {
    try {
      const catDoc = await findOrCreateCategory(item.category);
      const subDoc = await findOrCreateSubCategory(item.hairType, catDoc._id);

      const matches = productsByKey.get(item.key) || [];
      const keeper = selectKeeper(matches, item.name);

      if (keeper) {
        const keeperId = String(keeper._id);
        const duplicatesToDelete = matches
          .filter((product) => String(product._id) !== keeperId)
          .map((product) => product._id);

        if (duplicatesToDelete.length) {
          await ProductModel.deleteMany({ _id: { $in: duplicatesToDelete } });
          removed += duplicatesToDelete.length;
          console.log(`  ✂  Removed ${duplicatesToDelete.length} duplicate(s) for ${item.name}`);
        }

        await ProductModel.updateOne(
          { _id: keeper._id },
          {
            $set: {
              handle: slugify(item.name),
              name: item.name,
              stock: item.stock,
              price: Number.isFinite(Number(keeper.price)) ? Number(keeper.price) : 0,
              costPrice: Number.isFinite(Number(keeper.costPrice)) ? Number(keeper.costPrice) : 0,
              unit: keeper.unit || 'bundle',
              description: keeper.description || item.name,
              image: hasArrayValues(keeper.image) ? keeper.image : [PLACEHOLDER],
              category: [catDoc._id],
              subCategory: [subDoc._id],
              variants: buildVariants(item.hairType, item.color, keeper.variants || {}),
              publish: true,
            },
          }
        );
        console.log(`  ↻  Synced ${item.stock}  |  ${item.name}`);
        updated++;
      } else {
        const handle = slugify(item.name);
        const baseSku = handle.toUpperCase().slice(0, 50);

        // Check SKU collision
        const skuExists = await ProductModel.findOne({ sku: baseSku });
        const finalSku  = skuExists ? `${baseSku}-${Date.now()}` : baseSku;

        await ProductModel.create({
          handle,
          name       : item.name,
          sku        : finalSku,
          price      : 0,
          costPrice  : 0,
          discount   : 0,
          stock      : item.stock,
          unit       : 'bundle',
          description: item.name,
          image      : [PLACEHOLDER],
          category   : [catDoc._id],
          subCategory: [subDoc._id],
          variants   : buildVariants(item.hairType, item.color),
          publish    : true,
          averageRating: 0,
          more_details: {},
        });
        console.log(`  ✔  Created  ${item.stock}× ${item.name}`);
        created++;
      }
    } catch (err) {
      console.error(`  ✗  ${item.name}: ${err.message}`);
      skipped++;
    }
  }

  console.log('\n─────────────────────────────────────────────────');
  console.log(`✅  3RDMAY sync complete`);
  console.log(`   Created : ${created}`);
  console.log(`   Updated : ${updated} (stock refreshed)`);
  console.log(`   Removed : ${removed} duplicate product(s)`);
  console.log(`   Errors  : ${skipped}`);
  console.log('─────────────────────────────────────────────────\n');

  return { created, updated, removed, skipped };
}

// ── Step 3: Verify against sheet ──────────────────────────────────────────────

async function verifySheetSync(items) {
  const desiredNames = items.map((item) => item.name);
  const products = await ProductModel.find({ name: { $in: desiredNames } }).select('name stock').lean();
  const byName = new Map();

  products.forEach((product) => {
    if (!byName.has(product.name)) {
      byName.set(product.name, []);
    }
    byName.get(product.name).push(product);
  });

  let missing = 0;
  let stockMismatches = 0;
  let duplicateNames = 0;

  items.forEach((item) => {
    const matches = byName.get(item.name) || [];

    if (!matches.length) {
      missing += 1;
      return;
    }

    if (matches.length > 1) {
      duplicateNames += matches.length - 1;
    }

    if (Number(matches[0].stock) !== Number(item.stock)) {
      stockMismatches += 1;
    }
  });

  console.log('══════════════════════════════════════════════════');
  console.log(' 3RDMAY verification summary');
  console.log('══════════════════════════════════════════════════');
  console.log(` Missing products : ${missing}`);
  console.log(` Stock mismatches : ${stockMismatches}`);
  console.log(` Duplicate names  : ${duplicateNames}`);
  console.log('══════════════════════════════════════════════════\n');

  if (missing || stockMismatches || duplicateNames) {
    throw new Error(`Verification failed (missing=${missing}, stockMismatches=${stockMismatches}, duplicateNames=${duplicateNames})`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n══════════════════════════════════════════════════');
  console.log(' Nawiri Stock — Clean + Import (3rd May sheet)');
  console.log('══════════════════════════════════════════════════');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const items = parseSheet();
  await syncProductsToSheet(items);
  await removeExactNameDuplicates();
  await removeProductsNotInSheet(items);
  await verifySheetSync(items);

  await mongoose.disconnect();
  console.log('✅ Done. Disconnected.\n');
}

main().catch(err => {
  console.error('❌ Fatal:', err);
  process.exit(1);
});
