import { escHtml, emailFooter, emailWrapper } from './emailBase.js';

const forgotPasswordTemplate = ({ name, otp }) => {
  const displayName = name ? escHtml(name) : 'there';

  const innerRows = `
  <!-- HERO — deep midnight-blue/indigo security look -->
  <tr>
    <td class="pad-mobile" style="background:linear-gradient(160deg,#0f172a 0%,#1e1b4b 50%,#312e81 100%);padding:52px 48px 42px;text-align:center;">
      <!-- Shield badge -->
      <div style="display:inline-flex;align-items:center;justify-content:center;width:68px;height:68px;background:linear-gradient(180deg,#4f46e5,#7c3aed);border-radius:50%;margin-bottom:24px;">
        <span style="font-size:32px;line-height:1;">🔐</span>
      </div>
      <div style="display:inline-block;background:rgba(255,255,255,0.10);border:1px solid rgba(255,255,255,0.22);border-radius:50px;padding:5px 20px;margin-bottom:20px;">
        <span style="font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:rgba(255,255,255,0.72);font-family:Arial,sans-serif;font-weight:700;">Security Alert</span>
      </div>
      <h1 class="hero-title" style="margin:0 0 12px;font-size:32px;line-height:1.18;color:#ffffff;font-weight:700;font-family:Georgia,serif;letter-spacing:-0.5px;">
        Password Reset Request
      </h1>
      <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.58);line-height:1.75;font-family:Arial,sans-serif;">
        We received a request to reset the password for your account.
      </p>
    </td>
  </tr>

  <!-- INDIGO ACCENT STRIPE -->
  <tr><td style="height:5px;background:linear-gradient(90deg,#4f46e5,#7c3aed,#4f46e5);"></td></tr>

  <!-- DARK BODY SECTION -->
  <tr>
    <td class="pad-mobile" style="background:#13111c;padding:48px 48px 40px;">
      <p style="margin:0 0 8px;font-size:16px;color:rgba(255,255,255,0.88);font-weight:700;font-family:Arial,sans-serif;">Hello ${displayName},</p>
      <p style="margin:0 0 30px;font-size:15px;color:rgba(255,255,255,0.55);line-height:1.9;font-family:Arial,sans-serif;">
        Enter the one-time code below to verify your identity and reset your password. This code is valid for <strong style="color:#fff;">1 hour</strong>.
      </p>

      <!-- OTP CODE BLOCK -->
      <div style="background:#080b1a;border:1.5px solid rgba(79,70,229,0.40);border-radius:18px;padding:38px 20px;text-align:center;margin-bottom:32px;">
        <p style="margin:0 0 14px;font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:rgba(255,255,255,0.32);font-weight:700;font-family:Arial,sans-serif;">Your one-time code</p>
        <div style="font-size:56px;font-weight:700;letter-spacing:0.22em;color:#818cf8;font-family:'Courier New',Courier,monospace;line-height:1;">
          ${escHtml(String(otp))}
        </div>
        <p style="margin:16px 0 0;font-size:12px;color:rgba(255,255,255,0.28);font-family:Arial,sans-serif;">Valid for 1 hour &mdash; never share this code with anyone</p>
      </div>

      <!-- SECURITY NOTICES -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:32px;">
        ${[
          ['🔒', 'Enter this code exactly on the password reset screen'],
          ['⚠️', 'Nawiri Hair Kenya staff will <strong>never</strong> ask you for this code'],
          ['✅', 'Did not request this? Your account is safe — you can ignore this email'],
        ].map(([icon, text]) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.07);">
            <table role="presentation" cellspacing="0" cellpadding="0">
              <tr>
                <td style="width:36px;font-size:20px;vertical-align:middle;">${icon}</td>
                <td style="font-size:13px;color:rgba(255,255,255,0.52);line-height:1.75;font-family:Arial,sans-serif;padding-left:12px;vertical-align:middle;">${text}</td>
              </tr>
            </table>
          </td>
        </tr>`).join('')}
      </table>

      <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.22);text-align:center;font-family:Arial,sans-serif;">
        Having trouble? <a href="mailto:nawirihairke@gmail.com" style="color:#818cf8;text-decoration:none;">Contact our support team</a>
      </p>
    </td>
  </tr>

  ${emailFooter({ accentColor: '#818cf8', darkBg: '#080b18' })}`;

  return emailWrapper({
    innerRows,
    preheader: 'Your Nawiri Hair Kenya password reset code is inside — valid for 1 hour.',
    bgColor: '#0a0e27',
    title: 'Reset your password — Nawiri Hair Kenya',
  });
};

export default forgotPasswordTemplate;
