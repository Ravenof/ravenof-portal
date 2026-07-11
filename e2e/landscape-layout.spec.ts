import { test, expect } from '@playwright/test'
import { expectFullyInViewport, expectNoPageScroll } from './helpers'

// Vykdomas visais layout-* projektais (844×390 … 1920×1080).
test.describe('Landscape layout matrica', () => {
  test('login: forma telpa be scroll, CTA matomas', async ({ page }) => {
    await page.goto('/digital/login')
    const submit = page.getByRole('button', { name: /Prisijungti/ })
    await expect(submit).toBeVisible()
    await expectFullyInViewport(page, submit)
    await expectNoPageScroll(page)
  })

  test('register: forma telpa be scroll, CTA matomas', async ({ page }) => {
    await page.goto('/digital/register')
    const submit = page.getByRole('button', { name: /Registruotis/ })
    await expect(submit).toBeVisible()
    await expectFullyInViewport(page, submit)
    await expectNoPageScroll(page)
    await page.screenshot({ path: `test-results/register-${page.viewportSize()!.width}x${page.viewportSize()!.height}.png` })
  })

  test('forgot-password: CTA matomas', async ({ page }) => {
    await page.goto('/digital/forgot-password')
    const submit = page.getByRole('button', { name: /Siųsti/ })
    await expect(submit).toBeVisible()
    await expectFullyInViewport(page, submit)
  })
})
