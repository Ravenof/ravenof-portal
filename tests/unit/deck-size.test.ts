// ── Kaladės dydžio taisyklė: 30–40 kortų (audit #2/#30) ─────────────────────
import { beforeAll, describe, expect, it } from 'vitest'
import { setLocale } from '@/lib/i18n/core'

// Testai tikrina LT (numatytąją produkto kalbą) — Node aplinkoje navigator
// grąžintų en, todėl kalbą nustatome aiškiai.
beforeAll(() => setLocale('lt', { explicit: true, syncProfile: false }))
import { DECK_MIN, DECK_MAX, isDeckSizeValid, validateDeck, formatDeckCount } from '@/lib/deck-validation'
import { deckValidity, type ActiveDeckInfo } from '@/lib/digital/activeDeck'
import type { DeckEntry, CardWithRelations } from '@/types'

const card = (id: string): CardWithRelations => ({
  id, name: `Card ${id}`, faction_id: 1, rarity_id: 6, gold_cost: 300,
} as unknown as CardWithRelations)

/** Sugeneruoja kaladę su n kortų (po 2 kopijas, paskutinė – likutis). */
function entries(n: number): DeckEntry[] {
  const out: DeckEntry[] = []
  let left = n, i = 0
  while (left > 0) {
    const qty = Math.min(2, left)
    out.push({ card: card(`c${i++}`), quantity: qty } as DeckEntry)
    left -= qty
  }
  return out
}

const sizeError = (n: number) =>
  validateDeck(entries(n), 1, 'Testinė kaladė').some((w) =>
    w.type === 'error' && (n < DECK_MIN || n > DECK_MAX))

const deckInfo = (cardCount: number): ActiveDeckInfo => ({
  id: 'd1', name: 'Test', faction: 'Varngradas', factionId: 1,
  factionIcon: null, factionColor: null, cardCount, missing: 0,
  boundAvatar: null, updatedAt: null,
})

describe('isDeckSizeValid — kanoninė 30–40 taisyklė', () => {
  it.each([
    [29, false],
    [30, true],
    [39, true],
    [40, true],
    [41, false],
    [58, false],
    [60, false],
  ])('%i kortų → valid=%s', (n, ok) => {
    expect(isDeckSizeValid(n)).toBe(ok)
  })

  it('0 ir neigiami — negalioja', () => {
    expect(isDeckSizeValid(0)).toBe(false)
    expect(isDeckSizeValid(-5)).toBe(false)
    expect(isDeckSizeValid(null)).toBe(false)
    expect(isDeckSizeValid(undefined)).toBe(false)
  })
})

describe('validateDeck — dydžio klaidos', () => {
  it.each([[29], [41], [58], [60]])('%i kortų kaladė turi dydžio klaidą', (n) => {
    const errs = validateDeck(entries(n), 1, 'Testas').filter((w) => w.type === 'error')
    expect(errs.length).toBeGreaterThan(0)
  })
  it.each([[30], [39], [40]])('%i kortų kaladė be klaidų', (n) => {
    const errs = validateDeck(entries(n), 1, 'Testas').filter((w) => w.type === 'error')
    expect(errs).toHaveLength(0)
  })
  it('sizeError helper sanity', () => {
    expect(sizeError(29)).toBe(true)
    expect(sizeError(30)).toBe(false)
  })
})

describe('deckValidity — kovos tinkamumas (naudoja PvE/PvP/Ranked)', () => {
  it.each([[29, false], [30, true], [39, true], [40, true], [41, false], [58, false], [60, false]])(
    '%i kortų → playable=%s', (n, ok) => {
      expect(deckValidity(deckInfo(n)).valid).toBe(ok)
    })
  it('trūkstamos kortos blokuoja net ir gerą dydį', () => {
    expect(deckValidity({ ...deckInfo(35), missing: 3 }).valid).toBe(false)
  })
})

describe('formatDeckCount — vienodas formatas', () => {
  it('39 → „39 kortos · leidžiama 30–40"', () => {
    expect(formatDeckCount(39)).toBe('39 kortos · leidžiama 30–40')
  })
  it('30 → „30 kortų · leidžiama 30–40"', () => {
    expect(formatDeckCount(30)).toBe('30 kortų · leidžiama 30–40')
  })
  it('1 → vienaskaita', () => {
    expect(formatDeckCount(1)).toBe('1 korta · leidžiama 30–40')
  })
  it('nebenaudojam „X/30" ar „X/40" formos', () => {
    expect(formatDeckCount(39)).not.toMatch(/39\s*\/\s*(30|40)/)
  })
})

describe('konstantos', () => {
  it('DECK_MIN=30, DECK_MAX=40', () => {
    expect(DECK_MIN).toBe(30)
    expect(DECK_MAX).toBe(40)
  })
})
