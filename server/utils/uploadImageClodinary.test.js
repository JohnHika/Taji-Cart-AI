import assert from 'node:assert/strict';
import test from 'node:test';
import { getBrowserSafeImageUrl } from './uploadImageClodinary.js';

test('adds a JPG delivery transform for HEIC/HEIF/AVIF uploads', () => {
  const url = 'https://res.cloudinary.com/demo/image/upload/v123/el-roi-one/proof.heic';

  assert.equal(
    getBrowserSafeImageUrl({ secureUrl: url, mimetype: 'image/heic' }),
    'https://res.cloudinary.com/demo/image/upload/f_jpg,q_auto/v123/el-roi-one/proof.jpg',
  );
  assert.equal(
    getBrowserSafeImageUrl({ secureUrl: url, format: 'heif' }),
    'https://res.cloudinary.com/demo/image/upload/f_jpg,q_auto/v123/el-roi-one/proof.jpg',
  );
  assert.equal(
    getBrowserSafeImageUrl({ secureUrl: url, mimetype: 'image/avif' }),
    'https://res.cloudinary.com/demo/image/upload/f_jpg,q_auto/v123/el-roi-one/proof.jpg',
  );
});

test('leaves browser-compatible image URLs unchanged', () => {
  const url = 'https://res.cloudinary.com/demo/image/upload/v123/el-roi-one/proof.jpg';
  assert.equal(getBrowserSafeImageUrl({ secureUrl: url, mimetype: 'image/jpeg' }), url);
});
