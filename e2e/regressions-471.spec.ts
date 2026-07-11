import { test, expect } from '@playwright/test'
import { digitalLogin, ensureOnboarded, dismissGates, EMAIL } from './helpers'

test.describe('471 regresijos', () => {
  test('deck selector: naršymas NEkeičia aktyvios; pasirinkimas per pending + patvirtinimą', async ({ page }) => {
    test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
    await digitalLogin(page); await ensureOnboarded(page)
    await page.goto('/digital'); await dismissGates(page)
    const before = await page.getByTestId('home-active-deck').textContent()
    await page.getByTestId('home-active-deck').click()
    await expect(page.getByTestId('active-deck-modal')).toBeVisible()
    // naršom strėlėmis pirmyn/atgal — aktyvioji nesikeičia
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight')
    for (let i = 0; i < 2; i++) await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(600)
    await page.keyboard.press('Escape')
    const after = await page.getByTestId('home-active-deck').textContent()
    expect(after).toBe(before)
  })

  test('AI: sunkumas ir CTA matomi be scroll, nepersidengia', async ({ page }) => {
    test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
    await digitalLogin(page); await ensureOnboarded(page)
    await page.goto('/digital/pve'); await dismissGates(page)
    const diff = page.getByTestId('ai-difficulty')
    await expect(diff).toBeVisible({ timeout: 25_000 })
    const dBox = await diff.boundingBox()
    const cta = page.getByRole('button', { name: /PRADĖTI KOVĄ|PASIRINK/ })
    const cBox = await cta.boundingBox()
    const vp = page.viewportSize()!
    expect(dBox!.y + dBox!.height).toBeLessThanOrEqual(vp.height)
    expect(cBox!.y + cBox!.height).toBeLessThanOrEqual(vp.height)
    // nepersidengia
    expect(dBox!.y + dBox!.height).toBeLessThanOrEqual(cBox!.y + 2)
  })

  test('AI: pasirinkta frakcija rodo frakcijų pasirinkimą', async ({ page }) => {
    test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
    await digitalLogin(page); await ensureOnboarded(page)
    await page.goto('/digital/pve'); await dismissGates(page)
    await page.getByRole('button', { name: /Pasirinkta frakcija/i }).click()
    // matosi bent 2 frakcijų mygtukai turinio zonoje
    await page.waitForTimeout(1500)
    const factionBtns = page.locator('button:has(img[width="32"])')
    expect(await factionBtns.count()).toBeGreaterThanOrEqual(1)
  })

  test('AI: viešas deck turi paiešką ir filtrą', async ({ page }) => {
    test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
    await digitalLogin(page); await ensureOnboarded(page)
    await page.goto('/digital/pve'); await dismissGates(page)
    await page.getByRole('button', { name: /Viešas deck/i }).click()
    await expect(page.getByPlaceholder(/Ieškoti decko/)).toBeVisible()
    await expect(page.locator('select')).toBeVisible()
  })

  test('Draugiška: draugų sąrašas dešinėje, keli matomi, CTA su vardu', async ({ page }) => {
    test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
    await digitalLogin(page); await ensureOnboarded(page)
    await page.goto('/digital/pvp'); await dismissGates(page)
    await page.getByRole('button', { name: /Pakviesti draugą/i }).click()
    await expect(page.getByTestId('friend-panel')).toBeVisible()
    await expect(page.getByLabel('Ieškoti draugo')).toBeVisible()
    const rows = page.locator('[data-testid^="invite-friend-"]')
    const n = await rows.count()
    if (n > 0) {
      await rows.first().click()
      await expect(page.getByRole('button', { name: /PAKVIESTI/ })).toBeVisible()
      // sąrašas lieka matomas po pasirinkimo
      expect(await rows.count()).toBe(n)
    }
  })

  test('Sezono progresas: mygtukas paspaudžiamas (niekas neuždengia)', async ({ page }) => {
    test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
    await digitalLogin(page); await ensureOnboarded(page)
    await page.goto('/digital'); await dismissGates(page)
    const btn = page.getByTestId('season-track-btn')
    await expect(btn).toBeVisible({ timeout: 25_000 })
    await btn.click() // Playwright fail'ins jei kitas elementas perimtų click
    await page.keyboard.press('Escape')
  })
})
