import { test, expect } from '@playwright/test'

// Neprisijungus — visi apsaugoti /digital keliai veda į /digital/login su next.
const PROTECTED = ['/digital', '/digital/collection', '/digital/decks', '/digital/more', '/digital/onboarding']

test.describe('Route guard (neprisijungus)', () => {
  for (const route of PROTECTED) {
    test(`${route} → /digital/login`, async ({ page }) => {
      await page.goto(route)
      await page.waitForURL(/\/digital\/login/, { timeout: 20_000 })
      // login puslapis realiai užsikrauna (ne amžinas „Kraunama…")
      await expect(page.getByRole('button', { name: /Prisijungti/ })).toBeVisible()
      if (route !== '/digital/onboarding') {
        expect(page.url()).toContain(`next=${encodeURIComponent(route)}`)
      }
    })
  }

  test('auth puslapiai pasiekiami anonimui be loop', async ({ page }) => {
    for (const r of ['/digital/login', '/digital/register', '/digital/forgot-password']) {
      await page.goto(r)
      await page.waitForTimeout(2500)
      expect(page.url()).toContain(r)
    }
  })
})
