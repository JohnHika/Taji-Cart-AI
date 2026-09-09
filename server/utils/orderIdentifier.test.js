import assert from 'node:assert/strict';
import test from 'node:test';
import { getOrderIdentifierQuery } from './orderIdentifier.js';

test('resolves the public order ID emitted by the admin aggregate', () => {
  assert.deepEqual(getOrderIdentifierQuery('ORD-6a54e51bc74c4203c2075899'), {
    orderId: 'ORD-6a54e51bc74c4203c2075899',
  });
});

test('resolves a MongoDB order document ID for direct callers', () => {
  assert.deepEqual(getOrderIdentifierQuery('66b9d02607c6b1d78f1f319b'), {
    _id: '66b9d02607c6b1d78f1f319b',
  });
});

test('rejects an empty order identifier', () => {
  assert.equal(getOrderIdentifierQuery('   '), null);
});
