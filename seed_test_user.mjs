import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, 'server', '.env') });

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

const TEST_EMAIL = 'admin@nawiri.test';
const TEST_PASS  = 'Admin1234!';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const salt = await bcryptjs.genSalt(10);
  const hash = await bcryptjs.hash(TEST_PASS, salt);

  const result = await UserModel.findOneAndUpdate(
    { email: TEST_EMAIL },
    {
      name: 'Admin Test',
      email: TEST_EMAIL,
      password: hash,
      verify_email: true,
      status: 'Active',
      isAdmin: true,
      role: 'admin',
      authType: 'local',
    },
    { upsert: true, new: true }
  );

  console.log(`\n🎉 Test admin seeded!`);
  console.log(`   Email:    ${TEST_EMAIL}`);
  console.log(`   Password: ${TEST_PASS}`);
  console.log(`   Role:     admin`);
  console.log(`   _id:      ${result._id}`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
