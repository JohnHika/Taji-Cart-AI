// Registers the ai-style-tryon feature flag (admin-only preview) in the
// database the server points at. Safe to re-run — upsert by key.
// Usage: node scripts/seed_tryon_flag.mjs <mongodb-uri>
import mongoose from 'mongoose';

const uri = process.argv[2];
if (!uri) {
  console.error('Usage: node scripts/seed_tryon_flag.mjs <mongodb-uri>');
  process.exit(1);
}

const flagSchema = new mongoose.Schema({ key: String }, { strict: false });
const Flag = mongoose.model('featureFlag', flagSchema, 'featureflags');

await mongoose.connect(uri);
const res = await Flag.updateOne(
  { key: 'ai-style-tryon' },
  {
    $setOnInsert: {
      key: 'ai-style-tryon',
      name: 'AI Hairstyle Try-On',
      description: 'Generate photorealistic photos of a person wearing a catalog hairstyle (GPT Image 2, with a Gemini fallback). Admin preview while being refined.',
      status: 'admin-only',
      enabled: true,
    },
  },
  { upsert: true }
);
console.log(res.upsertedId ? 'Created flag ai-style-tryon (admin-only, enabled)' : 'Flag ai-style-tryon already exists — no change');
await mongoose.disconnect();