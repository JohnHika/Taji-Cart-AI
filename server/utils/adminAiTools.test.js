import test from 'node:test';
import assert from 'node:assert/strict';
import {
  READ_TOOL_DEFINITIONS,
  WRITE_TOOL_DEFINITIONS,
  toOpenAiTool,
  executeAiTool,
  isStockDeltaWithinCap,
  isPriceChangeWithinCap,
  isOrderStatusTransitionAllowed,
  isReorderDraftStatusAllowed,
  isLoyaltyPointsDeltaWithinCap,
  parseNairobiDayStart,
  tokenizeForProductMatch,
  matchCatalogProducts,
} from './adminAiTools.js';

test('isReorderDraftStatusAllowed only allows resolving to ordered or dismissed', () => {
  assert.equal(isReorderDraftStatusAllowed('ordered'), true);
  assert.equal(isReorderDraftStatusAllowed('dismissed'), true);
  assert.equal(isReorderDraftStatusAllowed('open'), false);
  assert.equal(isReorderDraftStatusAllowed('anything-else'), false);
});

test('isLoyaltyPointsDeltaWithinCap allows deltas up to +/-5000 by default and rejects beyond that, and rejects zero', () => {
  assert.equal(isLoyaltyPointsDeltaWithinCap(5000), true);
  assert.equal(isLoyaltyPointsDeltaWithinCap(-5000), true);
  assert.equal(isLoyaltyPointsDeltaWithinCap(1), true);
  assert.equal(isLoyaltyPointsDeltaWithinCap(5001), false);
  assert.equal(isLoyaltyPointsDeltaWithinCap(-5001), false);
  assert.equal(isLoyaltyPointsDeltaWithinCap(0), false);
  assert.equal(isLoyaltyPointsDeltaWithinCap(NaN), false);
});

// Defaults are generous (sized for a small retailer's own scale, not
// bank-grade caution) and env-tunable via ADMIN_AI_STOCK_CAP /
// ADMIN_AI_PRICE_CAP_PCT / ADMIN_AI_LOYALTY_POINTS_CAP -- see
// positiveNumberEnv() in adminAiTools.js. These assert the defaults; the
// helper itself is a 3-line Number-with-fallback, not separately tested.
test('stock/price/order-status caps default to generous-but-bounded values, and the order-status allow-list still excludes payment/dispatch-adjacent states', () => {
  assert.equal(isStockDeltaWithinCap(500), true);
  assert.equal(isStockDeltaWithinCap(501), false);
  assert.equal(isPriceChangeWithinCap(1000, 1600), true);
  assert.equal(isPriceChangeWithinCap(1000, 1601), false);
  assert.equal(isOrderStatusTransitionAllowed('pending', 'processing'), true);
  assert.equal(isOrderStatusTransitionAllowed('delivered', 'processing'), false);
});

test('toOpenAiTool converts an Anthropic-shaped tool definition to OpenAI function-call shape', () => {
  const [sample] = READ_TOOL_DEFINITIONS;
  const converted = toOpenAiTool(sample);
  assert.equal(converted.type, 'function');
  assert.equal(converted.function.name, sample.name);
  assert.equal(converted.function.description, sample.description);
  assert.deepEqual(converted.function.parameters, sample.input_schema);
});

test('every read and write tool definition is in Anthropic {name, description, input_schema} shape', () => {
  for (const tool of [...READ_TOOL_DEFINITIONS, ...WRITE_TOOL_DEFINITIONS]) {
    assert.equal(typeof tool.name, 'string');
    assert.equal(typeof tool.description, 'string');
    assert.equal(tool.input_schema.type, 'object');
    assert.equal(typeof tool.input_schema.properties, 'object');
  }
});

