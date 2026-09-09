import mongoose from 'mongoose';
import AdminActionLogModel from '../models/adminActionLog.model.js';
import DeliveryZoneModel from '../models/deliveryzone.model.js';
import DriverPersonnelModel from '../models/deliverypersonnel.model.js';
import InventoryMovementModel from '../models/inventoryMovement.model.js';
import LoyaltyCardModel from '../models/loyaltycard.model.js';
import OrderModel from '../models/order.model.js';
import ProductModel from '../models/product.model.js';
import PurchaseOrderModel from '../models/purchaseOrder.model.js';
import ReorderDraftModel from '../models/reorderDraft.model.js';
import Sale from '../models/sale.model.js';
import StockCountModel from '../models/stockCount.model.js';
import SupplierModel from '../models/supplier.model.js';
import UserModel from '../models/user.model.js';

// Kept local (not imported from adminAi.controller.js) to avoid a circular
// module dependency -- that controller imports the tool system from here.
const asMoney = (value) => Math.round(Number(value || 0));
const asCount = (value) => Number(value || 0);
const formatKes = (value) => `KES ${new Intl.NumberFormat('en-KE').format(asMoney(value))}`;
const dateLabel = (date) => new Intl.DateTimeFormat('en-KE', {
  timeZone: 'Africa/Nairobi', dateStyle: 'medium', timeStyle: 'short',
}).format(new Date(date));

// ── This module is the entire surface the AI copilot can touch on the store's
// database. Every capability here is a named, capped tool -- never a raw
// query/update the model can shape itself. Domains that never get a tool,
// regardless of ADMIN_AI_AUTONOMOUS_WRITES: payment capture/refund/webhook
// state (mpesaPayment, jengaPayment, Stripe, Order.paymentId/payment_status),
// driver payouts (driverfinancial.model.js), User auth/security/privilege
// fields (password, tokens, OTPs, isAdmin/role, staffPermissions), any
// delete/bulk operation, delivery dispatch/driver assignment, and loyalty
// *program* config (thresholds/settings, as opposed to one customer's points).

const isValidObjectId = (value) => Boolean(value) && mongoose.Types.ObjectId.isValid(value);
const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const clampLimit = (requested, fallback, max) => Math.min(Math.max(Math.trunc(Number(requested)) || fallback, 1), max);
const dateRangeFilter = (field, { startDate, endDate } = {}) => {
  const range = {};
  if (startDate) range.$gte = new Date(startDate);
  if (endDate) range.$lte = new Date(endDate);
  return Object.keys(range).length ? { [field]: range } : {};
};

// Nairobi-local day boundaries (Nairobi is UTC+3) -- a plain `new
// Date('2026-08-31')` resolves to UTC midnight, i.e. 03:00 Nairobi time,
// silently dropping most of that Nairobi-local day from range queries.
// Mirrors the Nairobi-aware math the rest of this codebase's date handling
// already uses (see getPeriod/nairobiDayStart in adminAi.controller.js).
// Invalid/unparseable input resolves to null rather than throwing, so a bad
// date degrades to "no date filter" instead of failing the whole lookup.
// Exported (pure, no I/O) so this boundary math is unit-tested directly.
const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000;
export const parseNairobiDayStart = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || '').trim());
  if (!match) return null;
  const [, year, month, day] = match;
  const result = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)) - NAIROBI_OFFSET_MS);
  return Number.isNaN(result.getTime()) ? null : result;
};

// A digit run immediately followed by a 2+ letter run is split before
// tokenizing (e.g. "14INCH" -> "14" + "inch") because this catalog writes
// sizes both glued ("14INCH", "18INCH") and spaced ("24 INCH") -- without
// the split, "14" never appears as its own token against a glued size, so a
// query like "French 14" can't distinguish the 14-inch item from
// 18-inch/24-inch ones. The 2+ letter threshold (a real unit word, not a
// single letter) deliberately leaves short digit+letter colour codes like
// "1B" glued as one token -- splitting those too (an earlier version of
// this fix did, symmetrically, for both digit->letter and letter->digit)
// destroys them into single characters that get filtered out entirely,
// making an exact-SKU search unable to tell colour variants apart. There is
// no letter->digit split for the same reason: letter-prefixed colour codes
// like "B6"/"C10"/"T33" must stay intact. Exported (pure) so the tokenizer
// and matcher below are unit-tested directly.
export const tokenizeForProductMatch = (value) => String(value || '')
  .replace(/(\d)([a-z]{2,})/gi, '$1 $2')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .split(' ')
  .map((token) => token.trim())
  .filter((token) => token.length > 1);

const isNumericToken = (token) => /^\d+$/.test(token);

// Token-overlap match against name+SKU. `queryTokens` must already be
// tokenizeForProductMatch(query) output; `catalog` is a plain array of
// {name, sku, ...} (a lean() Product query result, or plain test fixtures).
// A purely numeric query token (a size, e.g. "14") is only matched against
// the product NAME, never the SKU: SKU color-code suffixes routinely contain
// unrelated numbers after the same digit/letter split (e.g. SKU "...-C14"
// -> tokens "c","14"), which would otherwise tie an 18-inch or 24-inch
// item's color-code "14" against a size query for "14" and blend three
// different sizes' totals into one silently-wrong answer -- reproduced and
// confirmed against the real 520-item catalog (products_seed.json) before
// landing this fix; see server/utils/adminAiTools.test.js for the locked-in
// regression case.
export const matchCatalogProducts = (queryTokens, catalog) => {
  if (!queryTokens.length) return [];
  const candidates = catalog
    .map((product) => {
      const nameWords = new Set(tokenizeForProductMatch(product.name));
      const allWords = new Set(tokenizeForProductMatch(`${product.name} ${product.sku}`));
      const matchedTokens = queryTokens.filter((token) => (isNumericToken(token) ? nameWords : allWords).has(token));
      return { product, matchedTokens, score: matchedTokens.length / queryTokens.length };
    })
    .filter(({ matchedTokens, score }) => matchedTokens.length >= 1 && score >= 0.5)
    .sort((left, right) => right.score - left.score || String(left.product.name).localeCompare(String(right.product.name)));
  if (!candidates.length) return [];
  const strongestScore = candidates[0].score;
  // Keep equally specific variants (for example B6, C10, C11), while not
  // broadening a named product into loosely related items.
  return candidates.filter(({ score }) => score === strongestScore).map(({ product }) => product);
};

