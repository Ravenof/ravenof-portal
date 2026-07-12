import { test, expect } from '@playwright/test'
import {
  digitalLogin, ensureOnboarded, dismissGates, EMAIL,
  presetLocale, switchLocale, visibleLithuanianText, rawI18nKeys, expectNoPageScroll,
} from './helpers'

// ── Fazė 9: i18n QA ─────────────────────────────────────────────────────────
// Padengia: selektorių, persistenciją, navigator.language, EN maršrutus,
// neišverstus raktus, kovos log'o persirenderavimą ir EN teksto ilgį (layout).

test.describe('i18n — kalbos selektorius ir persistencija', () => {
  test('login ekrane LT→EN perjungia sąsają be reload', async ({ page }) => {
    await page.goto('/digital/login')
    await expect(page.getByRole('radiogroup')).toBeVisible({ timeout: 20_000 })
    // LT startas
    await expect(page.getByLabel('El. paštas')).toBeVisible()
    await switchLocale(page, 'en')
    await expect(page.getByLabel(/Email/i)).toBeVisible({ timeout: 10_000 })
    // <html lang> atnaujintas
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('en')
  })

  test('pasirinkta kalba išlieka po reload (cookie + localStorage)', async ({ page }) => {
    await page.goto('/digital/login')
    await switchLocale(page, 'en')
    const stored = await page.evaluate(() => localStorage.getItem('rvn_locale'))
    expect(stored).toBe('en')
    const cookie = await page.evaluate(() => document.cookie)
    expect(cookie).toContain('rvn_locale=en')

    await page.reload()
    await expect(page.getByLabel(/Email/i)).toBeVisible({ timeout: 20_000 })
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('en')
  })

  test('grįžimas į LT veikia', async ({ page }) => {
    await presetLocale(page, 'en')
    await page.goto('/digital/login')
    await expect(page.getByLabel(/Email/i)).toBeVisible({ timeout: 20_000 })
    await switchLocale(page, 'lt')
    await expect(page.getByLabel('El. paštas')).toBeVisible({ timeout: 10_000 })
    expect(await page.evaluate(() => localStorage.getItem('rvn_locale'))).toBe('lt')
  })
})

test.describe('i18n — naršyklės kalba', () => {
  test.use({ locale: 'en-US' })
  test('anglakalbė naršyklė (be pasirinkimo) → EN sąsaja', async ({ page }) => {
    await page.goto('/digital/login')
    await expect(page.getByLabel(/Email/i)).toBeVisible({ timeout: 20_000 })
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('en')
  })
})

test.describe('i18n — EN maršrutų padengimas', () => {
  const ROUTES = ['/digital', '/digital/collection', '/digital/decks', '/digital/pve', '/digital/pvp', '/digital/ranked']

  for (const route of ROUTES) {
    test(`EN: ${route} be lietuviškų tekstų ir be neišverstų raktų`, async ({ page }) => {
      test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
      await presetLocale(page, 'en')
      await digitalLogin(page); await ensureOnboarded(page)
      await page.goto(route); await dismissGates(page)
      await page.waitForTimeout(2500)

      const keys = await rawI18nKeys(page)
      expect(keys, `neišversti raktai ${route}: ${keys.join(', ')}`).toHaveLength(0)

      const lt = await visibleLithuanianText(page)
      // Kortų/DB turinio vertimai gali būti dar nesuvesti → fallback LT yra LEGALUS.
      // Todėl tikrinam tik SĄSAJOS tekstus: LT žodžiai, kurių tikrai nėra kortų varduose.
      const uiLeftovers = lt.filter((s) => /Baigti ėjimą|Kaladė|Nustatymai|Atsiimti|Parduotuvė|Prisijungti/i.test(s))
      expect(uiLeftovers, `EN režime likę LT UI tekstai (${route}): ${uiLeftovers.join(' | ')}`).toHaveLength(0)
    })
  }
})

test.describe('i18n — kovos log persirenderinimas', () => {
  test('pakeitus kalbą kovoje, istoriniai log įrašai persiverčia (struktūrinis log)', async ({ page }) => {
    test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
    await digitalLogin(page); await ensureOnboarded(page)
    await page.goto('/digital/pve'); await dismissGates(page)

    const practice = page.getByRole('button', { name: /Praktika prieš AI/i }).first()
    if (await practice.isVisible().catch(() => false)) await practice.click()
    await page.getByRole('button', { name: /PRADĖTI KOVĄ/i }).first().click()

    await expect(page.getByRole('button', { name: /Baigti ėjimą/i }).first()).toBeVisible({ timeout: 60_000 })
    await page.waitForTimeout(3000)

    const before = await page.evaluate(() => document.body.innerText)
    expect(before, 'LT kovos log').toMatch(/ėjim|trauk/i)

    // perjungiam kalbą TIESIOG KOVOJE (kovos ekrane selektoriaus nėra)
    await page.evaluate(() => (window as unknown as { __rvnSetLocale?: (l: string) => void }).__rvnSetLocale?.('en'))
    await page.waitForTimeout(800)

    const after = await page.evaluate(() => document.body.innerText)
    // istoriniai įrašai sugeneruoti IŠ STRUKTŪROS → jie irgi turi būti angliški
    expect(after).toMatch(/End turn|turn|draw/i)
    expect(after, 'po perjungimo neturi likti LT kovos tekstų').not.toMatch(/Baigti ėjimą|Priešo ėjimas/i)

    const keys = await rawI18nKeys(page)
    expect(keys.filter((k) => k.startsWith('battleLog.')), `log rodo raktus: ${keys.join(', ')}`).toHaveLength(0)
  })

  test('EN kovoje: mygtukai ir log angliškai, be neišverstų raktų', async ({ page }) => {
    test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
    await presetLocale(page, 'en')
    await digitalLogin(page); await ensureOnboarded(page)
    await page.goto('/digital/pve'); await dismissGates(page)
    const practice = page.getByRole('button', { name: /Practice vs AI/i }).first()
    if (await practice.isVisible().catch(() => false)) await practice.click()
    await page.getByRole('button', { name: /START BATTLE/i }).first().click()

    await expect(page.getByRole('button', { name: /End turn/i }).first()).toBeVisible({ timeout: 60_000 })
    await page.waitForTimeout(2500)
    const keys = await rawI18nKeys(page)
    expect(keys, `neišversti raktai kovoje: ${keys.join(', ')}`).toHaveLength(0)
    const body = await page.evaluate(() => document.body.innerText)
    expect(body).not.toMatch(/Baigti ėjimą|Priešo ėjimas/i)
  })
})

test.describe('i18n — EN teksto ilgis (layout)', () => {
  for (const vp of [{ w: 844, h: 390 }, { w: 1280, h: 720 }]) {
    test(`EN ${vp.w}×${vp.h}: hub be page-scroll, CTA matomas`, async ({ page }) => {
      test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
      await page.setViewportSize({ width: vp.w, height: vp.h })
      await presetLocale(page, 'en')
      await digitalLogin(page); await ensureOnboarded(page)
      await page.goto('/digital'); await dismissGates(page)
      await page.waitForTimeout(2000)
      await expectNoPageScroll(page)
      const keys = await rawI18nKeys(page)
      expect(keys).toHaveLength(0)
    })
  }
})
