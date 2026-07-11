import { expect, type Page } from '@playwright/test'

export const EMAIL = process.env.E2E_TEST_EMAIL ?? ''
export const PASSWORD = process.env.E2E_TEST_PASSWORD ?? ''

export function requireCreds() {
  if (!EMAIL || !PASSWORD) throw new Error('Nustatyk E2E_TEST_EMAIL ir E2E_TEST_PASSWORD aplinkos kintamuosius.')
}

/** Prisijungia per /digital/login. Grąžina galutinį URL. */
export async function digitalLogin(page: Page, next?: string): Promise<string> {
  requireCreds()
  await page.goto(`/digital/login${next ? `?next=${encodeURIComponent(next)}` : ''}`)
  await page.getByLabel('El. paštas').fill(EMAIL)
  await page.getByLabel('Slaptažodis', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: /Prisijungti/ }).click()
  // laukiam: arba paliekam login puslapį, arba matoma klaida (aiškus fail vietoj timeout)
  const alert = page.locator('[role="alert"]:not(#__next-route-announcer__)')
  await Promise.race([
    page.waitForURL((u) => !u.pathname.includes('/digital/login'), { timeout: 30_000 }),
    alert.waitFor({ state: 'visible', timeout: 30_000 }).then(async () => {
      throw new Error(`Prisijungimas nepavyko: ${(await alert.textContent())?.trim()} — patikrink E2E_TEST_EMAIL/PASSWORD (paskyra turi egzistuoti su patvirtintu el. paštu).`)
    }),
  ])
  return page.url()
}

/** Uždaro galimus onboarding/download/welcome popup'us, jei jie pasirodo. */
export async function dismissGates(page: Page) {
  for (const label of ['Tęsti be atsisiuntimo', 'Praleisti', 'Uždaryti', 'Vėliau']) {
    const b = page.getByRole('button', { name: new RegExp(label, 'i') }).first()
    if (await b.isVisible().catch(() => false)) await b.click().catch(() => {})
  }
}

/** Elementas pilnai matomas viewport'e (svarbiausi CTA niekada už ekrano). */
export async function expectFullyInViewport(page: Page, locator: ReturnType<Page['locator']>) {
  const box = await locator.boundingBox()
  expect(box, 'elementas turi turėti boundingBox').toBeTruthy()
  const vp = page.viewportSize()!
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.y + box!.height).toBeLessThanOrEqual(vp.height + 1)
  expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width + 1)
}

/** Puslapis neturi page-level vertikalaus scroll. */
export async function expectNoPageScroll(page: Page) {
  const { sh, ih } = await page.evaluate(() => ({ sh: document.documentElement.scrollHeight, ih: window.innerHeight }))
  expect(sh, 'be vertikalaus puslapio scroll').toBeLessThanOrEqual(ih + 4)
}
