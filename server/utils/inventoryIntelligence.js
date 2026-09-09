import InventoryPolicyModel from '../models/inventoryPolicy.model.js';
import ProductModel from '../models/product.model.js';
import PurchaseOrderModel from '../models/purchaseOrder.model.js';
import Sale from '../models/sale.model.js';
import SupplierModel from '../models/supplier.model.js';

// ── Pure calculation core ────────────────────────────────────────────────
// No I/O below this line -- every function here takes already-fetched data
// and returns a number or plain object, so the actual math is unit-tested
// without a database (see server/test/inventoryIntelligence.test.mjs).

export const DEFAULT_LEAD_TIME_DAYS = 7;
export const DEFAULT_SAFETY_DAYS = 4;

// Blends 30/60/90-day daily-unit rates, weighted toward recent activity --
// a full statistical demand model is a roadmap item, not this phase.
const VELOCITY_WEIGHTS = { d30: 0.5, d60: 0.3, d90: 0.2 };

export const computeBlendedVelocity = ({ units30 = 0, units60 = 0, units90 = 0 }) => {
  const rate30 = units30 / 30;
  const rate60 = units60 / 60;
  const rate90 = units90 / 90;
  return (rate30 * VELOCITY_WEIGHTS.d30) + (rate60 * VELOCITY_WEIGHTS.d60) + (rate90 * VELOCITY_WEIGHTS.d90);
};

// ROP = (avg daily usage x lead time) + safety stock. safetyStock, when
// given explicitly (the statistical Z-score figure below), is used as-is;
// otherwise this falls back to the original flat velocity x safety-day
// buffer -- the conservative default for a product with too little sales
// history to compute a meaningful demand standard deviation from.
export const computeReorderPoint = ({ velocity, leadTimeDays = DEFAULT_LEAD_TIME_DAYS, safetyDays = DEFAULT_SAFETY_DAYS, safetyStock }) => {
  const safeVelocity = Number.isFinite(velocity) && velocity > 0 ? velocity : 0;
  const safeLeadTime = Number.isFinite(leadTimeDays) && leadTimeDays > 0 ? leadTimeDays : DEFAULT_LEAD_TIME_DAYS;
  const resolvedSafetyStock = Number.isFinite(safetyStock) ? Math.max(0, safetyStock) : safeVelocity * safetyDays;
  return Math.ceil((safeVelocity * safeLeadTime) + resolvedSafetyStock);
};

// Service-level -> Z-score, the standard operations-management lookup
// (Heizer & Render). Non-linear on purpose: 90% -> 99% roughly doubles the
// required safety stock, which is the real-world tradeoff a service-level
// choice represents, not a bug in the table.
export const SERVICE_LEVEL_Z_SCORES = { 0.90: 1.28, 0.95: 1.65, 0.975: 1.96, 0.99: 2.33 };
export const DEFAULT_SERVICE_LEVEL = 0.95;

export const resolveZScore = (serviceLevel) => SERVICE_LEVEL_Z_SCORES[serviceLevel] || SERVICE_LEVEL_Z_SCORES[DEFAULT_SERVICE_LEVEL];

// Population standard deviation of daily unit sales (dailyUnits should
// already include the zero-sale days in the window, not just the days that
// had a sale -- omitting them would understate real demand variability).
export const computeStandardDeviation = (dailyUnits = []) => {
  if (!dailyUnits.length) return 0;
  const mean = dailyUnits.reduce((total, units) => total + units, 0) / dailyUnits.length;
  const variance = dailyUnits.reduce((total, units) => total + ((units - mean) ** 2), 0) / dailyUnits.length;
  return Math.sqrt(variance);
};

// SS = Z x sigma_d x sqrt(lead time) -- the standard statistical safety
// stock formula, sized to hit a target service level (probability of not
// stocking out during the lead-time window) rather than an arbitrary flat
// day-count buffer.
export const computeStatisticalSafetyStock = ({ demandStdDev, leadTimeDays = DEFAULT_LEAD_TIME_DAYS, serviceLevel = DEFAULT_SERVICE_LEVEL }) => {
  const safeStdDev = Number.isFinite(demandStdDev) && demandStdDev > 0 ? demandStdDev : 0;
  const safeLeadTime = Number.isFinite(leadTimeDays) && leadTimeDays > 0 ? leadTimeDays : DEFAULT_LEAD_TIME_DAYS;
  return resolveZScore(serviceLevel) * safeStdDev * Math.sqrt(safeLeadTime);
};

