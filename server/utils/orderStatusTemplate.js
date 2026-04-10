import { escHtml, emailFooter, emailWrapper } from './emailBase.js';

const STATUS_CONFIG = {
  processing: {
    label: 'Being Prepared',
    emoji: '📦',
    headerGradient: 'linear-gradient(150deg,#1e3a5f 0%,#1d4ed8 60%,#3b82f6 100%)',
    accentColor: '#3b82f6',
    lightBg: '#eff6ff',
    lightBorder: '#bfdbfe',
    lightText: '#1e40af',
    message: 'Our team has received your order and is carefully preparing it for dispatch.',
  },
  shipped: {
    label: 'On Its Way',
    emoji: '🚚',
    headerGradient: 'linear-gradient(150deg,#451a03 0%,#92400e 60%,#d97706 100%)',
    accentColor: '#d97706',
    lightBg: '#fffbeb',
    lightBorder: '#fde68a',
    lightText: '#92400e',
    message: 'Exciting news — your order has shipped! Keep an eye out for your delivery.',
  },
  delivered: {
    label: 'Delivered',
    emoji: '🎉',
    headerGradient: 'linear-gradient(150deg,#052e16 0%,#14532d 60%,#16a34a 100%)',
    accentColor: '#16a34a',
    lightBg: '#f0fdf4',
    lightBorder: '#86efac',
    lightText: '#166534',
    message: 'Your order has been delivered. We hope you love your new look!',
  },
  cancelled: {
    label: 'Cancelled',
    emoji: '❌',
    headerGradient: 'linear-gradient(150deg,#450a0a 0%,#991b1b 60%,#dc2626 100%)',
    accentColor: '#dc2626',
    lightBg: '#fef2f2',
    lightBorder: '#fca5a5',
    lightText: '#991b1b',
    message: 'Your order has been cancelled. If this was unexpected, please contact our support team.',
  },
  pending: {
    label: 'Received',
    emoji: '🕐',
    headerGradient: 'linear-gradient(150deg,#1f1720 0%,#342133 60%,#6b21a8 100%)',
    accentColor: '#9333ea',
    lightBg: '#faf5ff',
    lightBorder: '#d8b4fe',
    lightText: '#6b21a8',
    message: 'Your order has been received and is awaiting processing.',
  },
};

const JOURNEY_STEPS = ['pending', 'processing', 'shipped', 'delivered'];

/**
 * Order status update email.
 * Distinct design: Dynamic colour scheme per status, progress bar showing order journey.
 */
