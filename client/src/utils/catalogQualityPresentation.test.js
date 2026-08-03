import assert from 'node:assert/strict';
import test from 'node:test';
import { getCatalogVisibilityCopy } from './catalogQualityPresentation.js';

test('explains that enabled catalog protection hides incomplete products from customers', () => {
  assert.deepEqual(getCatalogVisibilityCopy(true), {
    status: 'Customer protection is on',
    description: 'Products without a usable image or a price above KSh 0 are hidden from customers.',
  });
});

test('explains when incomplete products are allowed back into the storefront', () => {
  assert.deepEqual(getCatalogVisibilityCopy(false), {
    status: 'Customer protection is off',
    description: 'Incomplete published products can appear in the customer storefront.',
  });
});
