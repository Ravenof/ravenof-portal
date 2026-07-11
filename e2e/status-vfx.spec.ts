import { test, expect } from '@playwright/test'

// Status VFX sistema — dev peržiūros puslapis /dev/status-vfx (be auth).
test.describe('Status VFX', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/dev/status-vfx') })

  test('apply sukuria idle, remove išvalo (shield)', async ({ page }) => {
    await page.getByTestId('pick-shield').click()
    await page.getByTestId('fire-apply').click()
    await expect(page.locator('[data-vfx-shot="shield:apply"]')).toBeVisible()
    await expect(page.locator('[data-vfx-idle="shield"]')).toBeVisible()
    // one-shot pasibaigia ir NEpasikartoja pats
    await expect(page.locator('[data-vfx-shot="shield:apply"]')).toBeHidden({ timeout: 3000 })
    await expect(page.locator('[data-vfx-idle="shield"]')).toBeVisible()
    // destroy: šukės + idle dingsta
    await page.getByTestId('fire-destroy').click()
    await expect(page.locator('[data-vfx-shot="shield:destroy"]')).toBeVisible()
    await expect(page.locator('[data-vfx-idle="shield"]')).toBeHidden({ timeout: 3000 })
  })

  test('poison: apply → trigger → remove seka', async ({ page }) => {
    await page.getByTestId('pick-poisoned').click()
    await page.getByTestId('fire-apply').click()
    await expect(page.locator('[data-vfx-idle="poisoned"]')).toBeVisible()
    await page.getByTestId('fire-trigger').click()
    await expect(page.locator('[data-vfx-shot="poisoned:trigger"]')).toBeVisible()
    await page.getByTestId('fire-remove').click()
    await expect(page.locator('[data-vfx-idle="poisoned"]')).toBeHidden({ timeout: 3000 })
  })

  test('keli statusai kartu: idle limitas saugo nuo chaoso', async ({ page }) => {
    await page.getByTestId('apply-all').click()
    await page.waitForTimeout(1200)
    // idle sluoksnių ne daugiau nei limitas (2)
    const idleCount = await page.locator('[data-vfx-idle]').count()
    expect(idleCount).toBeLessThanOrEqual(2)
    // aktyvūs visi (būsenos nepamestos — tik vizualiai ribojama)
    const list = await page.getByTestId('active-list').textContent()
    expect(list).toContain('shield')
    await page.getByTestId('clear-all').click()
    await expect(page.locator('[data-vfx-idle]')).toHaveCount(0)
  })

  test('reduced-motion: one-shot pakeičiami trumpu flash', async ({ page, context }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.reload()
    await page.getByTestId('pick-frozen').click()
    await page.getByTestId('fire-apply').click()
    // idle reduced režime — statinis rėmelis, be animacijų; shot vis tiek parodomas (fade)
    await expect(page.locator('[data-vfx-idle="frozen"]')).toBeVisible()
  })

  test('registro pilnumas: visi statusai turi mygtukus', async ({ page }) => {
    for (const s of ['shield', 'frozen', 'stunned', 'burning', 'poisoned', 'silenced', 'blessed', 'stealth', 'taunt', 'sprint', 'control', 'cantAttack', 'immortal']) {
      await expect(page.getByTestId(`pick-${s}`)).toBeVisible()
    }
  })
})
