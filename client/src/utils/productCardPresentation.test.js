import assert from 'node:assert/strict';
import test from 'node:test';
import { getRatingSummary, getStockPresentation } from './productCardPresentation.js';

test('labels unavailable and low product stock honestly', () => {
  assert.deepEqual(getStockPresentation(0), { label: 'Out of stock', tone: 'unavailable' });
  assert.deepEqual(getStockPresentation(3), { label: 'Only 3 left', tone: 'low' });
  assert.deepEqual(getStockPresentation(12), { label: 'In stock', tone: 'available' });
});

test('uses the stored product rating and count for a compact card summary', () => {
  assert.deepEqual(
    getRatingSummary({ averageRating: 4.6, ratings: [{ rating: 5 }, { rating: 4 }] }),
    { average: '4.6', count: 2, label: '2 ratings' }
  );
});

test('calculates a rating when only individual ratings are available', () => {
  assert.deepEqual(
    getRatingSummary({ ratings: [{ rating: 5 }, { rating: 4 }, { rating: 3 }] }),
    { average: '4.0', count: 3, label: '3 ratings' }
  );
});

test('does not invent a rating when a product has no ratings', () => {
  assert.equal(getRatingSummary({}), null);
});