export const renderOrderStatusEmail = ({
  name,
  orderId,
  status,
  ctaLabel = 'View Order Details',
  ctaUrl,
}) => {
  const displayName = name ? escHtml(name) : 'there';
  const cfg = STATUS_CONFIG[status?.toLowerCase?.()] || STATUS_CONFIG.pending;
  const normalizedStatus = status?.toLowerCase?.() || 'pending';
  const currentStepIndex = JOURNEY_STEPS.indexOf(normalizedStatus);

  const progressBar = JOURNEY_STEPS.map((step, i) => {
    const active = i <= currentStepIndex && normalizedStatus !== 'cancelled';
    const isCurrent = i === currentStepIndex && normalizedStatus !== 'cancelled';
    const stepCfg = STATUS_CONFIG[step];
    return `
    <td style="text-align:center;padding:0 4px;">
      <div style="width:32px;height:32px;border-radius:50%;background:${active ? cfg.accentColor : 'rgba(255,255,255,0.15)'};border:2px solid ${active ? cfg.accentColor : 'rgba(255,255,255,0.25)'};display:inline-block;line-height:32px;font-size:14px;${isCurrent ? 'box-shadow:0 0 0 4px rgba(255,255,255,0.20);' : ''}">
        <span style="font-size:14px;">${stepCfg.emoji}</span>
      </div>
      <div style="font-size:10px;color:${active ? '#fff' : 'rgba(255,255,255,0.35)'};margin-top:6px;font-weight:${isCurrent ? '700' : '400'};letter-spacing:0.05em;">${escHtml(stepCfg.label.split(' ')[0])}</div>
    </td>`;
  }).join('<td style="padding-bottom:18px;width:20px;"><div style="height:2px;background:rgba(255,255,255,0.20);margin-top:0;"></div></td>');

  const innerRows = `
  <!-- HERO — dynamic colour per status -->
  <tr>
    <td class="pad-mobile" style="background:${cfg.headerGradient};padding:44px 48px 36px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td style="vertical-align:middle;">
          </td>
          <td style="text-align:right;vertical-align:middle;">
            <div style="display:inline-block;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.30);border-radius:50px;padding:5px 16px;">
              <span style="font-size:12px;letter-spacing:0.20em;text-transform:uppercase;color:#fff;font-weight:700;font-family:Arial,sans-serif;">ORDER UPDATE</span>
            </div>
          </td>
        </tr>
      </table>
      <div style="margin-top:24px;text-align:center;">
        <span style="font-size:48px;line-height:1;">${cfg.emoji}</span>
        <h1 class="hero-title" style="margin:14px 0 6px;font-size:30px;color:#ffffff;font-weight:700;font-family:Georgia,serif;">
          Status: ${escHtml(cfg.label)}
        </h1>
        <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.62);line-height:1.75;font-family:Arial,sans-serif;">
          Order <strong style="color:#fff;">${escHtml(String(orderId || ''))}</strong>
        </p>
      </div>

      ${normalizedStatus !== 'cancelled' ? `
      <!-- PROGRESS STEPS -->
      <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px auto 0;">
        <tr>${progressBar}</tr>
      </table>` : ''}
    </td>
  </tr>

  <!-- STATUS ACCENT STRIPE -->
  <tr><td style="height:5px;background:${cfg.accentColor};"></td></tr>

  <!-- BODY -->
  <tr>
    <td class="pad-mobile" style="background:#ffffff;padding:48px 48px 40px;">
      <p style="margin:0 0 8px;font-size:18px;color:#1f1720;font-weight:700;font-family:Arial,sans-serif;">Hello ${displayName},</p>
      <p style="margin:0 0 26px;font-size:15px;color:#4d3d3f;line-height:1.9;font-family:Arial,sans-serif;">
        ${escHtml(cfg.message)}
      </p>

      <!-- STATUS BADGE -->
      <div style="background:${cfg.lightBg};border:1.5px solid ${cfg.lightBorder};border-radius:14px;padding:18px 22px;margin-bottom:32px;text-align:center;">
        <span style="font-size:14px;color:${cfg.lightText};font-weight:700;letter-spacing:0.08em;text-transform:uppercase;font-family:Arial,sans-serif;">
          ${cfg.emoji}&nbsp;&nbsp;${escHtml(cfg.label)}
        </span>
      </div>

      ${normalizedStatus === 'delivered' ? `
      <!-- REVIEW NUDGE -->
      <div style="background:#fdf6f0;border-left:4px solid #c69214;border-radius:0 12px 12px 0;padding:16px 22px;margin-bottom:32px;">
        <p style="margin:0;font-size:14px;color:#4d3d3f;line-height:1.75;font-family:Arial,sans-serif;">
          ⭐ <strong>Love your new look?</strong> Leave a review and earn bonus Royal Points on your next order.
        </p>
      </div>` : ''}

      ${ctaUrl ? `
      <!-- CTA BUTTON -->
      <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 28px;">
        <tr>
          <td style="border-radius:999px;background:${cfg.accentColor};box-shadow:0 6px 20px rgba(0,0,0,0.20);">
            <a href="${escHtml(ctaUrl)}" style="display:inline-block;padding:17px 54px;border-radius:999px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.04em;font-family:Arial,sans-serif;white-space:nowrap;">
              ${escHtml(ctaLabel)} →
            </a>
          </td>
        </tr>
      </table>` : ''}

      <p style="margin:0;font-size:13px;color:#9e8e8a;text-align:center;line-height:1.8;font-family:Arial,sans-serif;">
        Need help? <a href="mailto:nawirihairke@gmail.com" style="color:${cfg.accentColor};text-decoration:none;">Contact our support team</a>
      </p>
    </td>
  </tr>

  ${emailFooter({ accentColor: cfg.accentColor, darkBg: '#1f1720' })}`;

  return emailWrapper({
    innerRows,
    preheader: `Your Nawiri Hair Kenya order status has been updated — ${cfg.label}.`,
    bgColor: '#f8f4f1',
    title: `Order ${cfg.label} — Nawiri Hair Kenya`,
  });
};
