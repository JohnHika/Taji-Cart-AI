// Kenyan phone formats accepted from the client, normalized to 2547XXXXXXXX / 2541XXXXXXXX
// (the MSISDN format Jenga's stkussdpush/initiate endpoint expects).
const KENYAN_PHONE_PATTERNS = [
  /^0(7\d{8})$/,        // 07XXXXXXXX
  /^0(1\d{8})$/,        // 01XXXXXXXX
  /^254(7\d{8})$/,       // 2547XXXXXXXX
  /^254(1\d{8})$/,       // 2541XXXXXXXX
  /^\+254(7\d{8})$/,     // +2547XXXXXXXX
  /^\+254(1\d{8})$/,     // +2541XXXXXXXX
];

/**
 * Normalizes a Kenyan phone number to 254XXXXXXXXX format.
 * Returns null if the input doesn't match a supported Kenyan mobile format.
 */
const normalizeKenyanPhone = (input) => {
  const trimmed = String(input || '').trim();
  if (!trimmed) return null;

  for (const pattern of KENYAN_PHONE_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      return `254${match[1]}`;
    }
  }
  return null;
};

const MAX_AMOUNT_KES = 150000;

/**
 * Validates a payment amount in KES: finite, positive, minimum 1, max two
 * decimal places, and within an application-level ceiling.
 */
const isValidAmount = (amount) => {
  const value = Number(amount);
  if (!Number.isFinite(value)) return false;
  if (value < 1) return false;
  if (value > MAX_AMOUNT_KES) return false;

  // Reject more than 2 decimal places without relying on float subtraction.
  const [, decimals = ''] = value.toString().split('.');
  return decimals.length <= 2;
};

/**
 * Compares two KES amounts for exact equality using integer minor units
 * (cents) to avoid floating point comparison pitfalls.
 */
const amountsMatch = (a, b) => {
  const toCents = (value) => Math.round(Number(value) * 100);
  return toCents(a) === toCents(b);
};

export { normalizeKenyanPhone, isValidAmount, amountsMatch, MAX_AMOUNT_KES };
