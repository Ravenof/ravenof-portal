import { defineConfig, devices } from '@playwright/test'

// ── Ravenof „studija": parduotuvės ekrano nuotraukos ir trailer'io filmuota medžiaga ──
// Paleidimas: run-studio.bat  →  rezultatai aplanke store-media/
// 1920×1080, rodomas langas (GPU animacijoms), vaizdo įrašas kiekvienam scenarijui.
const BASE = process.env.E2E_BASE_URL ?? 'https://ravenof-portal-v1g9.vercel.app'
const SIZE = { width: 1920, height: 1080 }

export default defineConfig({
  testDir: './studio',
  outputDir: './store-media/_raw',
  timeout: 15 * 60_000,
  retries: 0,
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: BASE,
    headless: false,
    viewport: SIZE,
    deviceScaleFactor: 1,
    video: { mode: 'on', size: SIZE },
    screenshot: 'off',
    trace: 'off',
    launchOptions: { args: ['--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required', '--window-position=0,0'] },
  },
})
