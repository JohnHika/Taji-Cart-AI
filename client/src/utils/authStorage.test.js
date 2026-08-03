import assert from 'node:assert/strict';
import test from 'node:test';

const createStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
};

global.window = {};
global.localStorage = createStorage();
global.sessionStorage = createStorage();

const { getRememberMe, saveTokens } = await import('./authStorage.js');

test('keeps customers signed in by default until they opt out', () => {
  assert.equal(getRememberMe(), true);

  saveTokens({ accessToken: 'access', refreshToken: 'refresh', rememberMe: false });

  assert.equal(getRememberMe(), false);
  assert.equal(localStorage.getItem('accesstoken'), null);
  assert.equal(sessionStorage.getItem('accesstoken'), 'access');
});

test('persists tokens across browser restarts when sign-in is kept enabled', () => {
  saveTokens({ accessToken: 'access', refreshToken: 'refresh', rememberMe: true });

  assert.equal(localStorage.getItem('accesstoken'), 'access');
  assert.equal(localStorage.getItem('refreshToken'), 'refresh');
});
