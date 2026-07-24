// ── Ravenof UI Fazė 1 — vizualinė verifikacija (844×390 @2x) ─────────────────
// Paleidžia Chromium prieš lokalų dev serverį, užmockina Supabase tinklo sluoksnį
// (TIK verifikacijos aplinkoje — produkcinis kodas nekeičiamas) ir padaro
// implementacijos screenshotus į artifacts/ravenof-ui-phase-1/.
// Naudojimas: node tools/ravenof-ui-visual.mjs [baseURL]
import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.argv[2] ?? 'http://localhost:3100'
const OUT = 'artifacts/ravenof-ui-phase-1'
const REF = process.env.SUPA_REF ?? 'hrfkelcoxnfpvdynkxtw'
const SUPA = `https://${REF}.supabase.co`
fs.mkdirSync(OUT, { recursive: true })

// ── Fixtūros (vizualiniam palyginimui su raw reference) ──────────────────────
const USER = { id: '11111111-1111-4111-8111-111111111111', email: 'vejobrolis@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: { username: 'vejobrolis' }, created_at: '2026-01-01T00:00:00Z' }
const PROFILE = { username: 'vejobrolis', display_name: 'VėjoBrolis', avatar_url: '/ravenof-ui/logos/ravenof-wordmark.png', xp_total: 4200, gold: 12450, rubies: 320, essence: 1840, digital_onboarded_at: '2026-01-02T00:00:00Z' }

const CARD_NAMES = ['Vilnė Saulinė', 'Skausmo šauklys', 'Vėlių šauklė', 'Markas Žalvarnis', 'Servina Sidabrė', 'Nakties klajūnas']
const CARD_IMGS = [
  '/cards/mistikos-melodija/Mistikos_Melodija_159.webp',
  '/cards/mistikos-melodija/Mistikos_Melodija_154.webp',
  '/cards/mistikos-melodija/Mistikos_Melodija_153.webp',
]
const RARITIES = [
  { name: 'Paprastas', copy_limit: 2, sort_order: 1 },
  { name: 'Magiškas', copy_limit: 2, sort_order: 2 },
  { name: 'Epiškas', copy_limit: 1, sort_order: 4 },
  { name: 'Legendinis', copy_limit: 1, sort_order: 5 },
  { name: 'Unikalus', copy_limit: 1, sort_order: 3 },
]
const FACTIONS = [
  { name: 'Mirties maršas', slug: 'mirties-marsas' },
  { name: 'Plėšikų naktis', slug: 'plesiku-naktis' },
  { name: 'Vryhioko gauja', slug: 'vryhioko-gauja' },
  { name: 'Demonų orda', slug: 'demonu-orda' },
  { name: 'Mistikos melodija', slug: 'mistikos-melodija' },
  { name: 'Šviesos pulkas', slug: 'sviesos-pulkas' },
  { name: 'Inkvizicijos legionas', slug: 'inkvizicijos-legionas' },
  { name: 'Rytų vėjas', slug: 'rytu-vejas' },
  { name: 'Neutralūs', slug: 'neutralus' },
]
const TYPES = ['Būtybė', 'Artefaktas', 'Reakcija', 'Laukas', 'Burtas', 'Prakeiksmas', 'Čempionas']
const COSTS = [100, 200, 400, 500, 100, 200]
const OWNED = [3, 2, 4, 2, 2, 4]
const CARDS = Array.from({ length: 40 }, (_, i) => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
  name: CARD_NAMES[i % CARD_NAMES.length],
  image_url: CARD_IMGS[i % CARD_IMGS.length],
  gold_cost: COSTS[i % COSTS.length],
  attack: (i % 4) + 1, health: (i % 3) + 1,
  description: null,
  effect_text: i % 2 === 0 ? 'Šauksmas — traukite kortą.' : '∞ — Gali būti iškviestas vietoje „Zombis".',
  is_champion: false,
  faction: { name: 'Mistikos melodija', slug: 'mistikos-melodija' },
  card_type: { name: TYPES[0] },
  rarity: RARITIES[i % 2],
}))
const COLLECTION_ROWS = CARDS.map((c, i) => ({ card_id: c.id, quantity: OWNED[i % OWNED.length] }))

