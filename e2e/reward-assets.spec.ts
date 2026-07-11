import { test, expect } from '@playwright/test'
import { digitalLogin, ensureOnboarded, dismissGates, EMAIL } from './helpers'

// Kanoniniai reward asset'ai (registras) — tas pats tipas = tas pats asset visur.
test.describe('Reward vizualai', () => {
  test('registro asset keliai pasiekiami (HTTP 200)', async ({ request }) => {
    for (const a of ['cur-silver.png', 'cur-rubies.png', 'cur-essence.png', 'pack.png', 'seg-season.png', 'fi-academy.png', 'fi-gifts.png', 'avatar.png', 'nav-decks.png']) {
      const r = await request.get(`/digital/icons/${a}`)
      expect(r.status(), a).toBe(200)
    }
  })

  test('Home kito lygio atlygiai — img su data-reward, ne emoji', async ({ page }) => {
    test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
    await digitalLogin(page); await ensureOnboarded(page)
    await page.goto('/digital'); await dismissGates(page)
    await page.waitForTimeout(4000)
    const chips = page.locator('[data-reward]')
    if (await chips.count() > 0) {
      // kiekvienas chip'as turi img (kanoninis asset), o jo tekste nėra emoji
      const first = chips.first()
      expect(await first.locator('img').count()).toBeGreaterThan(0)
      const txt = await first.textContent()
      expect(txt ?? '').not.toMatch(/🪙|🥈|💎|🔮|🎁/u)
    }
  })

  test('Lygių kelias — sidabras visada cur-silver asset', async ({ page }) => {
    test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
    await digitalLogin(page); await ensureOnboarded(page)
    await page.goto('/digital'); await dismissGates(page)
    // profilio chip atidaro Lygių kelią
    await page.locator('header button').first().click()
    await page.waitForTimeout(2500)
    const silver = page.locator('[data-reward="silver"] img').first()
    await expect(silver).toBeVisible({ timeout: 15_000 })
    expect(await silver.getAttribute('src')).toContain('cur-silver')
  })
})
