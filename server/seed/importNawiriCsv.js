/**
 * importNawiriCsv.js — Bulk-import Nawiri inventory from CSV
 *
 * Usage (from server/):
 *   node seed/importNawiriCsv.js "../NAWIRI HAIR PRODUCTS(NAWIRI HAIR PRODUCTS).csv"
 *
 * Requires: MONGODB_URI in .env
 *
 * Behaviour:
 *   - Detects header row starting with "Handle,"
 *   - Skips documentation rows before the header
 *   - Creates Category / SubCategory via find-or-create (placeholder image if new)
 *   - One Product per data row; unique display name from Title + Color + Length
 *   - SKU: 8–13 digit string; uses CSV SKU if valid, else generates unique digits
 *   - barcode = sku (for scanner parity)
 *   - price/cost optional: omitted when blank → publish: false
 *   - Idempotent by sku (existing sku is skipped)
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

import CategoryModel from '../models/category.model.js';
import SubCategoryModel from '../models/subCategory.model.js';
import ProductModel from '../models/product.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PLACEHOLDER_IMAGE =
  'https://res.cloudinary.com/demo/image/upload/v1/samples/ecommerce/leather-bag-gray';

const SKU_DIGITS_REGEX = /^\d{8,13}$/;

/** Minimal CSV parser: handles commas and doubled quotes inside quoted fields */
function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ',') {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }
    if (c === '\r') {
      if (text[i + 1] === '\n') i += 1;
      row.push(field);
      field = '';
      if (row.some((cell) => String(cell).trim() !== '')) rows.push(row);
      row = [];
      i += 1;
      continue;
    }
    if (c === '\n') {
      row.push(field);
      field = '';
      if (row.some((cell) => String(cell).trim() !== '')) rows.push(row);
      row = [];
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }
  row.push(field);
  if (row.some((cell) => String(cell).trim() !== '')) rows.push(row);
  return rows;
}

const FIXED_KEYS = [
  'Handle',
  'Title',
  'SKU',
  'Hair_Type',
  'Texture',
  'Color',
  'Length',
  'Cost_Ksh',
  'Retail_Ksh',
  'Inventory',
  'Image_URL',
];

function rowsToObjects(header, dataRows) {
  return dataRows.map((cells) => {
    const obj = {};
    FIXED_KEYS.forEach((key, idx) => {
      obj[key] = cells[idx] !== undefined ? String(cells[idx]).trim() : '';
    });
    return obj;
  });
}

function categoryNameForTexture(texture) {
  const t = String(texture || '').toLowerCase();
  if (t === 'straight') return 'Virgin Hair Extensions';
  return 'Braiding Hair';
}

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
    image: PLACEHOLDER_IMAGE,
    category: [categoryId],
  });
  console.log(`    + SubCategory created: ${name}`);
  return doc;
}

async function generateUniqueSku() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    let digits = '';
    for (let j = 0; j < 12; j += 1) {
      digits += String(Math.floor(Math.random() * 10));
    }
    if (digits[0] === '0') {
      digits = `1${digits.slice(1)}`;
    }
    const exists = await ProductModel.exists({ sku: digits });
    if (!exists) return digits;
  }
  throw new Error('Could not allocate unique digit SKU');
}

function parseMoney(raw) {
  if (raw === undefined || raw === null || raw === '') return NaN;
  const n = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : NaN;
}