test('read tools expose the expected names, including the new domains', () => {
  const names = READ_TOOL_DEFINITIONS.map((tool) => tool.name);
  for (const expected of [
    'query_products', 'query_orders', 'query_sales', 'query_product_sales_history', 'query_customer',
    'query_loyalty_card', 'query_inventory_movements', 'query_stock_counts', 'query_purchase_orders',
    'query_suppliers', 'query_drivers', 'query_admin_action_log',
  ]) {
    assert.ok(names.includes(expected), `expected ${expected} in READ_TOOL_DEFINITIONS`);
  }
});

// query_product_sales_history's Sale aggregation always queries the
// database (even to report a clean "no match"), so the full tool cannot be
// exercised via executeAiTool() without a real MongoDB connection -- this
// repo has no existing mongodb-memory-server (or similar) test-DB pattern
// (checked: no *.test.js anywhere under server/ imports it -- only
// server/config/memoryMongoDB.js uses it, as an app-level offline-dev
// fallback on a fixed port, not a test harness), so DB-backed coverage of
// the Sale aggregation itself (units/revenue/transaction totals) is a
// follow-up. The catalog fuzzy-matching and date-boundary logic that caused
// the actual reported bug, however, are pure functions (matchCatalogProducts,
// tokenizeForProductMatch, parseNairobiDayStart) and ARE fully covered below,
// including the exact real-catalog collision (verified against the live
// products_seed.json, 520 products) that an earlier version of this fix
// missed: a query like "French 14" tying across 14/18/24-inch variants
// because of a SKU color-code suffix ("...-C14") that coincidentally
// contains the queried size number.
test('query_product_sales_history is defined with the expected schema', () => {
  const definition = READ_TOOL_DEFINITIONS.find((tool) => tool.name === 'query_product_sales_history');
  assert.ok(definition, 'query_product_sales_history should be in READ_TOOL_DEFINITIONS');
  assert.equal(definition.input_schema.type, 'object');
  assert.ok(definition.input_schema.properties.productQuery, 'should expose a productQuery field');
  assert.ok(definition.input_schema.properties.startDate, 'should expose a startDate field');
  assert.ok(definition.input_schema.properties.endDate, 'should expose an endDate field');
  assert.deepEqual(definition.input_schema.required, ['productQuery']);
});

test('query_product_sales_history rejects a call with an empty productQuery before touching the database', async () => {
  const result = await executeAiTool('query_product_sales_history', { productQuery: '   ' });
  assert.equal(result.ok, false);
  assert.match(result.summary, /provide a productQuery/);
  assert.equal(result.type, 'read');
});

// Regression fixture reproducing the exact shape of the real bug (found via
// adversarial review, then confirmed against the live 520-product catalog):
// this catalog writes some sizes glued ("14INCH", "18INCH") and one spaced
// ("24 INCH"), and at least one 18-inch SKU's color code happens to be
// "C14" -- a naive digit/letter-boundary split alone turns that into a
// stray "14" token, which would tie the 18-inch item against a "French 14"
// query on top of the correct 14-inch matches.
const FRENCH_CURL_FIXTURE = [
  { _id: '14a', name: 'FRENCH CURL 14INCH', sku: 'FRENCH-CURL-14INCH-1B' },
  { _id: '14b', name: 'FRENCH CURL 14INCH', sku: 'FRENCH-CURL-14INCH-613' },
  { _id: '18a', name: 'FRENCH CURL 18INCH', sku: 'FRENCH-CURL-18INCH-1B' },
  { _id: '18b-collision', name: 'FRENCH CURL 18INCH', sku: 'FRENCH-CURL-18INCH-C14' },
  { _id: '24a', name: 'FRENCH CURL 24 INCH', sku: 'FRENCH-CURL-24-INCH-1B' },
  { _id: 'unrelated', name: 'GYPSY LOCS 14INCH', sku: 'GYPSY-LOCS-14INCH-1B' },
];

test('matchCatalogProducts("French 14") matches only the 14-inch variants -- not 18-inch, 24-inch, or an unrelated product, and not a color-code collision', () => {
  const winners = matchCatalogProducts(tokenizeForProductMatch('French 14'), FRENCH_CURL_FIXTURE);
  assert.deepEqual(winners.map((product) => product._id).sort(), ['14a', '14b']);
});

