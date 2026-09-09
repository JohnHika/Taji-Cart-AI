import assert from 'node:assert/strict';
import test from 'node:test';
import { getPOSOverflowClass } from './posLayout.js';

test('uses non-scrolling clipping for POS pages so sticky headers retain their scroll container', () => {
  assert.equal(getPOSOverflowClass(true), 'overflow-x-clip');
});

test('keeps the existing horizontal overflow guard for non-POS pages', () => {
  assert.equal(getPOSOverflowClass(false), 'overflow-x-hidden');
});
