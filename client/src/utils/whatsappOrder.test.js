import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildWhatsAppOrderMessage,
  createWhatsAppOrderUrl,
} from './whatsappOrder.js';

test('builds a multi-item WhatsApp purchase message with customer and delivery details', () => {
  const message = buildWhatsAppOrderMessage({
    items: [
      { _id: 'one', name: 'PASSION TWIST 24INCH - #4', sku: 'PT24-4', price: 700, quantity: 2 },
      { _id: 'two', name: 'QUEEN LOCS - OT27613', price: 700, quantity: 1 },
    ],
    customerName: 'Amina',
    customerPhone: '0700000000',
    fulfillmentMethod: 'delivery',
    deliveryLocation: 'Westlands, Nairobi',
    deliveryDetails: { mode: 'bike', zoneName: 'Westlands' },
    deliveryFee: 300,
    note: 'Please pack #4.',
  });

  assert.match(message, /I would like to place this order:/);
  assert.match(message, /1\. PASSION TWIST 24INCH - #4/);
  assert.match(message, /Product code: PT24-4/);
  assert.match(message, /Qty: 2/);
  assert.match(message, /Items subtotal: KSh 2,100\.00/);
  assert.match(message, /Delivery mode: Bike delivery — Westlands zone/);
  assert.match(message, /Delivery fee: KSh 300\.00/);
  assert.match(message, /Delivery location: Westlands, Nairobi/);
  assert.match(message, /Order estimate: KSh 2,400\.00/);
  assert.match(message, /Customer: Amina/);
  assert.match(message, /Notes: Please pack #4\./);
});

test('uses pickup without a delivery location and safely encodes the WhatsApp URL', () => {
  const message = buildWhatsAppOrderMessage({
    items: [{ _id: 'one', name: 'Curl & Wave', price: 850, quantity: 1 }],
    customerName: 'John',
    customerPhone: '0712345678',
    fulfillmentMethod: 'pickup',
    deliveryLocation: '',
    note: '',
  });
  const url = createWhatsAppOrderUrl('https://wa.me/254703862741', message);

  assert.match(message, /Delivery: Pickup at store/);
  assert.match(url, /^https:\/\/wa\.me\/254703862741\?text=/);
  assert.equal(new URL(url).searchParams.get('text'), message);
});

test('rejects a WhatsApp order without items or a valid recipient', () => {
  assert.throws(() => buildWhatsAppOrderMessage({ items: [] }), /at least one item/i);
  assert.throws(() => createWhatsAppOrderUrl('https://example.com', 'hello'), /WhatsApp recipient/i);
});
