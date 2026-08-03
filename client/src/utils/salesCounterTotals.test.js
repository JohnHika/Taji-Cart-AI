import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateSalesCounterTotals } from './salesCounterTotals.js';

test('does not add an unconfigured 16% tax to new sales-counter transactions', () => {
  assert.deepEqual(
    calculateSalesCounterTotals([{ price: 1250, quantity: 2 }], 3000),
    { subtotal: 2500, tax: 0, total: 2500, change: 500 },
  );
});

test('keeps change at zero when tendered amount is below the total', () => {
  assert.deepEqual(
    calculateSalesCounterTotals([{ price: 800, quantity: 1 }], 500),
    { subtotal: 800, tax: 0, total: 800, change: 0 },
  );
});
