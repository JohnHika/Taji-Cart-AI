import { getBrandLogoUrl, nawiriBrand } from './brand.js';

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderInfoRows = (rows = []) =>
  rows
    .filter((row) => row?.label && row?.value)
    .map(
      (row) => `
        <tr>
          <td style="padding: 11px 0; color: #7a6a66; font-size: 13px; width: 38%; border-bottom: 1px solid #f0e4d4;">${escapeHtml(row.label)}</td>
          <td style="padding: 11px 0; color: #1f1720; font-size: 14px; font-weight: 700; border-bottom: 1px solid #f0e4d4;">${escapeHtml(row.value)}</td>
        </tr>
      `
    )
    .join('');

const renderHighlights = (items = []) =>
  items
    .filter(Boolean)
    .map(
      (item) => `
        <li style="margin: 0 0 10px; color: #4d3d3f; line-height: 1.75; font-size: 14px;">${escapeHtml(item)}</li>
      `
    )
    .join('');

export const renderEmailLayout = ({
  preheader = nawiriBrand.motto,
  eyebrow = nawiriBrand.shortName,
  title,
  greeting,
  intro,
  introHtml,
  highlights = [],
  infoRows = [],
  codeBlock,
  ctaLabel,
  ctaUrl,
  supportingText,
  headerGradient = 'linear-gradient(135deg, #160622 0%, #342133 52%, #c69214 100%)',
  footerNote = 'We are here whenever you need support, styling guidance, or order help.',
}) => {
  const logoUrl = getBrandLogoUrl();
  const year = new Date().getFullYear();

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(title)}</title>
      </head>
      <body style="margin: 0; padding: 0; background: #f5ede4; font-family: Arial, Helvetica, sans-serif; color: #1f1720;">
        <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">
          ${escapeHtml(preheader)}
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #f5ede4; padding: 32px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 16px 48px rgba(34, 20, 24, 0.12);">

                <!-- HEADER BANNER -->
                <tr>
                  <td style="padding: 40px 40px 32px; background: ${headerGradient};">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td>
                          ${
                            logoUrl
                              ? `<div style="margin-bottom: 22px;">
                                  <img src="${logoUrl}" alt="${escapeHtml(nawiriBrand.shortName)}" style="display: block; width: 110px; height: auto; border-radius: 12px; background: #ffffff; padding: 8px 10px;" />
                                </div>`
                              : ''
                          }
                          <div style="font-size: 11px; letter-spacing: 0.30em; text-transform: uppercase; color: rgba(255,255,255,0.60); font-weight: 700; margin-bottom: 14px;">
                            ${escapeHtml(eyebrow)}
                          </div>
                          <h1 style="margin: 0 0 14px; font-size: 27px; line-height: 1.22; color: #ffffff; font-weight: 700;">
                            ${escapeHtml(title)}
                          </h1>
                          <p style="margin: 0; color: rgba(255,255,255,0.75); font-size: 14px; line-height: 1.65; font-style: italic;">
                            ${escapeHtml(nawiriBrand.motto)}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- BODY -->
                <tr>
                  <td style="padding: 38px 40px 10px;">
                    <p style="margin: 0 0 18px; font-size: 16px; color: #1f1720; font-weight: 600; line-height: 1.5;">
                      ${escapeHtml(greeting)}
                    </p>
                    <p style="margin: 0; font-size: 15px; color: #4d3d3f; line-height: 1.85;">
                      ${introHtml || escapeHtml(intro || '')}
                    </p>

                    ${
                      highlights.length
                        ? `<ul style="margin: 24px 0 0; padding-left: 20px;">
                            ${renderHighlights(highlights)}
                          </ul>`
                        : ''
                    }

                    ${
                      infoRows.length
                        ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 28px; background: #fff9f0; border: 1px solid #f0ddb8; border-radius: 16px; padding: 18px 22px;">
                            ${renderInfoRows(infoRows)}
                          </table>`
                        : ''
                    }

                    ${
                      codeBlock
                        ? `<div style="margin: 32px 0 0; background: #1f1720; border-radius: 18px; padding: 30px 20px; text-align: center;">
                            <div style="font-size: 11px; letter-spacing: 0.26em; text-transform: uppercase; color: rgba(255,255,255,0.50); margin-bottom: 14px; font-weight: 600;">Your one-time code</div>
                            <div style="font-size: 44px; font-weight: 700; letter-spacing: 0.22em; color: #c69214; font-family: 'Courier New', Courier, monospace; line-height: 1;">
                              ${escapeHtml(String(codeBlock))}
                            </div>
                            <div style="margin-top: 14px; font-size: 12px; color: rgba(255,255,255,0.45); line-height: 1.6;">Valid for 1 hour &mdash; never share this code with anyone</div>
                          </div>`
                        : ''
                    }

                    ${
                      ctaLabel && ctaUrl
                        ? `<div style="margin-top: 34px; text-align: center;">
                            <a href="${ctaUrl}" style="display: inline-block; padding: 16px 40px; border-radius: 999px; background: linear-gradient(135deg, #c69214 0%, #e8b83a 100%); color: #160622; text-decoration: none; font-weight: 700; font-size: 15px; letter-spacing: 0.03em; box-shadow: 0 6px 20px rgba(198,146,20,0.38);">
                              ${escapeHtml(ctaLabel)}
                            </a>
                          </div>`
                        : ''
                    }

                    ${
                      supportingText
                        ? `<p style="margin: 20px 0 0; font-size: 12px; color: #9e8e8a; line-height: 1.75; text-align: center;">
                            ${escapeHtml(supportingText)}
                          </p>`
                        : ''
                    }
                  </td>
                </tr>

                <!-- DIVIDER -->
                <tr>
                  <td style="padding: 28px 40px 0;">
                    <div style="height: 1px; background: linear-gradient(90deg, transparent, #e8d8c8, transparent);"></div>
                  </td>
                </tr>

                <!-- FOOTER -->
                <tr>
                  <td style="padding: 24px 40px 36px;">
                    <p style="margin: 0 0 12px; font-size: 13px; color: #9e8e8a; line-height: 1.8;">
                      ${escapeHtml(footerNote)}
                    </p>
                    <p style="margin: 0 0 10px; font-size: 13px; color: #7a6a66; line-height: 1.75;">
                      <strong style="color: #1f1720;">${escapeHtml(nawiriBrand.shortName)}</strong><br />
                      ${escapeHtml(nawiriBrand.location)}<br />
                      <a href="tel:${escapeHtml(nawiriBrand.phoneDial)}" style="color: #c69214; text-decoration: none;">${escapeHtml(nawiriBrand.phoneDisplay)}</a>
                      &nbsp;|&nbsp;
                      <a href="mailto:${escapeHtml(nawiriBrand.supportEmail)}" style="color: #c69214; text-decoration: none;">${escapeHtml(nawiriBrand.supportEmail)}</a>
                    </p>
                    <p style="margin: 0 0 16px; font-size: 12px; color: #b0a09c;">
                      <a href="${escapeHtml(nawiriBrand.instagramUrl)}" style="color: #c69214; text-decoration: none;">Instagram ${escapeHtml(nawiriBrand.instagramHandle)}</a>
                      &nbsp;&nbsp;&middot;&nbsp;&nbsp;
                      <a href="${escapeHtml(nawiriBrand.tiktokUrl)}" style="color: #c69214; text-decoration: none;">TikTok ${escapeHtml(nawiriBrand.tiktokHandle)}</a>
                    </p>
                    <p style="margin: 0; font-size: 11px; color: #c8b8b0;">
                      &copy; ${year} ${escapeHtml(nawiriBrand.companyName)}. All rights reserved.
                      &nbsp;&middot;&nbsp;
                      <a href="${escapeHtml(nawiriBrand.websiteUrl)}" style="color: #c69214; text-decoration: none;">${escapeHtml(nawiriBrand.websiteUrl)}</a>
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

export const renderAccountNoticeEmail = ({
  name,
  title,
  intro,
  introHtml,
  highlights = [],
  infoRows = [],
  codeBlock,
  ctaLabel,
  ctaUrl,
  supportingText,
  headerGradient,
  footerNote,
}) =>
  renderEmailLayout({
    title,
    greeting: `Hello${name ? `, ${name}` : ''},`,
    intro,
    introHtml,
    highlights,
    infoRows,
    codeBlock,
    ctaLabel,
    ctaUrl,
    supportingText,
    ...(headerGradient && { headerGradient }),
    ...(footerNote && { footerNote }),
  });

export const renderOrderNoticeEmail = ({
  name,
  title,
  intro,
  orderId,
  total,
  fulfillmentType,
  pickupLocation,
  verificationCode,
  ctaLabel,
  ctaUrl,
}) =>
  renderEmailLayout({
    eyebrow: 'Order Update',
    title,
    greeting: `Hello${name ? `, ${name}` : ''},`,
    intro,
    headerGradient: 'linear-gradient(135deg, #0d2018 0%, #1a4a2e 52%, #c69214 100%)',
    infoRows: [
      { label: 'Order reference', value: orderId },
      { label: 'Order total', value: total },
      { label: 'Fulfilment', value: fulfillmentType },
      ...(pickupLocation ? [{ label: 'Pickup point', value: pickupLocation }] : []),
      ...(verificationCode ? [{ label: 'Verification code', value: verificationCode }] : []),
    ],
    ctaLabel,
    ctaUrl,
    footerNote: 'Questions about your order? Reply to this email or reach us on WhatsApp — we are happy to help.',
  });
