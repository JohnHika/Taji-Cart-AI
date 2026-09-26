import DeliveryPersonnelModel from '../models/deliverypersonnel.model.js';
import DriverFinancialModel from '../models/driverfinancial.model.js';
import DriverPerformanceModel from '../models/driverperformance.model.js';
import OrderModel from '../models/order.model.js';
import ProductModel from '../models/product.model.js';

// Shared order-lifecycle side effects (rider slots, stock restore, delivery
// completion). An order is stored as one document per line item sharing an
// orderId, so every helper here works on the whole orderId, and every side
// effect runs only for the caller that actually moved the order.

export const DELIVERY_DRIVER_CAPACITY = 3;
export const DRIVER_PRESENCE_TIMEOUT_MS = 15 * 60 * 1000;

const DEFAULT_DELIVERY_FEE = 50;

// A rider that hasn't pinged (location, stats, presence) for 15 minutes is
// treated as offline even if they never toggled themselves off.
export const isDriverPresenceFresh = (driver, now = Date.now()) => {
  if (driver?.isOnline !== true) return false;
  const lastActive = driver.lastActive ? new Date(driver.lastActive).getTime() : 0;
  return Number.isFinite(lastActive) && now - lastActive <= DRIVER_PRESENCE_TIMEOUT_MS;
};

/**
 * Moves every line of an order out of `fromStatuses` with `update`, and
 * reports whether THIS call made the transition. The claim is taken on the
 * order's first line (lowest _id), so of two concurrent callers exactly one
 * sees changed=true and runs the side effects; siblings follow via updateMany.
 */
export const transitionOrderLines = async ({ orderId, fromStatuses, update, filter = {} }) => {
  if (!orderId) return { changed: false, anchor: null };

  const firstLine = await OrderModel.findOne({ orderId }).sort({ _id: 1 }).select('_id');
  if (!firstLine) return { changed: false, anchor: null };

  const anchor = await OrderModel.findOneAndUpdate(
    { _id: firstLine._id, status: { $in: fromStatuses }, ...filter },
    update,
    { new: true, runValidators: true }
  );

  if (!anchor) return { changed: false, anchor: null };

  await OrderModel.updateMany(
    { orderId, _id: { $ne: anchor._id }, status: { $in: fromStatuses }, ...filter },
    update
  );

  return { changed: true, anchor };
};

// Orders may reference the rider by DeliveryPersonnel._id or (older rows) by
// the rider's User._id.
const driverProfileFilter = (driverId) => ({ $or: [{ _id: driverId }, { userId: driverId }] });

/**
 * Frees one active-delivery slot for a rider. Only call this after winning a
 * guarded transition of the order (transitionOrderLines / completeDelivery),
 * so the same order can never release a slot twice.
 */
export const releaseDriverSlot = async (driverId, lineIds = []) => {
  if (!driverId) return null;

  const pullActive = { activeOrders: { $in: lineIds } };
  const driver = await DeliveryPersonnelModel.findOneAndUpdate(
    { ...driverProfileFilter(driverId), activeOrdersCount: { $gt: 0 } },
    { $inc: { activeOrdersCount: -1 }, $pull: pullActive, $set: { lastActive: new Date() } },
    { new: true }
  ) || await DeliveryPersonnelModel.findOneAndUpdate(
    // Counter already at zero (an older assignment that was never counted):
    // still drop the order from the rider's active list.
    driverProfileFilter(driverId),
    { $pull: pullActive },
    { new: true }
  );

  if (driver && driver.isAvailable === false && driver.isActive !== false && driver.isOnline === true
    && (driver.activeOrdersCount || 0) < DELIVERY_DRIVER_CAPACITY) {
    await DeliveryPersonnelModel.updateOne(
      { _id: driver._id, activeOrdersCount: { $lt: DELIVERY_DRIVER_CAPACITY } },
      { $set: { isAvailable: true } }
    );
  }

  return driver;
};

/**
 * Puts cancelled stock back on the shelf, once per line quantity. Skips lines
 * without a product (guest summary rows), lines flagged stockShortfall (their
 * stock was never reserved) and products whose stock isn't tracked.
 */
export const restoreStockForLines = async (lines = []) => {
  await Promise.all(
    lines
      .filter((line) => line.productId && line.stockShortfall !== true)
      .map((line) => {
        const quantity = Number(line.quantity) > 0 ? Number(line.quantity) : 1;
        return ProductModel.updateOne(
          { _id: line.productId?._id || line.productId, stock: { $type: 'number' } },
          { $inc: { stock: quantity } }
        );
      })
  );
};

