import crypto from 'crypto';

// Persistent customer sessions are refreshed on use. This allows customers to
// return after normal browser/app restarts without repeated sign-ins, while
// explicit logout and server-side token revocation remain effective.
export const PERSISTENT_SESSION_REFRESH_TOKEN_TTL = '90d';

// One entry per concurrent device/tab. Oldest is evicted once exceeded —
// see genertedRefreshToken.js.
export const MAX_ACTIVE_REFRESH_SESSIONS = 5;

// How long a just-rotated-out refresh token still works. Every refresh
// rotates the token, but a user can have several tabs/devices open at once,
// each independently refreshing near the same 30-minute access-token expiry.
// Whichever refreshes first invalidates every other tab's copy — without a
// grace window, the next tab to refresh gets a hard 401 and is logged out,
// even though the user never signed out anywhere. 60s comfortably covers a
// near-simultaneous request from a second tab without keeping stale tokens
// valid for anything close to a meaningful security window.
export const REFRESH_TOKEN_GRACE_WINDOW_MS = 60 * 1000;

export const isCurrentRefreshToken = (storedToken, presentedToken) => (
  Boolean(storedToken) && Boolean(presentedToken) && storedToken === presentedToken
);

export const isRefreshTokenInGraceWindow = (user, presentedToken) => {
  if (!user?.previous_refresh_token || !presentedToken) return false;
  if (user.previous_refresh_token !== presentedToken) return false;
  if (!user.previous_refresh_token_rotated_at) return false;

  const rotatedAt = new Date(user.previous_refresh_token_rotated_at).getTime();
  return Date.now() - rotatedAt < REFRESH_TOKEN_GRACE_WINDOW_MS;
};

// Refresh tokens are stored hashed in refresh_sessions (never in plaintext) —
// this is the one place that hash is computed, both when writing a session
// and when checking a presented token against one.
export const hashRefreshToken = (token) => (
  token ? crypto.createHash('sha256').update(token).digest('hex') : null
);

// A presented refresh token is valid if it matches: a live session's current
// token, that same session's just-rotated-out token within the grace window,
// or (for a session issued before the multi-session migration) the legacy
// single refresh_token/previous_refresh_token pair still checked above.
export const isValidRefreshToken = (user, presentedToken) => {
  if (!user || !presentedToken) return false;

  if (isCurrentRefreshToken(user.refresh_token, presentedToken) || isRefreshTokenInGraceWindow(user, presentedToken)) {
    return true;
  }

  const presentedHash = hashRefreshToken(presentedToken);
  const sessions = Array.isArray(user.refresh_sessions) ? user.refresh_sessions : [];

  return sessions.some((session) => {
    if (session.tokenHash === presentedHash) return true;
    if (!session.previousTokenHash || session.previousTokenHash !== presentedHash) return false;
    if (!session.rotatedAt) return false;
    return Date.now() - new Date(session.rotatedAt).getTime() < REFRESH_TOKEN_GRACE_WINDOW_MS;
  });
};

// Used by logout to drop only the one session being signed out of, leaving
// every other concurrent device/tab's session untouched.
export const removeRefreshSession = (sessions, presentedToken) => {
  const presentedHash = hashRefreshToken(presentedToken);
  return (Array.isArray(sessions) ? sessions : []).filter((session) => (
    session.tokenHash !== presentedHash && session.previousTokenHash !== presentedHash
  ));
};
