import { test, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

// ── Parduotuvės medžiaga: ekrano nuotraukos (LT + EN) ir kovos vaizdo įrašai ──
// Viskas „best effort": jei kuris ekranas nepasiekiamas, scenarijus eina toliau.
// Rezultatai: store-media/shots/<lt|en>/NN-pavadinimas.png ir store-media/video/*.webm

const EMAIL = process.env.E2E_TEST_EMAIL ?? ''
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? ''
const OUT = path.resolve('store-media')
const TURNS = Number(process.env.STUDIO_TURNS ?? 7)
const BASE = process.env.E2E_BASE_URL ?? 'https://ravenof-portal-v1g9.vercel.app'
const BATTLE_MS = 8 * 60_000   // ilgiausia vienos kovos trukmė – po jos įrašas išsaugomas, kad ir kas nutiktų

type Loc = 'lt' | 'en'

async function presetLocale(page: Page, loc: Loc) {
  await page.addInitScript((l) => {
    try { window.localStorage.setItem('rvn_locale', l) } catch { /* */ }
    document.cookie = `rvn_locale=${l}; path=/; max-age=31536000`
  }, loc)
}

async function dismissGates(page: Page) {
  for (const label of ['Tęsti be atsisiuntimo', 'Continue without downloading', 'Praleisti', 'Skip', 'Uždaryti', 'Close', 'Vėliau', 'Later']) {
    const b = page.getByRole('button', { name: new RegExp(label, 'i') }).first()
    if (await b.isVisible().catch(() => false)) await b.click().catch(() => {})
  }
  // Laukiantys atlygių pasirinkimai / kiti modalai – uždarom, kad neužstotų ekrano
  for (let i = 0; i < 4; i++) {
    const dlg = page.locator('[role="dialog"]:visible').last()
    if (!(await dlg.isVisible().catch(() => false))) break
    const x = dlg.locator('button[aria-label]:visible, button:has(svg.lucide-x):visible').first()
    if (await x.isVisible().catch(() => false)) await x.click().catch(() => {})
    else await page.keyboard.press('Escape').catch(() => {})
    await page.waitForTimeout(600)
  }
}

const AUTH = path.join(OUT, '_auth.json')
type Saved = { cookies: Parameters<import('@playwright/test').BrowserContext['addCookies']>[0]; origins: { origin: string; localStorage: { name: string; value: string }[] }[] }

/** Prisijungimas VIENĄ kartą: jei nėra E2E_TEST_EMAIL/PASSWORD – langas laukia, kol prisijungsi pats
 *  (el. paštu arba per Google). Sesija išsaugoma store-media/_auth.json ir naudojama kitiems scenarijams. */
async function loginOnce(page: Page) {
  fs.mkdirSync(OUT, { recursive: true })
  await page.goto('/digital/login')
  if (EMAIL && PASSWORD) {
    await page.locator('#rvn-email').fill(EMAIL)
    await page.locator('#rvn-pw').fill(PASSWORD)
    await page.locator('#rvn-pw').press('Enter')
  } else {
    console.log('\n>>> PRISIJUNK ATSIDARIUSIAME LANGE (el. paštu arba per Google). Laukiu iki 10 min. <<<\n')
  }
  await page.waitForURL((u) => u.pathname.startsWith('/digital') && !/\/digital\/(login|register|auth|forgot)/.test(u.pathname), { timeout: 10 * 60_000 })
  await page.waitForTimeout(3000)
  await page.context().storageState({ path: AUTH })
}

/** Atkuria išsaugotą sesiją (slapukai + localStorage) prieš pirmą puslapį. */
async function login(page: Page, loc: Loc) {
  const saved = JSON.parse(fs.readFileSync(AUTH, 'utf8')) as Saved
  // išsaugotoje sesijoje yra ir kalbos slapukas – jį pakeičiam scenarijaus kalba (kitaip EN nuotraukos išeina lietuviškos)
  await page.context().addCookies(saved.cookies.filter((c) => c.name !== 'rvn_locale'))
  await page.context().addCookies([{ name: 'rvn_locale', value: loc, url: BASE }])
  const ls = saved.origins.flatMap((o) => o.localStorage).filter((e) => e.name !== 'rvn_locale')
  await page.addInitScript((items) => {
    for (const it of items) { try { if (window.localStorage.getItem(it.name) == null) window.localStorage.setItem(it.name, it.value) } catch { /* */ } }
  }, ls)
  await page.goto('/digital')
  await page.waitForTimeout(3000)
  if (page.url().includes('/digital/login')) throw new Error('Sesija negalioja – ištrink store-media/_auth.json ir paleisk iš naujo.')
  await dismissGates(page)
}

let counter = 0
async function shot(page: Page, loc: Loc, name: string) {
  const dir = path.join(OUT, 'shots', loc)
  fs.mkdirSync(dir, { recursive: true })
  counter += 1
  const file = path.join(dir, `${String(counter).padStart(2, '0')}-${name}.png`)
  // pelę patraukiam į kampą, kad nuotraukoje neliktų užvestos kortos peržiūros
  await page.mouse.move(3, 3).catch(() => {})
  await page.waitForTimeout(600)
  await page.screenshot({ path: file, type: 'png' }).catch(() => {})
}

async function saveVideo(page: Page, name: string) {
  const v = page.video()
  if (!v) return
  const dir = path.join(OUT, 'video')
  fs.mkdirSync(dir, { recursive: true })
  await page.close()
  await v.saveAs(path.join(dir, `${name}.webm`)).catch(() => {})
}

const SCREENS: { route: string; name: string }[] = [
  { route: '/digital', name: 'home' },
  { route: '/digital/collection', name: 'collection' },
  { route: '/digital/decks', name: 'decks' },
  { route: '/digital/pve', name: 'battle-vs-ai' },
  { route: '/digital/ranked', name: 'ranked' },
  { route: '/digital/pvp', name: 'pvp' },
  { route: '/digital/season', name: 'season' },
  { route: '/digital/quests', name: 'quests' },
  { route: '/digital/rewards', name: 'rewards' },
  { route: '/digital/profile', name: 'profile' },
]

async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2 - 40, { steps: 14 })
  await page.mouse.move(to.x, to.y, { steps: 14 })
  await page.waitForTimeout(120)
  await page.mouse.up()
}
const center = (b: { x: number; y: number; width: number; height: number }) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 })

