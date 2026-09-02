// Seeds one admin user directly into the scratch test database used for the
// feature-flag lifecycle test. Run: node scripts/seed_ff_test_admin.mjs
import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// CLI arg wins over server/.env — this script is only ever run against a
// throwaway local test DB, never Atlas.
const uri = process.argv[2];
if (!uri || !uri.includes('localhost') && !uri.includes('127.0.0.1')) {
  console.error('SAFETY: refusing to seed — pass the localhost test DB URI as argv[2]');
  process.exit(1);
}

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  avatar: { type: String, default: '' },
  mobile: { type: String, default: '' },
  refresh_token: { type: String, default: '' },
  verify_email: { type: Boolean, default: false },
  last_login_date: { type: Date, default: null },
  status: { type: String, default: 'Active' },
  isAdmin: { type: Boolean, default: false },
  role: { type: String, default: 'admin' },
  authType: { type: String, default: 'local' },
}, { timestamps: true });

const UserModel = mongoose.model('User', userSchema);

await mongoose.connect(uri);
await UserModel.deleteMany({ email: 'ff-test-admin@nawiri.test' });
await UserModel.create({
  name: 'FF Test Admin',
  email: 'ff-test-admin@nawiri.test',
  password: await bcryptjs.hash('FFtest1234!', 10),
  isAdmin: true,
  role: 'admin',
  verify_email: true,
  status: 'Active',
});
console.log('seeded admin: ff-test-admin@nawiri.test / FFtest1234!');
await mongoose.disconnect();