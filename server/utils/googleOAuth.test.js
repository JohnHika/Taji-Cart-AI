import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveGoogleCallbackUrl } from './googleOAuth.js';

test('uses the approved branded callback URL for both OAuth phases', () => {
  assert.equal(
    resolveGoogleCallbackUrl({
      GOOGLE_CALLBACK_BRANDED_READY: 'true',
      GOOGLE_CALLBACK_URL: 'https://api.nawirihairke.com/api/auth/google/callback/',
      RENDER_EXTERNAL_URL: 'https://taji-cart-api.onrender.com',
    }),
    'https://api.nawirihairke.com/api/auth/google/callback'
  );
});

test('falls back to the deployed backend when the branded relay is not ready', () => {
  assert.equal(
    resolveGoogleCallbackUrl({
      GOOGLE_CALLBACK_BRANDED_READY: 'false',
      GOOGLE_CALLBACK_URL: 'https://api.nawirihairke.com/api/auth/google/callback',
      RENDER_EXTERNAL_URL: 'https://taji-cart-api.onrender.com/',
    }),
    'https://taji-cart-api.onrender.com/api/auth/google/callback'
  );
});

test('uses the explicit callback base before generic server origins', () => {
  assert.equal(
    resolveGoogleCallbackUrl({
      GOOGLE_CALLBACK_BASE_URL: 'https://oauth.nawirihairke.com/',
      BACKEND_URL: 'https://api.example.com',
    }),
    'https://oauth.nawirihairke.com/api/auth/google/callback'
  );
});
