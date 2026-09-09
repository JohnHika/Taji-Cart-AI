import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOperationsBrief,
  extractProductLookupTokens,
  isStockDeltaWithinCap,
  isPriceChangeWithinCap,
  isOrderStatusTransitionAllowed,
  parseQuestionStartDate,
} from './adminAi.controller.js';

test('extractProductLookupTokens preserves a requested product and removes question wording', () => {
  assert.deepEqual(
    extractProductLookupTokens('FRENCH CURL 14INCH since September 14 chech for me how many sale we have made'),
    ['french', 'curl', '14inch'],
  );
});

test('parseQuestionStartDate uses the most recent past September 14 when no year is provided', () => {
  const start = parseQuestionStartDate(
    'FRENCH CURL 14INCH since September 14',
    new Date('2026-09-09T08:00:00.000Z'),
  );
  assert.equal(start?.toISOString(), '2025-09-13T21:00:00.000Z');
});

test('parseQuestionStartDate rejects an invalid calendar date', () => {
  assert.equal(parseQuestionStartDate('sales since February 31, 2026'), null);
});

test('buildOperationsBrief groups actionable stock and order risks without taking action', () => {
  const brief = buildOperationsBrief({
    currentOrders: [
      { total: 12000, status: 'pending' },
      { total: 8000, status: 'out_for_delivery' },
    ],
    previousOrders: [{ total: 30000, status: 'delivered' }],
    lowStockProducts: [{ _id: 'p1', name: '18 inch body wave', sku: 'BW-18', stock: 1 }],
    drivers: [{ isAvailable: false }, { isAvailable: true }],
  });

  assert.equal(brief.metrics.revenue, 20000);
  assert.equal(brief.metrics.openOrderCount, 2);
  assert.equal(brief.metrics.lowStockCount, 1);
  assert.equal(brief.metrics.revenueChangePercent, -33);
  assert.ok(brief.actions.some((action) => action.href === '/dashboard/catalog-quality'));
  assert.ok(brief.actions.every((action) => !action.mutatesData));
});

test('buildOperationsBrief combines counter and online revenue when both sources are selected', () => {
  const brief = buildOperationsBrief({
    currentOrders: [{ total: 1500, status: 'delivered' }],
    previousOrders: [{ total: 1000, status: 'delivered' }],
    currentCounter: { revenue: 8500, saleCount: 4, itemCount: 16 },
    previousCounter: { revenue: 4000, saleCount: 2, itemCount: 7 },
    counterTopProducts: [{ _id: 'p1', name: 'GYPSY LOCS', sku: 'GL-14', quantity: 4, revenue: 3000 }],
    sources: ['counter', 'online'],
  });

  assert.equal(brief.metrics.revenue, 10000);
  assert.equal(brief.metrics.counterRevenue, 8500);
  assert.equal(brief.metrics.counterSaleCount, 4);
  assert.equal(brief.metrics.onlineRevenue, 1500);
  assert.equal(brief.metrics.revenueChangePercent, 100);
  assert.equal(brief.counterTopProducts[0].name, 'GYPSY LOCS');
  assert.ok(brief.actions.some((action) => action.href === '/dashboard/sales-hub'));
});

test('buildOperationsBrief excludes unselected sources from totals and output', () => {
  const brief = buildOperationsBrief({
    currentOrders: [{ total: 5000, status: 'pending' }],
    currentCounter: { revenue: 8500, saleCount: 4, itemCount: 16 },
    lowStockProducts: [{ _id: 'p1', name: 'Low stock', stock: 1 }],
    sources: ['counter'],
  });

  assert.equal(brief.metrics.revenue, 8500);
  assert.equal(brief.metrics.onlineRevenue, 0);
  assert.equal(brief.metrics.lowStockCount, 0);
  assert.equal(brief.lowStockProducts.length, 0);
  assert.equal(brief.metrics.openOrderCount, 0);
});

test('isStockDeltaWithinCap allows deltas up to +/-25 and rejects beyond that', () => {
  assert.equal(isStockDeltaWithinCap(25), true);
  assert.equal(isStockDeltaWithinCap(-25), true);
  assert.equal(isStockDeltaWithinCap(1), true);
  assert.equal(isStockDeltaWithinCap(26), false);
  assert.equal(isStockDeltaWithinCap(-26), false);
  assert.equal(isStockDeltaWithinCap(0), false);
  assert.equal(isStockDeltaWithinCap(NaN), false);
});

test('isPriceChangeWithinCap allows moves up to 15% and rejects beyond that', () => {
  assert.equal(isPriceChangeWithinCap(1000, 1150), true);
  assert.equal(isPriceChangeWithinCap(1000, 850), true);
  assert.equal(isPriceChangeWithinCap(1000, 1151), false);
  assert.equal(isPriceChangeWithinCap(1000, 849), false);
  assert.equal(isPriceChangeWithinCap(1000, -5), false);
  assert.equal(isPriceChangeWithinCap(1000, 0), false);
});

test('isOrderStatusTransitionAllowed rejects cancellations, delivery states, and payment-adjacent moves', () => {
  assert.equal(isOrderStatusTransitionAllowed('pending', 'processing'), true);
  assert.equal(isOrderStatusTransitionAllowed('processing', 'ready_for_pickup'), true);
  assert.equal(isOrderStatusTransitionAllowed('processing', 'cancelled'), false);
  assert.equal(isOrderStatusTransitionAllowed('delivered', 'processing'), false);
  assert.equal(isOrderStatusTransitionAllowed('out_for_delivery', 'delivered'), false);
  assert.equal(isOrderStatusTransitionAllowed('dispatched', 'ready_for_pickup'), false);
});
