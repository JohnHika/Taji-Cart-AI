import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOperationsBrief } from './adminAi.controller.js';

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
