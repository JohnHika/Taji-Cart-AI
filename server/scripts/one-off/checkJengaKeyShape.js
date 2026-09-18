/**
 * Simulates the common ways a PEM key gets mangled when pasted into a
 * dashboard env-var field, and shows which mangling produces exactly
 * "error:1E08010C:DECODER routines::unsupported". Reference-only diagnostic:
 * reads the LOCAL .env, prints nothing sensitive.
 *
 * Usage: node scripts/one-off/checkJengaKeyShape.js --simulate
 */
import 'dotenv/config';
import crypto from 'crypto';

const raw = process.env.JENGA_PRIVATE_KEY;
if (!raw) { console.error('JENGA_PRIVATE_KEY is not set locally'); process.exit(1); }

const variants = {
  'clean-local (what works locally)': raw,
  'newlines-stripped (single line)': raw.replace(/\n/g, ''),
  'newlines-collapsed-to-spaces': raw.replace(/\n/g, ' '),
  'literal-\\n-instead-of-newlines': raw.replace(/\n/g, '\\n'),
  'crlf-line-endings': raw.replace(/\n/g, '\r\n'),
  'wrapped-in-quotes': '"' + raw + '"',
  'truncated-tail (chars cut off)': raw.slice(0, -104) + '\n-----END PRIVATE KEY-----\n',
  'blank-line-inserted': raw.replace(/\n/g, '\n\n'),
  'url-encoded-%0A': raw.replace(/\n/g, '%0A'),
};

for (const [name, key] of Object.entries(variants)) {
  try {
    crypto.createPrivateKey(key);
    console.log('OK   :', name);
  } catch (e) {
    console.log('FAIL :', name, '->', e.message);
  }
}

// Show which normalization repairs which failure mode:
console.log('--- normalization cross-check (repair table) ---');
const normalizers = {
  'app current: literal-\\n -> newline': (k) => k.replace(/\\n/g, '\n'),
  'trim+unquote': (k) => k.trim().replace(/^["\']|["\']$/g, ''),
  'full-normalize (trim/unquote/\\r\\n/\\n/%0A)': (k) => k.trim().replace(/^["\']|["\']$/g, '')
    .replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n')
    .stripCRLFHack || k,
};
// (fix the accidental placeholder above with a real function)
normalizers['full-normalize (trim/unquote/\\r\\n/\\n/%0A)'] = (k) => k
  .trim().replace(/^["']|["']$/g, '')
  .replace(/\\r\\n/g, '\n')
  .replace(/\\n/g, '\n')
  .replace(/\r\n/g, '\n')
  .replace(/\r/g, '\n')
  .replace(/%0A/gi, '\n');

for (const [normName, normFn] of Object.entries(normalizers)) {
  for (const [variantName, key] of Object.entries(variants)) {
    try {
      crypto.createPrivateKey(normFn(key));
      console.log(`OK   : [${normName}] x [${variantName}]`);
    } catch (e) {
      console.log(`FAIL : [${normName}] x [${variantName}] -> ${e.message}`);
    }
  }
}