import assert from 'node:assert/strict';
import test from 'node:test';
import { calculatePosCartTotals, getLoyaltyDiscountRate, POS_TAX_RATE } from './posCartTotals.js';

test('bare cart: no tax applied and change-free totals match the old sales-counter behaviour', () => {
  assert.deepEqual(
    calculatePosCartTotals({ cart: [{ price: 1250, quantity: 2 }], applyTax: false }),
    { subtotal: 2500, discountAmount: 0, tax: 0, total: 2500, itemCount: 2 },
  );
});

test('percent order discount reduces the pre-tax total', () => {
  const t = calculatePosCartTotals({
    cart: [{ price: 1000, quantity: 2 }],
    discount: 10,
    discountMode: 'percent',
  });
  assert.equal(t.subtotal, 2000);
  assert.equal(t.discountAmount, 200);
  assert.equal(t.tax, 0);
  assert.equal(t.total, 1800);
});

test('fixed-amount discount is capped at the subtotal', () => {
  const t = calculatePosCartTotals({
    cart: [{ price: 500, quantity: 1 }],
    discountMode: 'amount',
    discountAmount: 800,
  });
  assert.equal(t.discountAmount, 500);
  assert.equal(t.total, 0);
});

test('per-line discountPct applies before order discount', () => {
  const t = calculatePosCartTotals({
    cart: [{ price: 1000, quantity: 1, discountPct: 20 }],
    discount: 10,
    discountMode: 'percent',
  });
  // Line discount 200; order discount is taken on the FULL subtotal (legacy behaviour): 1000 × 10% = 100
  assert.equal(t.discountAmount, 300);
  assert.equal(t.total, 700);
});

test('tax applies after all discounts', () => {
  const t = calculatePosCartTotals({
    cart: [{ price: 1000, quantity: 1 }],
    discount: 10,
    discountMode: 'percent',
    applyTax: true,
  });
  assert.equal(t.tax, 900 * POS_TAX_RATE);
  assert.equal(t.total, 900 * (1 + POS_TAX_RATE));
});

test('loyalty percentage stacks with order discount', () => {
  const t = calculatePosCartTotals({
    cart: [{ price: 1000, quantity: 1 }],
    discount: 0,
    loyaltyDiscountPct: 5,
  });
  assert.equal(t.discountAmount, 50);
  assert.equal(t.total, 950);
});

test('loyalty tier fallback matches the retired StaffPOS table', () => {
  assert.equal(getLoyaltyDiscountRate({ tier: 'Bronze' }), 2);
  assert.equal(getLoyaltyDiscountRate({ tier: 'Silver' }), 5);
  assert.equal(getLoyaltyDiscountRate({ tier: 'Gold' }), 8);
  assert.equal(getLoyaltyDiscountRate({ tier: 'Platinum' }), 12);
  assert.equal(getLoyaltyDiscountRate({ tier: 'Unknown' }), 0);
  assert.equal(getLoyaltyDiscountRate({ discountRate: 7 }), 7);
  assert.equal(getLoyaltyDiscountRate(null), 0);
});

test('itemCount counts units, not lines', () => {
  const t = calculatePosCartTotals({
    cart: [{ price: 100, quantity: 3 }, { price: 50, quantity: 2 }],
  });
  assert.equal(t.itemCount, 5);
});