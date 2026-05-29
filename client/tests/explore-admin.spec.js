import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@nawiri.test';
const ADMIN_PASS  = 'Admin1234!';

test.use({ viewport: { width: 393, height: 851 } }); // Pixel 5

async function loginAsAdmin(page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  // Fill email
  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
  await emailInput.fill(ADMIN_EMAIL);
  // Fill password
  const passInput = page.locator('input[type="password"]').first();
  await passInput.fill(ADMIN_PASS);
  // Submit
  const submitBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();
  await submitBtn.click();
  await page.waitForURL('**/dashboard**', { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

test('admin - dashboard home', async ({ page }) => {
  await loginAsAdmin(page);
  await page.screenshot({ path: 'explore/01-dashboard.png', fullPage: true });
});

test('admin - orders page', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/dashboard/allorders');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'explore/02-allorders.png', fullPage: true });
});

test('admin - sales counter', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/dashboard/sales-counter');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'explore/03-sales-counter.png', fullPage: true });
});

test('admin - sales hub', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/dashboard/sales-hub');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'explore/04-sales-hub.png', fullPage: true });
});

test('admin - users admin', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/dashboard/users-admin');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'explore/05-users-admin.png', fullPage: true });
});

test('admin - profile', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/dashboard/profile');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'explore/06-profile.png', fullPage: true });
});
