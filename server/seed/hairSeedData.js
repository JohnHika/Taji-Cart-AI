/**
 * Nawiri Hair — Luxury Hair Seed Script
 *
 * Populates the database with:
 *   - 8 categories (hair types + products)
 *   - 24 subcategories
 *   - 52 luxury products (KES pricing)
 *
 * Images are read from ./images/ and uploaded to Cloudinary before insertion.
 * The script is idempotent: existing records (matched by name) are skipped.
 *
 * Usage:
 *   cd server
 *   node seed/hairSeedData.js
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';

import CategoryModel from '../models/category.model.js';
import SubCategoryModel from '../models/subCategory.model.js';
import ProductModel from '../models/product.model.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const IMAGES_DIR = path.join(__dirname, 'images');

// ── Cloudinary ──────────────────────────────────────────────────────────────

cloudinary.config({
  cloud_name : process.env.CLOUDINARY_CLOUD_NAME,
  api_key    : process.env.CLOUDINARY_API_KEY,
  api_secret : process.env.CLOUDINARY_API_SECRET_KEY,
});

async function uploadToCloudinary(filename) {
  const filepath = path.join(IMAGES_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.warn(`  ⚠  Image not found: ${filename} — using placeholder`);
    return 'https://res.cloudinary.com/demo/image/upload/v1/samples/ecommerce/leather-bag-gray';
  }

  const buffer    = fs.readFileSync(filepath);
  const mimeType  = 'image/png';
  const b64       = `data:${mimeType};base64,${buffer.toString('base64')}`;

  const result = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      b64,
      { folder: 'nawiri-hair/seed', resource_type: 'auto' },
      (err, res) => (err ? reject(err) : resolve(res)),
    );
  });
  return result.secure_url;
}

// ── Database ─────────────────────────────────────────────────────────────────

async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');
}

// ── Seed helpers ──────────────────────────────────────────────────────────────

async function upsertCategory(name, imageFile) {
  const existing = await CategoryModel.findOne({ name });
  if (existing) {
    console.log(`  ↩  Category already exists: ${name}`);
    return existing;
  }
  console.log(`  ↑  Uploading image for category: ${name}`);
  const imageUrl = await uploadToCloudinary(imageFile);
  const doc = await CategoryModel.create({ name, image: imageUrl });
  console.log(`  ✔  Created category: ${name}`);
  return doc;
}

async function upsertSubCategory(name, imageFile, categoryIds) {
  const existing = await SubCategoryModel.findOne({ name });
  if (existing) return existing;
  const imageUrl = await uploadToCloudinary(imageFile);
  const doc = await SubCategoryModel.create({ name, image: imageUrl, category: categoryIds });
  console.log(`    ✔  SubCategory: ${name}`);
  return doc;
}

async function upsertProduct(data) {
  const existing = await ProductModel.findOne({ name: data.name });
  if (existing) return existing;
  const doc = await ProductModel.create({ ...data, publish: true, averageRating: 0 });
  console.log(`      ✔  Product: ${data.name} — KES ${data.price.toLocaleString()}`);
  return doc;
}

// ── Taxonomy ──────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: 'virgin',     name: 'Virgin Hair Extensions', image: 'cat_virgin_hair.png' },
  { key: 'closures',   name: 'Closures & Frontals',    image: 'cat_closures_frontals.png' },
  { key: 'wigs',       name: 'Wigs',                   image: 'cat_wigs.png' },
  { key: 'braiding',   name: 'Braiding Hair',           image: 'cat_braiding_hair.png' },
  { key: 'natural',    name: 'Natural Hair Care',       image: 'cat_natural_hair_care.png' },
  { key: 'treatments', name: 'Hair Treatments',        image: 'cat_hair_treatments.png' },
  { key: 'tools',      name: 'Styling Tools',           image: 'cat_styling_tools.png' },
  { key: 'accessories',name: 'Accessories',             image: 'cat_accessories.png' },
];

// Sub-category image fallbacks (reuse nearest category image when no dedicated image)
const SUB_CATEGORIES = [
  // Virgin Hair
  { name: 'Brazilian Hair',       catKeys: ['virgin'],     image: 'cat_virgin_hair.png' },
  { name: 'Peruvian Hair',        catKeys: ['virgin'],     image: 'cat_virgin_hair.png' },
  { name: 'Malaysian Hair',       catKeys: ['virgin'],     image: 'cat_virgin_hair.png' },
  { name: 'Indian Remy Hair',     catKeys: ['virgin'],     image: 'cat_virgin_hair.png' },
  // Closures
  { name: '4×4 Lace Closure',    catKeys: ['closures'],   image: 'cat_closures_frontals.png' },
  { name: '5×5 Lace Closure',    catKeys: ['closures'],   image: 'cat_closures_frontals.png' },
  { name: '13×4 Lace Frontal',   catKeys: ['closures'],   image: 'cat_closures_frontals.png' },
  { name: 'HD Lace Frontal',     catKeys: ['closures'],   image: 'cat_closures_frontals.png' },
  // Wigs
  { name: 'Lace Front Wigs',     catKeys: ['wigs'],       image: 'cat_wigs.png' },
  { name: 'Full Lace Wigs',      catKeys: ['wigs'],       image: 'cat_wigs.png' },
  { name: 'Glueless Wigs',       catKeys: ['wigs'],       image: 'cat_wigs.png' },
  { name: 'Headband Wigs',       catKeys: ['wigs'],       image: 'cat_wigs.png' },
  // Braiding
  { name: 'Box Braid Hair',      catKeys: ['braiding'],   image: 'prod_knotless_braids_hair.png' },
  { name: 'Senegalese Twist Hair',catKeys: ['braiding'],  image: 'prod_senegalese_twist.png' },
  { name: 'Passion Twist Hair',  catKeys: ['braiding'],   image: 'cat_braiding_hair.png' },
  { name: 'Faux Locs Hair',      catKeys: ['braiding'],   image: 'prod_faux_locs.png' },
  { name: 'Marley & Afro Hair',  catKeys: ['braiding'],   image: 'cat_braiding_hair.png' },
  // Natural Care
  { name: 'Oils & Serums',       catKeys: ['natural'],    image: 'prod_hair_oils.png' },
  { name: 'Edge Control',        catKeys: ['natural'],    image: 'prod_edge_control.png' },
  { name: 'Shampoos & Co-Wash',  catKeys: ['natural'],    image: 'cat_natural_hair_care.png' },
  { name: 'Leave-in Conditioners',catKeys: ['natural'],   image: 'cat_natural_hair_care.png' },
  // Treatments
  { name: 'Deep Conditioners',   catKeys: ['treatments'], image: 'cat_hair_treatments.png' },
  { name: 'Protein Treatments',  catKeys: ['treatments'], image: 'cat_hair_treatments.png' },
  // Tools
  { name: 'Flat Irons',          catKeys: ['tools'],      image: 'prod_flat_iron.png' },
  { name: 'Curling Wands',       catKeys: ['tools'],      image: 'cat_styling_tools.png' },
  // Accessories
  { name: 'Bonnets & Scarves',   catKeys: ['accessories'],image: 'cat_accessories.png' },
  { name: 'Applicator Tools',    catKeys: ['accessories'],image: 'cat_accessories.png' },
];

// ── Product catalogue ──────────────────────────────────────────────────────────

function buildProducts(catMap, subMap) {
  const V  = (k) => catMap[k]._id;
  const S  = (k) => subMap[k]._id;
  const IMG = (f) => subMap[f]?.imageUrl || catMap[f]?.imageUrl;

  return [

    // ── VIRGIN HAIR ──────────────────────────────────────────────────────────
    {
      name: 'Royal Brazilian Body Wave Bundle (10")',
      image: [subMap['Brazilian Hair'].imageUrl],
      category: [V('virgin')],
      subCategory: [S('Brazilian Hair')],
      unit: 'bundle',
      stock: 48,
      price: 7500,
      discount: 5,
      description: 'Grade 10A 100% virgin Brazilian hair, body wave pattern. Soft, lustrous, and tangle-free. Can be dyed, bleached, and heat-styled up to 230°C. Double weft, minimal shedding.',
      more_details: { grade: '10A', length: '10"', texture: 'Body Wave', origin: 'Brazil', color: 'Natural Black (#1B)' },
    },
    {
      name: 'Royal Brazilian Body Wave Bundle (16")',
      image: [subMap['Brazilian Hair'].imageUrl],
      category: [V('virgin')],
      subCategory: [S('Brazilian Hair')],
      unit: 'bundle',
      stock: 35,
      price: 9500,
      discount: 5,
      description: 'Grade 10A 100% virgin Brazilian hair, body wave 16". Luscious voluminous waves that hold their shape. Ideal for sew-in installs, quick weave, and half-up styles.',
      more_details: { grade: '10A', length: '16"', texture: 'Body Wave', origin: 'Brazil', color: 'Natural Black (#1B)' },
    },
    {
      name: 'Royal Brazilian Body Wave Bundle (22")',
      image: [subMap['Brazilian Hair'].imageUrl],
      category: [V('virgin')],
      subCategory: [S('Brazilian Hair')],
      unit: 'bundle',
      stock: 20,
      price: 12500,
      discount: 0,
      description: '22" Grade 10A Brazilian body wave — long, glamorous, and full. Naturally blends with most hair textures. Perfect for full installs requiring max volume.',
      more_details: { grade: '10A', length: '22"', texture: 'Body Wave', origin: 'Brazil', color: 'Natural Black (#1B)' },
    },
    {
      name: 'Peruvian Straight Bundle (14")',
      image: [subMap['Peruvian Hair'].imageUrl],
      category: [V('virgin')],
      subCategory: [S('Peruvian Hair')],
      unit: 'bundle',
      stock: 30,
      price: 8500,
      discount: 0,
      description: 'Grade 9A 100% virgin Peruvian straight hair. Naturally silky and sleek with a subtle sheen. Lightweight yet dense — ideal for laid, bone-straight looks favoured in Nairobi.',
      more_details: { grade: '9A', length: '14"', texture: 'Straight', origin: 'Peru', color: 'Natural Black (#1B)' },
    },
    {
      name: 'Peruvian Deep Wave Bundle (18")',
      image: [subMap['Peruvian Hair'].imageUrl],
      category: [V('virgin')],
      subCategory: [S('Peruvian Hair')],
      unit: 'bundle',
      stock: 22,
      price: 11000,
      discount: 10,
      description: 'Luxurious 18" deep wave Peruvian virgin hair. Tight, defined ripple waves with incredible body. Low maintenance — simply wet and go for beautiful natural-looking curls.',
      more_details: { grade: '9A', length: '18"', texture: 'Deep Wave', origin: 'Peru', color: 'Natural Black (#1B)' },
    },
    {
      name: 'Malaysian Silky Straight Bundle (12")',
      image: [subMap['Malaysian Hair'].imageUrl],
      category: [V('virgin')],
      subCategory: [S('Malaysian Hair')],
      unit: 'bundle',
      stock: 40,
      price: 7800,
      discount: 0,
      description: 'Grade 8A Malaysian virgin hair, silky straight. Exceptionally soft with a natural sheen. Among the finest textures — blends effortlessly with relaxed African hair.',
      more_details: { grade: '8A', length: '12"', texture: 'Silky Straight', origin: 'Malaysia', color: 'Natural Black (#1B)' },
    },
    {
      name: 'Indian Remy Wavy Bundle (20")',
      image: [subMap['Indian Remy Hair'].imageUrl],
      category: [V('virgin')],
      subCategory: [S('Indian Remy Hair')],
      unit: 'bundle',
      stock: 18,
      price: 13500,
      discount: 5,
      description: 'Premium 20" Indian Remy hair with a natural wavy pattern. All cuticles aligned for zero tangles. Sourced ethically, temple-donated. Suitable for all install methods.',
      more_details: { grade: 'Remy', length: '20"', texture: 'Natural Wave', origin: 'India', color: 'Natural Dark Brown (#2)' },
    },

    // ── CLOSURES & FRONTALS ───────────────────────────────────────────────────
    {
      name: 'HD Lace 13×4 Frontal — Straight (14")',
      image: [subMap['HD Lace Frontal'].imageUrl],
      category: [V('closures')],
      subCategory: [S('HD Lace Frontal')],
      unit: 'piece',
      stock: 25,
      price: 14500,
      discount: 0,
      description: 'Invisible HD lace 13×4 frontal, straight. The ultra-thin lace melts into all skin tones for an undetectable hairline. Pre-plucked baby hairs. Compatible with any sew-in or glue install.',
      more_details: { laceType: 'HD Lace', size: '13×4', texture: 'Straight', length: '14"', color: 'Natural Black' },
    },
    {
      name: 'HD Lace 13×4 Frontal — Body Wave (16")',
      image: [subMap['HD Lace Frontal'].imageUrl],
      category: [V('closures')],
      subCategory: [S('HD Lace Frontal')],
      unit: 'piece',
      stock: 20,
      price: 16500,
      discount: 8,
      description: '13×4 HD lace frontal with body wave hair. Natural looking hairline with pre-plucked parting space. Perfect for completing a bundle install with a seamless finish.',
      more_details: { laceType: 'HD Lace', size: '13×4', texture: 'Body Wave', length: '16"', color: 'Natural Black' },
    },
    {
      name: '5×5 Lace Closure — Deep Wave (14")',
      image: [subMap['5×5 Lace Closure'].imageUrl],
      category: [V('closures')],
      subCategory: [S('5×5 Lace Closure')],
      unit: 'piece',
      stock: 30,
      price: 10500,
      discount: 0,
      description: 'Spacious 5×5 Swiss lace closure with deep wave pattern. Wider parting space for more versatile styling. Pre-bleached knots and baby hairs for a natural finish.',
      more_details: { laceType: 'Swiss Lace', size: '5×5', texture: 'Deep Wave', length: '14"', color: 'Natural Black' },
    },
    {
      name: '4×4 Lace Closure — Straight (10")',
      image: [subMap['4×4 Lace Closure'].imageUrl],
      category: [V('closures')],
      subCategory: [S('4×4 Lace Closure')],
      unit: 'piece',
      stock: 45,
      price: 7500,
      discount: 5,
      description: 'Classic 4×4 Swiss lace closure for straight installs. Durable and lightweight, easy to install and blend. The everyday essential for a complete weave look.',
      more_details: { laceType: 'Swiss Lace', size: '4×4', texture: 'Straight', length: '10"', color: 'Natural Black' },
    },

    // ── WIGS ──────────────────────────────────────────────────────────────────
    {
      name: 'Empress Glueless Body Wave Wig (20")',
      image: [subMap['Glueless Wigs'].imageUrl],
      category: [V('wigs')],
      subCategory: [S('Glueless Wigs')],
      unit: 'piece',
      stock: 15,
      price: 38000,
      discount: 10,
      description: 'Glueless 13×4 HD lace front wig, body wave 20". No glue, no gel — adjustable straps and combs for a secure fit. 180% density for maximum fullness. Ready to wear straight out of the box.',
      more_details: { laceType: 'HD Lace', size: '13×4', density: '180%', length: '20"', texture: 'Body Wave', capSize: 'Medium (adjustable)' },
    },
    {
      name: 'Empress Glueless Straight Wig (16")',
      image: [subMap['Glueless Wigs'].imageUrl],
      category: [V('wigs')],
      subCategory: [S('Glueless Wigs')],
      unit: 'piece',
      stock: 18,
      price: 29500,
      discount: 0,
      description: 'Sleek glueless straight wig with 13×4 HD lace. 150% density for a natural, elegant look. Pre-plucked with baby hairs. Perfect for the office, events, or everyday luxury wear.',
      more_details: { laceType: 'HD Lace', size: '13×4', density: '150%', length: '16"', texture: 'Straight', capSize: 'Medium (adjustable)' },
    },
    {
      name: 'Queen Full Lace Deep Wave Wig (22")',
      image: [subMap['Full Lace Wigs'].imageUrl],
      category: [V('wigs')],
      subCategory: [S('Full Lace Wigs')],
      unit: 'piece',
      stock: 8,
      price: 62000,
      discount: 0,
      description: 'Full lace wig — part anywhere, style in any direction. Deep wave 22", 200% density. All-lace construction for maximum breathability and styling freedom. The ultimate luxury hair investment.',
      more_details: { laceType: 'Full Lace', density: '200%', length: '22"', texture: 'Deep Wave', capSize: 'Medium / Large (adjustable)' },
    },
    {
      name: 'Lace Front Curly Wig (18")',
      image: [subMap['Lace Front Wigs'].imageUrl],
      category: [V('wigs')],
      subCategory: [S('Lace Front Wigs')],
      unit: 'piece',
      stock: 12,
      price: 24500,
      discount: 5,
      description: 'Bouncy 18" curly lace front wig. 13×4 transparent lace, 150% density. Tight curl pattern evocative of 3C/4A natural curls. Heat-friendly — blow out for volume or keep curly.',
      more_details: { laceType: 'Transparent Lace', size: '13×4', density: '150%', length: '18"', texture: 'Curly' },
    },
    {
      name: 'Headband Wig — Straight (14")',
      image: [subMap['Headband Wigs'].imageUrl],
      category: [V('wigs')],
      subCategory: [S('Headband Wigs')],
      unit: 'piece',
      stock: 30,
      price: 14500,
      discount: 0,
      description: 'No-lace, no-glue headband wig for the modern woman on the go. Straight hair, 150% density. Comes with a velvet headband. Install in under 2 minutes. Perfect protective styling.',
      more_details: { type: 'Headband Wig', density: '150%', length: '14"', texture: 'Straight' },
    },
    {
      name: 'Headband Wig — Body Wave (18")',
      image: [subMap['Headband Wigs'].imageUrl],
      category: [V('wigs')],
      subCategory: [S('Headband Wigs')],
      unit: 'piece',
      stock: 25,
      price: 17000,
      discount: 5,
      description: 'Effortlessly beautiful 18" body wave headband wig. Wear with the included satin headband or your own accessories for endless looks. Machine-made weft for durability.',
      more_details: { type: 'Headband Wig', density: '150%', length: '18"', texture: 'Body Wave' },
    },

    // ── BRAIDING HAIR ─────────────────────────────────────────────────────────
    {
      name: 'Nawiri Pre-Stretched Knotless Braid Hair — Jet Black',
      image: [subMap['Box Braid Hair'].imageUrl],
      category: [V('braiding')],
      subCategory: [S('Box Braid Hair')],
      unit: 'pack',
      stock: 100,
      price: 950,
      discount: 0,
      description: 'Pre-stretched knotless box braid hair for easy, pain-free installation. Lightweight, tangle-free, and heat-resistant. Available in 24" length. 5 packs recommended for full head.',
      more_details: { color: 'Jet Black (#1)', length: '24"', type: 'Pre-stretched knotless', packs_for_full_head: 5 },
    },
    {
      name: 'Nawiri Pre-Stretched Knotless Braid Hair — Dark Brown',
      image: [subMap['Box Braid Hair'].imageUrl],
      category: [V('braiding')],
      subCategory: [S('Box Braid Hair')],
      unit: 'pack',
      stock: 85,
      price: 950,
      discount: 0,
      description: 'Pre-stretched knotless braid hair in rich dark brown. Pairs beautifully with natural hair or as an ombré effect when mixed with black packs.',
      more_details: { color: 'Dark Brown (#2)', length: '24"', type: 'Pre-stretched knotless', packs_for_full_head: 5 },
    },
    {
      name: 'Jumbo Senegalese Twist Hair — Black/Brown Ombré',
      image: [subMap['Senegalese Twist Hair'].imageUrl],
      category: [V('braiding')],
      subCategory: [S('Senegalese Twist Hair')],
      unit: 'pack',
      stock: 70,
      price: 1100,
      discount: 0,
      description: 'Premium synthetic Senegalese twist hair in stunning black-to-brown ombré. Silky texture mimics real hair. Heat-resistant up to 150°C. 30" length for dramatic long twists.',
      more_details: { color: 'Black-Brown Ombré (#1B/30)', length: '30"', type: 'Senegalese Twist', packs_for_full_head: 7 },
    },
    {
      name: 'Passion Twist Crochet Hair — Water Wave',
      image: [subMap['Passion Twist Hair'].imageUrl],
      category: [V('braiding')],
      subCategory: [S('Passion Twist Hair')],
      unit: 'pack',
      stock: 60,
      price: 1350,
      discount: 10,
      description: 'Bohemian water wave passion twist hair for crochet install. Loose, free-flowing spiral curls that create the trendy passion twist style. Easy crochet loop method. 18" length.',
      more_details: { color: 'Natural Black', length: '18"', type: 'Water Wave Crochet', packs_for_full_head: 6 },
    },
    {
      name: 'Goddess Faux Locs Crochet Hair — Dark Brown',
      image: [subMap['Faux Locs Hair'].imageUrl],
      category: [V('braiding')],
      subCategory: [S('Faux Locs Hair')],
      unit: 'pack',
      stock: 55,
      price: 1600,
      discount: 0,
      description: 'Bohemian goddess faux locs with soft wavy ends. Realistic loc appearance with crochet installation. Dark brown shade for a warm, sun-kissed look. 18–20" length, 24 locs per pack.',
      more_details: { color: 'Dark Brown (#2)', length: '18-20"', type: 'Faux Locs Crochet', locs_per_pack: 24, packs_for_full_head: 6 },
    },
    {
      name: 'Marley Twist Afro Hair — Natural Black',
      image: [subMap['Marley & Afro Hair'].imageUrl],
      category: [V('braiding')],
      subCategory: [S('Marley & Afro Hair')],
      unit: 'pack',
      stock: 65,
      price: 850,
      discount: 0,
      description: 'Kinky Marley twist hair with a textured afro look. Soft, fluffy, and extremely lightweight. Ideal for Marley twists, flat twists, and afro styles. Blends perfectly with 4C natural hair.',
      more_details: { color: 'Natural Black (#1B)', length: '18"', type: 'Marley Kinky', packs_for_full_head: 5 },
    },

    // ── NATURAL HAIR CARE ─────────────────────────────────────────────────────
    {
      name: 'Nawiri Argan & Black Castor Growth Oil (100ml)',
      image: [subMap['Oils & Serums'].imageUrl],
      category: [V('natural')],
      subCategory: [S('Oils & Serums')],
      unit: 'bottle',
      stock: 200,
      price: 1850,
      discount: 0,
      description: 'Potent blend of Moroccan Argan oil and Jamaican Black Castor oil. Stimulates hair growth, seals in moisture, and adds luminous shine. Free of parabens, sulphates, and mineral oil. Suitable for 4A–4C hair.',
      more_details: { volume: '100ml', keyIngredients: 'Argan Oil, JBCO, Rosemary Extract', suitableFor: '4A, 4B, 4C', benefits: 'Growth, Moisture, Shine' },
    },
    {
      name: 'Nawiri Chebe & Avocado Scalp Serum (60ml)',
      image: [subMap['Oils & Serums'].imageUrl],
      category: [V('natural')],
      subCategory: [S('Oils & Serums')],
      unit: 'bottle',
      stock: 150,
      price: 2200,
      discount: 5,
      description: 'Inspired by the ancient Chadian chebe hair ritual. This scalp serum combines Chad chebe powder, avocado oil, and shea butter extract to reduce breakage and retain length.',
      more_details: { volume: '60ml', keyIngredients: 'Chebe Powder, Avocado Oil, Shea Butter', suitableFor: '3C, 4A, 4B, 4C', benefits: 'Length Retention, Breakage Reduction' },
    },
    {
      name: 'Empress Edge Control — Extra Hold (80g)',
      image: [subMap['Edge Control'].imageUrl],
      category: [V('natural')],
      subCategory: [S('Edge Control')],
      unit: 'jar',
      stock: 250,
      price: 950,
      discount: 0,
      description: 'Long-lasting extra-hold edge control that keeps your edges laid all day. No flaking, no white residue. Infused with castor oil and vitamin E for nourishment while you style.',
      more_details: { weight: '80g', hold: 'Extra Strong', finish: 'Natural Shine', ingredients: 'Castor Oil, Vitamin E, Beeswax' },
    },
    {
      name: 'Empress Edge Control — Smooth Hold (80g)',
      image: [subMap['Edge Control'].imageUrl],
      category: [V('natural')],
      subCategory: [S('Edge Control')],
      unit: 'jar',
      stock: 200,
      price: 850,
      discount: 0,
      description: 'Medium-hold edge control for a smooth, polished finish without crunchiness. Ideal for protective styles and everyday edge maintenance.',
      more_details: { weight: '80g', hold: 'Medium', finish: 'Smooth', ingredients: 'Castor Oil, Aloe Vera, Beeswax' },
    },
    {
      name: 'Nawiri Moisturising Curl Co-Wash (400ml)',
      image: [subMap['Shampoos & Co-Wash'].imageUrl],
      category: [V('natural')],
      subCategory: [S('Shampoos & Co-Wash')],
      unit: 'bottle',
      stock: 180,
      price: 1450,
      discount: 0,
      description: 'Sulphate-free cleansing conditioner designed for natural African hair. Detangles while cleansing, leaving curls defined and moisturised. Shea butter and baobab oil formula.',
      more_details: { volume: '400ml', type: 'Co-Wash', keyIngredients: 'Shea Butter, Baobab Oil, Aloe Vera', sulphateFree: true },
    },
    {
      name: 'Nawiri Hydrating Shampoo — Scalp Detox (300ml)',
      image: [subMap['Shampoos & Co-Wash'].imageUrl],
      category: [V('natural')],
      subCategory: [S('Shampoos & Co-Wash')],
      unit: 'bottle',
      stock: 160,
      price: 1250,
      discount: 0,
      description: 'Gentle sulphate-free shampoo that deeply cleanses the scalp without stripping natural oils. Tea tree and peppermint formula soothes scalp irritation and promotes healthy hair growth.',
      more_details: { volume: '300ml', type: 'Clarifying Shampoo', keyIngredients: 'Tea Tree, Peppermint, Vitamin B5', sulphateFree: true },
    },
    {
      name: 'Empress Curl Defining Leave-in Conditioner (250ml)',
      image: [subMap['Leave-in Conditioners'].imageUrl],
      category: [V('natural')],
      subCategory: [S('Leave-in Conditioners')],
      unit: 'bottle',
      stock: 190,
      price: 1650,
      discount: 10,
      description: 'Lightweight leave-in conditioner that defines and elongates natural curls. Provides all-day moisture and frizz control. Mango butter and flaxseed oil formula for 3C–4C hair types.',
      more_details: { volume: '250ml', type: 'Leave-in Conditioner', keyIngredients: 'Mango Butter, Flaxseed Oil, Glycerin', hairTypes: '3C, 4A, 4B, 4C' },
    },

    // ── HAIR TREATMENTS ───────────────────────────────────────────────────────
    {
      name: 'Royal Repair Deep Hydration Mask (300g)',
      image: [subMap['Deep Conditioners'].imageUrl],
      category: [V('treatments')],
      subCategory: [S('Deep Conditioners')],
      unit: 'jar',
      stock: 120,
      price: 2400,
      discount: 0,
      description: 'Intensive overnight deep conditioning mask for severely dry and damaged hair. Restores elasticity and shine in a single use. Formulated with Ugandan shea butter, avocado, and keratin hydrolysate.',
      more_details: { weight: '300g', type: 'Deep Conditioner / Hair Mask', keyIngredients: 'Ugandan Shea Butter, Avocado Oil, Keratin Hydrolysate', processingTime: '30 min or overnight' },
    },
    {
      name: 'Empress Baobab Moisture Surge Deep Conditioner (500ml)',
      image: [subMap['Deep Conditioners'].imageUrl],
      category: [V('treatments')],
      subCategory: [S('Deep Conditioners')],
      unit: 'bottle',
      stock: 140,
      price: 2800,
      discount: 5,
      description: 'Rich creamy deep conditioner powered by African baobab oil and honey. Restores moisture balance for high-porosity natural hair. Reduces breakage and detangles with ease.',
      more_details: { volume: '500ml', type: 'Deep Conditioner', keyIngredients: 'Baobab Oil, Honey, Behentrimonium Methosulfate', processingTime: '20–45 min' },
    },
    {
      name: 'Salon Keratin Bond Protein Treatment (200g)',
      image: [subMap['Protein Treatments'].imageUrl],
      category: [V('treatments')],
      subCategory: [S('Protein Treatments')],
      unit: 'jar',
      stock: 80,
      price: 3500,
      discount: 0,
      description: "Professional-grade protein treatment that rebuilds the hair's keratin structure. Ideal for over-processed, heat-damaged, or bleached hair. Reduces porosity and restores strength.",
      more_details: { weight: '200g', type: 'Protein Treatment', keyIngredients: 'Hydrolysed Keratin, Silk Amino Acids, Biotin', processingTime: '30–45 min with heat' },
    },
    {
      name: 'Nawiri Hydrolysed Silk Protein Serum (100ml)',
      image: [subMap['Protein Treatments'].imageUrl],
      category: [V('treatments')],
      subCategory: [S('Protein Treatments')],
      unit: 'bottle',
      stock: 100,
      price: 1950,
      discount: 0,
      description: 'Lightweight silk protein serum that fills gaps in the hair cuticle and adds intense shine. Use weekly for protein-moisture balance. Compatible with protective styles and natural hair.',
      more_details: { volume: '100ml', type: 'Protein Serum', keyIngredients: 'Hydrolysed Silk, Panthenol, Argan Oil', usageFrequency: 'Weekly' },
    },
    {
      name: 'African Botanics Scalp Revival Treatment (150ml)',
      image: [subMap['Protein Treatments'].imageUrl],
      category: [V('treatments')],
      subCategory: [S('Protein Treatments')],
      unit: 'bottle',
      stock: 95,
      price: 2650,
      discount: 0,
      description: 'Potent scalp treatment targeting dandruff, itchiness, and excess sebum. Infused with neem oil, tea tree, and salicylic acid for a clean, healthy scalp foundation for hair growth.',
      more_details: { volume: '150ml', type: 'Scalp Treatment', keyIngredients: 'Neem Oil, Tea Tree, Salicylic Acid, Zinc PCA', usageFrequency: '2–3x per week' },
    },

    // ── STYLING TOOLS ─────────────────────────────────────────────────────────
    {
      name: 'Aura Pro Titanium Flat Iron — Rose Gold',
      image: [subMap['Flat Irons'].imageUrl],
      category: [V('tools')],
      subCategory: [S('Flat Irons')],
      unit: 'piece',
      stock: 40,
      price: 8500,
      discount: 0,
      description: 'Professional titanium flat iron with digital temperature control (150°C–230°C). Negative ion technology eliminates frizz and adds mirror shine. Ceramic-coated plates, 1" width. Dual-voltage for travel.',
      more_details: { plateType: 'Titanium / Ceramic coated', width: '1"', tempRange: '150–230°C', dualVoltage: true, heatUpTime: '30 seconds', color: 'Rose Gold / Black' },
    },
    {
      name: 'Aura Pro Wide-Plate Flat Iron (1.5") — Matte Black',
      image: [subMap['Flat Irons'].imageUrl],
      category: [V('tools')],
      subCategory: [S('Flat Irons')],
      unit: 'piece',
      stock: 30,
      price: 10500,
      discount: 5,
      description: 'Wide-plate professional straightener ideal for thick, long, or coarse hair. Infrared heat penetrates the hair shaft for faster, gentler straightening. Auto-shutoff after 60 minutes.',
      more_details: { plateType: 'Infrared Ceramic', width: '1.5"', tempRange: '150–235°C', dualVoltage: true, autoShutoff: '60 min', color: 'Matte Black / Gold' },
    },
    {
      name: 'Empress Ceramic Curling Wand Set (3-in-1)',
      image: [subMap['Curling Wands'].imageUrl],
      category: [V('tools')],
      subCategory: [S('Curling Wands')],
      unit: 'set',
      stock: 25,
      price: 7500,
      discount: 10,
      description: '3-in-1 ceramic curling wand set with interchangeable barrels (25mm, 32mm, 38mm). Create tight ringlets to loose beachy waves. 25 temperature settings, instant heat-up.',
      more_details: { barrels: '25mm, 32mm, 38mm', tempRange: '120–220°C', heatUpTime: '45 seconds', material: 'Ceramic', includes: 'Heat-resistant glove, storage bag' },
    },
    {
      name: 'Aurora Pro Ionic Hair Dryer — Black/Rose Gold',
      image: [subMap['Flat Irons'].imageUrl],
      category: [V('tools')],
      subCategory: [S('Flat Irons')],
      unit: 'piece',
      stock: 35,
      price: 9800,
      discount: 0,
      description: '2400W professional ionic hair dryer with brushless motor. Dries hair up to 60% faster than conventional dryers. AC motor for salon durability. 3 heat + 2 speed settings, cool-shot button.',
      more_details: { power: '2400W', motorType: 'AC Brushless', technology: 'Ionic + Far Infrared', settings: '3 heat, 2 speed', weight: '480g', includes: 'Concentrator nozzle, diffuser' },
    },

    // ── ACCESSORIES ───────────────────────────────────────────────────────────
    {
      name: 'Nawiri Satin-Lined Sleep Bonnet — Champagne',
      image: [subMap['Bonnets & Scarves'].imageUrl],
      category: [V('accessories')],
      subCategory: [S('Bonnets & Scarves')],
      unit: 'piece',
      stock: 300,
      price: 1200,
      discount: 0,
      description: 'Oversized satin-lined sleep bonnet that fits over braids, twists, wigs, and natural hair. Eliminates bedtime friction that causes breakage and frizz. Elastic band is gentle on edges.',
      more_details: { material: 'Satin-lined polyester outer', color: 'Champagne', size: 'One size (extra large)', suitableFor: 'All hair types, including wigs and braids' },
    },
    {
      name: 'Nawiri Satin Sleep Bonnet — Midnight Black',
      image: [subMap['Bonnets & Scarves'].imageUrl],
      category: [V('accessories')],
      subCategory: [S('Bonnets & Scarves')],
      unit: 'piece',
      stock: 280,
      price: 1200,
      discount: 0,
      description: 'Classic midnight black satin sleep bonnet. Double-layered satin keeps moisture locked in all night. Adjustable elastic for a secure, comfortable fit.',
      more_details: { material: 'Double satin', color: 'Midnight Black', size: 'One size (extra large)' },
    },
    {
      name: 'Luxury Satin Hair Wrap Scarf — Botanical Print',
      image: [subMap['Bonnets & Scarves'].imageUrl],
      category: [V('accessories')],
      subCategory: [S('Bonnets & Scarves')],
      unit: 'piece',
      stock: 200,
      price: 1650,
      discount: 0,
      description: 'Oversized satin hair scarf in a beautiful botanical print. Wrap your hair, tie as a headscarf, or use as a stylish accessory. 100% satin lining, 90×90cm square.',
      more_details: { material: '100% Satin', size: '90×90cm', print: 'Botanical Floral', uses: 'Hair wrap, headscarf, neck scarf' },
    },
    {
      name: 'Wide-Tooth Detangling Comb — Sandalwood',
      image: [subMap['Applicator Tools'].imageUrl],
      category: [V('accessories')],
      subCategory: [S('Applicator Tools')],
      unit: 'piece',
      stock: 400,
      price: 750,
      discount: 0,
      description: 'Handcrafted sandalwood wide-tooth comb for detangling natural and wavy hair without breakage. Anti-static, gentle on the scalp. Suitable for wet or dry hair detangling.',
      more_details: { material: 'Natural Sandalwood', toothSpacing: 'Wide (6–8mm)', suitable: 'Natural, curly, wavy hair', length: '20cm' },
    },
    {
      name: 'Denman-Style Styling Brush Set (3-Piece)',
      image: [subMap['Applicator Tools'].imageUrl],
      category: [V('accessories')],
      subCategory: [S('Applicator Tools')],
      unit: 'set',
      stock: 150,
      price: 2200,
      discount: 5,
      description: '3-piece professional styling brush set: edge brush (boar bristle), Denman-style curl definer, and cushion paddle brush. Essential tools for defined curls, sleek styles, and smooth finishes.',
      more_details: { includes: 'Edge brush, Denman-style brush, Paddle brush', bristle: 'Boar & nylon blend', suitableFor: 'All hair types' },
    },
    {
      name: 'Silk Satin Scrunchie Set (5-Pack) — Earth Tones',
      image: [subMap['Bonnets & Scarves'].imageUrl],
      category: [V('accessories')],
      subCategory: [S('Bonnets & Scarves')],
      unit: 'set',
      stock: 350,
      price: 950,
      discount: 0,
      description: 'Set of 5 luxurious satin scrunchies in earth tone shades — terracotta, sage, camel, ivory, and charcoal. No crease, no breakage. Perfect for low ponytails, buns, and loose styles.',
      more_details: { material: 'Satin', count: 5, colors: 'Terracotta, Sage, Camel, Ivory, Charcoal', suitableFor: 'All hair types' },
    },
  ];
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  try {
    await connectDB();

    console.log('\n📂 Seeding Categories...');
    const catDocs = {};
    for (const cat of CATEGORIES) {
      catDocs[cat.key] = await upsertCategory(cat.name, cat.image);
      catDocs[cat.key].imageUrl = catDocs[cat.key].image;
    }

    console.log('\n📂 Seeding SubCategories...');
    const subDocs = {};
    for (const sub of SUB_CATEGORIES) {
      const categoryIds = sub.catKeys.map((k) => catDocs[k]._id);
      const doc = await upsertSubCategory(sub.name, sub.image, categoryIds);
      // store resolved image URL for product building
      doc.imageUrl = doc.image;
      subDocs[sub.name] = doc;
    }

    console.log('\n📦 Seeding Products...');
    const products = buildProducts(catDocs, subDocs);
    for (const p of products) {
      await upsertProduct(p);
    }

    const catCount  = await CategoryModel.countDocuments();
    const subCount  = await SubCategoryModel.countDocuments();
    const prodCount = await ProductModel.countDocuments();

    console.log(`\n✅ Seed complete!`);
    console.log(`   Categories   : ${catCount}`);
    console.log(`   SubCategories: ${subCount}`);
    console.log(`   Products     : ${prodCount}`);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
