import { test, expect } from '@playwright/test'
import { digitalLogin, dismissGates, EMAIL, ensureOnboarded } from './helpers'

// Kosmetikos atstatymas: Profilis → Redaguoti → pasirinkti → reload → išlieka.
test.describe('Profile cosmetics', () => {
  test('avatarą ir nugarėlę galima pasirinkti ir jie persistuoja po reload', async ({ page }) => {
    test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
    test.setTimeout(180_000)
    const errors: string[] = []
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

    await digitalLogin(page)
    await ensureOnboarded(page)
    await page.goto('/digital/profile')
    await dismissGates(page)

    // „Redaguoti profilį" atidaro kosmetikos modalą (nebe stub toast)
    await page.getByRole('button', { name: /Redaguoti/i }).first().click()
    const dialog = page.getByRole('dialog', { name: /Redaguoti profilį/i })
    await expect(dialog).toBeVisible({ timeout: 15_000 })

    // Avataras: pirmas „Pasirinkti" mygtukas
    const pickBtn = dialog.locator('button', { hasText: /Pasirinkti$/i }).first()
    if (await pickBtn.isVisible().catch(() => false)) {
      await pickBtn.click()
      await expect(dialog.locator('text=/Pasirinkta:/i').first()).toBeVisible({ timeout: 10_000 })
    }

    // Kortų nugarėlė
    await dialog.getByRole('button', { name: /Kortų nugarėlė/i }).click()
    const pickBack = dialog.locator('button', { hasText: /Pasirinkti$/i }).first()
    let backName: string | null = null
    if (await pickBack.isVisible().catch(() => false)) {
      backName = await pickBack.textContent()
      await pickBack.click()
      await expect(dialog.locator('text=/Pasirinkta:/i').first()).toBeVisible({ timeout: 10_000 })
    }

    // Reload → pasirinkimas išlieka (didysis preview žymi ★ Pasirinkta)
    await page.reload()
    await dismissGates(page)
    await page.getByRole('button', { name: /Redaguoti/i }).first().click()
    await expect(page.getByRole('dialog', { name: /Redaguoti profilį/i })).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('text=/★\\s*Pasirinkta/i').first()).toBeVisible({ timeout: 10_000 })

    // jokių console error'ų per pasirinkimą
    expect(errors.filter((e) => !/favicon|manifest|net::ERR_/i.test(e))).toHaveLength(0)
  })
})
