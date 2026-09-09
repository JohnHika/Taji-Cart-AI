import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOperationsBrief } from './adminAi.controller.js';

// Product-sales-history lookup (formerly a regex pre-gate here, tested above
// this comment in earlier versions of this file) is now the
// query_product_sales_history tool in server/utils/adminAiTools.js, called by
// the model itself rather than pre-parsed from the raw question -- see
// server/utils/adminAiTools.test.js for its coverage.

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

// Write-tool cap predicates (isStockDeltaWithinCap etc.) now live in and are
// tested by server/utils/adminAiTools.test.js, alongside the rest of the
// tool system -- not duplicated here.
