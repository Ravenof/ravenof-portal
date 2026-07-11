import { test, expect } from '@playwright/test'
import { digitalLogin, ensureOnboarded, dismissGates, EMAIL } from './helpers'

const ASSETS = [
  '/digital/ai/types/random-faction.png', '/digital/ai/types/selected-faction.png',
  '/digital/ai/types/public-deck.png', '/digital/ai/types/tutorials.png',
  '/digital/ai/difficulty/easy.png', '/digital/ai/difficulty/medium.png', '/digital/ai/difficulty/hard.png',
]

test.describe('AI treniruotės asset mygtukai', () => {
  test('visi 7 asset keliai HTTP 200', async ({ request }) => {
    for (const a of ASSETS) expect((await request.get(a)).status(), a).toBe(200)
  })

  test('mygtukai naudoja PNG (be emoji/dublikuoto teksto), sunkumas keičia realų state', async ({ page }) => {
    test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
    await page.setViewportSize({ width: 844, height: 390 })
    await digitalLogin(page); await ensureOnboarded(page)
    await page.goto('/digital/pve'); await dismissGates(page)
    // 4 tipo mygtukai su realiais img
    for (const t of ['random', 'faction', 'public', 'tutorial']) {
      const img = page.locator(`[data-setup-tile="${t}"] img`)
      await expect(img).toBeVisible({ timeout: 25_000 })
      expect(await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0), t).toBe(true)
      const txt = await page.locator(`[data-setup-tile="${t}"]`).textContent()
      expect((txt ?? '').trim(), `${t} be dublikuoto teksto`).toBe('')
    }
    // sunkumas: 3 asset mygtukai matomi 844×390 + realiai keičia pasirinkimą
    const vp = page.viewportSize()!
    for (const d of ['easy', 'normal', 'hard']) {
      const b = page.locator(`[data-setup-tile="diff-${d}"]`)
      await expect(b).toBeVisible()
      const bb = (await b.boundingBox())!
      expect(bb.y + bb.height).toBeLessThanOrEqual(vp.height + 1)
    }
    await page.locator('[data-setup-tile="diff-hard"]').click()
    await expect(page.locator('[data-setup-tile="diff-hard"]')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('[data-setup-tile="diff-easy"]')).toHaveAttribute('aria-pressed', 'false')
    // tipo pasirinkimas keičia state be layout shift
    const before = (await page.locator('[data-setup-tile="public"]').boundingBox())!.x
    await page.locator('[data-setup-tile="faction"]').click()
    await expect(page.locator('[data-setup-tile="faction"]')).toHaveAttribute('aria-pressed', 'true')
    const after = (await page.locator('[data-setup-tile="public"]').boundingBox())!.x
    expect(Math.abs(after - before)).toBeLessThan(2)
  })
})
