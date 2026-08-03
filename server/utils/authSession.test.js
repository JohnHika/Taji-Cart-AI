import assert from 'node:assert/strict';
import test from 'node:test';
import { PERSISTENT_SESSION_REFRESH_TOKEN_TTL, isCurrentRefreshToken } from './authSession.js';

test('uses a long-lived rolling refresh window for persistent customer sessions', () => {
  assert.equal(PERSISTENT_SESSION_REFRESH_TOKEN_TTL, '90d');
});

test('accepts only the refresh token currently stored for the user', () => {
  assert.equal(isCurrentRefreshToken('current-token', 'current-token'), true);
  assert.equal(isCurrentRefreshToken('current-token', 'stale-token'), false);
  assert.equal(isCurrentRefreshToken('', 'current-token'), false);
});
