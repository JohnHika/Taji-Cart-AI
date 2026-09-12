import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSplitPaymentRows, getSplitPaymentSummary, shouldShowEquityProof } from './splitPayment.js';

test('builds cash, Equity, and forwarded-text legs for an exact split', () => {
  const summary = getSplitPaymentSummary({
    total: 1500,
    cashAmount: '500',
    equityAmount: '700',
    textForwardedAmount: '300',
  });

  assert.equal(summary.paid, 1500);
  assert.equal(summary.remaining, 0);
  assert.equal(summary.isBalanced, true);
  assert.deepEqual(
    buildSplitPaymentRows({
      cashAmount: '500',
      equityAmount: '700',
      textForwardedAmount: '300',
    }),
    [
      { method: 'cash', amount: 500 },
      { method: 'equity', amount: 700 },
      { method: 'text_forwarded', amount: 300 },
    ],
  );
});

test('reports a short or overpaid split in cents without floating point drift', () => {
  assert.deepEqual(
    getSplitPaymentSummary({ total: 0.3, cashAmount: '0.1', equityAmount: '0.2', textForwardedAmount: '' }),
    { paid: 0.3, remaining: 0, isBalanced: true, methodCount: 2 },
  );
  assert.equal(
    getSplitPaymentSummary({ total: 1000, cashAmount: '400', equityAmount: '500', textForwardedAmount: '' }).remaining,
    100,
  );
  assert.equal(
    getSplitPaymentSummary({ total: 1000, cashAmount: '600', equityAmount: '500', textForwardedAmount: '' }).remaining,
    -100,
  );
});

test('keeps the Equity camera control available while a split is being configured', () => {
  assert.equal(shouldShowEquityProof('split'), true);
  assert.equal(shouldShowEquityProof('equity'), true);
  assert.equal(shouldShowEquityProof('cash'), false);
});
