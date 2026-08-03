import assert from 'node:assert/strict';
import test from 'node:test';
import ProductModel from '../models/product.model.js';
import { getProductDetailsForAdminController } from './product.controller.js';

const validProductId = '507f1f77bcf86cd799439011';

const createResponse = () => ({
  statusCode: null,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test('allows an admin to load an incomplete product for repair', async () => {
  const originalFindById = ProductModel.findById;
  const incompleteProduct = { _id: validProductId, name: 'Needs image and price', image: [], price: 0 };
  ProductModel.findById = () => ({
    populate: async () => incompleteProduct,
  });

  try {
    const response = createResponse();
    await getProductDetailsForAdminController({ body: { productId: validProductId } }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.deepEqual(response.body.data, incompleteProduct);
  } finally {
    ProductModel.findById = originalFindById;
  }
});

test('rejects malformed admin product IDs before querying the database', async () => {
  const response = createResponse();
  await getProductDetailsForAdminController({ body: { productId: 'not-a-product-id' } }, response);

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.success, false);
});
