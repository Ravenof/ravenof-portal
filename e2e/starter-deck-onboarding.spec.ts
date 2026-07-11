import { test, expect } from '@playwright/test'
import { digitalLogin, EMAIL } from './helpers'

test.describe('Starter kaladės onboarding', () => {
  test('onboarded žaidėjas iš /digital/onboarding grąžinamas į /digital', async ({ page }) => {
    test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
    await digitalLogin(page)
    await page.goto('/digital/onboarding')
    await page.waitForURL((u) => u.pathname === '/digital', { timeout: 20_000 })
  })

  // Pilnas naujo žaidėjo srautas — tik su šviežiu, patvirtintu, ne-onboarded testiniu vartotoju.
  // Nustatyk E2E_FRESH_EMAIL + E2E_FRESH_PASSWORD (paskyra be starter claim).
  test('naujas žaidėjas: karuselė → dėžės atidarymas → patvirtinimas → /digital', async ({ page }) => {
    const email = process.env.E2E_FRESH_EMAIL, pw = process.env.E2E_FRESH_PASSWORD
    test.skip(!email || !pw, 'reikia E2E_FRESH_EMAIL/E2E_FRESH_PASSWORD (ne-onboarded paskyra)')
    await page.goto('/digital/login')
    await page.getByLabel('El. paštas').fill(email!)
    await page.getByLabel('Slaptažodis', { exact: true }).fill(pw!)
    await page.getByRole('button', { name: /Prisijungti/ }).click()
    await page.waitForURL(/\/digital\/onboarding/, { timeout: 20_000 })

    // karuselė su dėžėmis
    const options = page.getByRole('option')
    await expect(options.first()).toBeVisible({ timeout: 20_000 })
    expect(await options.count()).toBeGreaterThanOrEqual(2)

    // navigacija strėlėmis + klaviatūra
    await page.getByRole('button', { name: 'Kita kaladė' }).click()
    await page.keyboard.press('ArrowLeft')

    // atidarom fokusuotą dėžę
    await page.getByRole('button', { name: /Apžiūrėti kaladę/ }).click()
    await expect(page.getByText(/Stiprybės/i)).toBeVisible()
    await expect(page.getByText(/Silpnybės/i)).toBeVisible()

    // kortų sąrašas užsikrauna; kortos preview
    await expect(page.getByText(/Kraunamos kortos/)).toBeHidden({ timeout: 20_000 })
    const cardRow = page.locator('button:has-text("🪙")').first()
    await cardRow.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')

    // patvirtinimas
    await page.getByRole('button', { name: /Pasirinkti šią kaladę|Tęsti su šia kalade/ }).click()
    await page.getByRole('button', { name: /Patvirtinti kaladę/ }).click()
    await expect(page.getByText(/TAVO KALADĖ PARUOŠTA/i)).toBeVisible({ timeout: 25_000 })
    await page.getByRole('button', { name: /Žengti į Ravenof/ }).click()
    await page.waitForURL((u) => u.pathname === '/digital', { timeout: 20_000 })

    // idempotencija: grįžus į onboarding — guard grąžina namo, dublikato nėra
    await page.goto('/digital/onboarding')
    await page.waitForURL((u) => u.pathname === '/digital', { timeout: 20_000 })
  })
})
