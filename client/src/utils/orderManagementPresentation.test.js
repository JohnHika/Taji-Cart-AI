import assert from 'node:assert/strict';
import test from 'node:test';
import { getOrderActionHint } from './orderManagementPresentation.js';

test('gives admins a concise next step for active delivery orders', () => {
  assert.equal(getOrderActionHint({ status: 'shipped', fulfillment_type: 'delivery' }), 'Ready to dispatch');
  assert.equal(getOrderActionHint({ status: 'nearby', fulfillment_type: 'delivery' }), 'Rider is near the customer');
});

test('does not invent a delivery action for completed counter sales', () => {
  assert.equal(getOrderActionHint({ status: 'POS' }), 'Counter sale completed');
});
