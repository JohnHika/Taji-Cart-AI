const amountFormatter = new Intl.NumberFormat('en-KE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatWhatsAppOrderAmount = (amount) => {
  const safeAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  return `KSh ${amountFormatter.format(safeAmount)}`;
};

export const buildWhatsAppOrderMessage = ({
  items = [],
  customerName = '',
  customerPhone = '',
  fulfillmentMethod = 'pickup',
  deliveryLocation = '',
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
  const orderEstimate = normalizedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const isDelivery = fulfillmentMethod === 'delivery';
  const deliverySummary = isDelivery
    ? (deliveryLocation.trim() || 'Delivery location to be confirmed')
    : 'Pickup at store';

  const itemLines = normalizedItems.flatMap((item, index) => [
    `${index + 1}. ${item.name || 'Product'}`,
    `   Product code: ${item.sku || item.barcode || item._id || 'Not provided'}`,
    `   Qty: ${item.quantity}`,
    `   Price: ${formatWhatsAppOrderAmount(item.price)}`,
    `   Line total: ${formatWhatsAppOrderAmount(item.price * item.quantity)}`,
    '',
  ]);

  return [
    'Hello Nawiri Hair,',
    '',
    'I would like to place this order:',
    '',
    ...itemLines,
    `Order estimate: ${formatWhatsAppOrderAmount(orderEstimate)}`,
    `Customer: ${customerName.trim() || 'Walk-in customer'}`,
    `Phone: ${customerPhone.trim() || 'Not provided'}`,
    `Delivery: ${deliverySummary}`,
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
