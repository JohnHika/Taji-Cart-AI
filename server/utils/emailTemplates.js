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
          <td style="padding: 8px 0; color: #7a6a66; font-size: 13px; width: 36%;">${escapeHtml(row.label)}</td>
          <td style="padding: 8px 0; color: #1f1720; font-size: 14px; font-weight: 600;">${escapeHtml(row.value)}</td>
        </tr>
      `
    )
    .join('');

const renderHighlights = (items = []) =>
  items
    .filter(Boolean)
    .map(
      (item) => `
        <li style="margin: 0 0 8px; color: #4d3d3f; line-height: 1.7;">${escapeHtml(item)}</li>
      `
    )
    .join('');

export const renderEmailLayout = ({
  preheader = nawiriBrand.motto,
  eyebrow = nawiriBrand.shortName,
  title,
  greeting,
  intro,
  highlights = [],
  infoRows = [],
  ctaLabel,
  ctaUrl,
  supportingText,
  footerNote = 'We are here whenever you need support, styling guidance, or order help.',
}) => {
  const logoUrl = getBrandLogoUrl();

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(title)}</title>
      </head>
      <body style="margin: 0; padding: 0; background: #f7f1eb; font-family: Arial, Helvetica, sans-serif; color: #1f1720;">
        <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">
          ${escapeHtml(preheader)}
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #f7f1eb; padding: 24px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 640px; background: #ffffff; border-radius: 28px; overflow: hidden; box-shadow: 0 18px 40px rgba(34, 20, 24, 0.08);">
                <tr>
                  <td style="padding: 36px 36px 28px; background: linear-gradient(135deg, #160622 0%, #342133 52%, #c69214 100%);">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="vertical-align: top;">
                          ${
                            logoUrl
                              ? `
                                <div style="display: inline-block; background: #ffffff; border-radius: 18px; padding: 10px 12px; margin-bottom: 18px;">
                                  <img src="${logoUrl}" alt="${escapeHtml(nawiriBrand.shortName)}" style="display: block; width: 140px; max-width: 100%; height: auto;" />
                                </div>
                              `
                              : ''
                          }
                          <div style="font-size: 12px; letter-spacing: 0.24em; text-transform: uppercase; color: rgba(255,255,255,0.72); font-weight: 700;">
                            ${escapeHtml(eyebrow)}
                          </div>
                          <h1 style="margin: 14px 0 10px; font-size: 30px; line-height: 1.18; color: #ffffff;">
                            ${escapeHtml(title)}
                          </h1>
                          <p style="margin: 0; color: rgba(255,255,255,0.82); font-size: 15px; line-height: 1.7;">
                            ${escapeHtml(nawiriBrand.motto)}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 34px 36px 18px;">
                    <p style="margin: 0 0 14px; font-size: 15px; color: #4d3d3f; line-height: 1.8;">
                      ${escapeHtml(greeting)}
                    </p>
                    <p style="margin: 0; font-size: 15px; color: #4d3d3f; line-height: 1.8;">
                      ${escapeHtml(intro)}
                    </p>

                    ${
                      highlights.length
                        ? `
                          <ul style="margin: 22px 0 0; padding-left: 20px;">
                            ${renderHighlights(highlights)}
                          </ul>
                        `
                        : ''
                    }

                    ${
                      infoRows.length
                        ? `
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 24px; background: #fff8ef; border: 1px solid #f2dfbe; border-radius: 18px; padding: 18px 20px;">
                            ${renderInfoRows(infoRows)}
                          </table>
                        `
                        : ''
                    }

                    ${
                      ctaLabel && ctaUrl
                        ? `
                          <div style="margin-top: 28px;">
                            <a href="${ctaUrl}" style="display: inline-block; padding: 14px 22px; border-radius: 999px; background: #c69214; color: #160622; text-decoration: none; font-weight: 700;">
                              ${escapeHtml(ctaLabel)}
                            </a>
                          </div>
                        `
                        : ''
                    }

                    ${
                      supportingText
                        ? `
                          <p style="margin: 20px 0 0; font-size: 13px; color: #7a6a66; line-height: 1.7;">
                            ${escapeHtml(supportingText)}
                          </p>
                        `
                        : ''
                    }
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 36px 32px;">
                    <div style="margin-top: 10px; padding-top: 22px; border-top: 1px solid #efe4db;">
                      <p style="margin: 0 0 14px; font-size: 13px; color: #7a6a66; line-height: 1.8;">
                        ${escapeHtml(footerNote)}
                      </p>
                      <p style="margin: 0; font-size: 13px; color: #7a6a66; line-height: 1.8;">
                        ${escapeHtml(nawiriBrand.shortName)}<br />
                        ${escapeHtml(nawiriBrand.location)}<br />
                        ${escapeHtml(nawiriBrand.phoneDisplay)} | ${escapeHtml(nawiriBrand.supportEmail)}<br />
                        Instagram ${escapeHtml(nawiriBrand.instagramHandle)} | TikTok ${escapeHtml(nawiriBrand.tiktokHandle)}
                      </p>
                    </div>
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
  highlights = [],
  infoRows = [],
  ctaLabel,
  ctaUrl,
  supportingText,
}) =>
  renderEmailLayout({
    title,
    greeting: `Hello ${name || 'there'},`,
    intro,
    highlights,
    infoRows,
    ctaLabel,
    ctaUrl,
    supportingText,
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
    greeting: `Hello ${name || 'there'},`,
    intro,
    infoRows: [
      { label: 'Order reference', value: orderId },
      { label: 'Order total', value: total },
      { label: 'Fulfilment', value: fulfillmentType },
      ...(pickupLocation ? [{ label: 'Pickup point', value: pickupLocation }] : []),
      ...(verificationCode ? [{ label: 'Verification code', value: verificationCode }] : []),
    ],
    ctaLabel,
    ctaUrl,
  });
