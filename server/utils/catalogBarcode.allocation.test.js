import assert from 'node:assert/strict';
import test, { after, before, beforeEach } from 'node:test';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import ProductModel from '../models/product.model.js';
import CatalogSequenceModel from '../models/catalogSequence.model.js';
import {
  PRODUCT_BARCODE_SEQUENCE_KEY,
  reserveNextProductBarcode,
} from './catalogBarcode.js';

let mongo;

before(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
});

after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await Promise.all([
    ProductModel.deleteMany({}),
    CatalogSequenceModel.deleteMany({}),
  ]);
});

test('automatic barcode allocation skips an existing legacy NWH value', async () => {
  await ProductModel.create({
    handle: 'legacy-test-hair',
    name: 'Legacy Test Hair',
    sku: 'LEGACY-TEST-HAIR',
    barcode: 'NWH-000562',
    costPrice: 100,
    price: 200,
    stock: 0,
  });
  await CatalogSequenceModel.create({
    key: PRODUCT_BARCODE_SEQUENCE_KEY,
    value: 561,
  });

  const barcode = await reserveNextProductBarcode();

  assert.equal(barcode, 'NWH-000563');
  const sequence = await CatalogSequenceModel.findOne({ key: PRODUCT_BARCODE_SEQUENCE_KEY }).lean();
  assert.equal(sequence.value, 563);
});
