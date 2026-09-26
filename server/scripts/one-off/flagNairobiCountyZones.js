/**
 * Sets deliveryZone.inNairobiCounty for the existing delivery zones, which
 * decides where Pay on Delivery is offered for bike deliveries.
 *
 * Every zone is inside Nairobi County except the ones listed below. The list
 * was checked against OpenStreetMap's Nairobi County boundary on 2026-09-26.
 * Zones that straddle the border (Githurai 44/45) or couldn't be placed
 * (Fourways) are treated as outside; staff can switch any zone on the
 * Delivery Zones admin page.
 *
 * Border zones re-checked against published sources on 2026-09-26 (Nation,
 * Wikipedia, county ward maps) — all current flags confirmed correct:
 *   Githurai 44/45 — the zone name spans both banks of Thika Superhighway:
 *     Githurai 44 is Nairobi (Roysambu/Kasarani side), 45 is Kiambu (Ruiru).
 *     Kept OUTSIDE: pay-upfront is the safe call for a straddling zone.
 *   Fourways (Junction) — Kiambu County, Kiambaa constituency, despite the
 *     "Nairobi" in estate marketing. Correctly outside.
 *   Kamulu — Nairobi City County, Ruai ward (Njiru sub-county). Neighbouring
 *     Joska is Machakos. Correctly inside.
 *   Uthiru — straddles the border, but the Uthiru/Ruthimitu ward is Dagoretti
 *     South, Nairobi. Inside stands.
 *   Upper Kabete — borderline (most directories place it in Westlands/
 *     Kitisuru, Nairobi; a few say Kiambu). Inside stands; flip it in the
 *     admin if riders report it falling outside the boundary.
 *
 * Usage:
 *   node scripts/one-off/flagNairobiCountyZones.js           # dry run
 *   node scripts/one-off/flagNairobiCountyZones.js --apply   # make changes
 */
import dotenv from 'dotenv';
dotenv.config({ path: new URL('../../.env', import.meta.url) });
import mongoose from 'mongoose';

const OUTSIDE_NAIROBI_COUNTY = new Set([
  // Kiambu
  'Thindigua', 'Paradise Lost', 'Runda (Paradise Lost)', 'Quickmart', 'Fourways', 'Githurai 44/45',
  'Kiambu', 'Kahawa Sukari', 'Ruiru', 'Ruiru Town', 'Ruiru Bypass', 'Juja', 'Thika Town', 'Ruaka',
  'Kinoo', 'Gitaru', 'Muthiga', 'Kikuyu',
  // Kajiado
  'Ongata Rongai', 'Gataka', 'Kiserian', 'Bulbul', 'Karen Kararapon', 'Ngong Town', 'Kitengela',
  // Machakos
  'Joska', 'Syokimau', 'Mlolongo', 'Athi River (Upto Devki)', 'Athi River (Past Devki)',
  // Dropped at a parcel office for sending on — nobody there to pay
  'Parcel Sending',
]);

const apply = process.argv.includes('--apply');

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
const zones = mongoose.connection.db.collection('deliveryzones');

const all = await zones.find({}).project({ name: 1, corridor: 1, inNairobiCounty: 1 }).toArray();
const unknownNames = [...OUTSIDE_NAIROBI_COUNTY].filter((name) => !all.some((zone) => zone.name === name));
if (unknownNames.length > 0) {
  console.warn(`Listed as outside but no zone has this name: ${unknownNames.join(', ')}`);
}

let changes = 0;
for (const zone of all) {
  const inside = !OUTSIDE_NAIROBI_COUNTY.has(zone.name);
  if (zone.inNairobiCounty === inside) continue;
  changes += 1;
  if (!inside) console.log(`  outside: ${zone.corridor} | ${zone.name}`);
  if (apply) await zones.updateOne({ _id: zone._id }, { $set: { inNairobiCounty: inside } });
}

const outsideCount = all.filter((zone) => OUTSIDE_NAIROBI_COUNTY.has(zone.name)).length;
console.log(`${apply ? 'APPLIED' : 'DRY RUN'} — ${all.length} zones: ${all.length - outsideCount} inside Nairobi County, ${outsideCount} outside; ${changes} to update.`);
await mongoose.disconnect();
