import { test, expect } from '@playwright/test'
import { digitalLogin, ensureOnboarded, dismissGates, EMAIL } from './helpers'

test.describe('Globali aktyvi kaladė', () => {
  test('Home: naujienų nebėra, aktyvios kaladės kortelė atidaro modalą; pasirinkimas persist', async ({ page }) => {
    test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
    await digitalLogin(page)
    await ensureOnboarded(page)
    await page.goto('/digital')
    await dismissGates(page)
    // naujienų kortelės nebėra
    await expect(page.getByText('Naujienos', { exact: true })).toHaveCount(0)
    // aktyvios kaladės kortelė
    const card = page.getByTestId('home-active-deck')
    await expect(card).toBeVisible({ timeout: 20_000 })
    await card.click()
    const modal = page.getByTestId('active-deck-modal')
    await expect(modal).toBeVisible()
    // karuselė: bent viena kaladė, validacija tekstu
    await expect(page.getByTestId('deck-validity')).toBeVisible({ timeout: 20_000 })
    // strėlės + klaviatūra neluš
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowLeft')
    // sąmoningas patvirtinimas
    const setBtn = page.getByTestId('set-active')
    await setBtn.click().catch(() => {}) // jei jau aktyvi — disabled, ok
    await page.keyboard.press('Escape')
    await expect(modal).toBeHidden()
    // refresh išsaugo (kortelėje matomas kaladės vardas, ne "Pasirink kaladę")
    await page.reload()
    await dismissGates(page)
    await expect(page.getByTestId('home-active-deck')).not.toContainText('Pasirink kaladę', { timeout: 25_000 })
  })

  test('PvE: nebėra pilno kaladžių sąrašo, yra santrauka + Keisti atidaro modalą', async ({ page }) => {
    test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
    await digitalLogin(page)
    await ensureOnboarded(page)
    await page.goto('/digital/pve')
    await dismissGates(page)
    await expect(page.getByTestId('active-deck-summary')).toBeVisible({ timeout: 25_000 })
    await expect(page.getByText('Tavo kaladė', { exact: true })).toHaveCount(0)
    await page.getByTestId('change-deck').click()
    await expect(page.getByTestId('active-deck-modal')).toBeVisible()
    await page.keyboard.press('Escape')
    // CTA matomas viewport'e
    const start = page.getByRole('button', { name: /PRADĖTI KOVĄ/i })
    await expect(start).toBeVisible()
    const box = await start.boundingBox()
    const vp = page.viewportSize()!
    expect(box!.y + box!.height).toBeLessThanOrEqual(vp.height + 1)
  })

  test('Draugiška: santrauka vietoj kaladžių stulpelio', async ({ page }) => {
    test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
    await digitalLogin(page)
    await ensureOnboarded(page)
    await page.goto('/digital/pvp')
    await dismissGates(page)
    await expect(page.getByTestId('active-deck-summary')).toBeVisible({ timeout: 25_000 })
    await expect(page.getByText('Tavo kaladė', { exact: true })).toHaveCount(0)
  })

  test('Reitingas: be kaladžių karuselės, be „slink" teksto', async ({ page }) => {
    test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
    await digitalLogin(page)
    await ensureOnboarded(page)
    await page.goto('/digital/ranked')
    await dismissGates(page)
    await expect(page.getByText(/Reitingo kaladės/)).toHaveCount(0)
    await expect(page.getByText(/slink/)).toHaveCount(0)
    await expect(page.getByTestId('active-deck-summary')).toBeVisible({ timeout: 30_000 })
  })
})
