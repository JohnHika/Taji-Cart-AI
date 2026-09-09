import { expect, test } from '@playwright/test';

async function waitForProductCard(page) {
  await page.goto('/');
  await page.waitForSelector('article a[aria-label^="View"]', { timeout: 30000 });
}

test.describe('Mobile product browsing', () => {
  test('keeps storefront cards compact without hiding purchase actions', async ({ page }, testInfo) => {
    await waitForProductCard(page);

    const card = page.locator('article').first();
    const cardBox = await card.boundingBox();
    const addToCart = card.getByRole('button', { name: /add to cart/i });
    const whatsApp = card.getByRole('button', { name: /buy .* via whatsapp/i });
    const wishlist = card.getByRole('button', { name: /wishlist/i });

    expect(cardBox).not.toBeNull();
    expect(cardBox.height / cardBox.width).toBeLessThan(2.35);
    await expect(addToCart).toBeVisible();
    await expect(whatsApp).toBeVisible();
    await expect(wishlist).toBeVisible();
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(350);
    await page.screenshot({ path: testInfo.outputPath('compact-mobile-product-cards.png'), fullPage: false });
  });

  test('opens a product at the very top after browsing Home', async ({ page }) => {
    await waitForProductCard(page);

    await page.evaluate(() => window.scrollTo(0, 520));
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    await page.locator('a[aria-label^="View"]').first().evaluate((link) => link.click());
    await page.waitForURL(/\/product\//, { timeout: 30000 });
    await page.waitForFunction(() => window.scrollY === 0, { timeout: 10000 });

    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });
});
