import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PRODUCT_BARCODE_PREFIX,
  formatProductBarcode,
  isCode128BarcodeValue,
  isNawiriBarcodeNamespace,
  parseGeneratedProductBarcode,
} from './catalogBarcode.js';

test('formats short, stable product barcode references', () => {
  assert.equal(formatProductBarcode(1), `${PRODUCT_BARCODE_PREFIX}000001`);
  assert.equal(formatProductBarcode(564), `${PRODUCT_BARCODE_PREFIX}000564`);
  assert.equal(formatProductBarcode(1000000), `${PRODUCT_BARCODE_PREFIX}1000000`);
});

test('rejects invalid barcode sequence values', () => {
  for (const value of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, '1']) {
    assert.throws(() => formatProductBarcode(value), /positive safe integer/);
  }
});

test('recognizes generated catalog barcodes without treating supplier codes as generated', () => {
  assert.equal(parseGeneratedProductBarcode('nwh-000564'), 564);
  assert.equal(parseGeneratedProductBarcode(`${PRODUCT_BARCODE_PREFIX}1000000`), 1000000);
  assert.equal(parseGeneratedProductBarcode('273397738892'), null);
  assert.equal(parseGeneratedProductBarcode('NWH-000000'), null);
  assert.equal(parseGeneratedProductBarcode('NWH-ABC123'), null);
});

test('reserves the Nawiri namespace and accepts only Code 128-safe barcode input', () => {
  assert.equal(isNawiriBarcodeNamespace('NWH-000562'), true);
  assert.equal(isNawiriBarcodeNamespace('nwh-supplier-code'), true);
  assert.equal(isNawiriBarcodeNamespace('273397738892'), false);

  assert.equal(isCode128BarcodeValue('NWH-000562'), true);
  assert.equal(isCode128BarcodeValue('SUPPLIER 273397738892'), true);
  assert.equal(isCode128BarcodeValue('NWH-000562\n'), false);
  assert.equal(isCode128BarcodeValue('Hair ✨'), false);
});
