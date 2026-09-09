import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_LEAD_TIME_DAYS,
  computeBlendedVelocity,
  computeDaysOfCover,
  computeLeadTimeFromSamples,
  computeReorderPoint,
  computeSupplierScorecardFromOrders,
  computeStandardDeviation,
  computeStatisticalSafetyStock,
  resolveZScore,
  classifyStockAge,
  classifyAbcCumulative,
} from '../utils/inventoryIntelligence.js';

test('computeBlendedVelocity weights the 30-day window most heavily', () => {
  // 3 units/day in every window -> blended rate should just be 3.
  const steady = computeBlendedVelocity({ units30: 90, units60: 180, units90: 270 });
  assert.equal(Math.round(steady * 100) / 100, 3);

  // A burst in the last 30 days should pull the blend up more than an
  // identical burst confined to days 61-90 would.
  const recentBurst = computeBlendedVelocity({ units30: 300, units60: 300, units90: 300 });
  const oldBurst = computeBlendedVelocity({ units30: 0, units60: 0, units90: 300 });
  assert.ok(recentBurst > oldBurst);
});

test('computeReorderPoint implements ROP = (velocity x lead time) + safety stock', () => {
  // velocity 2/day, lead time 7 days, safety 4 days -> (2*7) + (2*4) = 22
  assert.equal(computeReorderPoint({ velocity: 2, leadTimeDays: 7, safetyDays: 4 }), 22);
});

test('computeReorderPoint treats a non-positive or missing velocity as zero demand, not an error', () => {
  assert.equal(computeReorderPoint({ velocity: 0, leadTimeDays: 7, safetyDays: 4 }), 0);
  assert.equal(computeReorderPoint({ velocity: -5, leadTimeDays: 7, safetyDays: 4 }), 0);
  assert.equal(computeReorderPoint({ velocity: NaN, leadTimeDays: 7, safetyDays: 4 }), 0);
});

test('computeReorderPoint falls back to the default lead time when none is given or it is invalid', () => {
  const withDefault = computeReorderPoint({ velocity: 1, safetyDays: 0 });
  assert.equal(withDefault, DEFAULT_LEAD_TIME_DAYS);
  const withZeroLeadTime = computeReorderPoint({ velocity: 1, leadTimeDays: 0, safetyDays: 0 });
  assert.equal(withZeroLeadTime, DEFAULT_LEAD_TIME_DAYS);
});

test('computeDaysOfCover divides current stock by velocity, and is null when there is no demand signal', () => {
  assert.equal(computeDaysOfCover(20, 4), 5);
  assert.equal(computeDaysOfCover(20, 0), null);
  assert.equal(computeDaysOfCover(20, NaN), null);
});

// Regression: a live catalog product oversold to -2 units with velocity
// 0.05/day previously showed "days of cover: -41.9" on the reorder queue --
// a nonsense-reading number for a genuinely urgent (already-critical) row.
test('computeDaysOfCover clamps negative (oversold) stock to 0 rather than returning a negative day count', () => {
  assert.equal(computeDaysOfCover(-2, 0.05), 0);
  assert.equal(computeDaysOfCover(-100, 1), 0);
});

test('computeLeadTimeFromSamples averages millisecond durations into days, and falls back to the default with no samples', () => {
  const threeDays = 3 * 86_400_000;
  const fiveDays = 5 * 86_400_000;
  assert.equal(computeLeadTimeFromSamples([threeDays, fiveDays]), 4);
  assert.equal(computeLeadTimeFromSamples([]), DEFAULT_LEAD_TIME_DAYS);
  assert.equal(computeLeadTimeFromSamples([-100, NaN]), DEFAULT_LEAD_TIME_DAYS);
});

test('computeSupplierScorecardFromOrders computes on-time rate, lead time, and order accuracy from raw purchase orders', () => {
  const orders = [
    {
      orderedAt: '2026-01-01T00:00:00Z', receivedAt: '2026-01-06T00:00:00Z', expectedDate: '2026-01-08T00:00:00Z',
      lines: [{ orderedQuantity: 10, receivedQuantity: 10 }],
    },
    {
      orderedAt: '2026-02-01T00:00:00Z', receivedAt: '2026-02-15T00:00:00Z', expectedDate: '2026-02-08T00:00:00Z',
      lines: [{ orderedQuantity: 20, receivedQuantity: 18 }],
    },
    // Not yet received -- excluded from on-time rate and lead time, but its
    // (zero) line quantities still shouldn't crash the accuracy calculation.
    { orderedAt: '2026-03-01T00:00:00Z', receivedAt: null, expectedDate: '2026-03-10T00:00:00Z', lines: [] },
  ];
  const scorecard = computeSupplierScorecardFromOrders(orders);
  assert.equal(scorecard.totalOrders, 3);
  assert.equal(scorecard.completedOrders, 2);
  assert.equal(scorecard.onTimeRate, 50); // 1 of 2 completed orders arrived by its expectedDate
  assert.equal(scorecard.averageLeadTimeDays, 9.5); // (5 days + 14 days) / 2
  assert.equal(scorecard.orderAccuracyRate, Math.round((28 / 30) * 1000) / 10);
});

