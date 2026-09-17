/**
 * Safe pre-flight check before a live Jenga/Equity test: confirms the
 * configured credentials can authenticate against Jenga's auth endpoint.
 * Hits ONLY the authentication endpoint — never the STK push endpoint — so
 * this cannot trigger a real payment prompt or move any money.
 *
 * Run with: node server/scripts/one-off/checkJengaLiveAuth.js
 */

import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const { getAuthToken } = await import('../../config/jenga.js');

console.log(`JENGA_ENV: ${process.env.JENGA_ENV}`);
console.log(`Auth base URL: ${process.env.JENGA_ENV === 'production' ? 'https://api.finserve.africa' : 'https://uat.finserve.africa'}`);

try {
  const token = await getAuthToken();
  console.log(`SUCCESS: authenticated. Token acquired (${token.length} chars, not printed).`);
} catch (err) {
  console.error('FAILED:', err.response?.status, err.response?.data || err.message);
  process.exitCode = 1;
}
