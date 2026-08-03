import assert from 'node:assert/strict';
import test from 'node:test';
import { getProductRouteScrollPosition } from './productRouteScroll.js';

test('opens each product route at its header without smooth scrolling', () => {
  assert.deepEqual(getProductRouteScrollPosition(), {
    top: 0,
    left: 0,
    behavior: 'auto',
  });
});
