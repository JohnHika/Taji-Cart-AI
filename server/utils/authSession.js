// Persistent customer sessions are refreshed on use. This allows customers to
// return after normal browser/app restarts without repeated sign-ins, while
// explicit logout and server-side token revocation remain effective.
export const PERSISTENT_SESSION_REFRESH_TOKEN_TTL = '90d';

export const isCurrentRefreshToken = (storedToken, presentedToken) => (
  Boolean(storedToken) && Boolean(presentedToken) && storedToken === presentedToken
);
