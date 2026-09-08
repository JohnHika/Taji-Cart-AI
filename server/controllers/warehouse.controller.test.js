import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidDispatchQuantity } from './warehouse.controller.js';

test('isValidDispatchQuantity accepts positive integers only', () => {
  assert.equal(isValidDispatchQuantity(5), true);
  assert.equal(isValidDispatchQuantity('12'), true);
  assert.equal(isValidDispatchQuantity(0), false);
  assert.equal(isValidDispatchQuantity(-3), false);
  assert.equal(isValidDispatchQuantity('abc'), false);
  assert.equal(isValidDispatchQuantity(undefined), false);
});
