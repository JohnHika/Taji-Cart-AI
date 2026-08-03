import assert from 'node:assert/strict';
import test from 'node:test';
import { getRoyalCardMotion } from './royalCardMotion.js';

test('uses a subtle entry and hover response when motion is allowed', () => {
  assert.deepEqual(getRoyalCardMotion(false), {
    initial: { opacity: 0, y: 10 },
    whileHover: { y: -3 },
  });
});

test('removes non-essential card motion when the customer requests reduced motion', () => {
  assert.deepEqual(getRoyalCardMotion(true), {
    initial: false,
    whileHover: undefined,
  });
});