test('matchCatalogProducts finds a product by its exact SKU', () => {
  const winners = matchCatalogProducts(tokenizeForProductMatch('FRENCH-CURL-18INCH-1B'), FRENCH_CURL_FIXTURE);
  assert.deepEqual(winners.map((product) => product._id), ['18a']);
});

test('matchCatalogProducts returns nothing for a query unrelated to the catalog', () => {
  assert.deepEqual(matchCatalogProducts(tokenizeForProductMatch('xyz nonexistent widget'), FRENCH_CURL_FIXTURE), []);
});

test('parseNairobiDayStart resolves a YYYY-MM-DD date to Nairobi midnight expressed in UTC (Nairobi is UTC+3), not UTC midnight', () => {
  assert.equal(parseNairobiDayStart('2026-08-17').toISOString(), '2026-08-16T21:00:00.000Z');
});

test('parseNairobiDayStart returns null for invalid, empty, or missing input rather than throwing', () => {
  assert.equal(parseNairobiDayStart(''), null);
  assert.equal(parseNairobiDayStart(undefined), null);
  assert.equal(parseNairobiDayStart('not-a-date'), null);
});

test('Nairobi day-boundary fix: a 10am-Nairobi sale on the last day of a range is included, where the old naive UTC-midnight boundary would have wrongly excluded it', () => {
  const saleAt = new Date('2026-08-31T07:00:00.000Z'); // 10:00 Nairobi time on Aug 31
  const nairobiDayStart = parseNairobiDayStart('2026-08-31');
  const nairobiNextDayStart = parseNairobiDayStart('2026-09-01');
  assert.ok(saleAt >= nairobiDayStart && saleAt < nairobiNextDayStart, 'Nairobi-aware boundaries should include this sale in the Aug 31 range');

  const naiveUtcMidnight = new Date('2026-08-31'); // what the retired `new Date(endDate)` used as its $lte boundary
  assert.ok(!(saleAt <= naiveUtcMidnight), 'demonstrates the old naive boundary would have wrongly excluded this same sale');
});

test('write tools expose the expected names, including the 3 new ones', () => {
  const names = WRITE_TOOL_DEFINITIONS.map((tool) => tool.name);
  for (const expected of [
    'adjust_stock', 'draft_reorder', 'update_order_status', 'adjust_price',
    'resolve_reorder_draft', 'adjust_delivery_zone_fare', 'adjust_loyalty_points',
  ]) {
    assert.ok(names.includes(expected), `expected ${expected} in WRITE_TOOL_DEFINITIONS`);
  }
});

test('query_customer rejects a call with no identifier before touching the database', async () => {
  const result = await executeAiTool('query_customer', {});
  assert.equal(result.ok, false);
  assert.match(result.summary, /provide an exact email, userId, mobile number, or a name/);
  assert.equal(result.type, 'read');
});

test('query_customer accepts a partial name search, not just exact identifiers', () => {
  const definition = READ_TOOL_DEFINITIONS.find((tool) => tool.name === 'query_customer');
  assert.ok(definition.input_schema.properties.name, 'query_customer should expose a name search field');
});

test('query_loyalty_card rejects a call with no identifier before touching the database', async () => {
  const result = await executeAiTool('query_loyalty_card', {});
  assert.equal(result.ok, false);
  assert.match(result.summary, /exact userId or cardNumber/);
});

test('executeAiTool rejects an unknown tool name without touching the database', async () => {
  const result = await executeAiTool('not_a_real_tool', {});
  assert.equal(result.ok, false);
  assert.match(result.summary, /unknown tool/);
});

test('executeAiTool rejects unparseable JSON-string arguments (the OpenAI tool_calls shape)', async () => {
  const result = await executeAiTool('query_products', '{not valid json');
  assert.equal(result.ok, false);
  assert.match(result.summary, /could not parse arguments/);
});