/** Uždaro pasirinkimo scenas / patvirtinimus, kurie gali užstoti lentą. */
async function clearPrompts(page: Page) {
  for (const label of ['Pasilikti visas', 'Keep all', 'Patvirtinti', 'Confirm', 'Tęsti', 'Continue', 'Gerai', 'OK']) {
    const b = page.getByRole('button', { name: new RegExp(`^\\s*${label}`, 'i') }).first()
    if (await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); await page.waitForTimeout(700) }
  }
  const pick = page.locator('[data-pick-card]').first()
  if (await pick.isVisible().catch(() => false)) { await pick.click().catch(() => {}); await page.waitForTimeout(700); await clearPrompts(page) }
}

async function playTurn(page: Page) {
  // 1) kortos iš rankos į lauką (iš dešinės – dažniausiai brangesnės)
  for (let pass = 0; pass < 4; pass++) {
    const cards = page.locator('[data-tut="hand"] [data-hand-card]')
    const n = await cards.count().catch(() => 0)
    if (!n) break
    const field = page.locator('[data-tut="units-you"], [data-tut="field"]').first()
    const fb = await field.boundingBox().catch(() => null)
    const cb = await cards.nth(Math.max(0, n - 1 - pass)).boundingBox().catch(() => null)
    if (!fb || !cb) break
    await drag(page, center(cb), { x: fb.x + fb.width * (0.3 + 0.12 * pass), y: fb.y + fb.height / 2 })
    await page.waitForTimeout(1800)
    await clearPrompts(page)
  }
  // 2) atakos: savi padarai → priešo padaras arba priešo herojus
  const mine = page.locator('[data-tut="units-you"] [data-unit-uid]')
  const m = await mine.count().catch(() => 0)
  for (let i = 0; i < m; i++) {
    const ub = await mine.nth(i).boundingBox().catch(() => null)
    if (!ub) continue
    const foes = page.locator('[data-tut="units-ai"] [data-unit-uid]')
    const f = await foes.count().catch(() => 0)
    const target = f > 0 ? foes.nth(i % f) : page.locator('[data-player="ai"]').first()
    const tb = await target.boundingBox().catch(() => null)
    if (!tb) continue
    await drag(page, center(ub), center(tb))
    await page.waitForTimeout(2200)
    await clearPrompts(page)
  }
}

