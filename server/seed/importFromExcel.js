/**
 * importFromExcel.js — Bulk-import products from an Excel spreadsheet
 *
 * Usage:
 *   node seed/importFromExcel.js <path-to-xlsx>
 *
 * Example:
 *   node seed/importFromExcel.js "../NAWIRI HAIR PRODUCTS.xlsx"
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * REQUIRED EXCEL COLUMNS  (column header names, case-insensitive)
 * ─────────────────────────────────────────────────────────────────────────────
 *   Name          Product title visible to customers           (required)
 *   Category      Category name  e.g. "Virgin Hair Extensions" (required)
 *   SubCategory   SubCategory name e.g. "Brazilian Hair"      (required)
 *   Price         Retail selling price in KES                  (required)
 *   CostPrice     Vendor / purchase cost in KES               (required)
 *   Stock         Quantity available                           (required)
 *
 * OPTIONAL COLUMNS
 *   SKU           Unique stock code (auto-generated if blank)
 *   Unit          piece / bundle / pack / bottle / jar / set   (default: piece)
 *   Discount      Discount percentage 0–100                    (default: 0)
 *   Description   Product description text
 *   ImageUrl      Full Cloudinary / web URL for product image
 *                 (placeholder used if blank)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * BEHAVIOUR
 * ─────────────────────────────────────────────────────────────────────────────
 *   • Idempotent: products already in the DB (matched by SKU or Name) are
 *     skipped, not duplicated.
 *   • Categories and SubCategories that don't yet exist are created
 *     automatically with a placeholder image.
 *   • SKU is auto-generated as  HANDLE-NNNN  when the column is empty.
 *   • All changes are printed to stdout so you can review them.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

import mongoose from 'mongoose';
import CategoryModel    from '../models/category.model.js';
import SubCategoryModel from '../models/subCategory.model.js';
import ProductModel     from '../models/product.model.js';

// xlsx is a CommonJS package — use createRequire to import it in an ESM context
const require = createRequire(import.meta.url);
const XLSX    = require('xlsx');

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Constants ─────────────────────────────────────────────────────────────────

const PLACEHOLDER_IMAGE =
  'https://res.cloudinary.com/demo/image/upload/v1/samples/ecommerce/leather-bag-gray';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert "Brazilian Hair Bundle (16\")" → "brazilian-hair-bundle-16" */
function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Normalise a column header: trim + lowercase */
function normalise(str) {
  return String(str ?? '').trim().toLowerCase().replace(/[^a-z]/g, '');
}

/** Extract a cell value by trying multiple possible header spellings */
function col(row, ...aliases) {
  for (const alias of aliases) {
    const key = Object.keys(row).find(
      (k) => normalise(k) === normalise(alias),
    );
    if (key !== undefined && row[key] !== undefined && row[key] !== '') {
      return String(row[key]).trim();
    }
  }
  return '';
}

/** Generate a unique-enough SKU when the sheet doesn't provide one */
function generateSku(handle, index) {
  const suffix = String(index + 1).padStart(4, '0');
  return `${handle}-${suffix}`.toUpperCase().slice(0, 50);
}

// ── DB helpers ────────────────────────────────────────────────────────────────

async function findOrCreateCategory(name) {
  if (!name) throw new Error('Category name is empty');
  const existing = await CategoryModel.findOne({ name });
  if (existing) return existing;

  const doc = await CategoryModel.create({ name, image: PLACEHOLDER_IMAGE });
  console.log(`  + Category created: ${name}`);
  return doc;
}