const logAiAction = ({ action, target, before, after, reason }) =>
  AdminActionLogModel.create({ actorType: 'ai', action, target, before, after, reason }).catch((error) => {
    console.error('Failed to write AdminActionLog entry for AI tool call:', error);
  });

// ── Generic read-tool factory ────────────────────────────────────────────
// Every read tool is: an allow-listed set of filter properties, an
// allow-listed `.select()` (never secrets), and a hard result cap. No tool
// accepts a raw filter object from the model -- only the specific fields
// listed in `properties` ever reach a Mongo query.
const defineReadTool = ({ name, description, model, properties, required = [], select, buildFilter, defaultLimit = 20, maxLimit = 50, summarize, sort = { createdAt: -1 } }) => ({
  name,
  description,
  input_schema: {
    type: 'object',
    properties: {
      ...properties,
      limit: { type: 'number', description: `Max rows to return (default ${defaultLimit}, hard cap ${maxLimit}).` },
    },
    required,
  },
  handler: async (args = {}) => {
    const filter = buildFilter(args) || {};
    const rows = await model.find(filter).select(select).sort(sort).limit(clampLimit(args.limit, defaultLimit, maxLimit)).lean();
    console.log(`[adminAi] ${name}`, JSON.stringify({ filter, count: rows.length }));
    return { ok: true, summary: summarize(rows, args), data: rows };
  },
});