const RPC = {
  rvn_get_daily_tasks: {
    dateKey: '2026-07-23',
    tasks: [
      { id: 1, templateId: 1, difficulty: 'easy', objectiveType: 'wins', title: 'Laimėk 2 kovas', description: '', progress: 2, target: 2, rewardPayload: [], completed: true, claimed: false },
      { id: 2, templateId: 2, difficulty: 'medium', objectiveType: 'play', title: 'Sužaisk 3 Mistikos kortas', description: '', progress: 1, target: 3, rewardPayload: [], completed: false, claimed: false },
      { id: 3, templateId: 3, difficulty: 'hard', objectiveType: 'kill', title: 'Sunaikink 5 būtybes', description: '', progress: 3, target: 5, rewardPayload: [], completed: false, claimed: false },
    ],
    allDone: false, chestClaimed: false, reroll: { freeUsed: false, paidCount: 0 },
  },
  rvn_login_checkin: { already: true, reward: 0, streak: 12 },
  rvn_get_monthly_login: { claimedToday: true, nextDay: 24, daysInMonth: 31, rewards: [] },
  rvn_get_season_path: { level: 7, levels: 20, xp: 0, xpForNext: 100, hasPass: false, rows: [] },
  rvn_ensure_ranked_profile: { user_id: USER.id, season_id: 's1', rank_step: 82, loss_counter: 0, wins: 23, losses: 9, wins_vs_real: 0, losses_vs_real: 0, win_streak: 2, best_win_streak: 5, best_rank_step: 84, reached_numbers: [], portal_exp_earned: 0, ranked_gold_earned: 0, creatures_killed: 0 },
  rvn_active_season: { id: 's1', name: 'III', start_date: '2026-06-01', end_date: new Date(Date.now() + 41 * 864e5).toISOString(), is_active: true, reset_completed: false, created_at: '', updated_at: '' },
  rvn_get_craft_config: { config: { craft: { 1: 100, 2: 400, 3: 6400, 4: 1600, 5: 3200, 6: 3200 }, disenchant: { 1: 20, 2: 100, 3: 1600, 4: 400, 5: 800, 6: 800 } }, essence: 1840 },
  rvn_friends_list: { friends: [], incoming: [], outgoing: [] },
  rvn_heartbeat: null,
  rvn_challenge_incoming: [],
  rvn_get_starter_decks: [{ id: 'sd1', claimed: true }],
}

function sessionCookie() {
  const now = Math.floor(Date.now() / 1000)
  const session = {
    access_token: 'mock.mock.mock', token_type: 'bearer', expires_in: 3600, expires_at: now + 3600,
    refresh_token: 'mock-refresh', user: USER,
  }
  return 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url')
}

async function mockSupabase(context) {
  await context.route(`${SUPA}/**`, async (route) => {
    const url = new URL(route.request().url())
    const p = url.pathname
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) })
    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } })
    }
    if (p.startsWith('/auth/v1/user')) return json(USER)
    if (p.startsWith('/auth/v1/token')) return json({ access_token: 'mock.mock.mock', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'mock-refresh', user: USER })
    if (p.startsWith('/rest/v1/rpc/')) {
      const name = p.split('/rest/v1/rpc/')[1]
      return json(Object.prototype.hasOwnProperty.call(RPC, name) ? RPC[name] : null)
    }
    if (p.startsWith('/rest/v1/profiles')) return json(PROFILE)
    if (p.startsWith('/rest/v1/notifications')) return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'content-range': '0-2/3' }, body: JSON.stringify([]) })
    if (p.startsWith('/rest/v1/cards')) return json(CARDS)
    if (p.startsWith('/rest/v1/user_collections')) return json(COLLECTION_ROWS)
    if (p.startsWith('/rest/v1/card_packs')) return json([])
    if (p.startsWith('/rest/v1/user_pack_inventory')) return json([])
    if (p.startsWith('/rest/v1/')) return json([])
    if (p.startsWith('/realtime/')) return route.abort()
    if (p.startsWith('/storage/')) return route.abort()
    return json([])
  })
}