const resolveDeliveryFee = (order) => {
  if (Number(order.deliveryCharge) > 0) return Number(order.deliveryCharge);
  if (Number(order.delivery_zone_fare) > 0) return Number(order.delivery_zone_fare);
  return DEFAULT_DELIVERY_FEE;
};

// Books delivery-time metrics and the rider's commission for one delivered
// order. `lineIds` guards against booking the same order twice.
export const recordDriverDeliveryPerformance = async (order, driverProfileId, lineIds = [order._id]) => {
  const createdAt = new Date(order.createdAt);
  const deliveredAt = new Date(order.deliveredAt || Date.now());
  const deliveryTimeMinutes = Math.round((deliveredAt - createdAt) / (1000 * 60));

  // Determine if delivery was on time (assuming 60 minutes is the target)
  const isOnTime = deliveryTimeMinutes <= 60;

  const lineIdSet = new Set(lineIds.map(String));
  let financials = await DriverFinancialModel.findOne({ driverId: driverProfileId });
  if (financials?.commissions?.some((commission) => lineIdSet.has(String(commission.orderId)))) {
    return;
  }

  let performance = await DriverPerformanceModel.findOne({ driverId: driverProfileId });
  if (!performance) {
    performance = new DriverPerformanceModel({ driverId: driverProfileId });
  }

  performance.currentMetrics.successfulDeliveries += 1;
  if (isOnTime) {
    performance.currentMetrics.onTimeDeliveries += 1;
  } else {
    performance.currentMetrics.lateDeliveries += 1;
  }

  const totalDeliveries = performance.currentMetrics.successfulDeliveries;
  const currentAvgTime = performance.currentMetrics.averageDeliveryTime;
  performance.currentMetrics.averageDeliveryTime =
    ((currentAvgTime * (totalDeliveries - 1)) + deliveryTimeMinutes) / totalDeliveries;

  const onTimeRate = performance.currentMetrics.onTimeDeliveries / totalDeliveries;
  performance.currentMetrics.reliabilityScore = Math.round(onTimeRate * 100);
  performance.lastPerformanceUpdate = new Date();
  await performance.save();

  // Commission is a percentage of the delivery fee the customer paid.
  const driverPersonnel = await DeliveryPersonnelModel.findById(driverProfileId).select('financials');
  const commissionRate = driverPersonnel?.financials?.commissionRate || 10;
  const commissionAmount = (resolveDeliveryFee(order) * commissionRate) / 100;

  if (!financials) {
    financials = new DriverFinancialModel({ driverId: driverProfileId });
  }

  financials.commissions.push({
    orderId: order._id,
    amount: commissionAmount,
    rate: commissionRate,
    date: new Date()
  });
  financials.earnings.total += commissionAmount;
  financials.earnings.pending += commissionAmount;
  await financials.save();
};

/**
 * Marks every line of an order delivered, once. Used by both the rider's
 * "Mark delivered" and the staff status endpoint; only the call that actually
 * moves the order releases the rider's slot and books performance/commission.
 */
export const completeDelivery = async ({ orderId, fromStatuses, filter = {}, updatedBy, note }) => {
  const deliveredAt = new Date();
  const { changed, anchor } = await transitionOrderLines({
    orderId,
    fromStatuses,
    filter,
    update: {
      $set: { status: 'delivered', deliveredAt },
      $push: {
        statusHistory: { status: 'delivered', timestamp: deliveredAt, updatedBy, note }
      }
    }
  });

  if (!changed) return { changed: false, anchor: null };

  if (anchor.deliveryPersonnel) {
    const lines = await OrderModel.find({ orderId }).select('_id');
    const lineIds = lines.map((line) => line._id);

    let driver = null;
    try {
      driver = await releaseDriverSlot(anchor.deliveryPersonnel, lineIds);
    } catch (releaseError) {
      console.error('Error releasing rider slot on delivery:', releaseError);
    }

    if (driver?._id) {
      try {
        await recordDriverDeliveryPerformance(anchor.toObject(), driver._id, lineIds);
      } catch (performanceError) {
        console.error('Error updating driver performance:', performanceError);
      }
    }
  }

  return { changed: true, anchor, deliveredAt };
};
