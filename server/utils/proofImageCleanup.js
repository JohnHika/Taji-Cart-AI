import EndOfDay from '../models/endOfDay.model.js';
import Sale from '../models/sale.model.js';
import { deleteImageFromUrlCloudinary } from './uploadImageClodinary.js';

// Sweeps closed EndOfDay records whose proofDeletionDueAt has passed and
// deletes every Equity payment-proof image referenced in their transaction
// snapshot from Cloudinary. Also clears the matching proofImageUrl off the
// live Sale documents so a stale, now-broken URL doesn't linger there.
// Marks each processed EndOfDay as proofImagesDeleted so it's never swept
// twice, regardless of how many times this runs.
export const sweepExpiredProofImages = async () => {
  const dueRecords = await EndOfDay.find({
    proofDeletionDueAt: { $lte: new Date() },
    proofImagesDeleted: false
  });

  if (dueRecords.length === 0) return { processed: 0, imagesDeleted: 0 };

  let imagesDeleted = 0;

  for (const eod of dueRecords) {
    const urls = [...new Set(
      (eod.summary?.transactions || []).flatMap((t) => t.proofImageUrls || [])
    )];

    for (const url of urls) {
      const deleted = await deleteImageFromUrlCloudinary(url);
      if (deleted) imagesDeleted++;
    }

    // Clear the now-invalid URLs from the sale records they came from, so a
    // later receipt/report reprint doesn't try to load a deleted image.
    if (urls.length > 0) {
      await Sale.updateMany(
        { 'payments.proofImageUrl': { $in: urls } },
        { $set: { 'payments.$[proof].proofImageUrl': '' } },
        { arrayFilters: [{ 'proof.proofImageUrl': { $in: urls } }] }
      );
    }

    eod.proofImagesDeleted = true;
    await eod.save();
  }

  console.log(`Proof image cleanup: processed ${dueRecords.length} EOD record(s), deleted ${imagesDeleted} image(s).`);
  return { processed: dueRecords.length, imagesDeleted };
};

// Runs the sweep on an interval for the lifetime of the server process.
// A daily cadence is more than enough given the 3.5-day retention window —
// this only needs to catch up eventually, not fire precisely on the minute.
const SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000;

export const startProofImageCleanupSchedule = () => {
  sweepExpiredProofImages().catch((error) => {
    console.error('Proof image cleanup sweep failed:', error);
  });

  setInterval(() => {
    sweepExpiredProofImages().catch((error) => {
      console.error('Proof image cleanup sweep failed:', error);
    });
  }, SWEEP_INTERVAL_MS);
};
