import { test, expect } from '@playwright/test'
import { digitalLogin, EMAIL } from './helpers'

test.describe('Sesijos atkūrimas', () => {
  test('reload išlaiko sesiją ir turinį', async ({ page }) => {
    test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
    await digitalLogin(page)
    await page.goto('/digital/collection')
    await expect(page.locator('text=/Kolekcija|kort/i').first()).toBeVisible({ timeout: 20_000 })
    await page.reload()
    // po reload — ne login puslapis, turinys grįžta
    await page.waitForTimeout(4000)
    expect(page.url()).not.toContain('/digital/login')
    await expect(page.locator('text=/Kraunama/').first()).toBeHidden({ timeout: 25_000 })
  })
})