test('computeSupplierScorecardFromOrders handles a supplier with no order history at all', () => {
  const scorecard = computeSupplierScorecardFromOrders([]);
  assert.equal(scorecard.totalOrders, 0);
  assert.equal(scorecard.onTimeRate, null);
  assert.equal(scorecard.averageLeadTimeDays, null);
  assert.equal(scorecard.orderAccuracyRate, null);
});

// ── Statistical safety stock ────────────────────────────────────────────

test('resolveZScore maps service levels to the standard Heizer & Render Z-scores, and defaults to 95%', () => {
  assert.equal(resolveZScore(0.90), 1.28);
  assert.equal(resolveZScore(0.95), 1.65);
  assert.equal(resolveZScore(0.99), 2.33);
  assert.equal(resolveZScore(0.42), resolveZScore(0.95)); // unknown level -> default (95%)
});

test('computeStandardDeviation includes zero-sale days, so a bursty seller reads as more variable than a steady one with the same average', () => {
  const steady = [3, 3, 3, 3, 3];
  const bursty = [15, 0, 0, 0, 0]; // same total (15) and mean (3) as steady
  assert.equal(computeStandardDeviation(steady), 0);
  assert.ok(computeStandardDeviation(bursty) > 0);
  assert.equal(computeStandardDeviation([]), 0);
});

test('computeStatisticalSafetyStock implements SS = Z x demand-stddev x sqrt(lead time)', () => {
  // Textbook example: stddev 20, lead time 9 days, 95% service level -> 1.65 * 20 * 3 = 99
  assert.equal(Math.round(computeStatisticalSafetyStock({ demandStdDev: 20, leadTimeDays: 9, serviceLevel: 0.95 })), 99);
});

test('computeStatisticalSafetyStock is non-negative for zero/invalid demand variability', () => {
  assert.equal(computeStatisticalSafetyStock({ demandStdDev: 0, leadTimeDays: 7 }), 0);
  assert.equal(computeStatisticalSafetyStock({ demandStdDev: NaN, leadTimeDays: 7 }), 0);
});

test('computeReorderPoint uses an explicit safetyStock figure when given, instead of the flat safetyDays heuristic', () => {
  // velocity 2/day, lead time 7 days, explicit safetyStock 99 -> (2*7) + 99 = 113 (safetyDays ignored)
  assert.equal(computeReorderPoint({ velocity: 2, leadTimeDays: 7, safetyDays: 4, safetyStock: 99 }), 113);
  // No safetyStock given -> falls back to the original flat behaviour, unchanged.
  assert.equal(computeReorderPoint({ velocity: 2, leadTimeDays: 7, safetyDays: 4 }), 22);
});

// ── Dead stock classification ───────────────────────────────────────────

test('classifyStockAge buckets by days since last sale, and null (no sale record) is its own bucket', () => {
  assert.equal(classifyStockAge(0), 'healthy');
  assert.equal(classifyStockAge(89), 'healthy');
  assert.equal(classifyStockAge(90), 'slow');
  assert.equal(classifyStockAge(179), 'slow');
  assert.equal(classifyStockAge(180), 'dead');
  assert.equal(classifyStockAge(400), 'dead');
  assert.equal(classifyStockAge(null), 'never_sold');
});

// ── ABC classification ──────────────────────────────────────────────────

test('classifyAbcCumulative applies the 80/95 Pareto cutoffs', () => {
  assert.equal(classifyAbcCumulative(0.5), 'A');
  assert.equal(classifyAbcCumulative(0.8), 'A');
  assert.equal(classifyAbcCumulative(0.81), 'B');
  assert.equal(classifyAbcCumulative(0.95), 'B');
  assert.equal(classifyAbcCumulative(0.951), 'C');
  assert.equal(classifyAbcCumulative(1), 'C');
});
