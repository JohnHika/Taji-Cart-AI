import { escHtml, emailFooter, emailWrapper } from './emailBase.js';

const TIERS = {
  Basic:    { color: '#9e8e8a', label: 'Basic',    icon: '⚪', nextAt: 200  },
  Bronze:   { color: '#cd7f32', label: 'Bronze',   icon: '🥉', nextAt: 500  },
  Silver:   { color: '#94a3b8', label: 'Silver',   icon: '🥈', nextAt: 1000 },
  Gold:     { color: '#c69214', label: 'Gold',     icon: '🥇', nextAt: 2000 },
  Platinum: { color: '#94a3b8', label: 'Platinum', icon: '💎', nextAt: null },
};

/**
 * Loyalty points earned / tier upgrade email.
 * Distinct design: Rich gold/luxury aesthetic, large points counter, tier badge, tier ladder.
 */
export const renderLoyaltyPointsEmail = ({
  name,
  pointsEarned,
  totalPoints,
  tier = 'Basic',
  tierUpgraded = false,
  ctaLabel = 'View My Rewards',
  ctaUrl,
}) => {
  const displayName = name ? escHtml(name) : 'there';
  const tierCfg = TIERS[tier] || TIERS.Basic;

  // Progress bar to next tier
  let progressPct = 0;
  let progressLabel = '';
  if (tierCfg.nextAt) {
    const prevAt = tier === 'Basic' ? 0 : tier === 'Bronze' ? 200 : tier === 'Silver' ? 500 : 1000;
    progressPct = Math.min(100, Math.round(((totalPoints - prevAt) / (tierCfg.nextAt - prevAt)) * 100));
    const remaining = tierCfg.nextAt - totalPoints;
    progressLabel = remaining > 0
      ? `${remaining.toLocaleString()} points to ${Object.keys(TIERS)[Object.keys(TIERS).indexOf(tier) + 1] || 'Platinum'}`
      : 'Tier upgrade available!';
  }

  const tierLadder = Object.entries(TIERS).map(([key, t]) => {
    const isActive = key === tier;
    return `
    <td style="text-align:center;padding:0 6px;">
      <div style="font-size:22px;margin-bottom:6px;">${t.icon}</div>
      <div style="font-size:10px;font-weight:${isActive ? '700' : '400'};color:${isActive ? tierCfg.color : 'rgba(255,255,255,0.35)'};letter-spacing:0.08em;text-transform:uppercase;${isActive ? `border-bottom:2px solid ${tierCfg.color};padding-bottom:4px;` : ''}">${escHtml(t.label)}</div>
    </td>`;
  }).join('');

  const innerRows = `
  <!-- HERO — Rich gold/luxury feel -->
  <tr>
    <td class="pad-mobile" style="background:linear-gradient(150deg,#1a0f00 0%,#78350f 45%,#c69214 100%);padding:50px 48px 40px;text-align:center;">
      <div style="display:inline-block;background:rgba(198,146,20,0.20);border:1px solid rgba(198,146,20,0.50);border-radius:50px;padding:6px 22px;margin-bottom:22px;">
        <span style="font-size:12px;letter-spacing:0.25em;text-transform:uppercase;color:#e8b83a;font-weight:700;font-family:Arial,sans-serif;">Royal Rewards</span>
      </div>
      ${tierUpgraded
        ? `<h1 class="hero-title" style="margin:0 0 10px;font-size:32px;color:#ffffff;font-weight:700;font-family:Georgia,serif;">Tier Upgrade! ${tierCfg.icon}</h1>
           <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.68);line-height:1.75;font-family:Arial,sans-serif;">You've unlocked <strong style="color:#e8b83a;">${escHtml(tier)} status</strong>. Enjoy your new rewards!</p>`
        : `<h1 class="hero-title" style="margin:0 0 10px;font-size:32px;color:#ffffff;font-weight:700;font-family:Georgia,serif;">You've Earned Points! 🎊</h1>
           <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.68);line-height:1.75;font-family:Arial,sans-serif;">Your Royal Points balance has been updated.</p>`}

      <!-- TIER LADDER -->
      <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px auto 0;">
        <tr>${tierLadder}</tr>
      </table>
    </td>
  </tr>

  <!-- GOLD ACCENT STRIPE -->
  <tr><td style="height:5px;background:linear-gradient(90deg,#78350f,#c69214,#e8b83a,#c69214,#78350f);"></td></tr>

  <!-- DARK LUXURY BODY -->
  <tr>
    <td class="pad-mobile" style="background:#13100a;padding:48px 48px 40px;">
      <p style="margin:0 0 26px;font-size:16px;color:rgba(255,255,255,0.80);font-family:Arial,sans-serif;">Hello ${displayName},</p>

      <!-- DUAL POINTS COUNTER -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:30px;">
        <tr>
          <td style="width:48%;background:#1f1a10;border:1.5px solid rgba(198,146,20,0.28);border-radius:16px;padding:26px;text-align:center;vertical-align:top;">
            <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.25em;text-transform:uppercase;color:rgba(255,255,255,0.32);font-weight:700;font-family:Arial,sans-serif;">Earned this order</p>
            <div style="font-size:48px;font-weight:700;color:#c69214;font-family:Georgia,serif;line-height:1;">+${escHtml(String(pointsEarned ?? 0))}</div>
            <p style="margin:8px 0 0;font-size:12px;color:rgba(255,255,255,0.38);font-family:Arial,sans-serif;">Royal Points</p>
          </td>
          <td style="width:4%;"></td>
          <td style="width:48%;background:#1f1a10;border:1.5px solid rgba(198,146,20,0.28);border-radius:16px;padding:26px;text-align:center;vertical-align:top;">
            <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.25em;text-transform:uppercase;color:rgba(255,255,255,0.32);font-weight:700;font-family:Arial,sans-serif;">Total balance</p>
            <div style="font-size:48px;font-weight:700;color:#e8b83a;font-family:Georgia,serif;line-height:1;">${escHtml(String(totalPoints ?? 0))}</div>
            <p style="margin:8px 0 0;font-size:12px;color:rgba(255,255,255,0.38);font-family:Arial,sans-serif;">Royal Points</p>
          </td>
        </tr>
      </table>

      <!-- CURRENT TIER BADGE + PROGRESS BAR -->
      <div style="background:linear-gradient(135deg,#1f1a10,#2a2010);border:1.5px solid rgba(198,146,20,0.38);border-radius:16px;padding:22px 26px;margin-bottom:32px;text-align:center;">
        <span style="font-size:30px;">${tierCfg.icon}</span>
        <p style="margin:10px 0 4px;font-size:19px;font-weight:700;color:${tierCfg.color};font-family:Arial,sans-serif;">${escHtml(tier)} Member</p>
        ${tierCfg.nextAt ? `
        <p style="margin:4px 0 14px;font-size:12px;color:rgba(255,255,255,0.38);font-family:Arial,sans-serif;">${escHtml(progressLabel)}</p>
        <div style="background:rgba(255,255,255,0.08);border-radius:999px;height:9px;overflow:hidden;">
          <div style="width:${progressPct}%;height:100%;background:linear-gradient(90deg,#c69214,#e8b83a);border-radius:999px;"></div>
        </div>
        <p style="margin:8px 0 0;font-size:11px;color:rgba(255,255,255,0.28);font-family:Arial,sans-serif;">${progressPct}% to next tier</p>` : `
        <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.45);font-family:Arial,sans-serif;">You're at the top! Maximum rewards unlocked.</p>`}
      </div>

      ${ctaUrl ? `
      <!-- CTA BUTTON -->
      <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 28px;">
        <tr>
          <td style="border-radius:999px;background:linear-gradient(135deg,#c69214 0%,#e8b83a 100%);box-shadow:0 8px 28px rgba(198,146,20,0.45);">
            <a href="${escHtml(ctaUrl)}" style="display:inline-block;padding:17px 54px;border-radius:999px;color:#160622;text-decoration:none;font-weight:700;font-size:16px;letter-spacing:0.04em;font-family:Arial,sans-serif;white-space:nowrap;">
              ${escHtml(ctaLabel)} →
            </a>
          </td>
        </tr>
      </table>` : ''}

      <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.32);text-align:center;line-height:1.8;font-family:Arial,sans-serif;">
        Earn 1 Royal Point for every KES 100 spent on Nawiri Hair Kenya.
      </p>
    </td>
  </tr>

  ${emailFooter({ accentColor: '#c69214', darkBg: '#0a0800' })}`;

  return emailWrapper({
    innerRows,
    preheader: tierUpgraded
      ? `Congratulations — you've been upgraded to ${tier} tier at Nawiri Hair Kenya!`
      : `You've earned ${pointsEarned} Royal Points from your latest Nawiri Hair Kenya purchase.`,
    bgColor: '#1a0f00',
    title: `${tierUpgraded ? 'Tier upgrade' : 'Points earned'} — Nawiri Hair Kenya`,
  });
};
