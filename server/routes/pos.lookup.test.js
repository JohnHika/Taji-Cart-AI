import assert from 'node:assert/strict';
import test from 'node:test';
import posRouter from './pos.js';
import Product from '../models/product.model.js';

const lookupLayer = posRouter.stack.find((layer) => layer.route?.path === '/products/lookup');
const lookupHandler = lookupLayer.route.stack.at(-1).handle;

const responseRecorder = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

const emptyExactMatch = () => ({ collation: async () => null });

test('strict product-code lookup never falls back to a product name', async () => {
  const originalFindOne = Product.findOne;
  const calls = [];
  Product.findOne = (query) => {
    calls.push(query);
    return emptyExactMatch();
  };

  try {
    const response = responseRecorder();
    await lookupHandler({ query: { code: 'Body Wave 20 inch', strict: 'true' } }, response);

    assert.equal(response.statusCode, 404);
    assert.equal(response.body.success, false);
    assert.equal(calls.length, 3);
    assert.equal(calls.some((query) => Object.hasOwn(query, 'name')), false);
  } finally {
    Product.findOne = originalFindOne;
  }
});

test('strict product-code lookup returns an exact barcode match', async () => {
  const originalFindOne = Product.findOne;
  const expectedProduct = { _id: 'product-1', name: 'Body Wave 20 inch', barcode: 'NWR-000001' };
  Product.findOne = (query) => ({
    collation: async () => (query.barcode ? expectedProduct : null),
  });

  try {
    const response = responseRecorder();
    await lookupHandler({ query: { code: 'NWR-000001', strict: '1' } }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data, expectedProduct);
  } finally {
    Product.findOne = originalFindOne;
  }
});

test('legacy product lookup still allows a product-name fallback', async () => {
  const originalFindOne = Product.findOne;
  const expectedProduct = { _id: 'product-2', name: 'Closure Wig' };
  Product.findOne = (query) => {
    if (query.name) return Promise.resolve(expectedProduct);
    return emptyExactMatch();
  };

  try {
    const response = responseRecorder();
    await lookupHandler({ query: { code: 'Closure Wig' } }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.data, expectedProduct);
  } finally {
    Product.findOne = originalFindOne;
  }
});
