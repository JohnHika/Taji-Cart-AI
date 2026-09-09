import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldRenderMobileCartSummary } from './mobileShell.js';

test('shows the mobile cart summary only when a signed-in customer has cart items', () => {
  assert.equal(shouldRenderMobileCartSummary({ isAuthenticated: true, totalQty: 2, pathname: '/' }), true);
  assert.equal(shouldRenderMobileCartSummary({ isAuthenticated: true, totalQty: 0, pathname: '/' }), false);
  assert.equal(shouldRenderMobileCartSummary({ isAuthenticated: false, totalQty: 2, pathname: '/' }), false);
});

test('hides the cart summary where it would duplicate or obstruct checkout controls', () => {
  assert.equal(shouldRenderMobileCartSummary({ isAuthenticated: true, totalQty: 2, pathname: '/mobile/cart' }), false);
  assert.equal(shouldRenderMobileCartSummary({ isAuthenticated: true, totalQty: 2, pathname: '/checkout' }), false);
});
