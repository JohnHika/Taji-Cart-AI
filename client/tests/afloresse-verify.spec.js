/**
 * Afloresse UI Visual Verification
 * Checks: AdminDashboard, AllOrdersAdmin, POSDashboard, UsersAdmin, UserProfile
 * Run: pnpm exec playwright test tests/afloresse-verify.spec.js --headed --project=mobile-chrome
 */

import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';
const ADMIN_EMAIL = 'admin@nawiri.test';
const ADMIN_PASS = 'Admin1234!';

// ---------------------------------------------------------------------------
// Helper: log in as admin
// ---------------------------------------------------------------------------
async function loginAsAdmin(page) {
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');

  // Fill email/password — try common selectors
  const emailField = page.locator('input[type="email"], input[name="email"], input[placeholder*="mail" i]').first();
  const passField  = page.locator('input[type="password"]').first();
  await emailField.fill(ADMIN_EMAIL);
  await passField.fill(ADMIN_PASS);
  await page.keyboard.press('Enter');
  await page.waitForLoadState('networkidle');
  // small settle time
  await page.waitForTimeout(1200);
}

// ---------------------------------------------------------------------------
// Shared assertions: brand tokens we expect to be present
// ---------------------------------------------------------------------------
async function screenshotAndAssert(page, label) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `tests/screenshots/${label}.png`, fullPage: true });
  console.log(`📸  ${label}.png saved`);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Afloresse Brand Verification — Admin Pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  // ── 1. Admin Dashboard ──────────────────────────────────────────────────
  test('AdminDashboard — brand palette & rounded cards', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await screenshotAndAssert(page, '01-admin-dashboard');

    // Stat cards exist and are rounded-2xl
    const statCards = page.locator('[class*="rounded-2xl"]');
    await expect(statCards.first()).toBeVisible();

    // Plum color appears (icon container or heading)
    const plumEl = page.locator('[class*="plum"]').first();
    await expect(plumEl).toBeVisible();

    // Page title is prominent
    const title = page.locator('h1, h2').filter({ hasText: /dashboard/i }).first();
    await expect(title).toBeVisible();
  });

  // ── 2. All Orders Admin ─────────────────────────────────────────────────
  test('AllOrdersAdmin — status badges & filter tabs', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/orders`);
    await screenshotAndAssert(page, '02-all-orders-admin');

    // Status badges — rounded-pill class
    const badges = page.locator('[class*="rounded-pill"]');
    await expect(badges.first()).toBeVisible();

    // Order cards exist
    const cards = page.locator('[class*="rounded-2xl"]');
    await expect(cards.first()).toBeVisible();
  });

  // ── 3. POS Dashboard ───────────────────────────────────────────────────
  test('POSDashboard — stat cards & payment badges', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/pos`);
    await screenshotAndAssert(page, '03-pos-dashboard');

    const cards = page.locator('[class*="rounded-2xl"]');
    await expect(cards.first()).toBeVisible();

    // Open Sales Counter button — plum-700
    const openBtn = page.locator('[class*="plum-700"]').first();
    await expect(openBtn).toBeVisible();
  });

  // ── 4. Users Admin ─────────────────────────────────────────────────────
  test('UsersAdmin — role badges & filter panel', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/users`);
    await screenshotAndAssert(page, '04-users-admin');

    // Filter cards (rounded-2xl)
    const filterPanel = page.locator('[class*="rounded-2xl"]');
    await expect(filterPanel.first()).toBeVisible();

    // Role summary cards visible
    const roleCards = page.locator('[class*="border"]').filter({ hasText: /admin|staff|customer|driver/i });
    await expect(roleCards.first()).toBeVisible();

    // At least one rounded-pill badge in the user table
    const pillBadge = page.locator('[class*="rounded-pill"]');
    await expect(pillBadge.first()).toBeVisible();
  });

  // ── 5. User Profile ────────────────────────────────────────────────────
  test('UserProfile — hero gradient & section headers', async ({ page }) => {
    await page.goto(`${BASE}/user-profile`);
    await screenshotAndAssert(page, '05-user-profile');

    // Hero banner — plum gradient
    const hero = page.locator('[class*="plum-900"], [class*="from-plum"]').first();
    await expect(hero).toBeVisible();

    // Account Details h3 — bold
    const accountHeader = page.locator('h3').filter({ hasText: /Account Details/i });
    await expect(accountHeader).toBeVisible();

    // Account type chip — rounded-pill
    const chip = page.locator('[class*="rounded-pill"]').first();
    await expect(chip).toBeVisible();
  });

});
