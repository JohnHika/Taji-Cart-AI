import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config — mobile/md UI testing for Nawiri Hair
 * Run against the Vite dev server (start it first: pnpm dev)
 *
 *   pnpm exec playwright test            # run all
 *   pnpm exec playwright test --ui       # open interactive UI
 *   pnpm exec playwright show-report     # view last HTML report
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    /* Base URL — Vite dev server */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    /* Capture screenshots + traces on failure */
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    /* ── Mobile ─────────────────────────────────────────────── */
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        // Pixel 5: 393 × 851, mobile Chrome
      },
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 12'],
        // iPhone 12: 390 × 844, mobile Safari (WebKit)
      },
    },

    /* ── Tablet / md breakpoint (768 px) ────────────────────── */
    {
      name: 'tablet-md',
      use: {
        ...devices['iPad Mini'],
        // iPad Mini: 768 × 1024, matches Tailwind `md` breakpoint exactly
        viewport: { width: 768, height: 1024 },
      },
    },

    /* ── Desktop (smoke-only, excluded from mobile suite) ───── */
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
