import { defineConfig, devices } from '@playwright/test'

// ── Ravenof Digital E2E ───────────────────────────────────────────────────────
// Paleidimas (Windows):
//   npm i -D @playwright/test && npx playwright install chromium
//   set E2E_TEST_EMAIL=... & set E2E_TEST_PASSWORD=... & npx playwright test
// E2E_BASE_URL nenurodžius testuojamas prod deploy.
const BASE = process.env.E2E_BASE_URL ?? 'https://ravenof-portal-v1g9.vercel.app'

// Landscape viewport matrica (mobile → desktop)
export const VIEWPORTS = [
  { w: 844,  h: 390 },
  { w: 896,  h: 414 },
  { w: 932,  h: 430 },
  { w: 1024, h: 600 },
  { w: 1280, h: 720 },
  { w: 1366, h: 768 },
  { w: 1920, h: 1080 },
]

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    locale: 'lt-LT',
  },
  projects: [
    // Pagrindinė funkcinė eiga — 1280×720
    {
      name: 'functional',
      testIgnore: /landscape-layout\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
    // Layout matrica — kiekvienas viewport atskiru projektu
    ...VIEWPORTS.map((v) => ({
      name: `layout-${v.w}x${v.h}`,
      testMatch: /landscape-layout\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: v.w, height: v.h } },
    })),
  ],
})
