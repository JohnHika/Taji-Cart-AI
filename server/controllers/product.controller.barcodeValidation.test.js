import assert from 'node:assert/strict';
import test from 'node:test';
import { createProductController } from './product.controller.js';

const responseRecorder = () => {
  const response = {
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
  };
  return response;
};

const validProductBody = (barcode) => ({
  handle: 'test-braids',
  name: 'Test Braids - 1B',
  sku: 'TEST-BRAIDS-1B',
  barcode,
  image: ['https://example.com/test-braids.jpg'],
  category: ['507f1f77bcf86cd799439011'],
  subCategory: ['507f1f77bcf86cd799439012'],
  unit: 'bundle',
  stock: 0,
  costPrice: 100,
  price: 200,
  description: 'Test hair product',
});

test('product creation reserves the NWH namespace for automatic barcode allocation', async () => {
  const response = responseRecorder();

  await createProductController({ body: validProductBody('NWH-000562') }, response);

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.success, false);
  assert.match(response.body.message, /NWH barcodes are generated/i);
});

test('product creation rejects barcode text that Code 128 cannot print', async () => {
  const response = responseRecorder();

  await createProductController({ body: validProductBody('HAIR ✨') }, response);

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.success, false);
  assert.match(response.body.message, /Code 128/i);
});
