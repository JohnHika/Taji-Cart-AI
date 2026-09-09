import assert from 'node:assert/strict';
import test from 'node:test';
import { getProductNavigationOptions } from './productRouteScroll.js';

test('starts a newly opened product at the very top of its detail page', () => {
  assert.deepEqual(getProductNavigationOptions(), {
    preventScrollReset: false,
  });
});
