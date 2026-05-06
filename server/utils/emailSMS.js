import nodemailer from 'nodemailer';

/**
 * FREE SMS sending via Email-to-SMS gateways
 * Works for Kenyan phone numbers (Safaricom & Airtel)
 *
 * How it works:
 * - Safaricom: 2547XXXXXXXX@safaricomsms.co.ke
 * - Airtel: 2547XXXXXXXX@airtel.co.ke
 *
 * Limitations:
 * - Max 160 characters per SMS
 * - Delivery not guaranteed (depends on carrier)
 * - May take 1-5 minutes to arrive
 *
 * For production/high-volume, use Africa's Talking instead
 */

// Create email transporter (uses your existing SMTP/Resend)
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.resend.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true' || false,
    auth: {
      user: process.env.SMTP_USER || 'resend',
      pass: process.env.SMTP_PASS || process.env.RESEND_API
    }
  });
};

// Detect carrier from phone number prefix
const detectCarrier = (phoneNumber) => {
  const cleanNumber = phoneNumber.replace(/\+/g, '').replace(/\s/g, '');

  // Safaricom prefixes: 0712, 0713, 0714, 0715, 0716, 072, 073, 074, 075, 076, 077, 078, 079
  const safaricomPrefixes = ['254712', '254713', '254714', '254715', '254716',
                             '25472', '25473', '25474', '25475', '25476', '25477', '25478', '25479',
                             '0712', '0713', '0714', '0715', '0716',
                             '072', '073', '074', '075', '076', '077', '078', '079'];

  // Airtel prefixes: 070, 0710, 0711, 0728, 0729, 0730, 0731
  const airtelPrefixes = ['25470', '254710', '254711', '254728', '254729', '254730', '254731',
                          '070', '0710', '0711', '0728', '0729', '0730', '0731'];

  for (const prefix of safaricomPrefixes) {
    if (cleanNumber.startsWith(prefix) || cleanNumber.startsWith('254' + prefix.substring(1))) {
      return 'safaricom';
    }
  }

  for (const prefix of airtelPrefixes) {
    if (cleanNumber.startsWith(prefix) || cleanNumber.startsWith('254' + prefix.substring(1))) {
      return 'airtel';
    }
  }

  // Default to Safaricom (most common)
  return 'safaricom';
};

// Get email-to-SMS gateway address
const getSMSEmailAddress = (phoneNumber) => {
  const carrier = detectCarrier(phoneNumber);
  const cleanNumber = phoneNumber.replace(/\+/g, '').replace(/\s/g, '');

  // Format: remove country code for gateway
  let gatewayNumber = cleanNumber;
  if (gatewayNumber.startsWith('254')) {
    gatewayNumber = gatewayNumber.substring(3); // Remove 254
  }
  if (gatewayNumber.startsWith('0')) {
    gatewayNumber = gatewayNumber.substring(1); // Remove leading 0
  }

  // Add @ gateway domain
  if (carrier === 'safaricom') {
    return `${gatewayNumber}@safaricomsms.co.ke`;
  } else if (carrier === 'airtel') {
    return `${gatewayNumber}@airtel.co.ke`;
  }

  // Default to Safaricom
  return `${gatewayNumber}@safaricomsms.co.ke`;
};

/**
 * Send FREE SMS via Email-to-SMS gateway
 * @param {string} phoneNumber - Kenyan phone number (e.g., 0712345678 or 254712345678)
 * @param {string} message - SMS message (max 160 characters)
 * @returns {Promise<boolean>} - Success status
 */
export const sendEmailSMS = async (phoneNumber, message) => {
  try {
    // Truncate message to 160 characters (SMS limit)
    const truncatedMessage = message.length > 160
      ? message.substring(0, 157) + '...'
      : message;

    const smsEmail = getSMSEmailAddress(phoneNumber);

    const transporter = createTransporter();

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'Nawiri Hair <noreply@nawirihairke.com>',
      to: smsEmail,
      subject: '', // Empty subject for SMS
      text: truncatedMessage,
      html: undefined // Plain text only for SMS
    });

    console.log('✅ FREE SMS sent via email gateway to:', phoneNumber);
    return true;

  } catch (error) {
    console.error('❌ FREE SMS sending failed:', error.message);
    throw error;
  }
};

/**
 * Send bulk SMS (for notifications, promotions)
 * @param {string[]} phoneNumbers - Array of phone numbers
 * @param {string} message - SMS message
 * @returns {Promise<{success: number, failed: number}>}
 */
export const sendBulkEmailSMS = async (phoneNumbers, message) => {
  const results = { success: 0, failed: 0 };

  for (const phone of phoneNumbers) {
    try {
      await sendEmailSMS(phone, message);
      results.success++;
    } catch (error) {
      results.failed++;
      console.error(`Failed to send to ${phone}:`, error.message);
    }
  }

  return results;
};

export default { sendEmailSMS, sendBulkEmailSMS };
