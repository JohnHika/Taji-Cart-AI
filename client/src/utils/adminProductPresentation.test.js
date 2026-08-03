import assert from 'node:assert/strict';
import test from 'node:test';
import { getAdminProductPage } from './adminProductPresentation.js';

const products = Array.from({ length: 25 }, (_, index) => ({ _id: String(index + 1) }));

test('returns a stable 12-item product page with a clear visible range', () => {
  const page = getAdminProductPage(products, 2, 12);

  assert.equal(page.currentPage, 2);
  assert.equal(page.totalPages, 3);
  assert.equal(page.startItem, 13);
  assert.equal(page.endItem, 24);
  assert.equal(page.items.length, 12);
  assert.equal(page.items[0]._id, '13');
});

test('clamps an out-of-range page after filters reduce the result set', () => {
  const page = getAdminProductPage(products.slice(0, 3), 3, 12);

  assert.equal(page.currentPage, 1);
  assert.equal(page.totalPages, 1);
  assert.equal(page.startItem, 1);
  assert.equal(page.endItem, 3);
});

test('keeps empty results on the first page without an invalid range', () => {
  const page = getAdminProductPage([], 2, 12);

  assert.equal(page.currentPage, 1);
  assert.equal(page.totalPages, 1);
  assert.equal(page.startItem, 0);
  assert.equal(page.endItem, 0);
});
