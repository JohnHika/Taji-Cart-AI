import trimTrailingSlash from './trimTrailingSlash.js';

export const GOOGLE_CALLBACK_PATH = '/api/auth/google/callback';

const isApprovedConfiguredCallback = (url, brandedReady) => (
  Boolean(url) && (
    brandedReady ||
    /onrender\.com/i.test(url) ||
    /localhost/i.test(url)
  )
);

/**
 * Resolve the one fixed callback URL used for both sides of the Google flow.
 *
 * Google rejects a redirect URI that changes between authorization and token
 * exchange. Keeping this in one utility prevents Passport and the route from
 * silently deriving different values from different environment variables.
 */
export const resolveGoogleCallbackUrl = (env = process.env) => {
  const configuredUrl = trimTrailingSlash(env.GOOGLE_CALLBACK_URL || '');
  const brandedReady = env.GOOGLE_CALLBACK_BRANDED_READY === 'true';

  if (isApprovedConfiguredCallback(configuredUrl, brandedReady)) {
    return configuredUrl;
  }

  const serverBaseUrl = trimTrailingSlash(
    env.GOOGLE_CALLBACK_BASE_URL ||
    env.RENDER_EXTERNAL_URL ||
    env.BACKEND_URL ||
    env.SERVER_URL ||
    `http://localhost:${env.PORT || 5000}`
  );

  return `${serverBaseUrl}${GOOGLE_CALLBACK_PATH}`;
};

export const hasGoogleOAuthCredentials = (env = process.env) => Boolean(
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
);
