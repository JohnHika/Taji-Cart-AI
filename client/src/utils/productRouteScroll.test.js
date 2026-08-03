import assert from 'node:assert/strict';
import test from 'node:test';
import { getProductNavigationOptions } from './productRouteScroll.js';

test('preserves browsing position when a shopper opens a product', () => {
  assert.deepEqual(getProductNavigationOptions(), {
    preventScrollReset: true,
  });
});
