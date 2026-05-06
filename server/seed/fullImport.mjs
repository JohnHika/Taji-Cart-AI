/**
 * fullImport.mjs — Full stock import from 3rd May 2026 data
 * 1. Deletes all products created today (May 4 2026)
 * 2. Removes duplicates
 * 3. Upserts all 49 hair types with exact stock quantities
 *
 * Usage (from project root):
 *   node server/seed/fullImport.mjs
 */

import 'dotenv/config';
import { fileURLToPath } from 'url';
import path from 'path';
import mongoose from 'mongoose';
import CategoryModel    from '../models/category.model.js';
import SubCategoryModel from '../models/subCategory.model.js';
import ProductModel     from '../models/product.model.js';

const PLACEHOLDER = 'https://res.cloudinary.com/demo/image/upload/v1/samples/ecommerce/leather-bag-gray';

// ─── Full product data from 3RDMAY sheet ─────────────────────────────────────
// Format: [HAIR_TYPE, [[COLOR, STOCK], ...]]
const STOCK_DATA = [
  ['PASSION TWIST 24INCH', [
    ['1B',23],['#4',12],['#33',29],['#27',30],['#30',10],['#613',13],
    ['#350',9],['TBUG',13],['1B/4/30',24],['1B/30/27',14],['1B/30/613',15],
    ['3T/530/350',2],['T30',18],
  ]],
  ['PASSION TWIST 18INCH', [
    ['T30',17],['#4',5],['1B',0],
  ]],
  ['NUBIAN TWIST 12INCH', [
    ['1B',20],['B29',19],['0T33',14],['C14',20],['C15',14],['B31',16],
  ]],
  ['NUBIAN 8INCH', [
    ['1B',12],['#30',14],['#350',12],['#27',13],['#613',1],['T33',9],
    ['T30',3],['TGREY',10],['T350',12],['B5',16],['OT33',16],['B31',17],
    ['B29',16],['C14',4],['C15',16],['#33',10],['T27',14],['OTGREY',9],
  ]],
  ['MARLEY TWIST 14INCH', [
    ['1B',16],['OT33',12],['3T350',7],['OT350',6],['OT30',4],['C14',24],
    ['OTGREY',3],['1B/4/30',28],
  ]],
  ['MARLEY TWIST 18INCH', [
    ['1B',15],['#30',7],['OT30',13],['C14',3],['OT350',18],['3T350',4],
    ['1B/27/613',10],['1B/30/613',11],['OTBUG',9],['T30',13],['T33',13],
    ['OT33',11],['1B/4/30',12],
  ]],
  ['HONEY TWIST 20INCH', [
    ['1B',0],['OT33',8],['OT30',30],['C14',6],['C15',12],['#27',15],
    ['#30',20],['#350',17],['#613',8],['BUG',19],['#24',14],['TBUG',2],
  ]],
  ['HONEY TWIST 14INCH', [
    ['1B',9],['#33',13],['#30',11],['BUG',3],['B29',10],['OT33',28],
    ['C14',16],['C15',11],
  ]],
  ['FRENCH CURL 24INCH', [
    ['1B',16],['#24',15],['#27',25],['#30',42],['#350',35],['#33',2],
    ['BUG',26],['OTBUG',16],['TBUG',14],['T350',23],['OT350',26],['OTGREEN',12],
    ['OT30/27',1],['OT33/30',7],['GINGER',14],['P30/33',3],['P27/33',23],
    ['P350/33',14],['P27/30',22],['P27/30/613',31],['P27/33/613',18],['T33',24],
    ['#613',23],['B29',23],['C14',19],['C15',25],['P30/613',22],['P27/613',3],
    ['TGREY',15],['MP2',19],['P24/171',8],['T30',31],['T27',24],['D.PINK',9],
    ['P27/613/PINK',9],
  ]],
  ['FRENCH CURL 18INCH', [
    ['1B',20],['#30',14],['#27',13],['#33',14],['#613',19],['#350',25],
    ['BUG',28],['T30',13],['T350',13],['TBUG',15],['T33',24],['B29',29],
    ['C14',16],['C15',16],['OTBUG',20],['OT350',15],['P27/613',23],['P30/613',23],
    ['OT33/30',16],['P30/33',26],['OTGREEN',10],['MP2',18],['C10',3],['C11',0],
    ['B6',24],['C26',1],['OTRED',16],['C17',16],['B41',16],['P27/613/PINK',5],
  ]],
  ['FRENCH CURL 14INCH', [
    ['1B',23],['#27',23],['#30',20],['#33',8],['#613',27],['#350',11],
    ['BUG',13],['P30/33',25],['P30/613',6],['B29',29],['C14',17],['C15',19],
    ['P27/613',19],['T33',19],['T30',30],['OTBUG',29],['OT350',13],['MP2',19],
    ['P27/PINK/613',20],['OTRED',17],['D4',2],['C10',0],['C11',0],['B41',9],
    ['C26',1],['B6',0],['C17',14],['OT33/30',2],
  ]],
  ['XPRESSION BRAIDS', [
    ['1B',9],['#4',20],['#24',19],['#27',33],['#30',35],['#6',21],['#33',17],
    ['#613',14],['99J',0],['#118',14],['BUG',18],['II PINK',5],['PINK',3],
    ['BLUE',13],['RED',16],['GREY',19],['II GREY',4],['#171',19],['P27/PINK',12],
    ['#60',20],['#30 NEW',12],['#350',17],['P27/613',8],['1B/613',10],['1B/30',10],
    ['1B/27',10],['PURPLE',6],['1B/350',10],
  ]],
  ['BONESTRAIGHT 28INCH', [
    ['1B',12],['#4',15],['#24',14],['#27',19],['#33',15],['#30',27],['#613',14],
    ['BUG',12],['#350',13],['OTBUG',20],['OT350',18],['OT33',6],['OT33/30',17],
    ['P27/30',1],['P30/33',12],['P27/613',19],['B29',7],['C14',18],['C15',21],
  ]],
  ['BONESTRAIGHT 22INCH', [
    ['1B',20],['#4',13],['#33',12],['#350',16],['#30',25],['BUG',21],['#27',14],
    ['OTBUG',5],['OT350',6],['OT33',18],['B29',0],['C14',2],['C15',17],
    ['#613',13],['P27/613',18],
  ]],
  ['BONESTRAIGHT 14INCH', [
    ['1B',5],['#4',10],['#33',15],['#30',12],['B29',19],['C14',21],['OT350',15],
    ['#350',18],
  ]],
  ['OMBRESHORT', [
    ['C22',24],['C10',14],['C11',24],['C23',10],['B41',27],['C9',19],['D4',31],
    ['C26',26],['C14',20],['C25',4],
  ]],
  ['OMBRE LONG', [
    ['B29',31],['C14',10],['C15',27],['B6',10],['B8',30],['B26',20],['B31',11],
    ['B35',18],['C6',15],['C9',16],['C10',27],['C7',18],['C11',32],['C13',36],
    ['C17',9],['C18',3],['C19',13],['C26',17],['D3',2],['D4',0],['D2',0],
    ['B41',18],['C22',42],['C25',31],
  ]],
  ['DEEP TWIST', [
    ['1B',38],['#27',14],['#30',37],['#33',38],['#4',8],['#350',23],['T350',13],
    ['T27',17],['T30',20],['T27/613',18],['#613',15],['TGREY',12],['P27/30',10],
    ['P27/33',16],['P30/33',15],['P30/613',22],['P33/613',12],['P27/613',12],
    ['P27/33/613',12],['P27/30/613',9],['P30/613/GREY',20],['TBUG',0],
  ]],
  ['SPARKLE BRAIDS', [
    ['BLACK',24],['L.PURPLE',17],['L.PINK',6],['L.BLUE',15],['D.PURPLE',18],
    ['D.PINK',22],['D.BLUE',20],['BROWN',10],['RED',7],['C22',10],['C13',10],
    ['C25',15],['C26',6],['C11',3],['C10',14],
  ]],
  ['DEEP LOCS', [
    ['1B',12],['T27',16],['T30',7],['C14',18],['OT30',25],
  ]],
  ['PASSION LOCS 14INCH', [
    ['T30',19],['1B/27/613',19],['1B',3],['C14',27],
  ]],
  ['PASSION LOCS 10INCH', [
    ['1B',13],['OT30',35],['T30',21],['T27',22],['1B/27/613',10],['C14',11],
  ]],
  ['GYPSY LOCS 18INCH', [
    ['1B',12],['1B/4/30',12],['1B/30/27',20],['1B/30/613',23],['1B/27/613',12],
    ['C4-3T/530',15],['C3-3T350',15],
  ]],
  ['GYPSY LOCS 14INCH', [
    ['1B/4/30',15],['1B/30/27',12],
  ]],
  ['RIVERLOCS 18INCH', [
    ['1B',14],['T30',15],['T27',16],['TGREY',23],['TBUG',9],['T27/613',18],
    ['1B/27/613',17],['1B/30/613',3],['1B/30/27',7],['4/27/613',7],
  ]],
  ['RIVERLOCS 14INCH', [
    ['1B',21],['T27',8],['T30',10],['TGREY',9],['1B/30/27',17],
  ]],
  ['QUEEN LOCS', [
    ['1B',15],['OT27',16],['T30',28],['OTBUG',14],['OT27/613',13],
  ]],
  ['BOHO NU LOCS', [
    ['1B',0],['T27',12],['T30',11],['C14',6],
  ]],
  ['NU LOCS 30INCH', [
    ['1B',5],['#30',12],
  ]],
  ['NU LOCS 24INCH', [
    ['1B',15],['#27',10],['#30',9],['#350',12],['#613',19],['BUG',14],['T30',13],
  ]],
  ['NU LOCS 18INCH', [
    ['1B',6],['C14',10],['T30',1],
  ]],
  ['NU LOCS 14INCH', [
    ['1B',9],['OT30',10],['C14',12],['C15',13],
  ]],
  ['EXOTIC', [
    ['1B',19],['#30',11],['#27',19],['#33',16],['OT30',10],['OT27',9],
    ['OTBUG',5],['#350',15],['C14',15],['C15',15],['OT33',15],
  ]],
  ['WAND CURLS', [
    ['1B',16],['#27',2],['#30',16],['#33',8],['#350',11],['BUG',14],['T30',12],
    ['T27/613',9],['T33',12],['T27',16],['TBUG',7],['T350',8],['C14',18],
    ['C15',11],['TGREY',9],['B6',8],['B8',15],['B35',15],['B29',4],
  ]],
  ['AFRO SPRING TWIST', [
    ['1B',17],['#4',7],['#350',4],['T30',7],['T27',32],['OT30',18],
    ['T27/613',19],['#30',14],
  ]],
  ['SOFT AFRO BULK', [
    ['1B',18],['#27',14],['#30',9],['#33',18],['#613',20],['T27',13],['T30',11],
    ['TBUG',15],['TGREY',0],['T27/613',12],
  ]],
  ['RIVER BOX', [
    ['1B',27],['T27',10],['T30',11],['OT33',25],['B29',11],['C14',31],['C15',14],
    ['TBUG',19],['P30/613',16],
  ]],
  ['GOGO CURLS 18INCH', [
    ['1B',7],['T27',13],['T30',22],['C14',19],['TGREY',18],
  ]],
  ['GOGO CURLS 14INCH', [
    ['1B',21],['T27',19],['T30',14],['C14',14],['TGREY',15],
  ]],
  ['ITALY CURLS', [
    ['1B',0],['#27',12],['#33',9],['#30',14],['#350',20],['#613',8],['OT350',10],
    ['B29',2],['P30/33',2],['P27/33',18],['OT27',8],['BUG',10],['OT33',7],
    ['OTBUG',11],['OTGREY',16],['#4',0],
  ]],
  ['BODYWAVE', [
    ['1B',25],['#4',0],['#27',16],['#30',6],['#350',16],['#613',16],['#33',8],
    ['P27/30',21],['P30/33',12],['B29',14],['OT33',12],['PINK',7],['BUG',17],
    ['P27/613',11],['T27',20],['T30',16],
  ]],
  ['PRETWISTED 12INCH', [
    ['1B',6],['OT33',9],['C14',11],['C15',8],['B29',6],['B31',8],
  ]],
  ['PRETWISTED 8INCH', [
    ['1B',10],['#30',6],['#27',3],['#613',4],['T27',4],['T30',3],['T33',0],
    ['T350',4],['TGREY',6],['B29',6],['C14',9],['OT33',2],['C15',5],['#350',4],
    ['B31',12],['#33',4],['B5',4],['OTGREY',6],
  ]],
  ['VIXEN HAIR', [
    ['1B',0],['#4',10],['#27',14],['#30',10],['#613',11],['T27',11],['T30',24],
    ['TGREY',3],['#350',11],['P27/613',4],['BUG',13],['TBUG',10],
  ]],
  ['AFRO TWIST', [
    ['1B',15],['#27',12],['#30',16],['#350',18],['T27',17],['T30',26],['TBUG',11],
    ['99J',14],['OT30',3],['OT33',13],['OT350',13],['C14',25],['#33',16],['BUG',15],
  ]],
  ['HUMAN 22INCH', [
    ['1B',14],['#4',19],['OT30',13],['OT27',5],['#30',13],['BUG',11],['GREY',12],
  ]],
  ['HUMAN 18INCH', [
    ['1B',0],
  ]],
  ['HUMAN 14INCH', [
    ['1B',0],['#4',0],
  ]],
  ['NUBIAN KIDS', [
    ['C3/C9',13],['C6/C26',2],['C4/C22',1],['C7/C10',26],['C5/C13',7],
  ]],
  ['AFRO TWIST (BULK)', [  // alias for soft afro bulk / afro spring twist variants
  ]],
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function deriveCategoryName(hairType) {
  const words = hairType.trim().split(/\s+/);
  // Drop trailing size tokens (contain digits)
  const meaningful = [];
  for (const w of words) {
    if (/^\d+INCH$/i.test(w)) continue;
    meaningful.push(w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  }
  return meaningful.join(' ') || hairType;
}

async function findOrCreateCategory(name) {
  let cat = await CategoryModel.findOne({ name });
  if (!cat) {
    cat = await CategoryModel.create({ name, image: PLACEHOLDER });
    console.log(`    + Category: "${name}"`);
  }
  return cat;
}

async function findOrCreateSubCategory(name, categoryId) {
  let sub = await SubCategoryModel.findOne({ name });
  if (!sub) {
    sub = await SubCategoryModel.create({ name, image: PLACEHOLDER, category: [categoryId] });
    console.log(`      + SubCategory: "${name}"`);
  }
  return sub;
}

// ─── Steps ────────────────────────────────────────────────────────────────────

async function deleteTodaysProducts() {
  const start = new Date('2026-05-04T00:00:00+03:00');
  const end   = new Date('2026-05-04T23:59:59+03:00');
  const result = await ProductModel.deleteMany({ createdAt: { $gte: start, $lte: end } });
  console.log(`\n🗑  Deleted ${result.deletedCount} product(s) seeded today`);
}

async function removeDuplicates() {
  const groups = await ProductModel.aggregate([
    { $group: { _id: { $toLower: '$name' }, ids: { $push: '$_id' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }
  ]);
  let removed = 0;
  for (const g of groups) {
    const sorted = g.ids.sort();
    await ProductModel.deleteMany({ _id: { $in: sorted.slice(1) } });
    removed += sorted.length - 1;
    console.log(`  ✂  Duplicate: "${g._id}" — removed ${sorted.length - 1}`);
  }
  console.log(`✂  Removed ${removed} duplicate(s)\n`);
}

async function upsertAll() {
  let created = 0, updated = 0, errors = 0;

  for (const [hairType, variants] of STOCK_DATA) {
    if (!variants.length) continue;

    const catName = deriveCategoryName(hairType);
    const catDoc  = await findOrCreateCategory(catName);
    const subDoc  = await findOrCreateSubCategory(hairType, catDoc._id);

    for (const [color, stock] of variants) {
      const name = `${hairType} - ${color.toUpperCase()}`;
      try {
        const existing = await ProductModel.findOne({ name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });
        if (existing) {
          await ProductModel.updateOne(
            { _id: existing._id },
            {
              $set: {
                stock,
                category: [catDoc._id],
                subCategory: [subDoc._id],
                publish: true,
              }
            }
          );
          updated++;
        } else {
          const handle   = slugify(name);
          const baseSku  = handle.toUpperCase().slice(0, 48);
          const skuExists = await ProductModel.findOne({ sku: baseSku });
          const sku = skuExists ? `${baseSku}-${Date.now()}` : baseSku;

          await ProductModel.create({
            handle, name, sku,
            price: 0, costPrice: 0, discount: 0,
            stock, unit: 'bundle', description: '',
            image: [PLACEHOLDER],
            category: [catDoc._id],
            subCategory: [subDoc._id],
            publish: true,
            averageRating: 0,
            more_details: {},
          });
          console.log(`  ✔  ${stock}× ${name}`);
          created++;
        }
      } catch (err) {
        console.error(`  ✗  ${name}: ${err.message}`);
        errors++;
      }
    }
  }

  console.log('\n══════════════════════════════════════════════════');
  console.log(`✅  Import complete`);
  console.log(`   Created : ${created}`);
  console.log(`   Updated : ${updated} (stock refreshed)`);
  console.log(`   Errors  : ${errors}`);
  console.log('══════════════════════════════════════════════════\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n══════════════════════════════════════════════════');
  console.log(' Nawiri — Full Stock Import (3rd May 2026)');
  console.log('══════════════════════════════════════════════════\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  await deleteTodaysProducts();
  await removeDuplicates();
  await upsertAll();

  await mongoose.disconnect();
  console.log('✅ Done.\n');
}

main().catch(err => { console.error('❌ Fatal:', err); process.exit(1); });
