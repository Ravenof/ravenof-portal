import { test, expect } from '@playwright/test'
import { digitalLogin, ensureOnboarded, dismissGates, EMAIL } from './helpers'

const SIZES = [{ w: 844, h: 390 }, { w: 896, h: 414 }, { w: 1280, h: 720 }]

test.describe('AI treniruotės setup', () => {
  for (const v of SIZES) {
    test(`${v.w}×${v.h}: sunkumas + CTA + 4 plytelės visada matomi`, async ({ page }) => {
      test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
      await page.setViewportSize({ width: v.w, height: v.h })
      await digitalLogin(page); await ensureOnboarded(page)
      await page.goto('/digital/pve'); await dismissGates(page)
      const diff = page.getByTestId('ai-difficulty')
      await expect(diff).toBeVisible({ timeout: 25_000 })
      const vp = page.viewportSize()!
      const db = (await diff.boundingBox())!
      expect(db.y + db.height, 'sunkumas viewport ribose').toBeLessThanOrEqual(vp.height + 1)
      // 4 plytelės su vieninga struktūra (emblema + pavadinimas), matomos
      const tiles = page.locator('[data-setup-tile]')
      await expect(tiles).toHaveCount(4)
      for (let i = 0; i < 4; i++) {
        const b = (await tiles.nth(i).boundingBox())!
        expect(b.y + b.height).toBeLessThanOrEqual(vp.height + 1)
      }
      // sunkumas LIEKA matomas pasirinkus kiekvieną režimą
      for (const m of ['random', 'faction', 'public']) {
        await page.locator(`[data-setup-tile="${m}"]`).click()
        await expect(diff).toBeVisible()
      }
      // CTA matomas
      const cta = page.getByRole('button', { name: /PRADĖTI KOVĄ|PASIRINK/ })
      const cb = (await cta.boundingBox())!
      expect(cb.y + cb.height).toBeLessThanOrEqual(vp.height + 1)
      // pasirinkimo būsena keičiasi vizualiai (aria-pressed)
      await expect(page.locator('[data-setup-tile="faction"]')).toHaveAttribute('aria-pressed', 'false')
      await page.locator('[data-setup-tile="faction"]').click()
      await expect(page.locator('[data-setup-tile="faction"]')).toHaveAttribute('aria-pressed', 'true')
    })
  }
})
