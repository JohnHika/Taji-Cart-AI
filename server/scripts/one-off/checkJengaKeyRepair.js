/**
 * Verifies server/config/jenga.js getPrivateKey repairs every common
 * paste-damage mode, using the real local key as the fixture. Prints only
 * OK/FAIL lines — never key material.
 *
 * Usage: node scripts/one-off/checkJengaKeyRepair.js
 */
import dotenv from 'dotenv';
dotenv.config({ path: new URL('../../.env', import.meta.url) });
const { signStkPushRequest } = await import('../../config/jenga.js');

const real = process.env.JENGA_PRIVATE_KEY;
if (!real) { console.error('JENGA_PRIVATE_KEY missing locally'); process.exit(1); }

const damaged = {
  'clean (control)': real,
  'single-line literal-\\n': real.replace(/\n/g, '\\n'),
  'crlf line endings': real.replace(/\n/g, '\r\n'),
  'quotes-wrapped': '"' + real + '"',
  'url-encoded %0A': real.replace(/\n/g, '%0A'),
  'spaces-instead-of-newlines': real.replace(/\n/g, ' '),
  'blank-lines-inserted': real.replace(/\n/g, '\n\n'),
  'truncated (unrecoverable by design)': real.slice(0, -104),
};

const sigArgs = {
  accountNumber: '1740187734034',
  ref: 'TEST-REF-1',
  mobileNumber: '254700000000',
  telco: 'SAFARICOM',
  amount: '1.00',
  currency: 'KES',
};

let unexpectedFailures = 0;
for (const [name, key] of Object.entries(damaged)) {
  process.env.JENGA_PRIVATE_KEY = key;
  try {
    const sig = signStkPushRequest(sigArgs);
    console.log(`OK   : ${name} (signature ${sig.length} b64 chars)`);
  } catch (err) {
    const expected = name.startsWith('truncated');
    if (!expected) unexpectedFailures++;
    console.log(`${expected ? 'OK*  ' : 'FAIL :'} ${name} -> ${String(err.message).slice(0, 90)}`);
  }
}

// Restore the real key for any subsequent calls in this process.
process.env.JENGA_PRIVATE_KEY = real;
if (unexpectedFailures > 0) process.exit(1);