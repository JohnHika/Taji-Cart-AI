import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSitemapUrl, formatSitemapLastModified } from './sitemapXml.js';

test('formats a valid catalog update date for sitemap lastmod entries', () => {
  assert.equal(formatSitemapLastModified('2026-08-03T11:32:39.000Z'), '2026-08-03');
  assert.equal(formatSitemapLastModified('not-a-date'), '');
});

test('includes lastmod only when an accurate update date is available', () => {
  assert.equal(
    buildSitemapUrl('https://nawirihairke.com/product/example-id', 'weekly', '0.9', '2026-08-03T11:32:39.000Z'),
    '<url><loc>https://nawirihairke.com/product/example-id</loc><lastmod>2026-08-03</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>'
  );
  assert.equal(
    buildSitemapUrl('https://nawirihairke.com/', 'daily', '1.0'),
    '<url><loc>https://nawirihairke.com/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>'
  );
});
