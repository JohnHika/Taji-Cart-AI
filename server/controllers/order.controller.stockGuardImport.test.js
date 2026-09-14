import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const controllerUrl = new URL('./order.controller.js', import.meta.url);

test('order checkout controller imports the guarded stock reservation helper', async () => {
  const source = await readFile(controllerUrl, 'utf8');

  assert.match(
    source,
    /import\s*\{\s*reserveStockGuarded\s*\}\s*from\s*['"]\.\.\/utils\/stockGuard\.js['"];/,
    'checkout paths call reserveStockGuarded and must import it from the shared stock guard utility'
  );
});
