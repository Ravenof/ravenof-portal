import { expect, type Page } from '@playwright/test'

export const EMAIL = process.env.E2E_TEST_EMAIL ?? ''
export const PASSWORD = process.env.E2E_TEST_PASSWORD ?? ''

export function requireCreds() {
  if (!EMAIL || !PASSWORD) throw new Error('Nustatyk E2E_TEST_EMAIL ir E2E_TEST_PASSWORD aplinkos kintamuosius.')
}

/** Prisijungia per /digital/login. Grąžina galutinį URL. */
export async function digitalLogin(page: Page, next?: string): Promise<string> {
  requireCreds()
  await page.goto(`/digital/login${next ? `?next=${encodeURIComponent(next)}` : ''}`)
  await page.getByLabel('El. paštas').fill(EMAIL)
  await page.getByLabel('Slaptažodis', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: /Prisijungti/ }).click()
  // laukiam: arba paliekam login puslapį, arba matoma klaida (aiškus fail vietoj timeout)
  const alert = page.locator('[role="alert"]:not(#__next-route-announcer__)')
  await Promise.race([
    page.waitForURL((u) => !u.pathname.includes('/digital/login'), { timeout: 30_000 }),
    alert.waitFor({ state: 'visible', timeout: 30_000 }).then(async () => {
      throw new Error(`Prisijungimas nepavyko: ${(await alert.textContent())?.trim()} — patikrink E2E_TEST_EMAIL/PASSWORD (paskyra turi egzistuoti su patvirtintu el. paštu).`)
    }),
  ])
  return page.url()
}

/** Uždaro galimus onboarding/download/welcome popup'us, jei jie pasirodo. */
export async function dismissGates(page: Page) {
  for (const label of ['Tęsti be atsisiuntimo', 'Praleisti', 'Uždaryti', 'Vėliau']) {
    const b = page.getByRole('button', { name: new RegExp(label, 'i') }).first()
    if (await b.isVisible().catch(() => false)) await b.click().catch(() => {})
  }
}

/** Elementas pilnai matomas viewport'e (svarbiausi CTA niekada už ekrano). */
export async function expectFullyInViewport(page: Page, locator: ReturnType<Page['locator']>) {
  const box = await locator.boundingBox()
  expect(box, 'elementas turi turėti boundingBox').toBeTruthy()
  const vp = page.viewportSize()!
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.y + box!.height).toBeLessThanOrEqual(vp.height + 1)
  expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width + 1)
}

/** Puslapis neturi page-level vertikalaus scroll. */
export async function expectNoPageScroll(page: Page) {
  const { sh, ih } = await page.evaluate(() => ({ sh: document.documentElement.scrollHeight, ih: window.innerHeight }))
  expect(sh, 'be vertikalaus puslapio scroll').toBeLessThanOrEqual(ih + 4)
}

/** Jei po login patenkam į onboarding — realiai pereinam starter pasirinkimą.
 *  Testai tampa savarankiški: tinka ir šviežia (patvirtinta) paskyra. */
export async function ensureOnboarded(page: Page) {
  await page.waitForTimeout(1500)
  if (!page.url().includes('/digital/onboarding')) return
  // karuselė → apžiūrėti → pasirinkti → patvirtinti → į žaidimą
  await page.getByRole('button', { name: /Apžiūrėti kaladę/ }).click()
  await expect(page.getByText(/Stiprybės/i)).toBeVisible({ timeout: 20_000 })
  await page.getByRole('button', { name: /Pasirinkti šią kaladę|Tęsti su šia kalade/ }).click()
  await page.getByRole('button', { name: /Patvirtinti kaladę/ }).click()
  await expect(page.getByText(/TAVO KALADĖ PARUOŠTA/i)).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: /Žengti į Ravenof/ }).click()
  await page.waitForURL((u) => u.pathname === '/digital', { timeout: 20_000 })
}

// ── i18n (Fazė 9) ────────────────────────────────────────────────────────────

/** Nustato kalbą PRIEŠ pirmą render'į (cookie + localStorage) – be UI klikų. */
export async function presetLocale(page: Page, locale: 'lt' | 'en') {
  await page.addInitScript((loc) => {
    try { window.localStorage.setItem('rvn_locale', loc) } catch { /* */ }
    document.cookie = `rvn_locale=${loc}; path=/; max-age=31536000`
  }, locale)
}

