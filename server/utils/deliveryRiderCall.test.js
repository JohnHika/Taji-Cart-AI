import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildRiderCallMessage,
  buildWhatsAppDeliveryTemplatePayload,
  getCustomerDeliveryContact,
} from './deliveryRiderCall.js';

test('builds a concise rider-call notification for the customer', () => {
  assert.equal(
    buildRiderCallMessage('ORD-104'),
    'Nawiri Hair: Your rider is nearby for order ORD-104 and will call you shortly.'
  );
});

test('uses guest contact details before account details', () => {
  assert.deepEqual(
    getCustomerDeliveryContact(
      { guestEmail: 'guest@example.com', guestPhone: '0712345678' },
      { email: 'account@example.com', mobile: '0799999999' }
    ),
    { email: 'guest@example.com', phone: '0712345678' }
  );
});

test('builds a WhatsApp template payload with the customer order number', () => {
  assert.deepEqual(
    buildWhatsAppDeliveryTemplatePayload({
      phone: '+254 712 345 678',
      orderId: 'ORD-104',
      templateName: 'delivery_rider_nearby',
      languageCode: 'en',
    }),
    {
      messaging_product: 'whatsapp',
      to: '254712345678',
      type: 'template',
      template: {
        name: 'delivery_rider_nearby',
        language: { code: 'en' },
        components: [{ type: 'body', parameters: [{ type: 'text', text: 'ORD-104' }] }],
      },
    }
  );
});