// Clamped at 0 rather than going negative: a negative currentStock means the
// shop is oversold, and "-41.9 days of cover" reads as a broken number, not
// as the (true) fact that there is no buffer left at all -- 0 says that
// plainly. null is reserved for "no velocity signal to compute from."
export const computeDaysOfCover = (currentStock, velocity) => (
  Number.isFinite(velocity) && velocity > 0 ? Math.max(0, Number((currentStock / velocity).toFixed(1))) : null
);

// samples: array of millisecond durations (receivedAt - orderedAt).
export const computeLeadTimeFromSamples = (samples = []) => {
  const valid = samples.filter((ms) => Number.isFinite(ms) && ms >= 0).map((ms) => ms / 86_400_000);
  if (!valid.length) return DEFAULT_LEAD_TIME_DAYS;
  return Number((valid.reduce((total, days) => total + days, 0) / valid.length).toFixed(1));
};

// orders: array of plain PurchaseOrder documents for one supplier.
export const computeSupplierScorecardFromOrders = (orders = []) => {
  const completed = orders.filter((order) => order.receivedAt && order.orderedAt);
  const onTimeCount = completed.filter((order) => new Date(order.receivedAt) <= new Date(order.expectedDate || order.receivedAt)).length;
  const leadTimeDays = computeLeadTimeFromSamples(completed.map((order) => new Date(order.receivedAt) - new Date(order.orderedAt)));
  const lineStats = orders.flatMap((order) => order.lines || []).reduce((totals, line) => ({
    ordered: totals.ordered + (line.orderedQuantity || 0),
    received: totals.received + (line.receivedQuantity || 0),
  }), { ordered: 0, received: 0 });
  const accuracyRate = lineStats.ordered > 0 ? Number(((lineStats.received / lineStats.ordered) * 100).toFixed(1)) : null;
  return {
    totalOrders: orders.length,
    completedOrders: completed.length,
    onTimeRate: completed.length ? Number(((onTimeCount / completed.length) * 100).toFixed(1)) : null,
    averageLeadTimeDays: completed.length ? leadTimeDays : null,
    orderAccuracyRate: accuracyRate,
  };
};

// ── Bulk DB-backed orchestration ─────────────────────────────────────────
// One pass over the catalog/sales/purchase-order history, not N+1 queries
// per product -- the replenishment queue can cover the whole catalog.

const windowStart = (days) => new Date(Date.now() - days * 86_400_000);

// Returns Map<productId string, avg daily units>. Pass productIds to scope
// the aggregation; omit for the whole catalog.
export const calculateSalesVelocity = async (productIds = null) => {
  const productMatch = productIds ? { 'items.product': { $in: productIds } } : {};
  const unitsSince = async (days) => {
    const rows = await Sale.aggregate([
      { $match: { saleDate: { $gte: windowStart(days) }, isVoided: { $ne: true } } },
      { $unwind: '$items' },
      { $match: productMatch },
      { $group: { _id: '$items.product', units: { $sum: '$items.quantity' } } },
    ]);
    return new Map(rows.map((row) => [String(row._id), row.units]));
  };
  const [units30, units60, units90] = await Promise.all([unitsSince(30), unitsSince(60), unitsSince(90)]);
  const productKeys = new Set([...units30.keys(), ...units60.keys(), ...units90.keys()]);
  const velocityByProduct = new Map();
  for (const key of productKeys) {
    velocityByProduct.set(key, computeBlendedVelocity({
      units30: units30.get(key) || 0, units60: units60.get(key) || 0, units90: units90.get(key) || 0,
    }));
  }
  return velocityByProduct;
};

// Per-product daily-unit standard deviation over the trailing window,
// including zero-sale days (a product that sells only every third day is
// genuinely more variable than one that sells a steady trickle -- omitting
// the zero days would understate that). One aggregation for the whole
// catalog (or a productIds subset), not one query per product. Returns
// Map<productId string, { stdDev, sampleDays }> -- sampleDays lets a caller
// decide whether there's enough history to trust the statistical figure.
export const calculateDailyDemandStdDev = async (productIds = null, windowDays = 60) => {
  const productMatch = productIds ? { 'items.product': { $in: productIds } } : {};
  const rows = await Sale.aggregate([
    { $match: { saleDate: { $gte: windowStart(windowDays) }, isVoided: { $ne: true } } },
    { $unwind: '$items' },
    { $match: productMatch },
    {
      $group: {
        _id: { product: '$items.product', day: { $dateToString: { format: '%Y-%m-%d', date: '$saleDate', timezone: 'Africa/Nairobi' } } },
        units: { $sum: '$items.quantity' },
      },
    },
  ]);

  const unitsByProductAndDay = new Map();
  for (const row of rows) {
    const key = String(row._id.product);
    if (!unitsByProductAndDay.has(key)) unitsByProductAndDay.set(key, new Map());
    unitsByProductAndDay.get(key).set(row._id.day, row.units);
  }

  const dayKeys = Array.from({ length: windowDays }, (_, index) => {
    const date = new Date(Date.now() - index * 86_400_000);
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(date); // en-CA -> YYYY-MM-DD
  });

  const stdDevByProduct = new Map();
  for (const [productKey, dayMap] of unitsByProductAndDay) {
    const dailyUnits = dayKeys.map((day) => dayMap.get(day) || 0);
    stdDevByProduct.set(productKey, { stdDev: computeStandardDeviation(dailyUnits), sampleDays: dayMap.size });
  }
  return stdDevByProduct;
};