const READ_TOOLS = [
  defineReadTool({
    name: 'query_products',
    description: 'Search the product catalogue by name/SKU text, category, stock range, or publish status.',
    model: ProductModel,
    properties: {
      text: { type: 'string', description: 'Partial, case-insensitive match against product name or SKU.' },
      category: { type: 'string', description: 'A Category _id.' },
      minStock: { type: 'number' },
      maxStock: { type: 'number' },
      publishedOnly: { type: 'boolean', description: 'Only include products currently published to the storefront.' },
    },
    select: 'name sku price costPrice stock warehouseStock publish category',
    buildFilter: (args) => {
      const filter = {};
      if (args.text) {
        const pattern = new RegExp(escapeRegExp(args.text), 'i');
        filter.$or = [{ name: pattern }, { sku: pattern }];
      }
      if (isValidObjectId(args.category)) filter.category = args.category;
      if (Number.isFinite(Number(args.minStock)) || Number.isFinite(Number(args.maxStock))) {
        filter.stock = {};
        if (Number.isFinite(Number(args.minStock))) filter.stock.$gte = Number(args.minStock);
        if (Number.isFinite(Number(args.maxStock))) filter.stock.$lte = Number(args.maxStock);
      }
      if (args.publishedOnly) filter.publish = true;
      return filter;
    },
    summarize: (rows, args) => `Found ${rows.length} product${rows.length === 1 ? '' : 's'}${args.text ? ` matching "${args.text}"` : ''}.`,
  }),
  defineReadTool({
    name: 'query_inventory_movements',
    description: 'Read the InventoryMovement ledger -- the record of every non-sale stock change (warehouse receipts, transfers, stocktake adjustments).',
    model: InventoryMovementModel,
    properties: {
      productId: { type: 'string', description: 'A Product _id.' },
      type: { type: 'string', enum: ['warehouse_receipt', 'purchase_receipt', 'warehouse_to_shop', 'stocktake_adjustment'] },
      startDate: { type: 'string', description: 'ISO date.' },
      endDate: { type: 'string', description: 'ISO date.' },
    },
    select: 'product type warehouseDelta shopDelta reason reference createdAt',
    buildFilter: (args) => ({
      ...(isValidObjectId(args.productId) ? { product: args.productId } : {}),
      ...(args.type ? { type: args.type } : {}),
      ...dateRangeFilter('createdAt', args),
    }),
    summarize: (rows) => `Found ${rows.length} inventory movement${rows.length === 1 ? '' : 's'}.`,
  }),
  defineReadTool({
    name: 'query_stock_counts',
    description: 'List stocktake counts (shop or warehouse) by status.',
    model: StockCountModel,
    properties: {
      status: { type: 'string', enum: ['draft', 'in_progress', 'finalized'] },
      location: { type: 'string', enum: ['shop', 'warehouse'] },
    },
    select: 'number location status createdAt finalizedAt',
    buildFilter: (args) => ({
      ...(args.status ? { status: args.status } : {}),
      ...(args.location ? { location: args.location } : {}),
    }),
    summarize: (rows) => `Found ${rows.length} stock count${rows.length === 1 ? '' : 's'}.`,
  }),
  defineReadTool({
    name: 'query_purchase_orders',
    description: 'Look up purchase orders by supplier or status, including received-vs-ordered quantities per line.',
    model: PurchaseOrderModel,
    properties: {
      supplierId: { type: 'string', description: 'A Supplier _id.' },
      status: { type: 'string', enum: ['draft', 'ordered', 'partially_received', 'received', 'cancelled'] },
      startDate: { type: 'string', description: 'ISO date, matched against creation date.' },
      endDate: { type: 'string', description: 'ISO date, matched against creation date.' },
    },
    select: 'number supplier status expectedDate orderedAt receivedAt lines notes createdAt',
    buildFilter: (args) => ({
      ...(isValidObjectId(args.supplierId) ? { supplier: args.supplierId } : {}),
      ...(args.status ? { status: args.status } : {}),
      ...dateRangeFilter('createdAt', args),
    }),
    summarize: (rows) => `Found ${rows.length} purchase order${rows.length === 1 ? '' : 's'}.`,
  }),
  defineReadTool({
    name: 'query_suppliers',
    description: 'Search suppliers by name or active status.',
    model: SupplierModel,
    properties: {
      text: { type: 'string', description: 'Partial, case-insensitive match against supplier name.' },
      activeOnly: { type: 'boolean' },
    },
    select: 'name contactName phone email active',
    buildFilter: (args) => ({
      ...(args.text ? { name: new RegExp(escapeRegExp(args.text), 'i') } : {}),
      ...(args.activeOnly ? { active: true } : {}),
    }),
    summarize: (rows) => `Found ${rows.length} supplier${rows.length === 1 ? '' : 's'}.`,
  }),
  defineReadTool({
    name: 'query_drivers',
    description: 'List delivery riders by verification status or availability.',
    model: DriverPersonnelModel,
    properties: {
      verificationStatus: { type: 'string', enum: ['pending', 'verified', 'rejected'] },
      availableOnly: { type: 'boolean' },
    },
    select: 'name phoneNumber verificationStatus isAvailable vehicleDetails.type',
    buildFilter: (args) => ({
      ...(args.verificationStatus ? { verificationStatus: args.verificationStatus } : {}),
      ...(args.availableOnly ? { isAvailable: true } : {}),
    }),
    summarize: (rows) => `Found ${rows.length} driver${rows.length === 1 ? '' : 's'}.`,
  }),
  defineReadTool({
    name: 'query_admin_action_log',
    description: 'Self-audit: review recent admin/AI changes -- what changed, who or what changed it, and why. Use this to answer "what have you changed recently" or to check before repeating an action.',
    model: AdminActionLogModel,
    properties: {
      actorType: { type: 'string', enum: ['admin', 'ai'] },
      action: { type: 'string', description: 'Exact action name, e.g. "ai_adjust_stock".' },
      targetModel: { type: 'string', description: 'e.g. "Product", "Order".' },
      startDate: { type: 'string', description: 'ISO date.' },
      endDate: { type: 'string', description: 'ISO date.' },
    },
    select: 'actorType action target before after reason createdAt',
    buildFilter: (args) => ({
      ...(args.actorType ? { actorType: args.actorType } : {}),
      ...(args.action ? { action: args.action } : {}),
      ...(args.targetModel ? { 'target.model': args.targetModel } : {}),
      ...dateRangeFilter('createdAt', args),
    }),
    summarize: (rows) => `Found ${rows.length} log entr${rows.length === 1 ? 'y' : 'ies'}.`,
  }),
  {
    name: 'query_orders',
    description: 'Look up online orders by orderId, status, or date range. Returns one row per order (grouped from its line items), not raw payment data.',
    input_schema: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'The public orderId.' },
        status: { type: 'string', enum: ['pending', 'processing', 'shipped', 'dispatched', 'driver_assigned', 'out_for_delivery', 'nearby', 'delivered', 'ready_for_pickup', 'picked_up', 'cancelled'] },
        startDate: { type: 'string', description: 'ISO date.' },
        endDate: { type: 'string', description: 'ISO date.' },
        limit: { type: 'number', description: 'Max orders to return (default 20, hard cap 50).' },
      },
      required: [],
    },
    handler: async (args = {}) => {
      const match = {
        ...(args.orderId ? { orderId: String(args.orderId) } : {}),
        ...dateRangeFilter('createdAt', args),
      };
      const rows = await OrderModel.aggregate([
        { $match: match },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: '$orderId',
            status: { $first: '$status' },
            total: { $max: '$totalAmt' },
            deliveryCharge: { $first: '$deliveryCharge' },
            fulfillmentType: { $first: '$fulfillment_type' },
            paymentStatus: { $first: '$payment_status' },
            createdAt: { $first: '$createdAt' },
            deliveredAt: { $first: '$deliveredAt' },
            items: { $push: { name: '$product_details.name', quantity: '$quantity' } },
          },
        },
        ...(args.status ? [{ $match: { status: args.status } }] : []),
        { $sort: { createdAt: -1 } },
        { $limit: clampLimit(args.limit, 20, 50) },
      ]);
      console.log('[adminAi] query_orders', JSON.stringify({ match, status: args.status, count: rows.length }));
      return {
        ok: true,
        summary: `Found ${rows.length} order${rows.length === 1 ? '' : 's'}${args.status ? ` with status "${args.status}"` : ''}.`,
        data: rows.map((row) => ({ orderId: row._id, ...row, total: asMoney(row.total) })),
      };
    },
  },
  {
    name: 'query_sales',
    description: 'Look up counter/POS sales by date range or sale source. Excludes voided sales.',
    input_schema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'ISO date.' },
        endDate: { type: 'string', description: 'ISO date.' },
        saleSource: { type: 'string', description: "e.g. 'online' or 'counter'." },
        limit: { type: 'number', description: 'Max sales to return (default 20, hard cap 50).' },
      },
      required: [],
    },
    handler: async (args = {}) => {
      const filter = {
        isVoided: { $ne: true },
        ...(args.saleSource ? { saleSource: args.saleSource } : {}),
        ...dateRangeFilter('saleDate', args),
      };
      const rows = await Sale.find(filter)
        .select('saleNumber saleDate total saleSource items.name items.quantity items.total')
        .sort({ saleDate: -1 })
        .limit(clampLimit(args.limit, 20, 50))
        .lean();
      console.log('[adminAi] query_sales', JSON.stringify({ filter, count: rows.length }));
      return { ok: true, summary: `Found ${rows.length} sale${rows.length === 1 ? '' : 's'}.`, data: rows };
    },
  },
  {
    name: 'query_product_sales_history',
    description: 'Look up units sold, revenue, matching transaction count, and last-sold date for ONE specific named product, optionally restricted to a date range. This is the preferred, authoritative source whenever the owner asks how many of a specific product have sold, its sales history, or when it last sold -- prefer it over estimating from query_sales. It does its own fuzzy matching against the catalogue, so pass the owner\'s wording for the product unmodified rather than guessing the exact catalogue name.',
    input_schema: {
      type: 'object',
      properties: {
        productQuery: { type: 'string', description: "The product name/SKU/description in the owner's own words, e.g. 'French 14' or 'BW-18'. Do not pre-clean it or guess the exact catalogue name -- this tool does its own matching." },
        startDate: { type: 'string', description: "ISO date YYYY-MM-DD, e.g. '2026-08-17'. Resolve relative or day-first phrasing yourself (e.g. 'since 17 Aug', 'last week') using the operations snapshot's generatedAt as today; omit for all-time figures." },
        endDate: { type: 'string', description: "ISO date YYYY-MM-DD, e.g. '2026-09-09'. Omit for up to now." },
      },
      required: ['productQuery'],
    },
    handler: async ({ productQuery, startDate, endDate } = {}) => {
      const query = String(productQuery || '').trim();
      if (!query) {
        return { ok: false, summary: 'query_product_sales_history rejected: provide a productQuery.' };
      }

      const resolvedStartDate = parseNairobiDayStart(startDate);
      const endDateDayAfter = parseNairobiDayStart(endDate);
      const resolvedEndDateExclusive = endDateDayAfter ? new Date(endDateDayAfter.getTime() + 24 * 60 * 60 * 1000) : null;
      const resolvedEndDateDisplay = resolvedEndDateExclusive ? new Date(resolvedEndDateExclusive.getTime() - 1) : null;

      const tokens = tokenizeForProductMatch(query);
      let products = [];
      if (tokens.length) {
        const catalog = await ProductModel.find({}).select('name sku').lean();
        products = matchCatalogProducts(tokens, catalog);
      }

      const baseData = {
        matched: false,
        productQuery: query,
        resolvedStartDate: resolvedStartDate ? resolvedStartDate.toISOString() : null,
        resolvedEndDate: resolvedEndDateDisplay ? resolvedEndDateDisplay.toISOString() : null,
        variants: [],
        totals: { units: 0, revenue: 0, transactions: 0 },
        latestSale: null,
      };

      if (!products.length) {
        console.log('[adminAi] query_product_sales_history', JSON.stringify({ productQuery: query, matched: false }));
        return { ok: true, summary: `No catalogue item matched "${query}".`, data: baseData };
      }

      const productIds = products.map((product) => product._id);
      const saleDateFilter = {};
      if (resolvedStartDate) saleDateFilter.$gte = resolvedStartDate;
      if (resolvedEndDateExclusive) saleDateFilter.$lt = resolvedEndDateExclusive;
      const saleFilter = {
        isVoided: { $ne: true },
        'items.product': { $in: productIds },
        ...(Object.keys(saleDateFilter).length ? { saleDate: saleDateFilter } : {}),
      };
      // saleFilter matches at the Sale-document level (before $unwind), so
      // each matching receipt is counted exactly once here even if it
      // contains two or more of the tied matched variants (e.g. two colors
      // of the same 14-inch item in one sale) -- summing each variant's own
      // transactionCount instead would double-count that receipt.
      const distinctTransactionCount = await Sale.countDocuments(saleFilter);
      const rows = await Sale.aggregate([
        { $match: saleFilter },
        { $unwind: '$items' },
        { $match: { 'items.product': { $in: productIds } } },
        { $sort: { saleDate: -1 } },
        {
          $group: {
            _id: { product: '$items.product', sale: '$_id' },
            name: { $first: '$items.name' },
            sku: { $first: '$items.sku' },
            quantity: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.total' },
            saleDate: { $first: '$saleDate' },
            saleNumber: { $first: '$saleNumber' },
          },
        },
        { $sort: { saleDate: -1 } },
        {
          $group: {
            _id: '$_id.product',
            name: { $first: '$name' },
            sku: { $first: '$sku' },
            quantity: { $sum: '$quantity' },
            revenue: { $sum: '$revenue' },
            transactionCount: { $sum: 1 },
            lastSoldAt: { $first: '$saleDate' },
            lastSaleNumber: { $first: '$saleNumber' },
          },
        },
      ]);

      const byProductId = new Map(rows.map((row) => [String(row._id), row]));
      const variants = products.map((product) => {
        const row = byProductId.get(String(product._id));
        return {
          id: String(product._id),
          name: row?.name || product.name,
          sku: row?.sku || product.sku || '',
          quantity: asCount(row?.quantity),
          revenue: asMoney(row?.revenue),
          transactionCount: asCount(row?.transactionCount),
          lastSoldAt: row?.lastSoldAt || null,
          lastSaleNumber: row?.lastSaleNumber || '',
        };
      });
      const totals = variants.reduce((acc, variant) => ({
        units: acc.units + variant.quantity,
        revenue: acc.revenue + variant.revenue,
      }), { units: 0, revenue: 0 });
      totals.transactions = asCount(distinctTransactionCount);
      const latestSale = variants
        .filter((variant) => variant.lastSoldAt)
        .sort((left, right) => new Date(right.lastSoldAt) - new Date(left.lastSoldAt))[0] || null;

      const periodLabel = resolvedStartDate || resolvedEndDateDisplay
        ? `between ${resolvedStartDate ? dateLabel(resolvedStartDate) : 'the start of records'} and ${resolvedEndDateDisplay ? dateLabel(resolvedEndDateDisplay) : 'now'}`
        : 'across all recorded sales';
      const variantNames = variants.map((variant) => (variant.sku ? `${variant.name} (${variant.sku})` : variant.name)).join(', ');
      const summary = `Matched "${query}" to ${variants.length} catalogue item${variants.length === 1 ? '' : 's'} (${variantNames}): ${totals.units} units, ${formatKes(totals.revenue)} revenue, ${totals.transactions} matching transaction${totals.transactions === 1 ? '' : 's'} ${periodLabel}${latestSale ? `; latest sale ${dateLabel(latestSale.lastSoldAt)}${latestSale.lastSaleNumber ? ` (receipt ${latestSale.lastSaleNumber})` : ''}` : '; no matching sales in this period'}.`;

      console.log('[adminAi] query_product_sales_history', JSON.stringify({ productQuery: query, matched: true, productCount: products.length, units: totals.units }));
      return {
        ok: true,
        summary,
        data: {
          ...baseData,
          matched: true,
          variants,
          totals: { units: totals.units, revenue: asMoney(totals.revenue), transactions: totals.transactions },
          latestSale,
        },
      };
    },
  },
  {
    name: 'query_customer',
    description: 'Look up a customer by an exact email, userId, or mobile number, or by a partial name you already have from the conversation -- never an unprompted, open-ended browse. Returns up to 5 matches with contact info, order count, and loyalty summary. Cannot be used to dump or enumerate the customer list.',
    input_schema: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        userId: { type: 'string' },
        mobile: { type: 'string' },
        name: { type: 'string', description: 'Partial, case-insensitive name match. Use only when you already have a name to search for, not to browse.' },
      },
      required: [],
    },
    handler: async ({ email, userId, mobile, name } = {}) => {
      if (!email && !userId && !mobile && !name) {
        return { ok: false, summary: 'query_customer rejected: provide an exact email, userId, mobile number, or a name to search for.' };
      }
      let filter;
      if (userId) {
        if (!isValidObjectId(userId)) return { ok: false, summary: 'query_customer rejected: userId is not a valid id.' };
        filter = { _id: userId };
      } else if (email) {
        filter = { email: String(email).trim().toLowerCase() };
      } else if (mobile) {
        filter = { mobile: String(mobile).trim() };
      } else {
        filter = { name: new RegExp(escapeRegExp(name), 'i') };
      }
      const users = await UserModel.find(filter).select('name email mobile status createdAt orderHistory').limit(5).lean();
      if (!users.length) return { ok: true, summary: 'No matching customer found.', data: [] };
      const cards = await LoyaltyCardModel.find({ userId: { $in: users.map((u) => u._id) } }).select('userId tier points').lean();
      const cardByUser = new Map(cards.map((card) => [String(card.userId), card]));
      const data = users.map((user) => {
        const card = cardByUser.get(String(user._id));
        return {
          id: String(user._id),
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          status: user.status,
          createdAt: user.createdAt,
          orderCount: (user.orderHistory || []).length,
          loyaltyTier: card?.tier || null,
          loyaltyPoints: card?.points ?? null,
        };
      });
      console.log('[adminAi] query_customer', JSON.stringify({ hasEmail: Boolean(email), hasUserId: Boolean(userId), hasMobile: Boolean(mobile), hasName: Boolean(name), count: data.length }));
      return { ok: true, summary: `Found ${data.length} matching customer${data.length === 1 ? '' : 's'}.`, data };
    },
  },
  {
    name: 'query_loyalty_card',
    description: 'Look up ONE loyalty card by an exact userId or cardNumber you already have -- never an open-ended search.',
    input_schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        cardNumber: { type: 'string' },
      },
      required: [],
    },
    handler: async ({ userId, cardNumber } = {}) => {
      if (!userId && !cardNumber) return { ok: false, summary: 'query_loyalty_card rejected: provide an exact userId or cardNumber.' };
      let filter;
      if (userId) {
        if (!isValidObjectId(userId)) return { ok: false, summary: 'query_loyalty_card rejected: userId is not a valid id.' };
        filter = { userId };
      } else {
        filter = { cardNumber: String(cardNumber).trim() };
      }
      const cards = await LoyaltyCardModel.find(filter).select('userId cardNumber tier points isActive expiresAt').limit(5).lean();
      return { ok: true, summary: cards.length ? `Found ${cards.length} loyalty card${cards.length === 1 ? '' : 's'}.` : 'No matching loyalty card found.', data: cards };
    },
  },
];

