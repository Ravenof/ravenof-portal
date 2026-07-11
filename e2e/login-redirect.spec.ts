import { test, expect } from '@playwright/test'
import { digitalLogin, EMAIL } from './helpers'

test.describe('Prisijungimo nukreipimai', () => {
  test('login su next → digital kelias (niekada /cards)', async ({ page }) => {
    test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
    const url = await digitalLogin(page, '/digital/collection')
    expect(url).not.toContain('/cards')
    // onboarded → prašytas kelias; ne-onboarded → onboarding
    expect(url).toMatch(/\/digital\/(collection|onboarding)/)
  })

  test('login be next → /digital arba onboarding', async ({ page }) => {
    test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
    const url = await digitalLogin(page)
    expect(url).not.toContain('/cards')
    expect(url).toMatch(/\/digital(\/onboarding)?(\?|$)/)
  })

  test('portalo /login registracijos nuoroda gerbia digital next', async ({ page }) => {
    await page.goto('/login?next=%2Fdigital')
    const reg = page.getByRole('link', { name: /Registruotis/ })
    const href = await reg.getAttribute('href')
    expect(href).toContain('/digital/register')
  })
})
