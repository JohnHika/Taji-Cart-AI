import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTransferStatus,
  getTransferLineState,
  isValidTransferQuantity,
  transferLineVariance,
} from './stockTransfer.js';

test('isValidTransferQuantity accepts safe whole quantities within the business cap only', () => {
  assert.equal(isValidTransferQuantity(1), true);
  assert.equal(isValidTransferQuantity('100000'), true);
  assert.equal(isValidTransferQuantity(100001), false);
  assert.equal(isValidTransferQuantity(Number.MAX_SAFE_INTEGER + 1), false);
  assert.equal(isValidTransferQuantity(true), false);
  assert.equal(isValidTransferQuantity([1]), false);
  assert.equal(isValidTransferQuantity(1.5), false);
  assert.equal(isValidTransferQuantity(''), false);
  assert.equal(isValidTransferQuantity(' 1 '), false);
  assert.equal(isValidTransferQuantity('01'), false);
  assert.equal(isValidTransferQuantity('000'), false);
  assert.equal(isValidTransferQuantity('0', { allowZero: true }), true);
  assert.equal(isValidTransferQuantity(null, { allowZero: true }), false);
  assert.equal(isValidTransferQuantity(0, { allowZero: true }), true);
});

test('transferLineVariance is actual received minus dispatched', () => {
  assert.equal(transferLineVariance(8, 8), 0);
  assert.equal(transferLineVariance(8, 7), -1);
  assert.equal(transferLineVariance(8, 9), 1);
});

test('getTransferLineState classifies matched, short, and over-received lines', () => {
  assert.equal(getTransferLineState(8, 8), 'matched');
  assert.equal(getTransferLineState(8, 7), 'short');
  assert.equal(getTransferLineState(8, 9), 'over');
  assert.equal(getTransferLineState(8, null), 'pending');
});

test('calculateTransferStatus separates dispatched, partial, confirmed, and disputed states', () => {
  assert.equal(calculateTransferStatus([{ dispatchedQuantity: 8, receivedQuantity: null }]), 'dispatched');
  assert.equal(calculateTransferStatus([{ dispatchedQuantity: 8, receivedQuantity: 4 }]), 'partially_received');
  assert.equal(calculateTransferStatus([{ dispatchedQuantity: 8, receivedQuantity: 8 }]), 'confirmed');
  assert.equal(calculateTransferStatus([{ dispatchedQuantity: 8, receivedQuantity: 7 }], { finalize: true }), 'disputed');
  assert.equal(calculateTransferStatus([
    { dispatchedQuantity: 8, receivedQuantity: 9 },
    { dispatchedQuantity: 3, receivedQuantity: 2 },
  ], { finalize: true }), 'disputed');
});

test('calculateTransferStatus reports over-receipt as disputed for admin review', () => {
  assert.equal(calculateTransferStatus([{ dispatchedQuantity: 8, receivedQuantity: 9 }]), 'disputed');
});