// Average actual lead time (receivedAt - orderedAt) across a supplier's
// completed purchase orders, falling back to DEFAULT_LEAD_TIME_DAYS.
export const calculateSupplierLeadTime = async (supplierId) => {
  const orders = await PurchaseOrderModel.find({ supplier: supplierId, orderedAt: { $ne: null }, receivedAt: { $ne: null } })
    .select('orderedAt receivedAt').lean();
  return computeLeadTimeFromSamples(orders.map((order) => new Date(order.receivedAt) - new Date(order.orderedAt)));
};

export const buildSupplierScorecard = async (supplierId) => {
  const orders = await PurchaseOrderModel.find({ supplier: supplierId }).select('orderedAt receivedAt expectedDate lines').lean();
  return computeSupplierScorecardFromOrders(orders);
};

export const buildAllSupplierScorecards = async () => {
  const suppliers = await SupplierModel.find({}).select('name active').lean();
  const orders = await PurchaseOrderModel.find({}).select('supplier orderedAt receivedAt expectedDate lines').lean();
  const ordersBySupplier = new Map();
  for (const order of orders) {
    const key = String(order.supplier);
    if (!ordersBySupplier.has(key)) ordersBySupplier.set(key, []);
    ordersBySupplier.get(key).push(order);
  }
  return suppliers.map((supplier) => ({
    supplierId: String(supplier._id),
    name: supplier.name,
    active: supplier.active,
    ...computeSupplierScorecardFromOrders(ordersBySupplier.get(String(supplier._id)) || []),
  }));
};

// Below this many distinct sale-days in the 60-day stddev window, a
// standard deviation is too noisy to trust (e.g. one single sale day of 8
// units reads as "wildly variable" when it may just be a new or rarely-sold
// item) -- falls back to the flat safety-day heuristic instead.
const MIN_SAMPLE_DAYS_FOR_STATISTICAL_SAFETY_STOCK = 10;

