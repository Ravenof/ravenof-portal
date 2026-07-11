import { test, expect } from '@playwright/test'
import { digitalLogin, ensureOnboarded, EMAIL } from './helpers'

test.describe('Draugai + globalus chat', () => {
  test('friends puslapis: presence juosta, 3 panelės, paieška/filtras', async ({ page }) => {
    test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
    await digitalLogin(page)
    await ensureOnboarded(page)
    await page.goto('/digital/friends')
    // savo presence pasirinkimas
    for (const s of ['auto', 'away', 'dnd', 'hidden']) await expect(page.getByTestId(`presence-${s}`)).toBeVisible({ timeout: 20_000 })
    // Nematomas režimas rodo paaiškinimą savininkui
    await page.getByTestId('presence-hidden').click()
    await expect(page.getByText(/Kiti mato tave neprisijungusį/)).toBeVisible()
    await page.getByTestId('presence-auto').click()
    // panelės
    await expect(page.getByText('Pridėti draugą').first()).toBeVisible()
    await expect(page.getByText(/Draugai \(/)).toBeVisible()
    await expect(page.getByText('Paskutiniai pokalbiai')).toBeVisible()
    // paieška + filtras egzistuoja
    await expect(page.getByLabel('Ieškoti draugų')).toBeVisible()
    await expect(page.getByLabel('Filtruoti pagal būseną')).toBeVisible()
  })

  test('pridėti neegzistuojantį draugą → aiški klaida (išnyksta pati)', async ({ page }) => {
    test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
    await digitalLogin(page)
    await ensureOnboarded(page)
    await page.goto('/digital/friends')
    await page.locator('#friend-uname-input').fill('neegzistuoja_e2e_xyz')
    await page.getByRole('button', { name: /Pridėti/ }).click()
    await expect(page.locator('[role="status"]')).toBeVisible({ timeout: 15_000 })
  })

  test('chat sluoksnis nerodomas anonimui', async ({ page }) => {
    await page.goto('/digital/login')
    await page.waitForTimeout(2500)
    expect(await page.getByTestId('chat-stack').count()).toBe(0)
  })

  test('chat UI prefs persist per localStorage', async ({ page }) => {
    test.skip(!EMAIL, 'reikia E2E_TEST_EMAIL/PASSWORD')
    await digitalLogin(page)
    await page.evaluate(() => localStorage.setItem('rvn-chat-ui', JSON.stringify({ side: 'left', yPct: 20, soundOn: false, previewsOn: true, enabled: true, muted: [] })))
    await page.reload()
    const prefs = await page.evaluate(() => JSON.parse(localStorage.getItem('rvn-chat-ui') ?? '{}'))
    expect(prefs.side).toBe('left')
    expect(prefs.soundOn).toBe(false)
  })
})
