import { test, expect } from '@playwright/test'
import { digitalLogin, ensureOnboarded, dismissGates, EMAIL } from './helpers'

test.describe('Kovos režimų kortelės', () => {
  test('3 kortelės su tikrais asset, pasirinkimas keičia stilių, be clipping', async ({ page }) => {
    test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
    await digitalLogin(page); await ensureOnboarded(page)
    await page.goto('/digital'); await dismissGates(page)
    const cards = page.locator('button[data-mode]')
    await expect(cards).toHaveCount(3, { timeout: 25_000 })
    // kiekviena turi img be broken (naturalWidth > 0)
    for (const m of ['ranked', 'pve', 'free']) {
      const img = page.locator(`button[data-mode="${m}"] img`)
      await expect(img).toBeVisible()
      const ok = await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)
      expect(ok, `asset ${m}`).toBe(true)
    }
    // pasirinkimas keičia data-selected + neperstumia kaimynų (layout stabilus)
    const before = (await cards.nth(2).boundingBox())!.x
    await cards.nth(1).click()
    await expect(cards.nth(1)).toHaveAttribute('data-selected', 'true')
    await page.waitForTimeout(300)
    const after = (await cards.nth(2).boundingBox())!.x
    expect(Math.abs(after - before)).toBeLessThan(2)
    // kortelės viewport ribose
    const vp = page.viewportSize()!
    for (let i = 0; i < 3; i++) {
      const b = (await cards.nth(i).boundingBox())!
      expect(b.y + b.height).toBeLessThanOrEqual(vp.height + 1)
    }
  })
})