function parseStock(raw) {
  const n = parseInt(String(raw ?? '').replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(n) ? n : NaN;
}

function buildDisplayName(title, color, length) {
  const parts = [title, color, length].filter(Boolean);
  return parts.join(' — ');
}

async function main() {
  const csvArg = process.argv[2];
  if (!csvArg) {
    console.error(
      'Usage: node seed/importNawiriCsv.js <path-to.csv>\n' +
        'Example: node seed/importNawiriCsv.js "../NAWIRI HAIR PRODUCTS(NAWIRI HAIR PRODUCTS).csv"',
    );
    process.exit(1);
  }

  const csvPath = path.isAbsolute(csvArg) ? csvArg : path.resolve(process.cwd(), csvArg);
  if (!fs.existsSync(csvPath)) {
    console.error(`File not found: ${csvPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(csvPath, 'utf8');
  const table = parseCsvRows(raw);
  let headerIndex = table.findIndex(
    (row) => row[0] && String(row[0]).trim().toLowerCase() === 'handle',
  );
  if (headerIndex === -1) {
    console.error('Could not find header row starting with Handle');
    process.exit(1);
  }

  const header = table[headerIndex];
  const dataRows = table.slice(headerIndex + 1).filter((r) => r.some((c) => String(c).trim() !== ''));
  const rows = rowsToObjects(header, dataRows);

  console.log(`\nReading ${csvPath}`);
  console.log(`Data rows: ${rows.length}\n`);

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB\n');

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    try {
      const handle = row.Handle || row.handle;
      const title = row.Title || row.title;
      const hairType = row.Hair_Type || row['Hair_Type'] || '';
      const texture = row.Texture || row.texture || '';
      const color = row.Color || row.color || '';
      const length = row.Length || row.length || '';
      const skuRaw = (row.SKU || row.sku || '').trim();
      const invRaw = row.Inventory ?? row.inventory;
      const costRaw = row.Cost_Ksh ?? row.CostKsh;
      const retailRaw = row.Retail_Ksh ?? row.RetailKsh;
      const imageUrl = (row.Image_URL || row.ImageURL || '').trim();

      if (!handle || !title) {
        skipped += 1;
        continue;
      }

      const stock = parseStock(invRaw);
      if (!Number.isFinite(stock) || stock < 0) {
        console.warn(`  Row ${i + 2}: bad inventory — skipped`);
        skipped += 1;
        continue;
      }

      let sku = skuRaw;
      if (!SKU_DIGITS_REGEX.test(sku)) {
        sku = await generateUniqueSku();
      }

      const exists = await ProductModel.findOne({ sku });
      if (exists) {
        console.log(`  ↩  sku exists: ${sku} — skipped`);
        skipped += 1;
        continue;
      }

      const categoryName = categoryNameForTexture(texture);
      const subCategoryName = title.trim() || hairType.trim() || 'General';

      const catDoc = await findOrCreateCategory(categoryName);
      const subDoc = await findOrCreateSubCategory(subCategoryName, catDoc._id);

      const cost = parseMoney(costRaw);
      const retail = parseMoney(retailRaw);
      const hasCost = Number.isFinite(cost) && cost >= 0;
      const hasRetail = Number.isFinite(retail) && retail >= 0;
      const publishFlag = hasCost && hasRetail;

      const name = buildDisplayName(title, color, length);

      const doc = {
        handle: String(handle).trim(),
        name,
        sku,
        barcode: sku,
        variants: {
          color: color || undefined,
          length: length || undefined,
          texture: texture || undefined,
        },
        image: imageUrl ? [imageUrl] : [],
        category: [catDoc._id],
        subCategory: [subDoc._id],
        unit: 'piece',
        stock,
        discount: 0,
        description: '',
        more_details: {},
        averageRating: 0,
        publish: publishFlag,
      };

      if (hasCost) doc.costPrice = cost;
      if (hasRetail) doc.price = retail;

      await ProductModel.create(doc);
      console.log(`  ✔  ${name} (${sku}) publish=${publishFlag}`);
      created += 1;
    } catch (err) {
      console.error(`  ✗  Row ${i + 2}: ${err.message}`);
      errors += 1;
    }
  }

  console.log('\n────────────────────────────────────────');
  console.log(`Done. Created: ${created}, Skipped: ${skipped}, Errors: ${errors}`);
  console.log('────────────────────────────────────────\n');

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
