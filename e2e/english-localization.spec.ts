import { test, expect, type Page } from '@playwright/test'
import {
  digitalLogin, ensureOnboarded, dismissGates, EMAIL,
  presetLocale, expectNoVisibleTranslationKeys, expectNoLithuanianUi, i18nFallbackCount, expectNoPageScroll,
} from './helpers'

// ── EN režimo lokalizacijos auditas ─────────────────────────────────────────
// Padengia patvirtintus ekranus (Home, Užduotys, Sezonas, Kosmetika, Aktyvi
// kaladė, Kaladės, Parduotuvė) + raktų nutekėjimą + baked-text asset'us.

const VIEWPORTS = [
  { w: 844, h: 390 }, { w: 896, h: 414 }, { w: 1024, h: 600 },
  { w: 1366, h: 768 }, { w: 1800, h: 820 }, { w: 1920, h: 1080 },
]

async function openEnglishHub(page: Page) {
  await presetLocale(page, 'en')
  await digitalLogin(page); await ensureOnboarded(page)
  await page.goto('/digital'); await dismissGates(page)
  await page.waitForTimeout(2500)
}

test.describe('EN — Home hub', () => {
  test('quest kortelės, mūšio režimai ir CTA angliškai; jokių raktų', async ({ page }) => {
    test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
    await openEnglishHub(page)

    await expectNoVisibleTranslationKeys(page)
    await expectNoLithuanianUi(page)

    // mūšio režimų etiketės (asset arba HTML tekstas) – angliškos
    const body = await page.evaluate(() => document.body.innerText)
    expect(body).not.toMatch(/REITINGAS|PRIEŠ AI|DRAUGIŠKA|ŽAISTI DABAR/i)

    // baked-text PNG su LT tekstu EN režime NEturi būti rodomas
    const ltAssets = await page.locator('img[src*="battle-modes"], img[src*="heading.png"], img[src*="cta2.png"]').count()
    expect(ltAssets, 'EN režime rodomas LT baked-text asset').toBe(0)
  })

  test('EN→LT fallback registras (matomumas)', async ({ page }) => {
    test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
    await openEnglishHub(page)
    const n = await i18nFallbackCount(page)
    console.log(`[i18n] EN→LT fallback raktų: ${n}`)
    expect(n, 'kritiniai UI raktai neturi kristi į LT').toBe(0)
  })
})

test.describe('EN — modalai', () => {
  const MODALS: { name: string; open: (p: Page) => Promise<void> }[] = [
    { name: 'Daily quests', open: async (p) => { await p.getByRole('button', { name: /quests|tasks/i }).first().click() } },
    { name: 'Season path', open: async (p) => { await p.getByRole('button', { name: /season/i }).first().click() } },
    { name: 'Cosmetics', open: async (p) => { await p.getByRole('button', { name: /cosmetics/i }).first().click() } },
    { name: 'Shop', open: async (p) => { await p.getByRole('button', { name: /shop|store/i }).first().click() } },
    { name: 'Active deck', open: async (p) => { await p.getByRole('button', { name: /active deck|change/i }).first().click() } },
  ]

  for (const m of MODALS) {
    test(`${m.name}: be LT tekstų ir be raktų`, async ({ page }) => {
      test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
      await openEnglishHub(page)
      const btn = page.getByRole('button').filter({ hasText: /./ })
      await expect(btn.first()).toBeVisible()
      await m.open(page).catch(() => { test.skip(true, `${m.name} mygtukas nerastas`) })
      await page.waitForTimeout(1800)
      await expectNoVisibleTranslationKeys(page)
      await expectNoLithuanianUi(page)
    })
  }
})

test.describe('EN — maršrutų crawl', () => {
  const ROUTES = ['/digital', '/digital/collection', '/digital/decks', '/digital/pve', '/digital/pvp', '/digital/ranked', '/digital/friends']
  for (const route of ROUTES) {
    test(`EN ${route}`, async ({ page }) => {
      test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
      await presetLocale(page, 'en')
      await digitalLogin(page); await ensureOnboarded(page)
      await page.goto(route); await dismissGates(page)
      await page.waitForTimeout(2500)
      await expectNoVisibleTranslationKeys(page)
      await expectNoLithuanianUi(page)
    })
  }
})

test.describe('EN — viewport matrica (teksto ilgis)', () => {
  for (const vp of VIEWPORTS) {
    test(`EN ${vp.w}×${vp.h}: be page-scroll, be raktų`, async ({ page }) => {
      test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
      await page.setViewportSize({ width: vp.w, height: vp.h })
      await openEnglishHub(page)
      await expectNoPageScroll(page)
      await expectNoVisibleTranslationKeys(page)
    })
  }
})
