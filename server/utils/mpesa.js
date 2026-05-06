export function getCurrentTimestamp(date = new Date()) {
    const pad = (value) => String(value).padStart(2, '0');
    return [
        date.getFullYear(),
        pad(date.getMonth() + 1),
        pad(date.getDate()),
        pad(date.getHours()),
        pad(date.getMinutes()),
        pad(date.getSeconds())
    ].join('');
}

export function generatePassword(
    businessShortCode = process.env.MPESA_BUSINESS_SHORT_CODE || process.env.MPESA_SHORTCODE,
    passkey = process.env.MPESA_PASSKEY,
    timestamp = getCurrentTimestamp()
) {
    if (!businessShortCode || !passkey || !timestamp) {
        throw new Error('Missing M-Pesa shortcode, passkey, or timestamp');
    }

    return Buffer.from(`${businessShortCode}${passkey}${timestamp}`).toString('base64');
}

export default {
    getCurrentTimestamp,
    generatePassword
};
