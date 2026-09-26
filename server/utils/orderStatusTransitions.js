// Order lifecycle rules shared by the staff status endpoint, the dispatch
// board and the admin AI tool. Pure (no database access) so the rules can be
// unit-tested; an order's lines all share one status, so these rules are
// always evaluated against the order as a whole.

export const ACTIVE_DELIVERY_STATUSES = ['driver_assigned', 'out_for_delivery', 'nearby'];
export const PRE_DISPATCH_STATUSES = ['pending', 'processing', 'shipped'];
export const TERMINAL_ORDER_STATUSES = ['delivered', 'picked_up', 'cancelled'];

// Allowed manual (staff/admin) status changes per fulfillment type. Some
// states have their own dedicated flows and are deliberately unreachable here:
// driver_assigned needs a rider (/api/delivery/assign-driver), and a store
// pickup only becomes picked_up by verifying the customer's pickup code.
// Terminal states (delivered, picked_up, cancelled) have no way out: stock,
// driver capacity and commission have already been settled for them.
const ORDER_STATUS_TRANSITIONS = {
  delivery: {
    pending: ['processing', 'shipped', 'dispatched', 'cancelled'],
    processing: ['pending', 'shipped', 'dispatched', 'cancelled'],
    shipped: ['processing', 'dispatched', 'cancelled'],
    dispatched: ['processing', 'shipped', 'cancelled'],
    // Moving an active delivery back to dispatched releases the rider so the
    // order can be reassigned.
    driver_assigned: ['dispatched', 'out_for_delivery', 'delivered', 'cancelled'],
    out_for_delivery: ['dispatched', 'nearby', 'delivered', 'cancelled'],
    nearby: ['dispatched', 'delivered', 'cancelled'],
  },
  pickup: {
    pending: ['processing', 'ready_for_pickup', 'cancelled'],
    processing: ['pending', 'ready_for_pickup', 'cancelled'],
    ready_for_pickup: ['processing', 'cancelled'],
  },
  // SACCO parcels are handed to a coach (shipped) and collected by the
  // customer at the destination terminal, so staff confirm collection by hand.
  sacco_pickup: {
    pending: ['processing', 'shipped', 'cancelled'],
    processing: ['pending', 'shipped', 'cancelled'],
    shipped: ['processing', 'ready_for_pickup', 'picked_up', 'cancelled'],
    ready_for_pickup: ['picked_up', 'cancelled'],
  },
};

// Payment states that make a delivery order safe to send out: paid online,
// cash on delivery, or a staff/WhatsApp order (created with an empty
// payment_status and settled on delivery). Legacy PENDING/FAILED/CANCELLED/
// EXPIRED online orders were never paid and must not leave the shop.
export const DISPATCHABLE_PAYMENT_STATUSES = ['PAID', 'paid', 'CASH ON DELIVERY', '', null];

// Older documents can predate fulfillment_type, and deliveryMethod defaults to
// 'delivery' on every order, so fulfillment_type is the source of truth and
// deliveryMethod only counts as a legacy store-pickup marker.
export const resolveFulfillmentType = (order = {}) => {
  if (['pickup', 'sacco_pickup'].includes(order.fulfillment_type)) return order.fulfillment_type;
  if (order.deliveryMethod === 'store-pickup') return 'pickup';
  return 'delivery';
};

export const getAllowedNextStatuses = (order = {}) => {
  const rules = ORDER_STATUS_TRANSITIONS[resolveFulfillmentType(order)] || {};
  return rules[order.status] || [];
};

export const isStatusTransitionAllowed = (order = {}, nextStatus) =>
  getAllowedNextStatuses(order).includes(nextStatus);

// Returns a human-readable reason when a delivery order must not be
// dispatched yet, or null when it is eligible.
export const getDispatchBlockReason = (order = {}) => {
  if (resolveFulfillmentType(order) !== 'delivery') {
    return 'This order is not for delivery';
  }
  if (order.stockShortfall === true) {
    return 'This paid order is flagged for a stock shortfall and needs manual resolution before dispatch';
  }
  const paymentStatus = order.payment_status ?? null;
  if (!DISPATCHABLE_PAYMENT_STATUSES.includes(paymentStatus)) {
    return `This order has not been paid (payment status: ${paymentStatus})`;
  }
  return null;
};

// Mongo filter equivalents of resolveFulfillmentType(...) === 'delivery' and
// getDispatchBlockReason(...) === null, for list and update queries.
export const DELIVERY_FULFILLMENT_FILTER = {
  $or: [
    { fulfillment_type: 'delivery', deliveryMethod: { $ne: 'store-pickup' } },
    { fulfillment_type: { $exists: false }, deliveryMethod: { $ne: 'store-pickup' } },
  ],
};

export const DISPATCH_ELIGIBLE_FILTER = {
  $and: [
    DELIVERY_FULFILLMENT_FILTER,
    { payment_status: { $in: DISPATCHABLE_PAYMENT_STATUSES } },
    { stockShortfall: { $ne: true } },
  ],
};
