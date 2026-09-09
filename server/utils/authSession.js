// Persistent customer sessions are refreshed on use. This allows customers to
// return after normal browser/app restarts without repeated sign-ins, while
// explicit logout and server-side token revocation remain effective.
export const PERSISTENT_SESSION_REFRESH_TOKEN_TTL = '90d';

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
