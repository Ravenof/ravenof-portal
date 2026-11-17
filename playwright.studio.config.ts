import { defineConfig, devices } from '@playwright/test'

// ── Ravenof „studija": parduotuvės ekrano nuotraukos ir trailer'io filmuota medžiaga ──
// Paleidimas: run-studio.bat  →  rezultatai aplanke store-media/
// 1920×1080, rodomas langas (GPU animacijoms), vaizdo įrašas kiekvienam scenarijui.
const BASE = process.env.E2E_BASE_URL ?? 'https://ravenof-portal-v1g9.vercel.app'
// Vaizdas 1440×810 su 4/3 masteliu = lygiai 1920×1080 pikselių: sąsaja didesnė ir įskaitomesnė nei tikrame 1920 pločio lange.
const VIEW = { width: 1440, height: 810 }
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
    // Be šių ribų vienas neprieinamas mygtukas pakabina visą scenarijų iki testo timeout'o
    actionTimeout: 4000,
    navigationTimeout: 45_000,
    // Tikras Chrome (ne Playwright Chromium) – kad veiktų prisijungimas per Google
    channel: 'chrome',
    viewport: VIEW,
    deviceScaleFactor: 4 / 3,
    video: { mode: 'on', size: SIZE },
    screenshot: 'off',
    trace: 'off',
    launchOptions: { ignoreDefaultArgs: ['--enable-automation'], args: ['--disable-blink-features=AutomationControlled', '--autoplay-policy=no-user-gesture-required', '--window-position=0,0'] },
  },
})
