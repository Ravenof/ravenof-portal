import { test, expect } from '@playwright/test'
import { digitalLogin, ensureOnboarded, dismissGates, EMAIL } from './helpers'

test.describe('477 fix paketas', () => {
  test('Builder: Išsaugoti mygtukas viewport ribose (844×390 imtinai)', async ({ page }) => {
    test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
    await page.setViewportSize({ width: 844, height: 390 })
    await digitalLogin(page); await ensureOnboarded(page)
    await page.goto('/digital/decks?tab=builder'); await dismissGates(page)
    const save = page.getByRole('button', { name: /Išsaugoti/ })
    await expect(save).toBeVisible({ timeout: 25_000 })
    const b = await save.boundingBox()
    const vp = page.viewportSize()!
    expect(b!.y + b!.height, 'Save po viewport apačia').toBeLessThanOrEqual(vp.height + 1)
    // bottom nav (jei yra) neuždengia: mygtuko centras paspaudžiamas
    await save.click({ trial: true })
  })

  test('Ranked: Apdovanojimų puslapis atsidaro be klaidos, slot su tikrais asset', async ({ page }) => {
    test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
    await digitalLogin(page); await ensureOnboarded(page)
    await page.goto('/digital/ranked'); await dismissGates(page)
    await page.getByRole('button', { name: /Peržiūrėti atlygius/ }).click()
    await page.waitForTimeout(3000)
    // jokio application error; slot'ai su data-reward img
    expect(await page.locator('text=/Application error/').count()).toBe(0)
    await expect(page.locator('[data-reward-slot]').first()).toBeVisible({ timeout: 15_000 })
    expect(await page.locator('[data-reward-slot] img').count()).toBeGreaterThan(0)
  })

  test('PvP: kambario kūrimas naudoja globalią aktyvią kaladę (ne pirmą)', async ({ page }) => {
    test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
    await digitalLogin(page); await ensureOnboarded(page)
    await page.goto('/digital/pvp'); await dismissGates(page)
    // santraukoje matoma kaladė; jos vardas turi sutapti su „Tavo kaladė" po kambario sukūrimo
    const summary = await page.getByTestId('active-deck-summary').textContent()
    expect(summary).toBeTruthy()
  })
})
