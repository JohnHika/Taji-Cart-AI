import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCustomerProductFilter, getIncompleteProductReasons, isCustomerReadyProduct } from './catalogVisibility.js';

test('marks products without a usable image as incomplete', () => {
  assert.deepEqual(getIncompleteProductReasons({ image: [], price: 1500 }), ['Add at least one product image']);
  assert.equal(isCustomerReadyProduct({ image: [], price: 1500 }), false);
});

test('marks missing, zero, and negative prices as incomplete', () => {
  assert.deepEqual(getIncompleteProductReasons({ image: ['https://cdn.example/hair.jpg'] }), ['Set a price above KSh 0']);
  assert.deepEqual(getIncompleteProductReasons({ image: ['https://cdn.example/hair.jpg'], price: 0 }), ['Set a price above KSh 0']);
  assert.deepEqual(getIncompleteProductReasons({ image: ['https://cdn.example/hair.jpg'], price: -10 }), ['Set a price above KSh 0']);
});

test('requires both a usable image and a positive numeric price for customer visibility', () => {
  const readyProduct = { image: ['https://cdn.example/hair.jpg'], price: 2500 };

  assert.deepEqual(getIncompleteProductReasons(readyProduct), []);
  assert.equal(isCustomerReadyProduct(readyProduct), true);
});

test('treats placeholder images as missing customer-ready imagery', () => {
  assert.deepEqual(
    getIncompleteProductReasons({ image: ['https://cdn.example/product-photo-pending.webp'], price: 2500 }),
    ['Add at least one product image']
  );
});

test('builds a server query that hides unpublished, image-less, and non-positive-price products', () => {
  assert.deepEqual(buildCustomerProductFilter(true), {
    publish: true,
    price: { $gt: 0 },
    'image.0': { $exists: true, $nin: ['', null], $not: /product-photo-pending|via\.placeholder/i },
  });
  assert.deepEqual(buildCustomerProductFilter(false), { publish: true });
});