// ── Write tools ───────────────────────────────────────────────────────────
// Only ever offered when ADMIN_AI_AUTONOMOUS_WRITES=true. Every tool below
// mutates exactly one document, is capped, and is written to AdminActionLog
// (executed or rejected) with the model's stated reason.
//
// Caps are a backstop against a single catastrophic call (a hallucinated
// value, a bad prompt injection), not a target -- the system prompt tells the
// model to reason about the right number for the situation, not default to
// the ceiling. They're env-tunable (not a recompile) because what's
// "reasonable" for a small hair-products retailer is a business call, not a
// hardcoded one -- the numbers below are defaults sized for that business,
// not conservative bank-grade limits.
const positiveNumberEnv = (name, fallback) => {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const AI_STOCK_DELTA_CAP = positiveNumberEnv('ADMIN_AI_STOCK_CAP', 500);
const AI_PRICE_CHANGE_CAP_PCT = positiveNumberEnv('ADMIN_AI_PRICE_CAP_PCT', 0.6);
const AI_LOYALTY_POINTS_DELTA_CAP = positiveNumberEnv('ADMIN_AI_LOYALTY_POINTS_CAP', 5000);
// Deliberately excludes 'cancelled', 'delivered', 'dispatched', 'driver_assigned',
// 'out_for_delivery', 'nearby' and anything payment-adjacent: those carry real
// side effects (stock restore, driver capacity, rider-call preconditions) or
// touch money/customer-facing state and stay human-only.
const AI_ORDER_STATUS_FROM = ['pending', 'processing', 'shipped', 'ready_for_pickup'];
const AI_ORDER_STATUS_TO = ['processing', 'shipped', 'ready_for_pickup', 'picked_up'];
const REORDER_DRAFT_RESOLVABLE_STATUSES = ['ordered', 'dismissed'];

// Pure predicates, exported so caps can be unit-tested without a database.
export const isStockDeltaWithinCap = (delta) => {
  const amount = Math.trunc(Number(delta));
  return Number.isFinite(amount) && amount !== 0 && Math.abs(amount) <= AI_STOCK_DELTA_CAP;
};

export const isPriceChangeWithinCap = (currentPrice, newPrice) => {
  const current = Number(currentPrice);
  const next = Number(newPrice);
  if (!Number.isFinite(current) || !Number.isFinite(next) || next <= 0) return false;
  const changeRatio = current > 0 ? Math.abs(next - current) / current : 1;
  return changeRatio <= AI_PRICE_CHANGE_CAP_PCT;
};

export const isOrderStatusTransitionAllowed = (fromStatus, toStatus) =>
  AI_ORDER_STATUS_FROM.includes(fromStatus) && AI_ORDER_STATUS_TO.includes(toStatus);

export const isReorderDraftStatusAllowed = (status) => REORDER_DRAFT_RESOLVABLE_STATUSES.includes(status);

export const isLoyaltyPointsDeltaWithinCap = (delta) => {
  const amount = Math.trunc(Number(delta));
  return Number.isFinite(amount) && amount !== 0 && Math.abs(amount) <= AI_LOYALTY_POINTS_DELTA_CAP;
};

const runAdjustStock = async ({ productId, delta, reason }) => {
  const amount = Math.trunc(Number(delta));
  if (!productId || !Number.isFinite(amount) || amount === 0) {
    return { ok: false, summary: 'adjust_stock rejected: invalid product or delta.' };
  }
  if (!isStockDeltaWithinCap(amount)) {
    await logAiAction({
      action: 'ai_adjust_stock_rejected', target: { model: 'Product', id: productId },
      reason: `Rejected: delta ${amount} exceeds the +/-${AI_STOCK_DELTA_CAP} cap. Owner reason given: ${reason || 'none'}`,
    });
    return { ok: false, summary: `adjust_stock rejected: ${amount} exceeds the +/-${AI_STOCK_DELTA_CAP} per-call cap.` };
  }
  const before = await ProductModel.findById(productId).select('name stock').lean();
  if (!before) return { ok: false, summary: 'adjust_stock rejected: product not found.' };
  const updated = await ProductModel.findByIdAndUpdate(productId, { $inc: { stock: amount } }, { new: true }).select('name stock');
  await InventoryMovementModel.create({
    product: productId,
    type: 'stocktake_adjustment',
    shopDelta: amount,
    reason: reason || 'AI copilot stock adjustment',
  });
  await logAiAction({
    action: 'ai_adjust_stock', target: { model: 'Product', id: productId },
    before: { stock: before.stock }, after: { stock: updated.stock }, reason,
  });
  return { ok: true, summary: `Adjusted ${updated.name} stock by ${amount > 0 ? '+' : ''}${amount} (now ${updated.stock}).` };
};

const runDraftReorder = async ({ productId, suggestedQuantity, reason }) => {
  const quantity = Math.trunc(Number(suggestedQuantity));
  if (!productId || !Number.isFinite(quantity) || quantity <= 0) {
    return { ok: false, summary: 'draft_reorder rejected: invalid product or quantity.' };
  }
  const product = await ProductModel.findById(productId).select('name').lean();
  if (!product) return { ok: false, summary: 'draft_reorder rejected: product not found.' };
  await ReorderDraftModel.create({ product: productId, suggestedQuantity: quantity, reason, createdBy: 'ai' });
  await logAiAction({ action: 'ai_draft_reorder', target: { model: 'Product', id: productId }, after: { suggestedQuantity: quantity }, reason });
  return { ok: true, summary: `Drafted a reorder suggestion for ${product.name}: ${quantity} units. Awaiting owner review.` };
};

const runUpdateOrderStatus = async ({ orderId, status, reason }) => {
  if (!orderId || !AI_ORDER_STATUS_TO.includes(status)) {
    return { ok: false, summary: `update_order_status rejected: status must be one of ${AI_ORDER_STATUS_TO.join(', ')}.` };
  }
  const order = await OrderModel.findOne({ orderId }).select('status').lean();
  if (!order) return { ok: false, summary: 'update_order_status rejected: order not found.' };
  if (!isOrderStatusTransitionAllowed(order.status, status)) {
    await logAiAction({
      action: 'ai_update_order_status_rejected', target: { model: 'Order', id: orderId },
      reason: `Rejected: current status "${order.status}" is not eligible for AI transitions. Owner reason given: ${reason || 'none'}`,
    });
    return { ok: false, summary: `update_order_status rejected: order is currently "${order.status}", which the AI is not allowed to change.` };
  }
  await OrderModel.updateMany(
    { orderId },
    { $set: { status }, $push: { statusHistory: { status, timestamp: new Date(), note: `AI copilot: ${reason || 'no reason given'}` } } },
  );
  await logAiAction({
    action: 'ai_update_order_status', target: { model: 'Order', id: orderId },
    before: { status: order.status }, after: { status }, reason,
  });
  return { ok: true, summary: `Moved order ${orderId} from ${order.status} to ${status}.` };
};

const runAdjustPrice = async ({ productId, newPrice, reason }) => {
  const price = Number(newPrice);
  if (!productId || !Number.isFinite(price) || price <= 0) {
    return { ok: false, summary: 'adjust_price rejected: invalid product or price.' };
  }
  const before = await ProductModel.findById(productId).select('name price').lean();
  if (!before) return { ok: false, summary: 'adjust_price rejected: product not found.' };
  if (!isPriceChangeWithinCap(before.price, price)) {
    await logAiAction({
      action: 'ai_adjust_price_rejected', target: { model: 'Product', id: productId },
      before: { price: before.price },
      reason: `Rejected: KES ${before.price} -> ${price} exceeds the +/-${Math.round(AI_PRICE_CHANGE_CAP_PCT * 100)}% cap. Owner reason given: ${reason || 'none'}`,
    });
    return { ok: false, summary: `adjust_price rejected: KES ${before.price} -> ${price} exceeds the +/-${Math.round(AI_PRICE_CHANGE_CAP_PCT * 100)}% per-call cap.` };
  }
  const updated = await ProductModel.findByIdAndUpdate(productId, { $set: { price } }, { new: true }).select('name price');
  await logAiAction({
    action: 'ai_adjust_price', target: { model: 'Product', id: productId },
    before: { price: before.price }, after: { price: updated.price }, reason,
  });
  return { ok: true, summary: `Changed ${updated.name} price from KES ${before.price} to KES ${updated.price}.` };
};

const runResolveReorderDraft = async ({ draftId, status, reason }) => {
  if (!draftId || !isValidObjectId(draftId) || !isReorderDraftStatusAllowed(status)) {
    return { ok: false, summary: `resolve_reorder_draft rejected: provide a valid draft id and a status of ${REORDER_DRAFT_RESOLVABLE_STATUSES.join(' or ')}.` };
  }
  const draft = await ReorderDraftModel.findById(draftId);
  if (!draft) return { ok: false, summary: 'resolve_reorder_draft rejected: draft not found.' };
  if (draft.status !== 'open') {
    return { ok: false, summary: `resolve_reorder_draft rejected: draft is already "${draft.status}".` };
  }
  const before = draft.status;
  draft.status = status;
  await draft.save();
  await logAiAction({
    action: 'ai_resolve_reorder_draft', target: { model: 'ReorderDraft', id: draftId },
    before: { status: before }, after: { status }, reason,
  });
  return { ok: true, summary: `Marked the reorder draft as "${status}".` };
};

const runAdjustDeliveryZoneFare = async ({ zoneId, newFare, reason }) => {
  const fare = Number(newFare);
  if (!zoneId || !isValidObjectId(zoneId) || !Number.isFinite(fare) || fare <= 0) {
    return { ok: false, summary: 'adjust_delivery_zone_fare rejected: invalid zone or fare.' };
  }
  const before = await DeliveryZoneModel.findById(zoneId).select('name fare').lean();
  if (!before) return { ok: false, summary: 'adjust_delivery_zone_fare rejected: zone not found.' };
  if (!isPriceChangeWithinCap(before.fare, fare)) {
    await logAiAction({
      action: 'ai_adjust_delivery_zone_fare_rejected', target: { model: 'DeliveryZone', id: zoneId },
      before: { fare: before.fare },
      reason: `Rejected: KES ${before.fare} -> ${fare} exceeds the +/-${Math.round(AI_PRICE_CHANGE_CAP_PCT * 100)}% cap. Owner reason given: ${reason || 'none'}`,
    });
    return { ok: false, summary: `adjust_delivery_zone_fare rejected: KES ${before.fare} -> ${fare} exceeds the +/-${Math.round(AI_PRICE_CHANGE_CAP_PCT * 100)}% per-call cap.` };
  }
  const updated = await DeliveryZoneModel.findByIdAndUpdate(zoneId, { $set: { fare } }, { new: true }).select('name fare');
  await logAiAction({
    action: 'ai_adjust_delivery_zone_fare', target: { model: 'DeliveryZone', id: zoneId },
    before: { fare: before.fare }, after: { fare: updated.fare }, reason,
  });
  return { ok: true, summary: `Changed ${updated.name} delivery fare from ${formatKes(before.fare)} to ${formatKes(updated.fare)}.` };
};

const runAdjustLoyaltyPoints = async ({ userId, delta, reason }) => {
  const amount = Math.trunc(Number(delta));
  if (!userId || !isValidObjectId(userId) || !isLoyaltyPointsDeltaWithinCap(amount)) {
    return { ok: false, summary: `adjust_loyalty_points rejected: provide a valid customer and a delta within +/-${AI_LOYALTY_POINTS_DELTA_CAP}.` };
  }
  const card = await LoyaltyCardModel.findOne({ userId });
  if (!card) return { ok: false, summary: 'adjust_loyalty_points rejected: this customer has no loyalty card.' };
  const before = card.points;
  card.points = Math.max(0, before + amount);
  card.pointsHistory.push({ points: amount, reason: reason || 'AI copilot adjustment' });
  await card.save();
  await logAiAction({
    action: 'ai_adjust_loyalty_points', target: { model: 'LoyaltyCard', id: String(card._id) },
    before: { points: before }, after: { points: card.points }, reason,
  });
  return { ok: true, summary: `Adjusted loyalty points by ${amount > 0 ? '+' : ''}${amount} (now ${card.points}).` };
};

const WRITE_TOOLS = [
  {
    name: 'adjust_stock',
    description: `Correct a product's live shop stock count (e.g. fixing a negative or wrong number). Capped to +/-${AI_STOCK_DELTA_CAP} units per call. Also records the change in the InventoryMovement ledger.`,
    input_schema: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'The Product _id.' },
        delta: { type: 'number', description: `Amount to change stock by (can be negative). Max magnitude ${AI_STOCK_DELTA_CAP}.` },
        reason: { type: 'string', description: 'Why this change is being made.' },
      },
      required: ['productId', 'delta', 'reason'],
    },
    handler: runAdjustStock,
  },
  {
    name: 'draft_reorder',
    description: 'Create a restock suggestion for the owner to review and send manually. Never sent anywhere on its own.',
    input_schema: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'The Product _id.' },
        suggestedQuantity: { type: 'number', description: 'Suggested reorder quantity.' },
        reason: { type: 'string', description: 'Why this reorder is suggested.' },
      },
      required: ['productId', 'suggestedQuantity', 'reason'],
    },
    handler: runDraftReorder,
  },
  {
    name: 'update_order_status',
    description: `Move an order forward through early, non-payment fulfillment states only. Allowed target statuses: ${AI_ORDER_STATUS_TO.join(', ')}. Never use for cancellations, refunds, or delivery/driver states.`,
    input_schema: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'The public orderId.' },
        status: { type: 'string', enum: AI_ORDER_STATUS_TO },
        reason: { type: 'string', description: 'Why this status change is being made.' },
      },
      required: ['orderId', 'status', 'reason'],
    },
    handler: runUpdateOrderStatus,
  },
  {
    name: 'adjust_price',
    description: `Change a product's price. Capped to +/-${Math.round(AI_PRICE_CHANGE_CAP_PCT * 100)}% of its current price per call.`,
    input_schema: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'The Product _id.' },
        newPrice: { type: 'number', description: 'The new price in KES.' },
        reason: { type: 'string', description: 'Why this price change is being made.' },
      },
      required: ['productId', 'newPrice', 'reason'],
    },
    handler: runAdjustPrice,
  },
  {
    name: 'resolve_reorder_draft',
    description: 'Mark an open reorder-draft suggestion as ordered (owner acted on it) or dismissed (owner decided not to reorder).',
    input_schema: {
      type: 'object',
      properties: {
        draftId: { type: 'string', description: 'The ReorderDraft _id.' },
        status: { type: 'string', enum: REORDER_DRAFT_RESOLVABLE_STATUSES },
        reason: { type: 'string', description: 'Why this draft is being resolved.' },
      },
      required: ['draftId', 'status', 'reason'],
    },
    handler: runResolveReorderDraft,
  },
  {
    name: 'adjust_delivery_zone_fare',
    description: `Correct a delivery zone's bike-delivery fare. Capped to +/-${Math.round(AI_PRICE_CHANGE_CAP_PCT * 100)}% of its current fare per call.`,
    input_schema: {
      type: 'object',
      properties: {
        zoneId: { type: 'string', description: 'The DeliveryZone _id.' },
        newFare: { type: 'number', description: 'The new fare in KES.' },
        reason: { type: 'string', description: 'Why this fare change is being made.' },
      },
      required: ['zoneId', 'newFare', 'reason'],
    },
    handler: runAdjustDeliveryZoneFare,
  },
  {
    name: 'adjust_loyalty_points',
    description: `Nudge a single customer's loyalty points balance (e.g. a goodwill credit or a correction). Capped to +/-${AI_LOYALTY_POINTS_DELTA_CAP} points per call. Tier is always recalculated automatically from the points balance -- this tool cannot set a tier directly, and cannot change program-wide thresholds.`,
    input_schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'The customer User _id.' },
        delta: { type: 'number', description: `Points to add or subtract. Max magnitude ${AI_LOYALTY_POINTS_DELTA_CAP}.` },
        reason: { type: 'string', description: 'Why this adjustment is being made.' },
      },
      required: ['userId', 'delta', 'reason'],
    },
    handler: runAdjustLoyaltyPoints,
  },
];