async function battle(page: Page, loc: Loc) {
  await page.goto('/digital/pve')
  await page.waitForTimeout(3000)
  await dismissGates(page)
  const start = page.getByRole('button', { name: /PRADĖTI KOVĄ|START BATTLE/i }).first()
  await start.waitFor({ state: 'visible', timeout: 30_000 })
  await page.waitForTimeout(1500)
  await start.click()
  const endTurn = page.locator('[data-tut="end-turn"]').first()
  // monetos metimas + kortų keitimas
  for (let i = 0; i < 40; i++) {
    await clearPrompts(page)
    if (await endTurn.isVisible().catch(() => false)) break
    await page.waitForTimeout(1000)
  }
  await page.waitForTimeout(2500)
  await shot(page, loc, 'battle-start')
  const t0 = Date.now()
  const late = () => Date.now() - t0 > BATTLE_MS
  for (let t = 0; t < TURNS && !late(); t++) {
    if (await page.getByText(/Pergalė!|Pralaimėjai|VICTORY|DEFEAT/i).first().isVisible().catch(() => false)) break
    // laukiam savo ėjimo
    for (let i = 0; i < 90 && !late(); i++) {
      await clearPrompts(page)
      if (await endTurn.isEnabled().catch(() => false)) break
      await page.waitForTimeout(1000)
    }
    await playTurn(page)
    await shot(page, loc, `battle-turn${t + 1}`)
    // ėjimo pabaiga: force – jei lentą dengia taikinio pasirinkimas; nepavykus – spustelim tuščią lentos vietą ir bandom dar
    for (let k = 0; k < 3; k++) {
      if (!(await endTurn.isEnabled().catch(() => false))) break
      await endTurn.click({ force: true, timeout: 3000 }).catch(() => {})
      await page.waitForTimeout(1500)
      if (!(await endTurn.isEnabled().catch(() => false))) break
      const vp = page.viewportSize()
      if (vp) await page.mouse.click(vp.width * 0.5, vp.height * 0.5).catch(() => {})
      await clearPrompts(page)
    }
    await page.waitForTimeout(2500)
    await shot(page, loc, `battle-enemy${t + 1}`)
  }
  await page.waitForTimeout(3000)
  await shot(page, loc, 'battle-end')
}

test('prisijungimas', async ({ page }) => {
  if (fs.existsSync(AUTH) && !process.env.STUDIO_RELOGIN) { await page.close(); return }
  await loginOnce(page)
  await page.close()
})

for (const loc of ['lt', 'en'] as Loc[]) {
  test(`${loc}: meniu ekranai`, async ({ page }) => {
    test.skip(!fs.existsSync(AUTH), 'nepavyko prisijungti')
    counter = 0
    await presetLocale(page, loc)
    await login(page, loc)
    for (const s of SCREENS) {
      try {
        await page.goto(s.route)
        await page.waitForTimeout(4500)
        await dismissGates(page)
        await page.waitForTimeout(800)
        await shot(page, loc, s.name)
      } catch { /* ekranas nepasiekiamas – toliau */ }
    }
    // parduotuvė – modalas iš pradžios ekrano
    try {
      await page.goto('/digital')
      await page.waitForTimeout(3500)
      await dismissGates(page)
      const shop = page.getByRole('button', { name: /Parduotuv|Shop/i }).first()
      if (await shop.isVisible().catch(() => false)) { await shop.click(); await page.waitForTimeout(3500); await shot(page, loc, 'shop') }
    } catch { /* */ }
    await saveVideo(page, `menus-${loc}`)
  })

  test(`${loc}: kova su DI`, async ({ page }) => {
    test.skip(!fs.existsSync(AUTH), 'nepavyko prisijungti')
    counter = 50
    await presetLocale(page, loc)
    await login(page, loc)
    try { await battle(page, loc) } finally { await saveVideo(page, `battle-${loc}`) }
  })

  test(`${loc}: kaladės pasirinkimas (svečias)`, async ({ page }) => {
    counter = 80
    await presetLocale(page, loc)
    await page.goto('/digital/login')
    const guest = page.getByRole('button', { name: /Žaisti kaip svečias|Play as guest/i }).first()
    await guest.waitFor({ state: 'visible', timeout: 30_000 })
    await shot(page, loc, 'login')
    await guest.click()
    await page.waitForURL((u) => u.pathname.includes('/digital/onboarding'), { timeout: 40_000 }).catch(() => {})
    await page.waitForTimeout(6000)
    await shot(page, loc, 'choose-deck')
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: /Kita kalad|Next deck/i }).first().click().catch(async () => { await page.locator('.ob-box.n1').last().click().catch(() => {}) })
      await page.waitForTimeout(1800)
      await shot(page, loc, `choose-deck-${i + 2}`)
    }
    await saveVideo(page, `onboarding-${loc}`)
  })
}
