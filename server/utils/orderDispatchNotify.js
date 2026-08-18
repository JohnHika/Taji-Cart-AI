import sendEmail from '../config/sendEmail.js';
import { getBrandLogoUrl, nawiriBrand } from './brand.js';
import { renderOrderNoticeEmail } from './emailTemplates.js';

// Same trust model as deliveryRiderCall.js: WhatsApp Cloud API requires a
// pre-approved message template for anything sent outside a live customer
// chat window, so this only ever fires when the account/template are
// actually configured — silently skipped otherwise (e.g. no WhatsApp
// Business API access yet), never a hard failure that blocks dispatch.
const normalizeWhatsAppPhone = (phone) => String(phone || '').replace(/\D/g, '');

// Mirrors the "your order shipped" style a customer sees from a well-run
// hair business on WhatsApp: personalized greeting, order number, delivery
// expectation, and a branded image header — built from real fields already
// on Sale/Order (fulfillment type, pickup code, delivery date) rather than
// invented copy.
export const buildDispatchWhatsAppText = ({ customerName, orderNumber, fulfillmentType, pickupCode, deliveryScheduledDate }) => {
  const greeting = customerName ? `Hey ${customerName} 😊` : 'Hey there 😊';
  const brandLine = `${nawiriBrand.shortName} here.`;
  const isPickup = fulfillmentType === 'pickup';

  const bodyLines = [
    `Thank you so much for your order #${orderNumber}!`,
    isPickup
      ? `It's packed and ready — please come collect it${pickupCode ? ` and show this code: ${pickupCode}` : ''}.`
      : `We've packed it and sent it out for delivery. You should receive a call from a rider${
          deliveryScheduledDate ? ` on ${new Date(deliveryScheduledDate).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' })}` : ''
        }.`,
    '',
    "We hope you'll love what you ordered 💕",
  ];

  return [greeting, brandLine, '', ...bodyLines].join('\n');
};

export const buildDispatchWhatsAppTemplatePayload = ({ phone, orderNumber, templateName, languageCode = 'en' }) => ({
  messaging_product: 'whatsapp',
  to: normalizeWhatsAppPhone(phone),
  type: 'template',
  template: {
    name: templateName,
    language: { code: languageCode },
    components: [
      {
        type: 'header',
        parameters: [{ type: 'image', image: { link: getBrandLogoUrl() } }],
      },
      {
        type: 'body',
        parameters: [{ type: 'text', text: orderNumber }],
      },
    ],
  },
});

const sendDispatchWhatsAppNotice = async ({ phone, orderNumber }) => {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.WHATSAPP_DISPATCH_TEMPLATE_NAME;

  if (!phone || !accessToken || !phoneNumberId || !templateName) {
    return { attempted: false, sent: false, reason: 'not_configured_or_no_phone' };
  }

  const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildDispatchWhatsAppTemplatePayload({
      phone,
      orderNumber,
      templateName,
      languageCode: process.env.WHATSAPP_DISPATCH_TEMPLATE_LANGUAGE || 'en',
    })),
  });

  if (!response.ok) {
    throw new Error(`WhatsApp dispatch notification request failed with HTTP ${response.status}`);
  }

  return { attempted: true, sent: true };
};

const sendDispatchEmail = async ({ email, customerName, orderNumber, total, fulfillmentType, pickupCode }) => {
  if (!email) return { attempted: false, sent: false, reason: 'no_email' };

  await sendEmail({
    sendTo: email,
    subject: `Order dispatched - ${nawiriBrand.shortName}`,
    html: renderOrderNoticeEmail({
      name: customerName,
      title: fulfillmentType === 'pickup' ? 'Your order is ready for pickup' : 'Your order has been dispatched',
      intro: fulfillmentType === 'pickup'
        ? "Thank you for your order! It's packed and waiting for you at our shop."
        : "Thank you for your order! We've packed it and sent it out for delivery — you should receive a call from a rider soon.",
      orderId: orderNumber,
      total,
      fulfillmentType: fulfillmentType === 'pickup' ? 'Store pickup' : 'Delivery',
      verificationCode: pickupCode || undefined,
      ctaLabel: 'View order details',
      ctaUrl: nawiriBrand.websiteUrl,
    }),
  });

  return { attempted: true, sent: true };
};

// Fires both channels for whichever contact details are available — same
// "attempt everything, fail on nothing" pattern as notifyCustomerRiderWillCall.
// Callers should await but never let a rejection here block the dispatch
// action itself (see call sites: wrapped in their own try/catch).
export const notifyCustomerOrderDispatched = async ({
  orderNumber,
  total,
  fulfillmentType,
  pickupCode,
  deliveryScheduledDate,
  customerName,
  customerEmail,
  customerPhone,
}) => {
  const results = await Promise.allSettled([
    sendDispatchEmail({ email: customerEmail, customerName, orderNumber, total, fulfillmentType, pickupCode }),
    sendDispatchWhatsAppNotice({ phone: customerPhone, orderNumber }),
  ]);

  return {
    text: buildDispatchWhatsAppText({ customerName, orderNumber, fulfillmentType, pickupCode, deliveryScheduledDate }),
    results,
  };
};
