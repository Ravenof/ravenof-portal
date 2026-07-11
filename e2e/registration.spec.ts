import { test, expect } from '@playwright/test'
import { EMAIL, expectFullyInViewport } from './helpers'

test.describe('Registracija (/digital/register)', () => {
  test('landscape forma, CTA matomas, jokio /cards', async ({ page }) => {
    await page.goto('/digital/register')
    await expect(page.getByRole('heading', { name: /SUKURK PASKYRĄ/i })).toBeVisible()
    const submit = page.getByRole('button', { name: /Registruotis/ })
    await expect(submit).toBeVisible()
    await expectFullyInViewport(page, submit)
    expect(page.url()).not.toContain('/cards')
  })

  test('nuoroda į prisijungimą išsaugo next', async ({ page }) => {
    await page.goto('/digital/register?next=%2Fdigital%2Fcollection')
    await page.getByRole('link', { name: /Prisijunk/ }).click()
    await page.waitForURL(/\/digital\/login/)
    expect(page.url()).toContain('next=%2Fdigital%2Fcollection')
  })

  test('validacijos klaidos rodomos formoje (ne redirect)', async ({ page }) => {
    await page.goto('/digital/register')
    await page.getByLabel('Slapyvardis').fill('e2e_test_user')
    await page.getByLabel('El. paštas').fill(EMAIL || 'e2e@example.com')
    await page.getByLabel('Slaptažodis', { exact: true }).fill('slaptazodis123')
    await page.getByLabel('Pakartoti').fill('kitoks-slaptazodis')
    await page.getByRole('button', { name: /Registruotis/ }).click()
    await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toBeVisible()
    expect(page.url()).toContain('/digital/register')
  })

  test('registracija su užimtu el. paštu → klaida, liekam /digital', async ({ page }) => {
    test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL')
    await page.goto('/digital/register')
    await page.getByLabel('Slapyvardis').fill(`e2e_${Date.now().toString(36).slice(-6)}`)
    await page.getByLabel('El. paštas').fill(EMAIL)
    await page.getByLabel('Slaptažodis', { exact: true }).fill('slaptazodis123')
    await page.getByLabel('Pakartoti').fill('slaptazodis123')
    await page.getByRole('button', { name: /Registruotis/ }).click()
    await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toBeVisible({ timeout: 20_000 })
    expect(page.url()).not.toContain('/cards')
    expect(page.url()).toContain('/digital')
  })
})
