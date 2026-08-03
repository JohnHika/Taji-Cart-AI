import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const indexHtmlPath = fileURLToPath(new URL('../index.html', import.meta.url));

test('the application shell does not clear customer caches or unregister service workers', async () => {
  const html = await readFile(indexHtmlPath, 'utf8');

  assert.doesNotMatch(html, /nawiri-cache-cleanup/);
  assert.doesNotMatch(html, /serviceWorker\.getRegistrations/);
  assert.doesNotMatch(html, /caches\.delete/);
});
