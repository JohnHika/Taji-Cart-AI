import assert from 'node:assert/strict';
import test from 'node:test';
import { DisplayPriceInShillings } from './DisplayPriceInShillings.js';

test('formats customer prices with the approved KSh currency label', () => {
  assert.equal(DisplayPriceInShillings(700), 'KSh 700.00');
});

test('uses KES for an unavailable price instead of a dollar fallback', () => {
  assert.equal(DisplayPriceInShillings(null), 'KES 0.00');
});
