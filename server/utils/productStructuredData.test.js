import assert from 'node:assert/strict';
import test from 'node:test';
import { buildProductStructuredData } from './productStructuredData.js';

test('builds a customer-facing Product schema with discounted KES offer and ratings', () => {
  const schema = buildProductStructuredData({
    product: {
      _id: 'product-1',
      name: 'Passion Twist 24 Inch',
      sku: 'PT-24-4',
      image: ['https://cdn.example.com/passion-twist.jpg'],
      price: 700,
      discount: 10,
      stock: 3,
      ratings: [{ rating: 4 }, { rating: 5 }],
    },
    canonicalUrl: 'https://nawirihairke.com/product/passion-twist-24-inch-product-1',
    description: 'Premium passion twists for everyday wear.',
  });

  assert.deepEqual(schema, {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Passion Twist 24 Inch',
    image: ['https://cdn.example.com/passion-twist.jpg'],
    description: 'Premium passion twists for everyday wear.',
    sku: 'PT-24-4',
    brand: { '@type': 'Brand', name: 'Nawiri Hair' },
    offers: {
      '@type': 'Offer',
      url: 'https://nawirihairke.com/product/passion-twist-24-inch-product-1',
      priceCurrency: 'KES',
      price: 630,
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: 'Nawiri Hair' },
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.5',
      reviewCount: 2,
      bestRating: 5,
      worstRating: 1,
    },
  });
});

test('does not claim an offer or rating data when catalog data is unsuitable', () => {
  const schema = buildProductStructuredData({
    product: {
      name: 'Incomplete item',
      image: [],
      price: 'not-a-price',
      stock: 0,
      ratings: [],
    },
    canonicalUrl: 'https://nawirihairke.com/product/incomplete-item-product-2',
    description: 'Description.',
  });

  assert.deepEqual(schema, {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Incomplete item',
    description: 'Description.',
    brand: { '@type': 'Brand', name: 'Nawiri Hair' },
  });
});
