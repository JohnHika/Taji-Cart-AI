/**
 * sendTestEmails.js
 * Run from the server directory: node scripts/sendTestEmails.js
 *
 * Sends one live email for each of the 5 template types to the configured address,
 * so you can see exactly how each design looks in a real inbox.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import sendEmail from '../config/sendEmail.js';
import verifyEmailTemplate from '../utils/verifyEmailTemplate.js';
import forgotPasswordTemplate from '../utils/forgotPasswordTemplate.js';
import { renderOrderDispatchEmail } from '../utils/orderDispatchTemplate.js';
import { renderOrderStatusEmail } from '../utils/orderStatusTemplate.js';
import { renderLoyaltyPointsEmail } from '../utils/loyaltyPointsTemplate.js';
import { nawiriBrand } from '../utils/brand.js';

const TEST_EMAIL = 'johnkimani576@gmail.com';
const TEST_NAME = 'John Kimani';
const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://nawirihairke.com').replace(/\/$/, '');

const emails = [
  {
    label: '1. Email Verification (Welcome)',
    subject: `[TEST] Verify your Nawiri Hair Kenya email address`,
    html: verifyEmailTemplate({
      name: TEST_NAME,
      url: `${FRONTEND_URL}/verify-email?token=SAMPLE_TOKEN_123&email=${encodeURIComponent(TEST_EMAIL)}`,
    }),
  },
  {
    label: '2. Password Reset (OTP)',
    subject: `[TEST] Reset your Nawiri Hair Kenya password`,
    html: forgotPasswordTemplate({
      name: TEST_NAME,
      otp: '847291',
    }),
  },
  {
    label: '3. Order Placed / Dispatched',
    subject: `[TEST] Your Nawiri Hair Kenya order is confirmed`,
    html: renderOrderDispatchEmail({
      name: TEST_NAME,
      orderId: 'ORD-TEST-20260408',
      total: 'KES 4,500',
      fulfillmentType: 'Delivery',
      ctaLabel: 'View My Order',
      ctaUrl: `${FRONTEND_URL}/orders`,
    }),
  },
  {
    label: '4. Order Status — Shipped',
    subject: `[TEST] Your order is on its way — Nawiri Hair Kenya`,
    html: renderOrderStatusEmail({
      name: TEST_NAME,
      orderId: 'ORD-TEST-20260408',
      status: 'shipped',
      ctaLabel: 'Track My Order',
      ctaUrl: `${FRONTEND_URL}/orders`,
    }),
  },
  {
    label: '5. Loyalty Points Earned (Silver Tier Upgrade)',
    subject: `[TEST] You've been upgraded to Silver — Nawiri Hair Kenya`,
    html: renderLoyaltyPointsEmail({
      name: TEST_NAME,
      pointsEarned: 45,
      totalPoints: 512,
      tier: 'Silver',
      tierUpgraded: true,
      ctaLabel: 'View My Rewards',
      ctaUrl: `${FRONTEND_URL}/dashboard`,
    }),
  },
];

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const run = async () => {
  console.log(`\n📧  Nawiri Hair Kenya — Email Template Test Runner`);
  console.log(`   Sending ${emails.length} test emails to: ${TEST_EMAIL}\n`);

  for (const [i, mail] of emails.entries()) {
    try {
      await sendEmail({ sendTo: TEST_EMAIL, subject: mail.subject, html: mail.html });
      console.log(`   ✅  ${mail.label}`);
    } catch (err) {
      console.error(`   ❌  ${mail.label}`);
      console.error(`       ${err.message}\n`);
    }

    if (i < emails.length - 1) {
      await delay(1200); // small gap to avoid rate limiting
    }
  }

  console.log(`\n   Done! Check the inbox at ${TEST_EMAIL}\n`);
};

run();