async function findOrCreateSubCategory(name, categoryId) {
  if (!name) throw new Error('SubCategory name is empty');
  const existing = await SubCategoryModel.findOne({ name });
  if (existing) return existing;

  const doc = await SubCategoryModel.create({
    name,
    image    : PLACEHOLDER_IMAGE,
    category : [categoryId],
  });
  console.log(`    + SubCategory created: ${name}`);
  return doc;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // ── 1. Resolve the file path from the CLI argument
  const xlsxArg = process.argv[2];
  if (!xlsxArg) {
    console.error(
      '❌  Please provide the path to the Excel file.\n' +
      '    Usage: node seed/importFromExcel.js <path-to-xlsx>\n' +
      '    Example: node seed/importFromExcel.js "../NAWIRI HAIR PRODUCTS.xlsx"',
    );
    process.exit(1);
  }

  const xlsxPath = path.isAbsolute(xlsxArg)
    ? xlsxArg
    : path.resolve(process.cwd(), xlsxArg);

  console.log(`\n📂 Reading Excel file: ${xlsxPath}`);

  let workbook;
  try {
    workbook = XLSX.readFile(xlsxPath);
  } catch (err) {
    console.error(`❌  Could not open file: ${err.message}`);
    process.exit(1);
  }

  // Use the first sheet
  const sheetName = workbook.SheetNames[0];
  const sheet     = workbook.Sheets[sheetName];
  const rows      = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (!rows.length) {
    console.error('❌  The spreadsheet is empty or has no data rows.');
    process.exit(1);
  }

  console.log(`   Sheet "${sheetName}" — ${rows.length} rows found`);

  // ── 2. Connect to MongoDB
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  // ── 3. Process each row
  let created = 0;
  let skipped = 0;
  let errors  = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    try {
      // ── Extract required fields
      const name        = col(row, 'Name', 'Product Name', 'ProductName', 'Title');
      const categoryName = col(row, 'Category', 'Cat', 'Category Name');
      const subCatName  = col(row, 'SubCategory', 'Sub Category', 'Subcategory', 'SubCat');
      const priceRaw    = col(row, 'Price', 'Retail Price', 'Retail', 'Selling Price', 'SellingPrice');
      const costRaw     = col(row, 'CostPrice', 'Cost Price', 'Cost', 'Purchase Price', 'PurchasePrice', 'Vendor Price');
      const stockRaw    = col(row, 'Stock', 'Quantity', 'Qty', 'Inventory');

      // ── Validate required
      if (!name)         { console.warn(`  ⚠  Row ${i + 2}: missing Name — skipped`);      skipped++; continue; }
      if (!categoryName) { console.warn(`  ⚠  Row ${i + 2}: missing Category — skipped`);  skipped++; continue; }
      if (!priceRaw)     { console.warn(`  ⚠  Row ${i + 2} [${name}]: missing Price — skipped`); skipped++; continue; }
      if (!costRaw)      { console.warn(`  ⚠  Row ${i + 2} [${name}]: missing CostPrice — skipped`); skipped++; continue; }
      if (!stockRaw)     { console.warn(`  ⚠  Row ${i + 2} [${name}]: missing Stock — skipped`);    skipped++; continue; }

      const price     = parseFloat(String(priceRaw).replace(/[^0-9.]/g, ''));
      const costPrice = parseFloat(String(costRaw).replace(/[^0-9.]/g, ''));
      const stock     = parseInt(String(stockRaw).replace(/[^0-9]/g, ''), 10);

      if (isNaN(price) || isNaN(costPrice) || isNaN(stock)) {
        console.warn(`  ⚠  Row ${i + 2} [${name}]: non-numeric Price/CostPrice/Stock — skipped`);
        skipped++;
        continue;
      }

      // ── Optional fields
      const handle      = slugify(name);
      const discount    = parseFloat(col(row, 'Discount', 'Disc', 'Sale') || '0') || 0;
      const unit        = col(row, 'Unit', 'Unit Type', 'Measure') || 'piece';
      const description = col(row, 'Description', 'Desc', 'Details', 'Notes');
      const imageUrl    = col(row, 'ImageUrl', 'Image Url', 'Image URL', 'ImageURL', 'Image', 'Photo');
      const skuFromSheet = col(row, 'SKU', 'Sku', 'Stock Code', 'StockCode', 'Code');
      const sku         = skuFromSheet || generateSku(handle, i);

      // ── Check idempotency
      const existsBySku  = await ProductModel.findOne({ sku });
      const existsByName = await ProductModel.findOne({ name });
      if (existsBySku || existsByName) {
        console.log(`  ↩  [${i + 2}] Already exists: ${name} (${sku}) — skipped`);
        skipped++;
        continue;
      }

      // ── Find or create Category + SubCategory
      const catDoc    = await findOrCreateCategory(categoryName);
      const subCatDoc = subCatName
        ? await findOrCreateSubCategory(subCatName, catDoc._id)
        : null;

      // ── Create product
      await ProductModel.create({
        handle,
        name,
        sku,
        costPrice,
        price,
        discount,
        stock,
        unit,
        description,
        image      : imageUrl ? [imageUrl] : [PLACEHOLDER_IMAGE],
        category   : [catDoc._id],
        subCategory: subCatDoc ? [subCatDoc._id] : [],
        publish    : true,
        averageRating: 0,
        more_details: {},
      });

      console.log(`  ✔  [${i + 2}] ${name} (${sku}) — KES ${price.toLocaleString()}`);
      created++;

    } catch (err) {
      console.error(`  ✗  Row ${i + 2}: ${err.message}`);
      errors++;
    }
  }

  // ── 4. Summary
  console.log('\n─────────────────────────────────────────────────');
  console.log(`✅  Import complete`);
  console.log(`   Created : ${created}`);
  console.log(`   Skipped : ${skipped} (already existed or missing data)`);
  console.log(`   Errors  : ${errors}`);
  console.log('─────────────────────────────────────────────────\n');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('❌ Fatal:', err.message);
  process.exit(1);
});
