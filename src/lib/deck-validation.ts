import type { DeckEntry, CardWithRelations } from '@/types'
import { containsProfanity } from '@/lib/profanity'
import { t } from '@/lib/i18n/core'

export const NEUTRAL_FACTION_ID = 14   // "Universalus"
export const DECK_MIN = 30
export const DECK_MAX = 40
export const SIDE_DECK_MAX = 20   // Demonų prakeiksmų side deck

/** Copy limit pagal rarity id */
export const RARITY_COPY_LIMIT: Record<number, number> = {
  6:  2, // Paprastas
  7:  2, // Magiskas
  8:  2, // Unikalus
  9:  1, // Episkas
  10: 1, // Legendinis
}

export function getCopyLimit(card: CardWithRelations): number {
  if (!card.rarity_id) return 2
  return RARITY_COPY_LIMIT[card.rarity_id] ?? 2
}

/** Ar korta yra prakeiksmas (deda į side deck, ne į pagrindinę kaladę). */
export function isCurseCard(card: CardWithRelations): boolean {
  return /prakeik|curse/i.test(card.card_type?.name ?? '')
}

/** Ar galima pridėti prakeiksmą į side deck'ą. */
export function canAddSideCard(
  card: CardWithRelations,
  sideEntries: DeckEntry[],
): { ok: boolean; reason?: string } {
  if (!isCurseCard(card)) {
    return { ok: false, reason: t('deckBuilder.v.sideOnlyCurses') }
  }
  const existing = sideEntries.find((e) => e.card.id === card.id)
  const currentQty = existing?.quantity ?? 0
  const limit = getCopyLimit(card)
  if (currentQty >= limit) {
    return { ok: false, reason: t('deckBuilder.v.copyLimit', { limit }) }
  }
  const total = sideEntries.reduce((s, e) => s + e.quantity, 0)
  if (total >= SIDE_DECK_MAX) {
    return { ok: false, reason: t('deckBuilder.v.sideMax', { max: SIDE_DECK_MAX }) }
  }
  return { ok: true }
}

export function canAddCard(
  card: CardWithRelations,
  entries: DeckEntry[],
  factionId: number | null,
): { ok: boolean; reason?: string } {
  // Prakeiksmai į pagrindinę kaladę nededami – jie eina į atskirą side deck'ą
  if (isCurseCard(card)) {
    return { ok: false, reason: t('deckBuilder.v.cursesGoSide') }
  }

  // Faction lock
  if (factionId !== null) {
    const cf = card.faction_id
    if (cf !== factionId && cf !== NEUTRAL_FACTION_ID) {
      return { ok: false, reason: t('deckBuilder.v.wrongFaction') }
    }
  }

  const existing = entries.find((e) => e.card.id === card.id)
  const currentQty = existing?.quantity ?? 0
  const limit = getCopyLimit(card)

  if (currentQty >= limit) {
    return { ok: false, reason: t('deckBuilder.v.copyLimit', { limit }) }
  }

  const totalCards = entries.reduce((s, e) => s + e.quantity, 0)
  if (totalCards >= DECK_MAX) {
    return { ok: false, reason: t('deckBuilder.v.deckMax', { max: DECK_MAX }) }
  }

  return { ok: true }
}

export type ValidationWarning = {
  type: 'error' | 'warning'
  message: string
}

export function validateDeck(
  entries: DeckEntry[],
  factionId: number | null,
  name: string,
): ValidationWarning[] {
  const warnings: ValidationWarning[] = []
  const total = entries.reduce((s, e) => s + e.quantity, 0)

  if (!name.trim()) {
    warnings.push({ type: 'error', message: t('deckBuilder.v.nameRequired') })
  } else if (containsProfanity(name)) {
    warnings.push({ type: 'error', message: t('deckBuilder.v.nameProfanity') })
  }
  if (!factionId) {
    warnings.push({ type: 'error', message: t('deckBuilder.v.pickFaction') })
  }
  if (total < DECK_MIN) {
    warnings.push({ type: 'error', message: t('deckBuilder.v.deckMin', { min: DECK_MIN, current: total }) })
  }
  if (total > DECK_MAX) {
    warnings.push({ type: 'error', message: t('deckBuilder.v.deckMaxNow', { max: DECK_MAX, current: total }) })
  }

  // Copy limit violations
  for (const entry of entries) {
    const limit = getCopyLimit(entry.card)
    if (entry.quantity > limit) {
      warnings.push({
        type: 'error',
        message: t('deckBuilder.v.tooManyCopies', { name: entry.card.name, qty: entry.quantity, limit }),
      })
    }
  }

  // Wrong faction cards (safety check in case deck was edited externally)
  if (factionId !== null) {
    for (const entry of entries) {
      const cf = entry.card.faction_id
      if (cf !== null && cf !== factionId && cf !== NEUTRAL_FACTION_ID) {
        warnings.push({
          type: 'error',
          message: t('deckBuilder.v.cardWrongFaction', { name: entry.card.name }),
        })
      }
    }
  }

  return warnings
}

export function isDeckValid(
  entries: DeckEntry[],
  factionId: number | null,
  name: string,
): boolean {
  return validateDeck(entries, factionId, name).filter((w) => w.type === 'error').length === 0
}
