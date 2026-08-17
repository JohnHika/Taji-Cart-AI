const amountFormatter = new Intl.NumberFormat('en-KE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatWhatsAppOrderAmount = (amount) => {
  const safeAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  return `KSh ${amountFormatter.format(safeAmount)}`;
};

// deliveryDetails describes which delivery mode was picked via the shared
// DeliveryModeSelector (client/src/components/DeliveryModeSelector.jsx):
// { mode: 'standard'|'bike'|'sacco', zoneName, saccoOperatorName, saccoDestinationTown }
const describeDeliveryMode = (deliveryDetails) => {
  if (!deliveryDetails) return null;
  if (deliveryDetails.mode === 'bike') {
    return deliveryDetails.zoneName
      ? `Bike delivery — ${deliveryDetails.zoneName} zone`
      : 'Bike delivery — zone to be confirmed';
  }
  if (deliveryDetails.mode === 'sacco') {
    const operator = deliveryDetails.saccoOperatorName || 'operator to be confirmed';
    const town = deliveryDetails.saccoDestinationTown || 'destination to be confirmed';
    return `SACCO/bus parcel — ${operator} to ${town}`;
  }
  return 'Standard delivery';
};

export const buildWhatsAppOrderMessage = ({
  items = [],
  customerName = '',
  customerPhone = '',
  fulfillmentMethod = 'pickup',
  deliveryLocation = '',
  deliveryDetails = null,
  deliveryFee = 0,
  note = '',
} = {}) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('A WhatsApp order needs at least one item.');
  }

  const normalizedItems = items.map((item) => ({
    ...item,
    quantity: Math.max(1, Number(item.quantity) || 1),
    price: Math.max(0, Number(item.price) || 0),
  }));
  const itemsTotal = normalizedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const isDelivery = fulfillmentMethod === 'delivery';
  const resolvedDeliveryFee = isDelivery ? Math.max(0, Number(deliveryFee) || 0) : 0;
  const orderEstimate = itemsTotal + resolvedDeliveryFee;

  const itemLines = normalizedItems.flatMap((item, index) => [
    `${index + 1}. ${item.name || 'Product'}`,
    `   Product code: ${item.sku || item.barcode || item._id || 'Not provided'}`,
    `   Qty: ${item.quantity}`,
    `   Price: ${formatWhatsAppOrderAmount(item.price)}`,
    `   Line total: ${formatWhatsAppOrderAmount(item.price * item.quantity)}`,
    '',
  ]);

  const deliveryLines = isDelivery
    ? [
        `Delivery mode: ${describeDeliveryMode(deliveryDetails) || 'Standard delivery'}`,
        `Delivery fee: ${formatWhatsAppOrderAmount(resolvedDeliveryFee)}`,
        `Delivery location: ${deliveryLocation.trim() || 'To be confirmed'}`,
      ]
    : ['Delivery: Pickup at store'];

  return [
    'Hello Nawiri Hair,',
    '',
    'I would like to place this order:',
    '',
    ...itemLines,
    `Items subtotal: ${formatWhatsAppOrderAmount(itemsTotal)}`,
    ...deliveryLines,
    `Order estimate: ${formatWhatsAppOrderAmount(orderEstimate)}`,
    `Customer: ${customerName.trim() || 'Walk-in customer'}`,
    `Phone: ${customerPhone.trim() || 'Not provided'}`,
    ...(note.trim() ? [`Notes: ${note.trim()}`] : []),
    '',
    'Please confirm the order, payment instructions, and delivery details. Thank you.',
  ].join('\n');
};

export const createWhatsAppOrderUrl = (whatsappUrl, message) => {
  let recipient;

  try {
    const parsedUrl = new URL(whatsappUrl);
    if (parsedUrl.hostname !== 'wa.me') {
      throw new Error('Unsupported WhatsApp host');
    }
    recipient = parsedUrl.pathname.replace(/\D/g, '');
  } catch {
    throw new Error('A valid WhatsApp recipient is required.');
  }

  if (!recipient) {
    throw new Error('A valid WhatsApp recipient is required.');
  }

  return `https://wa.me/${recipient}?text=${encodeURIComponent(message || '')}`;
};
