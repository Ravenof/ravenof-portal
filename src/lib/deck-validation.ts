import type { DeckEntry, CardWithRelations } from '@/types'

export const NEUTRAL_FACTION_ID = 14   // "Universalus"
export const DECK_MIN = 30
export const DECK_MAX = 40

/** Copy limit pagal rarity id */
export const RARITY_COPY_LIMIT: Record<number, number> = {
  6:  2, // Paprastas
  7:  2, // Magiškas
  8:  2, // Unikalus
  9:  1, // Epiškas
  10: 1, // Legendinis
}

export function getCopyLimit(card: CardWithRelations): number {
  if (!card.rarity_id) return 2
  return RARITY_COPY_LIMIT[card.rarity_id] ?? 2
}

export function canAddCard(
  card: CardWithRelations,
  entries: DeckEntry[],
  factionId: number | null,
): { ok: boolean; reason?: string } {
  // Faction lock
  if (factionId !== null) {
    const cf = card.faction_id
    if (cf !== factionId && cf !== NEUTRAL_FACTION_ID) {
      return { ok: false, reason: 'Korta nepriklauso šiai frakcijai' }
    }
  }

  const existing = entries.find((e) => e.card.id === card.id)
  const currentQty = existing?.quantity ?? 0
  const limit = getCopyLimit(card)

  if (currentQty >= limit) {
    return { ok: false, reason: `Maksimumas ${limit} kopiją (-ų) šiai kortai` }
  }

  const totalCards = entries.reduce((s, e) => s + e.quantity, 0)
  if (totalCards >= DECK_MAX) {
    return { ok: false, reason: `Deck negali turėti daugiau nei ${DECK_MAX} kortų` }
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
    warnings.push({ type: 'error', message: 'Deck turi turėti pavadinimą' })
  }
  if (!factionId) {
    warnings.push({ type: 'error', message: 'Pasirink deck frakciją' })
  }
  if (total < DECK_MIN) {
    warnings.push({ type: 'error', message: `Deck turi bent ${DECK_MIN} kortų (dabar: ${total})` })
  }
  if (total > DECK_MAX) {
    warnings.push({ type: 'error', message: `Deck negali turėti daugiau nei ${DECK_MAX} kortų (dabar: ${total})` })
  }

  // Copy limit violations
  for (const entry of entries) {
    const limit = getCopyLimit(entry.card)
    if (entry.quantity > limit) {
      warnings.push({
        type: 'error',
        message: `"${entry.card.name}": per daug kopijų (${entry.quantity}/${limit})`,
      })
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
