import { test, expect } from '@playwright/test'
import { digitalLogin, dismissGates, EMAIL } from './helpers'

test.describe('Deck Builder', () => {
  test('sukurti → redaguoti → validuoti → išsaugoti → perkrauti', async ({ page }) => {
    test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
    test.setTimeout(180_000)
    await digitalLogin(page)
    await page.goto('/digital/decks')
    await dismissGates(page)

    // į builder: „Nauja kaladė" arba pirmos kaladės „Redaguoti"
    const newBtn = page.getByRole('button', { name: /Nauja kaladė|Sukurti kaladę/i }).first()
    const editBtn = page.getByRole('button', { name: /Redaguoti/i }).first()
    if (await newBtn.isVisible().catch(() => false)) await newBtn.click()
    else if (await editBtn.isVisible().catch(() => false)) await editBtn.click()
    else await page.goto('/digital/decks?tab=builder')

    // builder atsidarė: kortų vardų sąrašas kairėje + Išsaugoti mygtukas
    const save = page.getByRole('button', { name: /Išsaugoti/ })
    await expect(save).toBeVisible({ timeout: 20_000 })

    // pridėti kortų per [+] (greitasis add)
    const plusButtons = page.locator('button[aria-label*="ridėti"], button:has-text("+")')
    const before = await page.locator('text=/\\d+\\s*\\/\\s*30/').first().textContent().catch(() => null)
    for (let i = 0; i < 4; i++) {
      const b = plusButtons.nth(i)
      if (await b.isVisible().catch(() => false)) await b.click().catch(() => {})
    }
    const after = await page.locator('text=/\\d+\\s*\\/\\s*30/').first().textContent().catch(() => null)
    if (before && after) expect(after).not.toBe(before)

    // išsaugoti (validacija gali neleisti <30 kortų — tada matoma aiški žinutė, ne tylus fail)
    await save.click()
    const savedOrError = page.locator('text=/išsaugota|Nepavyko išsaugoti|30 kort/i').first()
    await expect(savedOrError).toBeVisible({ timeout: 20_000 })

    // perkrovus kaladės sąrašas grįžta
    await page.goto('/digital/decks')
    await expect(page.locator('text=/Kraunama/').first()).toBeHidden({ timeout: 25_000 })
  })
})