// The replenishment queue: every published product at or below its reorder
// point (computed, or an InventoryPolicy override), sorted most-urgent
// first. One pass over products/sales/purchase-orders/policies, not one
// query per product. Safety stock is statistical (Z-score x demand stddev x
// sqrt(lead time)) for products with enough sale-day history to trust;
// everything else keeps the original flat velocity x safetyDays buffer.
export const buildReplenishmentQueue = async ({ safetyDays = DEFAULT_SAFETY_DAYS, serviceLevel = DEFAULT_SERVICE_LEVEL } = {}) => {
  const [products, velocityByProduct, demandStdDevByProduct, policies, recentOrders, suppliers] = await Promise.all([
    ProductModel.find({ publish: true }).select('name sku stock warehouseStock costPrice').lean(),
    calculateSalesVelocity(),
    calculateDailyDemandStdDev(),
    InventoryPolicyModel.find({}).lean(),
    PurchaseOrderModel.find({}).sort({ createdAt: -1 }).select('supplier lines orderedAt receivedAt').lean(),
    SupplierModel.find({}).select('name').lean(),
  ]);

  const policyByProduct = new Map(policies.map((policy) => [String(policy.product), policy]));
  const supplierNameById = new Map(suppliers.map((supplier) => [String(supplier._id), supplier.name]));

  // Most recently ordered supplier per product (recentOrders is already
  // newest-first, so the first hit per product wins), and per-supplier
  // completed-lead-time samples, both from a single pass.
  const lastSupplierByProduct = new Map();
  const leadTimeSamplesBySupplier = new Map();
  for (const order of recentOrders) {
    for (const line of order.lines || []) {
      const productKey = String(line.product);
      if (!lastSupplierByProduct.has(productKey)) lastSupplierByProduct.set(productKey, String(order.supplier));
    }
    if (order.orderedAt && order.receivedAt) {
      const supplierKey = String(order.supplier);
      if (!leadTimeSamplesBySupplier.has(supplierKey)) leadTimeSamplesBySupplier.set(supplierKey, []);
      leadTimeSamplesBySupplier.get(supplierKey).push(new Date(order.receivedAt) - new Date(order.orderedAt));
    }
  }
  const leadTimeForSupplier = (supplierId) => (
    supplierId ? computeLeadTimeFromSamples(leadTimeSamplesBySupplier.get(String(supplierId)) || []) : DEFAULT_LEAD_TIME_DAYS
  );

  const queue = [];
  for (const product of products) {
    const productKey = String(product._id);
    const policy = policyByProduct.get(productKey);
    const velocity = velocityByProduct.get(productKey) || 0;
    const supplierId = policy?.preferredSupplier ? String(policy.preferredSupplier) : (lastSupplierByProduct.get(productKey) || null);
    const leadTimeDays = leadTimeForSupplier(supplierId);
    const demandStats = demandStdDevByProduct.get(productKey);
    const usesStatisticalSafetyStock = Boolean(demandStats) && demandStats.sampleDays >= MIN_SAMPLE_DAYS_FOR_STATISTICAL_SAFETY_STOCK;
    const safetyStock = usesStatisticalSafetyStock
      ? computeStatisticalSafetyStock({ demandStdDev: demandStats.stdDev, leadTimeDays, serviceLevel })
      : undefined; // undefined -> computeReorderPoint falls back to the flat safetyDays heuristic
    const computedPoint = computeReorderPoint({ velocity, leadTimeDays, safetyDays, safetyStock });
    const reorderPoint = Number.isFinite(policy?.manualReorderPoint) ? policy.manualReorderPoint : computedPoint;
    const currentStock = Number(product.stock || 0);
    if (currentStock > reorderPoint) continue;

    const daysOfCover = computeDaysOfCover(currentStock, velocity);
    queue.push({
      productId: productKey,
      name: product.name,
      sku: product.sku || '',
      safetyStockMethod: usesStatisticalSafetyStock ? 'statistical' : 'default',
      serviceLevel: usesStatisticalSafetyStock ? serviceLevel : null,
      currentStock,
      warehouseStock: Number(product.warehouseStock || 0),
      velocityPerDay: Number(velocity.toFixed(2)),
      leadTimeDays,
      reorderPoint,
      isManualOverride: Number.isFinite(policy?.manualReorderPoint),
      daysOfCover,
      suggestedOrderQuantity: Number.isFinite(policy?.reorderQuantity) ? policy.reorderQuantity : Math.max(reorderPoint - currentStock, 1),
      supplierId,
      supplierName: supplierId ? (supplierNameById.get(supplierId) || null) : null,
      costPrice: Number(product.costPrice || 0),
      urgency: currentStock <= 0 ? 'critical' : (daysOfCover !== null && daysOfCover < leadTimeDays ? 'high' : 'low'),
    });
  }

  queue.sort((left, right) => (left.daysOfCover ?? -1) - (right.daysOfCover ?? -1));
  return queue;
};

// ── Dead stock / aging report ────────────────────────────────────────────
const DEAD_STOCK_SLOW_THRESHOLD_DAYS = 90;
const DEAD_STOCK_DEAD_THRESHOLD_DAYS = 180;
// A product must have existed at least this long before "never sold" means
// anything -- one added yesterday hasn't had a fair chance to sell yet.
const NEVER_SOLD_MIN_AGE_DAYS = 30;

export const classifyStockAge = (daysSinceLastSale) => {
  if (daysSinceLastSale === null) return 'never_sold';
  if (daysSinceLastSale < DEAD_STOCK_SLOW_THRESHOLD_DAYS) return 'healthy';
  if (daysSinceLastSale < DEAD_STOCK_DEAD_THRESHOLD_DAYS) return 'slow';
  return 'dead';
};

