/**
 * Seed: Seele Customer Account
 * Creates a regular customer user "Seele" with Silver-tier loyalty card
 * Run: node server/scripts/seed-seele.js
 */

import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../server/.env') });

// ─── User Schema (inline to avoid circular imports) ──────────────────────────
const userSchema = new mongoose.Schema({
  name:            { type: String, required: true },
  email:           { type: String, required: true, unique: true },
  password:        { type: String },
  avatar:          { type: String, default: '' },
  mobile:          { type: String, default: '' },
  mobile_verified: { type: Boolean, default: false },
  refresh_token:   { type: String, default: '' },
  verify_email:    { type: Boolean, default: false },
  last_login_date: { type: Date, default: null },
  status:          { type: String, enum: ['Active','Inactive','Suspended'], default: 'Active' },
  isAdmin:         { type: Boolean, default: false },
  role:            { type: String, enum: ['user','admin','delivery','staff'], default: 'user' },
  isDelivery:      { type: Boolean, default: false },
  isStaff:         { type: Boolean, default: false },
  authType:        { type: String, default: 'local' },
}, { timestamps: true });

// ─── Loyalty Card Schema ──────────────────────────────────────────────────────
const pointsHistorySchema = new mongoose.Schema({
  points:  { type: Number, required: true },
  reason:  { type: String, required: true },
  date:    { type: Date, default: Date.now }
});

const loyaltyCardSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cardNumber: { type: String, required: true, unique: true },
  tier:       { type: String, enum: ['Basic','Bronze','Silver','Gold','Platinum'], default: 'Basic' },
  points:     { type: Number, default: 0 },
  pointsHistory: [pointsHistorySchema],
  isActive:   { type: Boolean, default: true },
  createdAt:  { type: Date, default: Date.now },
  expiresAt:  { type: Date, default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
});

const User        = mongoose.models.user        || mongoose.model('user',        userSchema);
const LoyaltyCard = mongoose.models.loyaltycard || mongoose.model('loyaltycard', loyaltyCardSchema);

// ─── Seed Data ────────────────────────────────────────────────────────────────
const SEELE = {
  name:           'Seele Vollerei',
  email:          'seele@nawiri.co.ke',
  password:       'Seele@2026',       // plain-text; will be hashed
  mobile:         '+254711223344',
  mobile_verified: true,
  verify_email:   true,
  status:         'Active',
  role:           'staff',
  isAdmin:        false,
  isStaff:        true,
};

const LOYALTY = {
  tier:   'Silver',
  points: 1850,
  history: [
    { points: 500,  reason: 'Welcome bonus – first order' },
    { points: 350,  reason: 'Purchase KES 35,000 – Hair Extensions' },
    { points: 600,  reason: 'Purchase KES 60,000 – Weave & Wigs bundle' },
    { points: 400,  reason: 'Referral reward – 4 friends joined' },
  ]
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function generateCardNumber(name) {
  const prefix = name.split(' ')[0].toUpperCase().slice(0, 6).padEnd(6, 'X');
  const suffix = Date.now().toString().slice(-9);
  return `${prefix}${suffix}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('\n🌱  Seeding Seele account …\n');

  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('❌  MONGODB_URI not set in .env'); process.exit(1); }

  await mongoose.connect(uri);
  console.log('✅  Connected to MongoDB');

  // ── 1. Upsert user ──────────────────────────────────────────────────────────
  let user = await User.findOne({ email: SEELE.email });

  if (user) {
    console.log(`ℹ️   User "${SEELE.email}" already exists — updating status/role …`);
    user.status       = SEELE.status;
    user.role         = SEELE.role;
    user.isAdmin      = SEELE.isAdmin;
    user.isStaff      = SEELE.isStaff;
    user.verify_email = true;
    // Re-hash password on update so we always know the test password
    const salt = await bcryptjs.genSalt(10);
    user.password = await bcryptjs.hash(SEELE.password, salt);
    await user.save();
    console.log(`✅  User updated  (id: ${user._id})`);
  } else {
    const salt = await bcryptjs.genSalt(10);
    const hashed = await bcryptjs.hash(SEELE.password, salt);

    user = await User.create({
      ...SEELE,
      password: hashed,
    });
    console.log(`✅  User created  (id: ${user._id})`);
  }

  // ── 2. Upsert loyalty card ──────────────────────────────────────────────────
  let card = await LoyaltyCard.findOne({ userId: user._id });

  if (card) {
    console.log('ℹ️   Loyalty card exists — refreshing points & tier …');
    card.tier   = LOYALTY.tier;
    card.points = LOYALTY.points;
    card.pointsHistory = LOYALTY.history.map(h => ({ ...h }));
    await card.save();
    console.log(`✅  Loyalty card updated  (${card.cardNumber})`);
  } else {
    card = await LoyaltyCard.create({
      userId:        user._id,
      cardNumber:    generateCardNumber(SEELE.name),
      tier:          LOYALTY.tier,
      points:        LOYALTY.points,
      pointsHistory: LOYALTY.history.map(h => ({ ...h })),
      isActive:      true,
    });
    console.log(`✅  Loyalty card created  (${card.cardNumber})`);
  }

  // ── 3. Summary ──────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────────');
  console.log('  🪪  LOGIN CREDENTIALS (Seele)');
  console.log('─────────────────────────────────────────────');
  console.log(`  Email    : ${SEELE.email}`);
  console.log(`  Password : ${SEELE.password}`);
  console.log(`  Tier     : ${LOYALTY.tier}  (${LOYALTY.points} pts)`);
  console.log(`  Card No. : ${card.cardNumber}`);
  console.log('─────────────────────────────────────────────\n');

  await mongoose.disconnect();
  console.log('🏁  Done.\n');
}

seed().catch(err => {
  console.error('❌  Seed failed:', err.message);
  process.exit(1);
});
