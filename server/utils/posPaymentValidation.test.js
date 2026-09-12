import assert from 'node:assert/strict';
import test from 'node:test';
import { validatePosPayments } from './posPaymentValidation.js';

test('accepts an exact split containing cash, Equity, and forwarded text', () => {
  assert.deepEqual(
    validatePosPayments({
      paymentMethod: 'split',
      total: 1500,
      payments: [
        { method: 'cash', amount: 500 },
        { method: 'equity', amount: 700, proofImageUrl: 'https://proof.test/equity.jpg', approved: true },
        { method: 'text_forwarded', amount: 300, forwardedText: 'Confirmed 300', approved: true },
      ],
    }),
    { valid: true },
  );
});

test('rejects split legs that do not add up to the server total', () => {
  const result = validatePosPayments({
    paymentMethod: 'split',
    total: 1500,
    payments: [
      { method: 'cash', amount: 500 },
      { method: 'equity', amount: 700, proofImageUrl: 'https://proof.test/equity.jpg', approved: true },
    ],
  });

  assert.equal(result.valid, false);
  assert.match(result.message, /exactly match/i);
});

test('rejects a split with only one payment method', () => {
  const result = validatePosPayments({
    paymentMethod: 'split',
    total: 1500,
    payments: [{ method: 'cash', amount: 1500 }],
  });

  assert.equal(result.valid, false);
  assert.match(result.message, /two payment methods/i);
});