const consoleErrors = []
async function newPage(browser, { auth }) {
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 2,
    locale: 'lt-LT',
  })
  await mockSupabase(context)
  if (auth) {
    await context.addCookies([
      { name: `sb-${REF}-auth-token`, value: sessionCookie(), url: BASE },
      { name: 'sb-localhost-auth-token', value: sessionCookie(), url: BASE },
    ])
  }
  const page = await context.newPage()
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)) })
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + String(e).slice(0, 300)))
  return { page, context }
}

const browser = await chromium.launch({ executablePath: process.env.RVN_CHROMIUM || undefined })

// 1) Login
{
  const { page, context } = await newPage(browser, { auth: false })
  await page.goto(`${BASE}/digital/login`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1600)
  await page.screenshot({ path: path.join(OUT, 'login-implementation.png') })
  await context.close()
}
// 2) Main menu
{
  const { page, context } = await newPage(browser, { auth: true })
  await page.goto(`${BASE}/digital`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2200)
  await page.screenshot({ path: path.join(OUT, 'main-menu-implementation.png') })
  await context.close()
}
// 3) Collection + 4) card detail modal
{
  const { page, context } = await newPage(browser, { auth: true })
  await page.goto(`${BASE}/digital/collection`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2400)
  await page.screenshot({ path: path.join(OUT, 'collection-implementation.png') })
  await page.locator('[data-testid="card-browser"] button').first().click()
  await page.waitForTimeout(900)
  await page.screenshot({ path: path.join(OUT, 'card-detail-implementation.png') })
  await context.close()
}

// ── Fazė 2 ekranai ───────────────────────────────────────────────────────────
const OUT2 = 'artifacts/ravenof-ui-phase-2'
fs.mkdirSync(OUT2, { recursive: true })
// Decks
{
  const { page, context } = await newPage(browser, { auth: true })
  await page.goto(`${BASE}/digital/decks?tab=my`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2200)
  await page.screenshot({ path: path.join(OUT2, 'decks-implementation.png') })
  await context.close()
}
// Ranked
{
  const { page, context } = await newPage(browser, { auth: true })
  await page.goto(`${BASE}/digital/ranked`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2200)
  await page.screenshot({ path: path.join(OUT2, 'ranked-implementation.png') })
  await context.close()
}
// Shop (per nav rail „Parduotuvė") + Settings (per header ⚙)
{
  const { page, context } = await newPage(browser, { auth: true })
  await page.goto(`${BASE}/digital`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1800)
  await page.locator('nav button').first().click()
  await page.waitForTimeout(1400)
  await page.screenshot({ path: path.join(OUT2, 'shop-implementation.png') })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
  await page.locator('header button[aria-label]').last().click()
  await page.waitForTimeout(1200)
  await page.screenshot({ path: path.join(OUT2, 'settings-implementation.png') })
  await context.close()
}