/** Perjungia kalbą per matomą LT|EN selektorių. */
export async function switchLocale(page: Page, locale: 'lt' | 'en') {
  const btn = page.getByRole('radio', { name: locale === 'en' ? 'English' : 'Lietuvių' }).first()
  await btn.click()
  await page.waitForTimeout(400)
}

/** Ar puslapyje matomas nors vienas lietuviškas diakritinis simbolis (EN režimo patikra). */
export async function visibleLithuanianText(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const hits: string[] = []
    const re = /[ąčęėįšųūžĄČĘĖĮŠŲŪŽ]/
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    let n: Node | null
    while ((n = walker.nextNode())) {
      const el = n.parentElement
      if (!el) continue
      const st = window.getComputedStyle(el)
      if (st.display === 'none' || st.visibility === 'hidden') continue
      const txt = (n.textContent ?? '').trim()
      if (txt && re.test(txt)) hits.push(txt.slice(0, 60))
    }
    return hits
  })
}

/** Neišverstų raktų paieška: matomas tekstas, atrodantis kaip `namespace.key.path`. */
export async function rawI18nKeys(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = []
    const re = /^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9_]+){1,4}$/
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    let n: Node | null
    while ((n = walker.nextNode())) {
      const txt = (n.textContent ?? '').trim()
      if (txt && txt.length < 60 && re.test(txt) && !txt.includes(' ')) out.push(txt)
    }
    return out
  })
}

// ── EN lokalizacijos auditas (Fazė 10) ──────────────────────────────────────

/** Bendriniai LT žodžiai, kurių EN sąsajoje būti negali (be diakritikų irgi). */
export const LT_UI_TERMS = [
  'Atsiimta', 'Atsiimti', 'Turima', 'Naudojama', 'Naudoti', 'PIRKTI', 'Pirkti', 'ATPLĖŠTI', 'Atplėšti',
  'Lygis', 'LYGIS', 'Nugarėlė', 'Sezono', 'Pasas', 'PASAS', 'Nemok', 'Aktyvi', 'AKTYVI', 'Redaguoti',
  'kortų', 'pak.', 'Pradėti', 'Reitingas', 'Draugiška', 'Prieš AI', 'Žaisti', 'Kraunama', 'Saugoma',
  'Nepakanka', 'Paimta', 'Turinys',
]

/** Leidžiamos LT reikšmės EN režime (su priežastimi). */
export type LocalizationAllowlistEntry = {
  value: string
  reason: 'card-name-managed-separately' | 'deck-name-user-generated' | 'canonical-character-name' | 'player-generated-content'
}

/** Nė vienas matomas tekstas negali atrodyti kaip vertimo raktas. */
export async function expectNoVisibleTranslationKeys(page: Page) {
  const raw = await page.evaluate(() => document.body.innerText)
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean)
  const looksLikeKey = (s: string) =>
    /^[A-Z][A-Z0-9_]*(?:\.[A-Z0-9_]+){1,}$/.test(s) ||          // QUESTS.DAILY.EASY
    (/^[a-z][a-zA-Z0-9_-]*(?:\.[a-zA-Z0-9_-]+){1,}$/.test(s) && // quests.daily.easy
     !/\.(png|jpg|jpeg|webp|svg|mp3|mp4|json|com|lt|io|dev)$/i.test(s) && !/^\d/.test(s))
  const hits = lines.filter((l) => !l.includes(' ') && looksLikeKey(l))
  expect(hits, `matomi vertimo raktai: ${hits.join(', ')}`).toHaveLength(0)
}

/** EN režime nelieka lietuviškos SĄSAJOS (DB turinio LT fallback – atskirai). */
export async function expectNoLithuanianUi(page: Page, allow: LocalizationAllowlistEntry[] = []) {
  const text = await page.evaluate(() => document.body.innerText)
  const allowed = new Set(allow.map((a) => a.value))
  const hits = LT_UI_TERMS.filter((w) => text.includes(w) && !allowed.has(w))
  expect(hits, `EN režime likę LT sąsajos tekstai: ${hits.join(' | ')}`).toHaveLength(0)
}

/** Kiek kartų EN krito į LT (matomumas, ne blokada). */
export async function i18nFallbackCount(page: Page): Promise<number> {
  return page.evaluate(() => ((window as unknown as { __rvnI18nFallbacks?: unknown[] }).__rvnI18nFallbacks ?? []).length)
}
