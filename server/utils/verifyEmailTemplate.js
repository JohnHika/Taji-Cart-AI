import { nawiriBrand, getBrandLogoUrl } from './brand.js';
import { escHtml, emailFooter, emailWrapper } from './emailBase.js';

const verifyEmailTemplate = ({ name, url }) => {
  const logo = getBrandLogoUrl();
  const displayName = name ? escHtml(name) : 'there';

  const innerRows = `
  <!-- HEADER: Rose-to-plum gradient, welcoming -->
  <tr>
    <td class="pad-mobile" style="background:linear-gradient(150deg,#7c1947 0%,#3b0764 55%,#160622 100%);padding:52px 48px 44px;text-align:center;">
      <img src="${logo}" alt="${escHtml(nawiriBrand.shortName)}" width="96" style="display:block;margin:0 auto 26px;border-radius:14px;background:#fff;padding:8px 10px;" />
      <div style="display:inline-block;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.28);border-radius:50px;padding:6px 22px;margin-bottom:22px;">
        <span style="font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.80);font-family:Arial,sans-serif;font-weight:700;">Welcome to Nawiri Hair</span>
      </div>
      <h1 class="hero-title" style="margin:0 0 14px;font-size:34px;line-height:1.18;color:#ffffff;font-weight:700;font-family:Georgia,serif;letter-spacing:-0.5px;">
        Your style journey<br/>begins here, ${displayName} ✨
      </h1>
      <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.68);line-height:1.75;font-family:Arial,sans-serif;font-style:italic;">
        ${escHtml(nawiriBrand.motto)}
      </p>
    </td>
  </tr>

  <!-- PINK ACCENT STRIPE -->
  <tr><td style="height:5px;background:linear-gradient(90deg,#de3163,#c69214,#de3163);"></td></tr>

  <!-- BODY -->
  <tr>
    <td class="pad-mobile" style="background:#ffffff;padding:48px 48px 40px;">
      <p style="margin:0 0 10px;font-size:18px;color:#1f1720;font-weight:700;font-family:Arial,sans-serif;">Hello ${displayName},</p>
      <p style="margin:0 0 22px;font-size:15px;color:#4d3d3f;line-height:1.9;font-family:Arial,sans-serif;">
        Thank you for joining <strong>Nawiri Hair Kenya</strong> — your destination for premium wigs, weaves, braids, and extensions crafted to elevate your everyday confidence.
      </p>
      <p style="margin:0 0 32px;font-size:15px;color:#4d3d3f;line-height:1.9;font-family:Arial,sans-serif;">
        One quick step remains: confirm that this email address belongs to you. Click the button below and you are all set.
      </p>

      <!-- FEATURE LIST -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:38px;">
        ${[
          ['💇', 'Browse our full collection of premium hair products'],
          ['⭐', 'Earn Royal Points on every purchase for exclusive rewards'],
          ['🎁', 'Get early access to new arrivals and member-only deals'],
        ].map(([icon, text]) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #f5ede4;vertical-align:top;">
            <table role="presentation" cellspacing="0" cellpadding="0">
              <tr>
                <td style="width:40px;font-size:22px;vertical-align:middle;">${icon}</td>
                <td style="font-size:14px;color:#4d3d3f;line-height:1.75;font-family:Arial,sans-serif;padding-left:12px;vertical-align:middle;">${escHtml(text)}</td>
              </tr>
            </table>
          </td>
        </tr>`).join('')}
      </table>

      <!-- CTA BUTTON -->
      <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 28px;text-align:center;">
        <tr>
          <td style="border-radius:999px;background:linear-gradient(135deg,#de3163 0%,#7c1947 100%);box-shadow:0 8px 28px rgba(222,49,99,0.38);">
            <a href="${escHtml(url)}" style="display:inline-block;padding:18px 56px;border-radius:999px;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;letter-spacing:0.04em;font-family:Arial,sans-serif;white-space:nowrap;">
              Verify My Email Address →
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:0;font-size:12px;color:#9e8e8a;line-height:1.8;text-align:center;font-family:Arial,sans-serif;">
        Link expires in <strong>24 hours</strong>. If you did not sign up, safely ignore this.<br/>
        Can't click? Copy: <span style="word-break:break-all;color:#de3163;">${escHtml(url)}</span>
      </p>
    </td>
  </tr>

  ${emailFooter({ accentColor: '#de3163', darkBg: '#1f1720' })}`;

  return emailWrapper({
    innerRows,
    preheader: `Welcome to Nawiri Hair Kenya — please verify your email to get started.`,
    bgColor: '#fdf6f0',
    title: 'Verify your email — Nawiri Hair Kenya',
  });
};

export default verifyEmailTemplate;
