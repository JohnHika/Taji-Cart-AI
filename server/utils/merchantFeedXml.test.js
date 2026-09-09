import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMerchantFeedXml } from './merchantFeedXml.js';

test('builds a Merchant Center XML item for a customer-ready product', () => {
  const xml = buildMerchantFeedXml([{
    _id: '69d637a999170d9bab3bd1d3',
    name: 'BODYWAVE - 0T33',
    sku: 'BODY-0T33',
    description: 'Soft & natural bodywave hair.',
    image: ['https://cdn.example.com/bodywave.jpg'],
    price: 700,
    discount: 10,
    stock: 10,
  }]);

  assert.match(xml, /<g:id>BODY-0T33<\/g:id>/);
  assert.match(xml, /<g:availability>in_stock<\/g:availability>/);
  assert.match(xml, /<g:price>630\.00 KES<\/g:price>/);
  assert.match(xml, /<g:link>https:\/\/nawirihairke\.com\/product\/bodywave-0t33-69d637a999170d9bab3bd1d3<\/g:link>/);
});
