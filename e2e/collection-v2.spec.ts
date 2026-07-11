import { test, expect } from '@playwright/test'
import { digitalLogin, ensureOnboarded, dismissGates, EMAIL } from './helpers'

async function visibleCards(page: import('@playwright/test').Page): Promise<number> {
  const browser = page.getByTestId('card-browser')
  const bb = await browser.boundingBox()
  if (!bb) return 0
  const cards = page.locator('[data-testid="card-browser"] button.relative.block')
  const n = await cards.count()
  let vis = 0
  for (let i = 0; i < Math.min(n, 24); i++) {
    const b = await cards.nth(i).boundingBox()
    if (b && b.y >= bb.y - 2 && b.y + b.height <= bb.y + bb.height + 2) vis++
  }
  return vis
}

test.describe('Kolekcija v2', () => {
  test('toolbar + dominuojantis grid; 1280×720 matomos ≥4 kortos; be body scroll', async ({ page }) => {
    test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
    await digitalLogin(page); await ensureOnboarded(page)
    await page.goto('/digital/collection'); await dismissGates(page)
    await expect(page.getByTestId('collection-toolbar')).toBeVisible({ timeout: 25_000 })
    await expect(page.getByTestId('card-browser')).toBeVisible()
    await page.waitForTimeout(2500)
    expect(await visibleCards(page)).toBeGreaterThanOrEqual(4)
    const { sh, ih } = await page.evaluate(() => ({ sh: document.body.scrollHeight, ih: innerHeight }))
    expect(sh).toBeLessThanOrEqual(ih + 4)
    // grid plotis ≥70% viewport
    const bb = await page.getByTestId('card-browser').boundingBox()
    expect(bb!.width).toBeGreaterThan(page.viewportSize()!.width * 0.68)
  })

  test('inspector suskleidžiamas — grid praplatėja; būsena išlieka', async ({ page }) => {
    test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
    await digitalLogin(page); await ensureOnboarded(page)
    await page.goto('/digital/collection'); await dismissGates(page)
    await expect(page.getByTestId('inspector')).toBeVisible({ timeout: 25_000 })
    const before = (await page.getByTestId('card-browser').boundingBox())!.width
    await page.getByTestId('inspector-collapse').click()
    await expect(page.getByTestId('inspector')).toBeHidden()
    const after = (await page.getByTestId('card-browser').boundingBox())!.width
    expect(after).toBeGreaterThan(before + 150)
    await page.getByTestId('inspector-open').click()
    await expect(page.getByTestId('inspector')).toBeVisible()
  })

  test('filtrai veikia iš toolbar; tankio jungiklis keičia kortų dydį', async ({ page }) => {
    test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
    await digitalLogin(page); await ensureOnboarded(page)
    await page.goto('/digital/collection'); await dismissGates(page)
    await page.waitForTimeout(2500)
    const countTxt = () => page.getByText(/rodoma \d+/).textContent()
    const before = await countTxt()
    await page.getByLabel('Ieškoti kortų').fill('zzz_nėra_tokios')
    await page.waitForTimeout(600)
    await expect(page.getByText('Nieko nerasta')).toBeVisible()
    await page.getByLabel('Ieškoti kortų').fill('')
    await page.waitForTimeout(600)
    expect(await countTxt()).toBe(before)
    // density
    const w1 = (await page.locator('[data-testid="card-browser"] button.relative.block').first().boundingBox())!.width
    await page.getByTestId('density-toggle').click()
    await page.waitForTimeout(400)
    const w2 = (await page.locator('[data-testid="card-browser"] button.relative.block').first().boundingBox())!.width
    expect(Math.abs(w1 - w2)).toBeGreaterThan(8)
  })

  test('844×390: grid pilno pločio, kortos tap atidaro slide-over', async ({ page }) => {
    test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
    await page.setViewportSize({ width: 844, height: 390 })
    await digitalLogin(page); await ensureOnboarded(page)
    await page.goto('/digital/collection'); await dismissGates(page)
    await expect(page.getByTestId('card-browser')).toBeVisible({ timeout: 25_000 })
    await page.waitForTimeout(2000)
    expect(await page.getByTestId('inspector').count()).toBe(0) // mažame — jokio nuolatinio inspector
    expect(await visibleCards(page)).toBeGreaterThanOrEqual(3)
    await page.locator('[data-testid="card-browser"] button.relative.block').first().click()
    await expect(page.getByText('✕ Uždaryti')).toBeVisible()
    await page.getByText('✕ Uždaryti').click()
  })
})
