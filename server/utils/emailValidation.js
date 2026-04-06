import dns from 'dns/promises';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const reservedSuffixes = ['.example', '.invalid', '.localhost', '.test'];
const disposableDomains = new Set([
  '10minutemail.com',
  'dispostable.com',
  'fakeinbox.com',
  'getairmail.com',
  'getnada.com',
  'guerrillamail.com',
  'maildrop.cc',
  'mailinator.com',
  'tempmail.com',
  'temp-mail.org',
  'throwawaymail.com',
  'yopmail.com',
]);

const dnsCache = new Map();

export const normalizeEmail = (email = '') => email.trim().toLowerCase();

const withTimeout = async (promise, timeoutMs = 3500) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('DNS lookup timed out')), timeoutMs);
    }),
  ]);

const domainCanReceiveEmail = async (domain) => {
  if (dnsCache.has(domain)) {
    return dnsCache.get(domain);
  }

  let result = true;

  try {
    const mxRecords = await withTimeout(dns.resolveMx(domain));
    result = Array.isArray(mxRecords) && mxRecords.length > 0;
  } catch (mxError) {
    if (mxError?.code === 'ENOTFOUND' || mxError?.code === 'ENODATA') {
      try {
        const [aRecords, aaaaRecords] = await Promise.allSettled([
          withTimeout(dns.resolve4(domain)),
          withTimeout(dns.resolve6(domain)),
        ]);

        result = [aRecords, aaaaRecords].some(
          (record) => record.status === 'fulfilled' && record.value.length > 0
        );
      } catch {
        result = false;
      }
    } else if (mxError?.message === 'DNS lookup timed out') {
      result = true;
    } else {
      result = true;
    }
  }

  dnsCache.set(domain, result);
  return result;
};

export const validateEmailAddress = async (email) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return {
      valid: false,
      normalizedEmail,
      message: 'Email address is required.',
    };
  }

  if (!emailRegex.test(normalizedEmail)) {
    return {
      valid: false,
      normalizedEmail,
      message: 'Please use a valid email address.',
    };
  }

  const [localPart, domain] = normalizedEmail.split('@');

  if (!localPart || !domain) {
    return {
      valid: false,
      normalizedEmail,
      message: 'Please use a valid email address.',
    };
  }

  if (reservedSuffixes.some((suffix) => domain.endsWith(suffix)) || disposableDomains.has(domain)) {
    return {
      valid: false,
      normalizedEmail,
      message: 'Please use a real email address you can access.',
    };
  }

  const domainHasMail = await domainCanReceiveEmail(domain);

  if (!domainHasMail) {
    return {
      valid: false,
      normalizedEmail,
      message: 'That email domain cannot receive mail. Please use another address.',
    };
  }

  return {
    valid: true,
    normalizedEmail,
    domain,
  };
};
