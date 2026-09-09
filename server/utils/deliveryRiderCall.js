import sendEmail from '../config/sendEmail.js';
import { nawiriBrand } from './brand.js';
import { renderOrderNoticeEmail } from './emailTemplates.js';

export const buildRiderCallMessage = (orderId) =>
  `Nawiri Hair: Your rider is nearby for order ${orderId} and will call you shortly.`;

const normalizeWhatsAppPhone = (phone) => String(phone || '').replace(/\D/g, '');

export const getCustomerDeliveryContact = (order = {}, customer = {}) => ({
  email: order.guestEmail || customer.email || '',
  phone: order.guestPhone || order.guestShipping?.phone || customer.mobile || customer.phone || '',
});

export const buildWhatsAppDeliveryTemplatePayload = ({
  phone,
  orderId,
  templateName,
  languageCode = 'en',
}) => ({
  messaging_product: 'whatsapp',
  to: normalizeWhatsAppPhone(phone),
  type: 'template',
  template: {
    name: templateName,
    language: { code: languageCode },
    components: [{ type: 'body', parameters: [{ type: 'text', text: orderId }] }],
  },
});

const sendWhatsAppRiderCallNotice = async ({ phone, orderId }) => {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.WHATSAPP_DELIVERY_TEMPLATE_NAME;

  if (!phone || !accessToken || !phoneNumberId || !templateName) {
    return { attempted: false, sent: false, reason: 'not_configured_or_no_phone' };
  }

  const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildWhatsAppDeliveryTemplatePayload({
      phone,
      orderId,
      templateName,
      languageCode: process.env.WHATSAPP_DELIVERY_TEMPLATE_LANGUAGE || 'en',
    })),
  });

  if (!response.ok) {
    throw new Error(`WhatsApp delivery notification request failed with HTTP ${response.status}`);
  }

  return { attempted: true, sent: true };
};

export const notifyCustomerRiderWillCall = async ({ order, customer }) => {
  const orderId = order.orderId || order._id?.toString() || 'your order';
  const message = buildRiderCallMessage(orderId);
  const contact = getCustomerDeliveryContact(order, customer);
  const results = await Promise.allSettled([
    contact.email
      ? sendEmail({
          sendTo: contact.email,
          subject: `Your rider is nearby - ${nawiriBrand.shortName}`,
          html: renderOrderNoticeEmail({
            name: customer?.name || 'Customer',
            title: 'Your rider is nearby',
            intro: 'Your rider is nearby and will call you shortly before arrival.',
            orderId,
            total: `KSh ${Number(order.totalAmt || order.total || 0).toLocaleString()}`,
            fulfillmentType: 'Delivery',
            ctaLabel: 'Track your order',
            ctaUrl: nawiriBrand.websiteUrl,
          }),
        })
      : Promise.resolve({ skipped: 'no_email' }),
    sendWhatsAppRiderCallNotice({ phone: contact.phone, orderId }),
  ]);

  return { message, results };
};
