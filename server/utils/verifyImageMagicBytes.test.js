import assert from 'node:assert/strict';
import test from 'node:test';
import isValidImageBuffer from './verifyImageMagicBytes.js';

const makeFtypBuffer = (brand) => {
  const buffer = Buffer.alloc(20);
  buffer.write('ftyp', 4, 'ascii');
  buffer.write(brand, 8, 'ascii');
  return buffer;
};

test('accepts HEIC and HEIF camera image signatures', () => {
  assert.equal(isValidImageBuffer(makeFtypBuffer('heic')), true);
  assert.equal(isValidImageBuffer(makeFtypBuffer('heix')), true);
  assert.equal(isValidImageBuffer(makeFtypBuffer('mif1')), true);
});

test('accepts AVIF camera image signatures', () => {
  assert.equal(isValidImageBuffer(makeFtypBuffer('avif')), true);
  assert.equal(isValidImageBuffer(makeFtypBuffer('avis')), true);
});
