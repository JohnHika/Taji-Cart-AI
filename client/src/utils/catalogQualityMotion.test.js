import assert from 'node:assert/strict';
import test from 'node:test';
import { getCatalogQualityMotion } from './catalogQualityMotion.js';

test('uses short hierarchy motion when motion is allowed', () => {
  assert.deepEqual(getCatalogQualityMotion(false, 2), {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.18, delay: 0.06, ease: 'easeOut' },
  });
});

test('removes non-essential catalog motion for reduced-motion users', () => {
  assert.deepEqual(getCatalogQualityMotion(true, 2), { initial: false });
});