// ── Public surface ────────────────────────────────────────────────────────
export const READ_TOOL_DEFINITIONS = READ_TOOLS.map(({ name, description, input_schema }) => ({ name, description, input_schema }));
export const WRITE_TOOL_DEFINITIONS = WRITE_TOOLS.map(({ name, description, input_schema }) => ({ name, description, input_schema }));

// Anthropic (Arche Axon /v1/messages) is this module's native shape; the
// OpenAI SDK branch needs {type:'function', function:{name, description,
// parameters}} instead. One adapter, one source of truth for every schema.
export const toOpenAiTool = ({ name, description, input_schema }) => ({
  type: 'function',
  function: { name, description, parameters: input_schema },
});

const TOOL_HANDLERS = Object.fromEntries([...READ_TOOLS, ...WRITE_TOOLS].map((tool) => [tool.name, tool.handler]));
const TOOL_KIND = Object.fromEntries([
  ...READ_TOOLS.map((tool) => [tool.name, 'read']),
  ...WRITE_TOOLS.map((tool) => [tool.name, 'write']),
]);

// rawArgs may be a JSON string (OpenAI SDK tool_calls) or an already-parsed
// object (Anthropic /v1/messages tool_use.input).
export const executeAiTool = async (name, rawArgs) => {
  const kind = TOOL_KIND[name] || 'read';
  let args;
  if (rawArgs && typeof rawArgs === 'object') {
    args = rawArgs;
  } else {
    try {
      args = JSON.parse(rawArgs || '{}');
    } catch {
      return { ok: false, summary: `${name} rejected: could not parse arguments.`, type: kind };
    }
  }
  const handler = TOOL_HANDLERS[name];
  if (!handler) return { ok: false, summary: `${name} rejected: unknown tool.`, type: kind };
  try {
    const result = await handler(args);
    return { ...result, type: kind };
  } catch (error) {
    console.error(`AI tool ${name} failed:`, error);
    return { ok: false, summary: `${name} failed unexpectedly.`, type: kind };
  }
};
