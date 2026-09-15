import assert from 'node:assert/strict';
import test from 'node:test';
import { addProductToSalesCounterCart } from './salesCounterCart.js';

const trackedProduct = { _id: 'wig-20', name: '20 inch Body Wave', price: 3500, stock: 2 };

test('adds a scanned product to an empty cart', () => {
  const result = addProductToSalesCounterCart([], trackedProduct);

  assert.equal(result.added, true);
  assert.deepEqual(result.cart, [{ ...trackedProduct, quantity: 1 }]);
});

test('caps repeated scan additions at available stock', () => {
  const first = addProductToSalesCounterCart([], trackedProduct);
  const second = addProductToSalesCounterCart(first.cart, trackedProduct);
  const third = addProductToSalesCounterCart(second.cart, trackedProduct);

  assert.equal(second.added, true);
  assert.equal(second.cart[0].quantity, 2);
  assert.equal(third.added, false);
  assert.equal(third.cart[0].quantity, 2);
  assert.match(third.message, /Only 2/);
});

test('does not add zero-price or out-of-stock products', () => {
  assert.equal(addProductToSalesCounterCart([], { ...trackedProduct, price: 0 }).added, false);
  assert.equal(addProductToSalesCounterCart([], { ...trackedProduct, stock: 0 }).added, false);
});
