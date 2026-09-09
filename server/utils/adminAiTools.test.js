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
    'query_products', 'query_orders', 'query_sales', 'query_customer', 'query_loyalty_card',
    'query_inventory_movements', 'query_stock_counts', 'query_purchase_orders', 'query_suppliers',
    'query_drivers', 'query_admin_action_log',
  ]) {
    assert.ok(names.includes(expected), `expected ${expected} in READ_TOOL_DEFINITIONS`);
  }
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
