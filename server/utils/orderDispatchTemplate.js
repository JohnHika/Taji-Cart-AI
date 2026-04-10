import { escHtml, emailFooter, emailWrapper } from './emailBase.js';

/**
 * Order Placed / Dispatched confirmation email.
 * Design: Emerald green success receipt style, 680px responsive.
 */
export const renderOrderDispatchEmail = ({
  name,
  orderId,
  total,
  fulfillmentType,
  pickupLocation,
  verificationCode,
  ctaLabel = 'View My Order',
  ctaUrl,
}) => {
  const displayName = name ? escHtml(name) : 'there';
  const isPickup = String(fulfillmentType || '').toLowerCase().includes('pickup');

  const rows = [
    { label: 'Order reference', value: orderId },
    { label: 'Order total',     value: total },
    { label: 'Fulfilment',      value: isPickup ? 'Store pickup' : 'Delivery to your address' },
    ...(pickupLocation   ? [{ label: 'Pickup point',   value: pickupLocation }]   : []),
    ...(verificationCode ? [{ label: 'Pickup code',    value: verificationCode }] : []),
  ].filter(r => r.value);

  const innerRows = `
  <!-- HERO — deep forest green, success receipt feel -->
  <tr>
    <td class="pad-mobile" style="background:linear-gradient(150deg,#052e16 0%,#14532d 55%,#166534 100%);padding:50px 48px 40px;text-align:center;">
      <!-- Checkmark badge -->
      <div style="display:inline-flex;align-items:center;justify-content:center;width:68px;height:68px;background:rgba(255,255,255,0.14);border-radius:50%;border:2px solid rgba(255,255,255,0.36);font-size:32px;margin-bottom:22px;">✓</div>
      <div style="display:inline-block;background:rgba(255,255,255,0.10);border:1px solid rgba(255,255,255,0.22);border-radius:50px;padding:5px 20px;margin-bottom:18px;">
        <span style="font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:rgba(255,255,255,0.75);font-family:Arial,sans-serif;font-weight:700;">Order Confirmed</span>
      </div>
      <h1 class="hero-title" style="margin:0 0 10px;font-size:32px;line-height:1.18;color:#ffffff;font-weight:700;font-family:Georgia,serif;">
        Your Order is Confirmed! 🎉
      </h1>
      <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.62);line-height:1.75;font-family:Arial,sans-serif;">
        Thank you for shopping with Nawiri Hair Kenya. Your order is now being prepared.
      </p>
    </td>
  </tr>

  <!-- GREEN ACCENT STRIPE -->
  <tr><td style="height:5px;background:linear-gradient(90deg,#16a34a,#c69214,#16a34a);"></td></tr>

  <!-- BODY -->
  <tr>
    <td class="pad-mobile" style="background:#ffffff;padding:48px 48px 40px;">
      <p style="margin:0 0 8px;font-size:18px;color:#052e16;font-weight:700;font-family:Arial,sans-serif;">Hello ${displayName},</p>
      <p style="margin:0 0 28px;font-size:15px;color:#4d3d3f;line-height:1.9;font-family:Arial,sans-serif;">
        We've received your order and our team is already on it. Here's a summary of what to expect:
      </p>

      <!-- ORDER SUMMARY CARD -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
        style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:16px;margin-bottom:32px;overflow:hidden;">
        ${rows.map((row, i) => `
        <tr>
          <td style="padding:14px 22px;${i < rows.length - 1 ? 'border-bottom:1px solid #bbf7d0;' : ''}">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="font-size:13px;color:#166534;font-family:Arial,sans-serif;">${escHtml(row.label)}</td>
                <td style="font-size:14px;color:#052e16;font-weight:700;text-align:right;font-family:Arial,sans-serif;">${escHtml(String(row.value))}</td>
              </tr>
            </table>
          </td>
        </tr>`).join('')}
      </table>

      ${verificationCode ? `
      <!-- PICKUP CODE SPOTLIGHT -->
      <div style="background:#1f1720;border-radius:16px;padding:28px 20px;text-align:center;margin-bottom:32px;">
        <p style="margin:0 0 12px;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:rgba(255,255,255,0.40);font-weight:700;font-family:Arial,sans-serif;">Pickup verification code</p>
        <div style="font-size:42px;font-weight:700;letter-spacing:0.20em;color:#c69214;font-family:'Courier New',Courier,monospace;">${escHtml(String(verificationCode))}</div>
        <p style="margin:10px 0 0;font-size:12px;color:rgba(255,255,255,0.38);font-family:Arial,sans-serif;">Show this code when collecting your order</p>
      </div>` : ''}

      ${ctaUrl ? `
      <!-- CTA BUTTON -->
      <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 28px;">
        <tr>
          <td style="border-radius:999px;background:linear-gradient(135deg,#16a34a 0%,#166534 100%);box-shadow:0 8px 28px rgba(22,163,74,0.38);">
            <a href="${escHtml(ctaUrl)}" style="display:inline-block;padding:18px 56px;border-radius:999px;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;letter-spacing:0.04em;font-family:Arial,sans-serif;white-space:nowrap;">
              ${escHtml(ctaLabel)} →
            </a>
          </td>
        </tr>
      </table>` : ''}

      <p style="margin:0;font-size:13px;color:#9e8e8a;text-align:center;line-height:1.8;font-family:Arial,sans-serif;">
        Questions? WhatsApp us at <a href="tel:+254703862741" style="color:#16a34a;text-decoration:none;">+254 703 862 741</a>
      </p>
    </td>
  </tr>

  ${emailFooter({ accentColor: '#86efac', darkBg: '#052e16' })}`;

  return emailWrapper({
    innerRows,
    preheader: `Your Nawiri Hair Kenya order has been confirmed — here are the details.`,
    bgColor: '#f0fdf4',
    title: 'Order confirmed — Nawiri Hair Kenya',
  });
};
