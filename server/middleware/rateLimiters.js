import rateLimit from 'express-rate-limit';

// A single blanket limit covering every route (200 req/15min/IP) was found
// during load testing to have a real false-positive risk: Kenyan mobile
// carriers commonly put many real customers behind the same public IP via
// carrier-grade NAT, so a burst of legitimate shoppers browsing the site
// together could exhaust one shared budget and get blocked well before the
// server itself is ever the bottleneck. Splitting into two tiers: a generous
// limit for general/public traffic, and a much stricter one specifically on
// auth endpoints (login, register, password reset, etc.), which is where a
// tight per-IP limit actually matters for abuse resistance. Login itself also
// has per-account lockout (see loginController) as a second, independent layer.

export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 2000,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests, please try again later',
});

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many attempts from this network. Please try again later.',
});
