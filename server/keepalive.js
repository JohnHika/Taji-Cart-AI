/**
 * keepalive.js — Prevents Render free-tier spin-down by self-pinging /health
 * every 13 minutes (Render sleeps after 15 min of inactivity).
 */
import https from 'https';
import http from 'http';

// Render automatically sets RENDER_EXTERNAL_URL; fall back to the known URL.
const RENDER_URL  = process.env.RENDER_EXTERNAL_URL || process.env.SERVER_URL || 'https://taji-cart-api.onrender.com';
const PING_PATH   = '/health';
const INTERVAL_MS = 13 * 60 * 1000; // 13 minutes
const MAX_RETRIES = 3;
const RETRY_DELAY = 30 * 1000; // 30 seconds

function timestamp() {
    return new Date().toISOString();
}

function ping(attempt = 1) {
    const isHttps = RENDER_URL.startsWith('https');
    const client  = isHttps ? https : http;
    const req = client.get(`${RENDER_URL}${PING_PATH}`, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
            console.log(`[Keepalive ✓] ${timestamp()} — HTTP ${res.statusCode}`);
        } else {
            console.warn(`[Keepalive ✗] ${timestamp()} — HTTP ${res.statusCode} (attempt ${attempt})`);
            retry(attempt);
        }
        res.resume(); // drain response body to free memory
    });

    req.on('error', (err) => {
        console.warn(`[Keepalive ✗] ${timestamp()} — ${err.message} (attempt ${attempt})`);
        retry(attempt);
    });

    req.setTimeout(10_000, () => {
        console.warn(`[Keepalive ✗] ${timestamp()} — timeout (attempt ${attempt})`);
        req.destroy();
        retry(attempt);
    });
}

function retry(attempt) {
    if (attempt < MAX_RETRIES) {
        setTimeout(() => ping(attempt + 1), RETRY_DELAY);
    } else {
        console.error(`[Keepalive] ${timestamp()} — gave up after ${MAX_RETRIES} attempts`);
    }
}

/**
 * Start the self-ping loop. Call this once after the server is listening.
 * Waits 60 s before the first ping so the server is fully ready.
 */
export function startKeepalive() {
    // Only run when actually deployed on a cloud host.
    // RENDER_EXTERNAL_URL is set by Render automatically; without it we're local.
    if (process.env.NODE_ENV !== 'production' || !process.env.RENDER_EXTERNAL_URL) {
        console.log('[Keepalive] Skipped — not running on Render (no RENDER_EXTERNAL_URL)');
        return;
    }
    console.log(`[Keepalive] Started — pinging ${RENDER_URL}${PING_PATH} every 13 min`);
    // First ping after 60 s (server warm-up), then every INTERVAL_MS
    setTimeout(() => {
        ping();
        setInterval(ping, INTERVAL_MS);
    }, 60_000);
}
