// multer's fileFilter only sees the filename/declared mimetype while the
// upload is still streaming in — it can't inspect real file content. A
// renamed file (e.g. a script saved as photo.jpg) would sail through that
// check. This inspects the actual leading bytes of the uploaded buffer
// against known image format signatures, so the extension claim can't be
// used to smuggle a mismatched file type past validation.
const SIGNATURES = [
  { format: 'jpeg', bytes: [0xff, 0xd8, 0xff] },
  { format: 'png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { format: 'gif', bytes: [0x47, 0x49, 0x46, 0x38] }, // GIF87a / GIF89a
];

const matchesSignature = (buffer, bytes) =>
  bytes.every((byte, index) => buffer[index] === byte);

const isWebp = (buffer) =>
  buffer.length >= 12 &&
  buffer.toString('ascii', 0, 4) === 'RIFF' &&
  buffer.toString('ascii', 8, 12) === 'WEBP';

const FTYP_IMAGE_BRANDS = new Set([
  'heic', 'heif', 'heix', 'hevc', 'hevx', 'mif1', 'msf1',
  'avif', 'avis',
]);

const isFtypImage = (buffer) => {
  if (!buffer || buffer.length < 16 || buffer.toString('ascii', 4, 8) !== 'ftyp') {
    return false;
  }

  for (let offset = 8; offset + 4 <= buffer.length; offset += 4) {
    if (FTYP_IMAGE_BRANDS.has(buffer.toString('ascii', offset, offset + 4))) {
      return true;
    }
  }
  return false;
};

const isValidImageBuffer = (buffer) => {
  if (!buffer || buffer.length < 12) return false;
  if (isWebp(buffer) || isFtypImage(buffer)) return true;
  return SIGNATURES.some(({ bytes }) => matchesSignature(buffer, bytes));
};

export default isValidImageBuffer;
