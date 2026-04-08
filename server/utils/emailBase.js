/**
 * emailBase.js
 * Shared helpers used across all 5 email templates.
 * - escHtml: HTML-escape a string
 * - socialIconsHtml: Inline-SVG social buttons for IG, TikTok, phone
 * - emailFooter: Standard branded footer
 * - emailWrapper: Full responsive wrapper
 */

import { nawiriBrand, getBrandLogoUrl } from './brand.js';

export const escHtml = (v = '') =>
  String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// ─── Instagram SVG (white) ─────────────────────────────────────────────────
const igSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="2" y="2" width="20" height="20" rx="5.5" stroke="white" stroke-width="2"/>
  <circle cx="12" cy="12" r="4" stroke="white" stroke-width="2"/>
  <circle cx="17.5" cy="6.5" r="1.25" fill="white"/>
</svg>`;

// ─── TikTok SVG (white) ───────────────────────────────────────────────────
const ttSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/>
</svg>`;

// ─── Phone SVG (white) ────────────────────────────────────────────────────
const phoneSvg = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24 11.4 11.4 0 003.57.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.4 11.4 0 00.57 3.57 1 1 0 01-.25 1.02l-2.2 2.2z" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export const socialIconsHtml = `
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
  <tr>
    <td style="padding:0 6px;">
      <a href="${nawiriBrand.instagramUrl}" target="_blank" style="display:inline-block;width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045);text-align:center;line-height:38px;text-decoration:none;vertical-align:middle;">
        <span style="display:inline-block;vertical-align:middle;line-height:1;">${igSvg}</span>
      </a>
    </td>
    <td style="padding:0 6px;">
      <a href="${nawiriBrand.tiktokUrl}" target="_blank" style="display:inline-block;width:38px;height:38px;border-radius:50%;background:#010101;border:1px solid rgba(255,255,255,0.20);text-align:center;line-height:38px;text-decoration:none;vertical-align:middle;">
        <span style="display:inline-block;vertical-align:middle;line-height:1;">${ttSvg}</span>
      </a>
    </td>
    <td style="padding:0 6px;">
      <a href="tel:${nawiriBrand.phoneDial}" style="display:inline-block;width:38px;height:38px;border-radius:50%;background:#c69214;text-align:center;line-height:38px;text-decoration:none;vertical-align:middle;">
        <span style="display:inline-block;vertical-align:middle;line-height:1;">${phoneSvg}</span>
      </a>
    </td>
  </tr>
</table>`;

export const emailFooter = ({ accentColor = '#c69214', darkBg = '#1f1720' } = {}) => {
  const year = new Date().getFullYear();
  return `
  <!-- DIVIDER -->
  <tr>
    <td style="padding:0 40px;">
      <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent);"></div>
    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td style="background:${darkBg};border-radius:0 0 22px 22px;padding:28px 40px 32px;text-align:center;">

      <!-- LOGO IN FOOTER -->
      <div style="margin-bottom:16px;">
        <img src="${getBrandLogoUrl()}" alt="${escHtml(nawiriBrand.shortName)}" width="64" style="border-radius:10px;background:#fff;padding:5px 7px;" />
      </div>

      <!-- SOCIAL ICONS -->
      <div style="margin-bottom:18px;">
        ${socialIconsHtml}
      </div>

      <!-- CONTACT LINE -->
      <p style="margin:0 0 10px;font-size:13px;color:rgba(255,255,255,0.55);line-height:1.9;">
        <strong style="color:rgba(255,255,255,0.80);">${escHtml(nawiriBrand.companyName)}</strong><br/>
        ${escHtml(nawiriBrand.location)}<br/>
        <a href="tel:${escHtml(nawiriBrand.phoneDial)}" style="color:${accentColor};text-decoration:none;">${escHtml(nawiriBrand.phoneDisplay)}</a>
        &nbsp;&middot;&nbsp;
        <a href="mailto:${escHtml(nawiriBrand.supportEmail)}" style="color:${accentColor};text-decoration:none;">${escHtml(nawiriBrand.supportEmail)}</a>
      </p>

      <!-- SOCIAL HANDLES TEXT -->
      <p style="margin:0 0 14px;font-size:12px;">
        <a href="${escHtml(nawiriBrand.instagramUrl)}" style="color:${accentColor};text-decoration:none;">${escHtml(nawiriBrand.instagramHandle)}</a>
        &nbsp;&nbsp;&middot;&nbsp;&nbsp;
        <a href="${escHtml(nawiriBrand.tiktokUrl)}" style="color:${accentColor};text-decoration:none;">${escHtml(nawiriBrand.tiktokHandle)}</a>
        &nbsp;&nbsp;&middot;&nbsp;&nbsp;
        <a href="${escHtml(nawiriBrand.websiteUrl)}" style="color:${accentColor};text-decoration:none;">${escHtml(nawiriBrand.websiteUrl)}</a>
      </p>

      <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.22);">
        &copy; ${year} ${escHtml(nawiriBrand.companyName)}. All rights reserved.
      </p>
    </td>
  </tr>`;
};

/**
 * Wraps inner table rows in a full responsive email document.
 * @param {string} innerRows - HTML <tr> blocks to insert inside the max-width wrapper
 * @param {string} preheader  - Hidden preview text
 * @param {string} bgColor    - Outer background color
 */
export const emailWrapper = ({ innerRows, preheader = nawiriBrand.motto, bgColor = '#f5ede4', title = nawiriBrand.shortName } = {}) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta name="x-apple-disable-message-reformatting"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>${escHtml(title)}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    @media only screen and (max-width:620px){
      .email-container{width:100%!important;margin:0!important;}
      .stack-col{display:block!important;width:100%!important;}
      .pad-mobile{padding-left:24px!important;padding-right:24px!important;}
      .hero-title{font-size:26px!important;}
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${bgColor};word-spacing:normal;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <!-- PREHEADER -->
  <div style="display:none;font-size:1px;color:${bgColor};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${escHtml(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${bgColor};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table class="email-container" role="presentation" cellspacing="0" cellpadding="0" border="0"
          style="width:100%;max-width:680px;border-radius:22px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.14);">
          ${innerRows}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
