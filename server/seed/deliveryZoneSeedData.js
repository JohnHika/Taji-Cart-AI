/**
 * Bike Delivery — Zone Fare Chart Seed Script
 *
 * Populates DeliveryZoneModel with the flat-fare zones used by the bike
 * rider partner, grouped by corridor. Idempotent: existing zones (matched
 * by name) are skipped.
 *
 * Usage:
 *   cd server
 *   node seed/deliveryZoneSeedData.js
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';

import DeliveryZoneModel from '../models/deliveryzone.model.js';

dotenv.config();

async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');
}

async function upsertZone(name, corridor, fare) {
  const existing = await DeliveryZoneModel.findOne({ name, corridor });
  if (existing) {
    console.log(`  ↩  Zone already exists: ${corridor} / ${name}`);
    return existing;
  }
  const doc = await DeliveryZoneModel.create({ name, corridor, fare });
  console.log(`  ✔  Created zone: ${corridor} / ${name} — KES ${fare}`);
  return doc;
}

// ── Fare chart data ─────────────────────────────────────────────────────────
// Transcribed from "The Quicker Rider & Logistics" fare chart.

const ZONES = [
  // Town Service
  ['Town Service', 'Parcel Sending', 100],
  ['Town Service', 'CBD', 100],
  ['Town Service', 'Kamukunji', 200],
  ['Town Service', 'Gikomba', 250],

  // Waiyaki Way
  ['Waiyaki Way', 'Parklands', 300],
  ['Waiyaki Way', 'Westlands', 300],
  ['Waiyaki Way', 'Museum Hill', 250],
  ['Waiyaki Way', 'Sarit Center', 300],
  ['Waiyaki Way', 'The Oval', 300],
  ['Waiyaki Way', 'Safaricom', 400],
  ['Waiyaki Way', 'ABC Place', 400],
  ['Waiyaki Way', 'Kangemi', 450],
  ['Waiyaki Way', 'Loresho', 500],
  ['Waiyaki Way', 'Mountain View', 500],
  ['Waiyaki Way', 'Upper Kabete', 500],
  ['Waiyaki Way', 'Lower Kabete', 600],
  ['Waiyaki Way', 'Uthiru', 600],
  ['Waiyaki Way', 'Kinoo', 600],
  ['Waiyaki Way', 'Muthiga', 800],
  ['Waiyaki Way', 'Gitaru', 800],
  ['Waiyaki Way', 'Kikuyu', 1000],

  // Argwings Kodhek
  ['Argwings Kodhek', 'Valley Road', 300],
  ['Argwings Kodhek', 'Hurlingham', 300],
  ['Argwings Kodhek', 'Kilimani', 300],
  ['Argwings Kodhek', 'Valley Arcade', 400],
  ['Argwings Kodhek', 'Lavington', 400],
  ['Argwings Kodhek', 'Kawangware', 500],

  // Thika Road
  ['Thika Road', 'Ngara', 250],
  ['Thika Road', 'Kariokor', 250],
  ['Thika Road', 'Pangani', 300],
  ['Thika Road', 'Muthaiga', 300],
  ['Thika Road', 'Eastleigh', 350],
  ['Thika Road', 'NYS', 300],
  ['Thika Road', 'Survey', 300],
  ['Thika Road', 'Utalii', 300],
  ['Thika Road', 'Allsoaps', 300],
  ['Thika Road', 'Roasters', 400],
  ['Thika Road', 'Garden City', 400],
  ['Thika Road', 'Safari Park', 400],
  ['Thika Road', 'TRM', 400],
  ['Thika Road', 'Roysambu', 500],
  ['Thika Road', 'Ruiru Bypass', 800],
  ['Thika Road', 'Ruiru Town', 800],
  ['Thika Road', 'Baba Ndogo', 500],
  ['Thika Road', 'Zimmerman', 500],
  ['Thika Road', 'Kasarani', 500],
  ['Thika Road', 'Githurai 44/45', 600],
  ['Thika Road', 'Kahawa West', 700],
  ['Thika Road', 'Kahawa Sukari', 700],
  ['Thika Road', 'Ruiru', 800],
  ['Thika Road', 'Juja', 1200],
  ['Thika Road', 'Thika Town', 1500],

  // Ngong Road
  ['Ngong Road', 'Milimani', 300],
  ['Ngong Road', 'Upper Hill', 300],
  ['Ngong Road', 'Traffic Area', 300],
  ['Ngong Road', 'KNH', 300],
  ['Ngong Road', 'Nairobi Hospital', 300],
  ['Ngong Road', 'Daystar University', 300],
  ['Ngong Road', 'Coptic Hospital', 300],
  ['Ngong Road', 'Prestige', 300],
  ['Ngong Road', 'Adams Arcade', 350],
  ['Ngong Road', 'Junction Mall', 450],
  ['Ngong Road', 'Jamhuri', 500],
  ['Ngong Road', 'Kibera', 400],
  ['Ngong Road', 'Dagoretti', 500],
  ['Ngong Road', 'Show Ground', 500],
  ['Ngong Road', 'Race Course', 500],
  ['Ngong Road', 'The Hub', 700],
  ['Ngong Road', 'Karen Kararapon', 1000],
  ['Ngong Road', 'Shade Hotel', 700],
  ['Ngong Road', 'Bulbul', 800],
  ['Ngong Road', 'Ngong Town', 1300],
  ['Ngong Road', 'Kiserian', 1500],
  ['Ngong Road', 'Riara Road', 400],

  // Kiambu Road
  ['Kiambu Road', 'Ridgeways', 400],
  ['Kiambu Road', 'Runda (Paradise Lost)', 500],
  ['Kiambu Road', 'Fourways', 400],
  ['Kiambu Road', 'Paradise Lost', 500],
  ['Kiambu Road', 'Quickmart', 500],
  ['Kiambu Road', 'Thindigua', 500],
  ['Kiambu Road', 'Kiambu', 700],

  // Thika Road (second block on chart)
  ['Kiambu Road', 'Zimmerman', 500],
  ['Kiambu Road', 'Kasarani', 500],
  ['Kiambu Road', 'Githurai 44/45', 600],
  ['Kiambu Road', 'Kahawa West', 700],
  ['Kiambu Road', 'Kahawa Sukari', 700],
  ['Kiambu Road', 'Ruiru', 800],
  ['Kiambu Road', 'Juja', 1200],
  ['Kiambu Road', 'Thika Town', 1500],

  // Mombasa Road
  ['Mombasa Road', 'Nyayo Stadium', 300],
  ['Mombasa Road', 'South B', 300],
  ['Mombasa Road', 'Capital Center', 300],
  ['Mombasa Road', 'South C', 350],
  ['Mombasa Road', 'Belle View', 350],
  ['Mombasa Road', 'Airtel', 350],
  ['Mombasa Road', 'DTB', 350],
  ['Mombasa Road', 'Sameer Park', 400],
  ['Mombasa Road', 'Panari', 400],
  ['Mombasa Road', 'GM', 400],
  ['Mombasa Road', 'Industrial Area', 400],
  ['Mombasa Road', 'Imara Daima', 450],
  ['Mombasa Road', 'Cabanas', 500],
  ['Mombasa Road', 'Pipeline', 500],
  ['Mombasa Road', 'Nyanyo Estate', 500],
  ['Mombasa Road', 'Utawala Upto Benedicta', 800],
  ['Mombasa Road', 'JKIA', 600],
  ['Mombasa Road', 'Syokimau', 700],
  ['Mombasa Road', 'SGR', 600],
  ['Mombasa Road', 'Mlolongo', 1000],
  ['Mombasa Road', 'Athi River (Upto Devki)', 1200],
  ['Mombasa Road', 'Athi River (Past Devki)', 1500],
  ['Mombasa Road', 'Kitengela', 1500],

  // Ngara Rd & Limuru Road
  ['Ngara Rd & Limuru Road', 'Fig Tree', 250],
  ['Ngara Rd & Limuru Road', 'Jamhuri Sec School', 250],
  ['Ngara Rd & Limuru Road', 'Stima Plaza', 250],
  ['Ngara Rd & Limuru Road', 'Highridge', 300],
  ['Ngara Rd & Limuru Road', 'City Park', 300],
  ['Ngara Rd & Limuru Road', 'Muthaiga Mini', 300],
  ['Ngara Rd & Limuru Road', 'Karura Forest', 300],
  ['Ngara Rd & Limuru Road', 'UN Gigiri', 500],
  ['Ngara Rd & Limuru Road', 'Village Market', 500],
  ['Ngara Rd & Limuru Road', 'Runda', 500],
  ['Ngara Rd & Limuru Road', 'Ruaka', 500],

  // Langata Road
  ['Langata Road', 'Highway Mall', 300],
  ['Langata Road', 'Nairobi West', 300],
  ['Langata Road', 'Madaraka', 300],
  ['Langata Road', 'T-Mall', 300],
  ['Langata Road', 'Wilson Airport', 350],
  ['Langata Road', 'Carnivore', 400],
  ['Langata Road', 'Langata', 400],
  ['Langata Road', 'St Mary Hospital', 400],
  ['Langata Road', 'Otiende', 400],
  ['Langata Road', 'Bomas', 500],
  ['Langata Road', 'Galleria Park', 500],
  ['Langata Road', 'Giraffe Park', 500],
  ['Langata Road', 'JKUAT Karen', 700],
  ['Langata Road', 'Hardy', 800],
  ['Langata Road', 'Karen Hospital', 700],
  ['Langata Road', 'Ongata Rongai', 900],
  ['Langata Road', 'Kiserian', 1500],
  ['Langata Road', 'Gataka', 1100],

  // Jogoo Road
  ['Jogoo Road', 'City Stadium', 300],
  ['Jogoo Road', 'Burma', 300],
  ['Jogoo Road', 'Shauri Moyo', 300],
  ['Jogoo Road', 'Bahati', 400],
  ['Jogoo Road', 'Huruma', 400],
  ['Jogoo Road', 'Kariobangi', 400],
  ['Jogoo Road', 'Buruburu', 400],
  ['Jogoo Road', 'Donholm', 500],
  ['Jogoo Road', 'Umoja', 500],
  ['Jogoo Road', 'Kayole', 600],
  ['Jogoo Road', 'Komarock', 600],
  ['Jogoo Road', 'Saika', 700],
  ['Jogoo Road', 'Dandora', 500],
  ['Jogoo Road', 'Ruai', 800],
  ['Jogoo Road', 'Chokaa', 700],
  ['Jogoo Road', 'Kamulu', 1000],
  ['Jogoo Road', 'Joska', 1500],
];

async function run() {
  await connectDB();

  console.log(`\nSeeding ${ZONES.length} delivery zones...\n`);
  for (const [corridor, name, fare] of ZONES) {
    await upsertZone(name, corridor, fare);
  }

  console.log('\n✅ Delivery zone seed complete.');
  await mongoose.disconnect();
}

run().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
