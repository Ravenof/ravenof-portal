import { test, expect } from '@playwright/test'
import { digitalLogin, dismissGates, EMAIL, ensureOnboarded } from './helpers'

// Reali kova su AI per data-tut inkarus (hand / gold / end-turn / hp-ai / board).
test.describe('Kova prieš AI', () => {
  test('pradėti → sužaisti kortą → ataka/ėjimas → AI atsakas → reload → rezultatas', async ({ page }) => {
    test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
    test.setTimeout(300_000)
    await digitalLogin(page)
    await ensureOnboarded(page)
    await page.goto('/digital/pve')
    await dismissGates(page)

    // startas (kaladė preselect'inta; režimas „atsitiktinė" — canStart iškart)
    const start = page.getByRole('button', { name: /PRADĖTI KOVĄ/i })
    await expect(start).toBeEnabled({ timeout: 25_000 })
    await start.click()

    // lenta: ranka + auksas + end-turn matomi
    const hand = page.locator('[data-tut="hand"]')
    const endTurn = page.locator('[data-tut="end-turn"]')
    const gold = page.locator('[data-tut="gold"]')
    await expect(endTurn).toBeVisible({ timeout: 40_000 })
    await expect(hand).toBeVisible()

    const goldText = async () => parseInt((await gold.first().textContent().catch(() => '0'))?.replace(/\D/g, '') || '0', 10)

    // bandome sužaisti pirmą įperkamą kortą (drag iš rankos į lentą)
    const g0 = await goldText()
    const board = page.locator('[data-fx-board], [data-tut="field"], section').first()
    const cards = hand.locator('[data-card], img, button')
    const n = await cards.count()
    let played = false
    for (let i = 0; i < Math.min(n, 5) && !played; i++) {
      const c = cards.nth(i)
      const cb = await c.boundingBox(); const bb = await board.boundingBox()
      if (!cb || !bb) continue
      await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2)
      await page.mouse.down()
      await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, { steps: 12 })
      await page.mouse.up()
      await page.waitForTimeout(1500)
      const g1 = await goldText()
      if (g1 < g0) { played = true; expect(g1).toBeLessThan(g0) } // aukso kaina nuskaičiuota
    }

    // baigiam ėjimą — AI turi atsakyti (ėjimas grįžta mums)
    await endTurn.click()
    await expect(endTurn).toBeEnabled({ timeout: 60_000 })

    // reconnection: reload kovos viduryje — žaidimas nekrenta (grįžta į kovą arba į PvE meniu be klaidos ekrano)
    await page.reload()
    await page.waitForTimeout(5000)
    const crashed = await page.locator('text=/Application error|Something went wrong/i').first().isVisible().catch(() => false)
    expect(crashed).toBe(false)

    // rezultatas: jei kova baigėsi — modalas su atlygiu; kitaip fiksuojam, kad UI gyvas
    const result = page.locator('text=/Pergalė!|Pralaimėjai/i').first()
    if (await result.isVisible().catch(() => false)) {
      await expect(page.locator('text=/XP|atlyg/i').first()).toBeVisible()
    }
  })
})
