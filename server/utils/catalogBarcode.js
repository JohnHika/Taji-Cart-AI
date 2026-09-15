import CatalogSequenceModel from '../models/catalogSequence.model.js';
import ProductModel from '../models/product.model.js';

export const PRODUCT_BARCODE_SEQUENCE_KEY = 'product-barcode';
export const PRODUCT_BARCODE_PREFIX = 'NWH-';
export const PRODUCT_BARCODE_MIN_DIGITS = 6;

// JsBarcode's CODE128 encoder supports printable ASCII only. Rejecting other
// values at the catalog boundary prevents one malformed supplier code from
// aborting the entire printable label sheet.
export const isCode128BarcodeValue = (value) => /^[\x20-\x7E]+$/.test(String(value || ''));

// NWH-* is the system-managed sequence namespace. Supplier labels must use
// their own barcode value so automatic assignment can never be claimed by a
// manually entered code.
export const isNawiriBarcodeNamespace = (value) => /^NWH-/i.test(String(value || '').trim());

export const formatProductBarcode = (sequence) => {
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new TypeError('Product barcode sequence must be a positive safe integer');
  }

  return `${PRODUCT_BARCODE_PREFIX}${String(sequence).padStart(PRODUCT_BARCODE_MIN_DIGITS, '0')}`;
};

export const parseGeneratedProductBarcode = (value) => {
  const match = new RegExp(`^${PRODUCT_BARCODE_PREFIX}(\\d+)$`, 'i').exec(String(value || '').trim());
  if (!match) return null;

  const sequence = Number(match[1]);
  return Number.isSafeInteger(sequence) && sequence >= 1 ? sequence : null;
};

const sequenceOptions = (session) => ({
  new: true,
  upsert: true,
  setDefaultsOnInsert: true,
  ...(session ? { session } : {}),
});

/**
 * Atomically reserves the next scan-safe Nawiri Hair product barcode.
 * The sequence is separate from Mongo ObjectIds, so it remains short,
 * printable, and stable even when a product is edited.
 */
export const reserveNextProductBarcode = async ({ session } = {}) => {
  // A historical direct import could already contain a generated-namespace
  // value. Advance atomically, then skip it instead of failing product creation.
  while (true) {
    const sequence = await CatalogSequenceModel.findOneAndUpdate(
      { key: PRODUCT_BARCODE_SEQUENCE_KEY },
      {
        $inc: { value: 1 },
        $setOnInsert: { key: PRODUCT_BARCODE_SEQUENCE_KEY },
      },
      sequenceOptions(session),
    );
    const barcode = formatProductBarcode(sequence.value);
    const existingBarcode = await ProductModel.exists({ barcode })
      .collation({ locale: 'en', strength: 2 });

    if (!existingBarcode) {
      return barcode;
    }
  }
};

/**
 * Advances the persisted sequence without ever moving it backwards.
 * Used by the one-time catalog backfill before future products allocate codes.
 */
export const ensureProductBarcodeSequenceAtLeast = async (value, { session } = {}) => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError('Product barcode sequence floor must be a non-negative safe integer');
  }

  return CatalogSequenceModel.findOneAndUpdate(
    { key: PRODUCT_BARCODE_SEQUENCE_KEY },
    {
      $max: { value },
      $setOnInsert: { key: PRODUCT_BARCODE_SEQUENCE_KEY },
    },
    sequenceOptions(session),
  );
};
