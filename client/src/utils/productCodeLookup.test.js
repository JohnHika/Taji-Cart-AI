import assert from 'node:assert/strict';
import test from 'node:test';
import { findProductByScannedCode, normalizeProductCode, productMatchesScannedCode } from './productCodeLookup.js';

const products = [
  { _id: '1', name: 'Body Wave 20 inch', barcode: 'NWR-000001', qrCode: 'nawiri://product/1', sku: 'BW-20' },
  { _id: '2', name: 'Closure Wig', barcode: 'NWR-000002', sku: 'CW-18' },
];

test('normalizes scanner and keyboard input without changing the code', () => {
  assert.equal(normalizeProductCode('  NWR-000001\n'), 'NWR-000001');
  assert.equal(normalizeProductCode(null), '');
});

test('matches barcodes, QR payloads, and SKUs case-insensitively', () => {
  assert.equal(productMatchesScannedCode(products[0], 'nwr-000001'), true);
  assert.equal(productMatchesScannedCode(products[0], 'NAWIRI://PRODUCT/1'), true);
  assert.equal(productMatchesScannedCode(products[0], 'bw-20'), true);
});

test('finds only an exact scan-code match and does not turn a product name into a scan match', () => {
  assert.equal(findProductByScannedCode(products, 'cw-18')._id, '2');
  assert.equal(findProductByScannedCode(products, 'Body Wave 20 inch'), null);
  assert.equal(findProductByScannedCode(products, 'NWR-999999'), null);
});