// ── Fazė 3 ekranai ───────────────────────────────────────────────────────────
const OUT3 = 'artifacts/ravenof-ui-phase-3'
fs.mkdirSync(OUT3, { recursive: true })
// Register + Forgot (bare)
{
  const { page, context } = await newPage(browser, { auth: false })
  await page.goto(`${BASE}/digital/register`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1600)
  await page.screenshot({ path: path.join(OUT3, 'register-implementation.png') })
  await page.goto(`${BASE}/digital/forgot-password`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1400)
  await page.screenshot({ path: path.join(OUT3, 'forgot-implementation.png') })
  await context.close()
}
// Onboarding (1 žingsnis — kaladė; 2 žingsnis — avataras; sd-1 claimed → be RPC).
// Mock profilis laikinai perjungiamas į digital_onboarded_at=null, kad layout
// guard'as nenukreiptų į /digital.
{
  const MOCK = 'http://localhost:54321'
  await fetch(`${MOCK}/__mock/profile`, { method: 'POST', body: JSON.stringify({ digital_onboarded_at: null }) }).catch(() => {})
  const { page, context } = await newPage(browser, { auth: true })
  await page.goto(`${BASE}/digital/onboarding`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2400)
  await page.screenshot({ path: path.join(OUT3, 'onboarding-step1-implementation.png') })
  await page.locator('button', { hasText: /toliau/i }).last().click()
  await page.waitForTimeout(1600)
  await page.screenshot({ path: path.join(OUT3, 'onboarding-step2-implementation.png') })
  await context.close()
  await fetch(`${MOCK}/__mock/profile`, { method: 'POST', body: JSON.stringify({ digital_onboarded_at: '2026-01-02T00:00:00Z' }) }).catch(() => {})
}
// PvE / PvP / Campaign (full-bleed)
for (const [route, name] of [['/digital/pve', 'pve'], ['/digital/pvp', 'pvp'], ['/digital/campaign', 'campaign']]) {
  const { page, context } = await newPage(browser, { auth: true })
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2400)
  await page.screenshot({ path: path.join(OUT3, `${name}-implementation.png`) })
  await context.close()
}
// Friends (+ atidarytas pokalbis)
{
  const { page, context } = await newPage(browser, { auth: true })
  await page.goto(`${BASE}/digital/friends`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2200)
  await page.locator('[data-testid="friend-row-TamsusRitis"]').click()
  await page.waitForTimeout(1400)
  await page.screenshot({ path: path.join(OUT3, 'friends-implementation.png') })
  await context.close()
}

// ── Fazė 4 ekranai (be raw ref — RavenofKit kalba) ───────────────────────────
const OUT4 = 'artifacts/ravenof-ui-phase-4'
fs.mkdirSync(OUT4, { recursive: true })
// Community decks + deck builder
{
  const { page, context } = await newPage(browser, { auth: true })
  await page.goto(`${BASE}/digital/decks?tab=community`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2400)
  await page.screenshot({ path: path.join(OUT4, 'community-implementation.png') })
  await page.goto(`${BASE}/digital/decks?tab=builder`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2400)
  await page.screenshot({ path: path.join(OUT4, 'builder-faction-implementation.png') })
  // pasirenkam frakciją → albumas + kaladės panelė
  await page.locator('section button').nth(1).click().catch(() => {})
  await page.waitForTimeout(1200)
  await page.screenshot({ path: path.join(OUT4, 'builder-implementation.png') })
  await context.close()
}
// More + Tutorial hub
{
  const { page, context } = await newPage(browser, { auth: true })
  await page.goto(`${BASE}/digital/more`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  await page.screenshot({ path: path.join(OUT4, 'more-implementation.png') })
  await page.goto(`${BASE}/digital/tutorial`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2200)
  await page.screenshot({ path: path.join(OUT4, 'tutorial-implementation.png') })
  await context.close()
}
// Pack open (sealed) — kolekcijos CTA
{
  const { page, context } = await newPage(browser, { auth: true })
  await page.goto(`${BASE}/digital/collection`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2200)
  await page.locator('[data-testid="packs-btn"]').click().catch(() => {})
  await page.waitForTimeout(1200)
  await page.screenshot({ path: path.join(OUT4, 'pack-open-implementation.png') })
  await context.close()
}
// Ranked queue (ŽAISTI → eilė)
{
  const { page, context } = await newPage(browser, { auth: true })
  await page.goto(`${BASE}/digital/ranked`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2200)
  await page.getByText('ŽAISTI', { exact: false }).last().click().catch(() => {})
  await page.waitForTimeout(1500)
  await page.screenshot({ path: path.join(OUT4, 'ranked-queue-implementation.png') })
  await context.close()
}
// Kampanijos žemėlapis
{
  const { page, context } = await newPage(browser, { auth: true })
  await page.goto(`${BASE}/digital/campaign/pelenu-zygis`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2600)
  await page.screenshot({ path: path.join(OUT4, 'campaign-map-implementation.png') })
  await context.close()
}

await browser.close()
fs.writeFileSync(path.join(OUT, 'console-errors.json'), JSON.stringify(consoleErrors, null, 2))
console.log('screenshots done; console errors:', consoleErrors.length)
