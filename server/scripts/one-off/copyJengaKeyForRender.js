/**
 * Copies the Jenga RSA private key from server/.env to the Windows clipboard
 * in dashboard-paste-safe format: a SINGLE line with literal \n sequences,
 * which server/config/jenga.js normalizes back into a real PEM. Prints only
 * metadata — never the key material.
 *
 * Usage: node scripts/one-off/copyJengaKeyForRender.js
 */
import 'dotenv/config';
import { execSync } from 'child_process';

const raw = process.env.JENGA_PRIVATE_KEY;
if (!raw) {
  console.error('JENGA_PRIVATE_KEY is not set in server/.env');
  process.exit(1);
}

const singleLine = raw
  .trim()
  .replace(/^["']|["']$/g, '')
  .replace(/\r\n/g, '\\n')
  .replace(/\n/g, '\\n');

execSync('clip', { input: singleLine });

console.log(`Copied to clipboard: ${singleLine.length} chars (source ${raw.length}), header ${(raw.match(/-----BEGIN [^-]+-----/) || ['?'])[0]}`);
console.log('Next: Render Dashboard -> taji-cart-api -> Environment -> JENGA_PRIVATE_KEY -> clear the field -> paste -> Save (auto-redeploys).');