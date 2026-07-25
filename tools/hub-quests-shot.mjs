// ── Pagrindinio meniu dienos užduočių slotas — vizualinė verifikacija ────────
// Paleidimas (žr. docs/PROGRESSION-BACKEND-IMPLEMENTATION.md):
//   node tools/ravenof-ui-mock-supabase.mjs &
//   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 npx next dev -p 3100 &
//   node tools/hub-quests-shot.mjs
import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.argv[2] ?? 'http://localhost:3100'
const OUT = 'artifacts/ravenof-progression'
fs.mkdirSync(OUT, { recursive: true })

const USER = { id: '11111111-1111-4111-8111-111111111111', email: 'vejobrolis@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: { username: 'vejobrolis' }, created_at: '2026-01-01T00:00:00Z' }
function sessionCookie() {
  const now = Math.floor(Date.now() / 1000)
  return 'base64-' + Buffer.from(JSON.stringify({
    access_token: 'mock.mock.mock', token_type: 'bearer', expires_in: 3600,
    expires_at: now + 3600, refresh_token: 'mock-refresh', user: USER,
  })).toString('base64url')
}

const SIZES = [
  { w: 1536, h: 768, tag: '1536x768' },
  { w: 1366, h: 768, tag: '1366x768' },
  { w: 1280, h: 720, tag: '1280x720' },
  { w: 1024, h: 600, tag: '1024x600' },
]

const errors = []
const browser = await chromium.launch({ executablePath: process.env.RVN_CHROMIUM || undefined })

for (const locale of ['lt', 'en']) {
  for (const s of SIZES) {
    if (locale === 'en' && s.tag !== '1536x768') continue
    const context = await browser.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 1, locale: locale === 'lt' ? 'lt-LT' : 'en-US' })
    await context.addCookies([
      { name: 'sb-localhost-auth-token', value: sessionCookie(), url: BASE },
      { name: 'rvn-locale', value: locale, url: BASE },
    ])
    // Hub'as vieną kartą per dieną automatiškai atidaro prisijungimo dovanas —
    // verifikacijai tą „jau matyta" žymę nustatom iš anksto.
    await context.addInitScript(() => {
      try { localStorage.setItem(`rvn:login-${new Date().toISOString().slice(0, 10)}`, '1') } catch { /* */ }
    })
    const page = await context.newPage()
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`${locale}/${s.tag}: ${m.text().slice(0, 240)}`) })
    page.on('pageerror', (e) => errors.push(`${locale}/${s.tag}: pageerror ${String(e).slice(0, 240)}`))
    await page.goto(`${BASE}/digital`, { waitUntil: 'networkidle' })
    await page.evaluate((l) => window.__rvnSetLocale?.(l), locale)
    await page.waitForTimeout(1800)
    const name = locale === 'lt' ? `hub-quests-${s.tag}.png` : `hub-quests-en-${s.tag}.png`
    await page.screenshot({ path: path.join(OUT, name) })
    // slotas atskirai — kad matytųsi tekstas ir mygtukai
    const slot = page.locator('[data-testid="hub-daily-quests"]')
    if (await slot.count()) await slot.screenshot({ path: path.join(OUT, name.replace('.png', '-slot.png')) })
    await context.close()
  }
}

// ── Mišri būsena: 1 atsiimamas · 1 vykdomas · 1 atsiimtas · skrynia užrakinta ─
{
  const context = await browser.newContext({ viewport: { width: 1536, height: 768 }, deviceScaleFactor: 1, locale: 'lt-LT' })
  await context.addCookies([{ name: 'sb-localhost-auth-token', value: sessionCookie(), url: BASE }])
  await context.addInitScript(() => {
    try { localStorage.setItem(`rvn:login-${new Date().toISOString().slice(0, 10)}`, '1') } catch { /* */ }
  })
  await context.route('**/rest/v1/rpc/rvn_get_daily_quests_v2', async (route) => {
    const res = await route.fetch()
    const body = await res.json()
    body.quests[1] = { ...body.quests[1], progress: 1, target: 3, completed: false, claimed: false }
    body.quests[2] = { ...body.quests[2], claimed: true }
    body.allCompleted = false
    body.chest = { ...body.chest, claimable: false }
    await route.fulfill({ response: res, body: JSON.stringify(body) })
  })
  const page = await context.newPage()
  await page.goto(`${BASE}/digital`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1800)
  await page.screenshot({ path: path.join(OUT, 'hub-quests-mixed-1536x768.png') })
  const slot = page.locator('[data-testid="hub-daily-quests"]')
  if (await slot.count()) await slot.screenshot({ path: path.join(OUT, 'hub-quests-mixed-1536x768-slot.png') })
  await context.close()
}

await browser.close()
console.log('hub-quests shots done; console errors:', errors.length)
for (const e of errors.slice(0, 12)) console.log('  ', e)