// Every in-stock product that hasn't sold in >= 90 days (or has never sold
// and has been in the catalog long enough that this is meaningful),
// sorted by KES value trapped in unsold units -- the biggest, most
// actionable number first, not just the oldest.
export const buildDeadStockReport = async () => {
  const [products, lastSaleRows] = await Promise.all([
    ProductModel.find({ publish: true, stock: { $gt: 0 } }).select('name sku stock costPrice createdAt').lean(),
    Sale.aggregate([
      { $match: { isVoided: { $ne: true } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.product', lastSoldAt: { $max: '$saleDate' } } },
    ]),
  ]);

  const lastSoldByProduct = new Map(lastSaleRows.map((row) => [String(row._id), row.lastSoldAt]));
  const now = Date.now();
  const rows = [];
  for (const product of products) {
    const lastSoldAt = lastSoldByProduct.get(String(product._id)) || null;
    const daysSinceLastSale = lastSoldAt ? Math.floor((now - new Date(lastSoldAt).getTime()) / 86_400_000) : null;
    const ageInCatalogDays = Math.floor((now - new Date(product.createdAt).getTime()) / 86_400_000);
    if (daysSinceLastSale === null && ageInCatalogDays < NEVER_SOLD_MIN_AGE_DAYS) continue;

    const bucket = classifyStockAge(daysSinceLastSale);
    if (bucket === 'healthy') continue;

    const stock = Number(product.stock || 0);
    const costPrice = Number(product.costPrice || 0);
    rows.push({
      productId: String(product._id),
      name: product.name,
      sku: product.sku || '',
      stock,
      costPrice,
      trappedValue: Math.round(stock * costPrice),
      lastSoldAt,
      daysSinceLastSale,
      bucket,
    });
  }

  rows.sort((left, right) => right.trappedValue - left.trappedValue);
  return {
    items: rows,
    totalTrappedValue: rows.reduce((total, row) => total + row.trappedValue, 0),
    counts: {
      slow: rows.filter((row) => row.bucket === 'slow').length,
      dead: rows.filter((row) => row.bucket === 'dead').length,
      neverSold: rows.filter((row) => row.bucket === 'never_sold').length,
    },
  };
};

// ── ABC classification ───────────────────────────────────────────────────
// Cumulative-share Pareto cutoffs (the standard ABC method): A = items
// making up the first 80% of total consumption value, B = the next 15%
// (to 95%), C = the trailing 5%. Ranked by COST-based annual consumption
// value (velocity x cost x 365), not retail revenue -- revenue-based
// ranking overweights high-margin items and understates capital tied up in
// bulk low-margin stock (the single most common ABC implementation mistake).
const ABC_CUMULATIVE_CUTOFFS = { A: 0.8, B: 0.95 };

export const classifyAbcCumulative = (cumulativeShare) => {
  if (cumulativeShare <= ABC_CUMULATIVE_CUTOFFS.A) return 'A';
  if (cumulativeShare <= ABC_CUMULATIVE_CUTOFFS.B) return 'B';
  return 'C';
};

export const buildAbcClassification = async () => {
  const [products, velocityByProduct] = await Promise.all([
    ProductModel.find({ publish: true }).select('name sku costPrice stock').lean(),
    calculateSalesVelocity(),
  ]);

  const rows = products.map((product) => {
    const velocity = velocityByProduct.get(String(product._id)) || 0;
    const costPrice = Number(product.costPrice || 0);
    return {
      productId: String(product._id),
      name: product.name,
      sku: product.sku || '',
      costPrice,
      stock: product.stock,
      velocityPerDay: Number(velocity.toFixed(2)),
      annualConsumptionValue: Math.round(velocity * costPrice * 365),
    };
  }).sort((left, right) => right.annualConsumptionValue - left.annualConsumptionValue);

  const totalValue = rows.reduce((total, row) => total + row.annualConsumptionValue, 0);
  let cumulativeValue = 0;
  for (const row of rows) {
    cumulativeValue += row.annualConsumptionValue;
    row.cumulativeShare = totalValue > 0 ? Number((cumulativeValue / totalValue).toFixed(4)) : 1;
    row.classification = totalValue > 0 ? classifyAbcCumulative(row.cumulativeShare) : 'C';
  }

  return {
    items: rows,
    totalAnnualConsumptionValue: Math.round(totalValue),
    counts: {
      A: rows.filter((row) => row.classification === 'A').length,
      B: rows.filter((row) => row.classification === 'B').length,
      C: rows.filter((row) => row.classification === 'C').length,
    },
  };
};

// Daily revenue + units for the last N days (non-voided sales only) --
// backs the Store Command Center's sales trend chart. Bucketed in Nairobi
// local time so a day's figures match what the owner sees on the shop floor.
export const buildSalesTrend = async (days = 30) => {
  const rows = await Sale.aggregate([
    { $match: { saleDate: { $gte: windowStart(days) }, isVoided: { $ne: true } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$saleDate', timezone: 'Africa/Nairobi' } },
        revenue: { $sum: '$total' },
        units: { $sum: { $sum: '$items.quantity' } },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  return rows.map((row) => ({ date: row._id, revenue: Math.round(row.revenue), units: row.units }));
};
