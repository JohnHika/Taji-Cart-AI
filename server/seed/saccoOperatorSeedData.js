/**
 * Matatu SACCO / Coach Parcel Operators — Seed Script
 *
 * Populates SaccoOperatorModel with matatu SACCOs and long-distance coach
 * operators that run their own parcel/courier service. Used by the
 * "Send via SACCO" fulfillment option: customer drops a parcel at the
 * operator's Nairobi terminal, receiver collects it at the destination town.
 * The operator's own parcel fee is paid directly to them, not through this
 * app. Idempotent: existing operators (matched by name) are skipped.
 *
 * Coverage/contact details are sourced from each operator's own site or
 * public reporting as of 2026 and should be re-verified periodically —
 * routes and terminals change.
 *
 * Usage:
 *   cd server
 *   node seed/saccoOperatorSeedData.js
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';

import SaccoOperatorModel from '../models/saccooperator.model.js';

dotenv.config();

async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');
}

async function upsertOperator(data) {
  const existing = await SaccoOperatorModel.findOne({ name: data.name });
  if (existing) {
    console.log(`  ↩  Already exists: ${data.name}`);
    return existing;
  }
  const doc = await SaccoOperatorModel.create(data);
  console.log(`  ✔  Created: ${data.name}`);
  return doc;
}

// ── Domestic matatu SACCOs with parcel service ──────────────────────────────

const DOMESTIC_OPERATORS = [
  {
    name: '2NK Sacco',
    type: 'matatu_sacco',
    destinationsServed: [
      'Nairobi', 'Nyeri', 'Nakuru', 'Karatina', 'Thika', 'Nanyuki', 'Nyahururu',
      'Kerugoya', 'Othaya', 'Naivasha', 'Embu', 'Eldoret', 'Bungoma', 'Kericho',
      'Kitale', 'Busia', 'Kisumu', 'Kakamega', 'Mumias', 'Nambale', 'Malaba',
      'Mombasa', 'Mtwapa', 'Ukunda', 'Diani', 'Voi', 'Mariakani', 'Mtito Andei',
      'Naromoru', 'Mukurweini', 'Majengo', 'Ruai',
    ],
    isCrossBorder: false,
    nairobiTerminal: 'Nairobi parcel office — see 2nksacco.co.ke for current address',
    contactPhone: '0706 235 260',
    notes: 'Widest domestic network of the matatu SACCOs; separate sending/receiving offices per town.',
  },
  {
    name: 'Super Metro',
    type: 'matatu_sacco',
    destinationsServed: [
      'Nairobi CBD', 'Thika', 'Juja', 'Roysambu', 'Westlands', 'Kikuyu',
      'Rongai', 'Ngong', 'Kitengela', 'Kahawa West', 'Kinoo', 'Malaa',
    ],
    isCrossBorder: false,
    nairobiTerminal: 'Multiple Nairobi metro stages — confirm nearest stage per route',
    contactPhone: '',
    notes: 'Nairobi metro-area coverage; parcel service alongside commuter routes.',
  },
  {
    name: 'County Link Sacco',
    type: 'matatu_sacco',
    destinationsServed: [
      'South B', 'Katani', 'Syokimau', 'Mlolongo', 'Jogoo Road', 'Kayole Junction',
      'Njiru', 'Ruai', 'Kamulu', 'Joska', 'Malaa', 'Kantafu', 'Koma',
    ],
    isCrossBorder: false,
    nairobiTerminal: 'Development House, 8th Floor, Room 811, Moi Avenue, Nairobi',
    contactPhone: '+254 727 445 182',
    notes: 'Nairobi/Machakos outskirts; advertises same-day delivery.',
  },
  {
    name: 'NortRift Sacco',
    type: 'matatu_sacco',
    destinationsServed: ['Nairobi', 'Nakuru', 'Eldoret', 'Kitale', 'Kimilili', 'Bungoma', 'Chwele'],
    isCrossBorder: false,
    nairobiTerminal: '',
    contactPhone: '',
    notes: 'Links Nairobi to Northern Rift Valley and former Western province towns.',
  },
  {
    name: 'Transline Classic',
    type: 'matatu_sacco',
    destinationsServed: ['Nairobi', 'Kisii'],
    isCrossBorder: false,
    nairobiTerminal: '',
    contactPhone: '',
    notes: 'Nairobi–Kisii route, passenger and parcel service.',
  },
  {
    name: 'Kinatwa Sacco',
    type: 'matatu_sacco',
    destinationsServed: ['Nairobi', 'Kitui', 'Machakos'],
    isCrossBorder: false,
    nairobiTerminal: '',
    contactPhone: '',
    notes: 'Serves Ukambani-bound routes from Nairobi.',
  },
  {
    name: 'Naekana Route 134 Sacco',
    type: 'matatu_sacco',
    destinationsServed: [
      'Nairobi', 'Kitengela', 'Isinya', 'Kajiado', 'Namanga', 'Mtito Andei',
      'Voi', 'Mombasa', 'Emali', 'Loitoktok', 'Taveta', 'Mbumbuni', 'Wote',
    ],
    isCrossBorder: false,
    nairobiTerminal: '',
    contactPhone: '',
    notes: 'Covers the Namanga corridor (bordering Tanzania) as well as the Mombasa road.',
  },
  {
    name: 'Makos Sacco',
    type: 'matatu_sacco',
    destinationsServed: ['Nairobi', 'Machakos', 'Kitui', 'Makueni'],
    isCrossBorder: false,
    nairobiTerminal: '',
    contactPhone: '',
    notes: '',
  },
  {
    name: 'Latema Sacco',
    type: 'matatu_sacco',
    destinationsServed: ['Nairobi CBD', 'Kabiria', 'Thika', 'Gachie', 'Westlands', 'Kikuyu'],
    isCrossBorder: false,
    nairobiTerminal: 'Tom Mboya Street (Latema Road) — parcel collection point',
    contactPhone: '',
    notes: 'Primarily urban/peri-urban Nairobi routes.',
  },
];

// ── Cross-border coach operators with parcel/courier service ───────────────

const CROSS_BORDER_OPERATORS = [
  {
    name: 'Tahmeed Coach',
    type: 'coach',
    destinationsServed: [
      'Nairobi', 'Mombasa', 'Kisumu', 'Kitale', 'Malaba', 'Kitui',
      'Kampala (Uganda)', 'Dar es Salaam (Tanzania)', 'Arusha (Tanzania)',
      'Tanga (Tanzania)', 'Moshi (Tanzania)',
    ],
    isCrossBorder: true,
    nairobiTerminal: 'Zahra Building, River Road, Nairobi (ground floor booking office)',
    contactPhone: '0703 414 754',
    notes: 'Dedicated parcel/courier line separate from ticket booking.',
  },
  {
    name: 'Modern Coast',
    type: 'coach',
    destinationsServed: [
      'Nairobi', 'Mombasa', 'Kampala (Uganda)', 'Kigali (Rwanda)',
      'Juba (South Sudan)', 'Dar es Salaam (Tanzania)',
    ],
    isCrossBorder: true,
    nairobiTerminal: '',
    contactPhone: '',
    notes: 'Runs a dedicated Modern Coast Courier division with online parcel tracking.',
  },
  {
    name: 'Simba Coach',
    type: 'coach',
    destinationsServed: [
      'Nairobi', 'Kampala (Uganda)', 'Jinja (Uganda)', 'Mbale (Uganda)',
      'Kigali (Rwanda)', 'Juba (South Sudan)',
    ],
    isCrossBorder: true,
    nairobiTerminal: 'River Road, Nairobi',
    contactPhone: '',
    notes: '',
  },
  {
    name: 'Mash Poa',
    type: 'coach',
    destinationsServed: ['Nairobi', 'Kenya (multiple towns)', 'Uganda', 'Tanzania', 'Rwanda'],
    isCrossBorder: true,
    nairobiTerminal: '',
    contactPhone: '',
    notes: '',
  },
];

async function run() {
  await connectDB();

  const all = [...DOMESTIC_OPERATORS, ...CROSS_BORDER_OPERATORS];
  console.log(`Seeding ${all.length} SACCO/coach parcel operators...`);
  for (const operator of all) {
    await upsertOperator(operator);
  }

  console.log('✅ SACCO operator seed complete');
  await mongoose.disconnect();
}

run().catch((error) => {
  console.error('❌ SACCO operator seed failed:', error);
  process.exit(1);
});
