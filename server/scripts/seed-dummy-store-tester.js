/**
 * Seed: dummy admin account for local Store Intelligence testing.
 * Not a real staff member -- created purely to click through the new
 * store.nawirihairke.com screens without using a real admin's credentials.
 * Safe to delete after testing (see DELETE instructions printed at the end).
 * Run: node server/scripts/seed-dummy-store-tester.js
 */

import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../server/.env') });

// Inline schema (avoids circular imports), same fields the real user.model.js
// defines that matter for admin auth -- mirrors server/scripts/seed-seele.js.
const userSchema = new mongoose.Schema({
  name:            { type: String, required: true },
  email:           { type: String, required: true, unique: true },
  password:        { type: String },
  verify_email:    { type: Boolean, default: false },
  status:          { type: String, enum: ['Active', 'Inactive', 'Suspended'], default: 'Active' },
  isAdmin:         { type: Boolean, default: false },
  role:            { type: String, enum: ['user', 'admin', 'delivery', 'staff'], default: 'user' },
  authType:        { type: String, default: 'local' },
}, { timestamps: true });

const User = mongoose.models.user || mongoose.model('user', userSchema);

const DUMMY = {
  name: 'Store Intel Dummy Tester',
  email: 'dummy.storetester@nawiri-test.invalid',
  password: 'DummyStoreTester@2026',
  verify_email: true,
  status: 'Active',
  role: 'admin',
  isAdmin: true,
  authType: 'local',
};

async function seed() {
  console.log('\nSeeding dummy Store Intelligence tester account...\n');

  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set in .env'); process.exit(1); }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const salt = await bcryptjs.genSalt(10);
  const hashed = await bcryptjs.hash(DUMMY.password, salt);

  let user = await User.findOne({ email: DUMMY.email });
  if (user) {
    console.log('Dummy tester already exists -- refreshing credentials.');
    Object.assign(user, DUMMY, { password: hashed });
    await user.save();
  } else {
    user = await User.create({ ...DUMMY, password: hashed });
    console.log('Dummy tester created.');
  }

  console.log('\n-----------------------------------------------');
  console.log('  DUMMY ADMIN LOGIN (Store Intelligence testing)');
  console.log('-----------------------------------------------');
  console.log(`  Email    : ${DUMMY.email}`);
  console.log(`  Password : ${DUMMY.password}`);
  console.log(`  User id  : ${user._id}`);
  console.log('-----------------------------------------------');
  console.log('  To remove this account afterward, run:');
  console.log(`  node -e "require('mongoose').connect(process.env.MONGODB_URI).then(async m=>{await m.connection.collection('users').deleteOne({email:'${DUMMY.email}'});process.exit(0)})"`);
  console.log('-----------------------------------------------\n');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
