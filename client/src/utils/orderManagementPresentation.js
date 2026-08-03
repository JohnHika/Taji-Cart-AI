export const getOrderActionHint = (order) => {
  if (order?.status === 'POS') return 'Counter sale completed';

  const hints = {
    pending: 'Awaiting review',
    processing: 'Preparing the order',
    shipped: 'Ready to dispatch',
    dispatched: 'Awaiting driver assignment',
    driver_assigned: 'Driver assigned',
    out_for_delivery: 'Delivery in progress',
    nearby: 'Rider is near the customer',
    delivered: 'Delivery complete',
    cancelled: 'Order cancelled',
  };

  return hints[order?.status] || 'Open order to review';
};
