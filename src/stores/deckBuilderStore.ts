'use client'

import { create } from 'zustand'
import type { DeckEntry, CardWithRelations, DeckVisibility } from '@/types'
import { canAddCard, getCopyLimit, DECK_MAX } from '@/lib/deck-validation'
import { playCardPlace, playCardPick, playError, playUiClick } from '@/lib/ui-sound'

type DeckBuilderStore = {
  // State
  deckId:      string | null   // null = new deck
  name:        string
  description: string
  factionId:   number | null
  visibility:  DeckVisibility
  entries:     DeckEntry[]
  ownedOnly:   boolean
  isDirty:     boolean
  isSaving:    boolean

  // Computed helpers
  totalCards:  () => number
  avgGold:     () => number

  // Actions
  initNew:     () => void
  loadExisting:(deckId: string, name: string, description: string, factionId: number | null, visibility: DeckVisibility, entries: DeckEntry[]) => void
  setName:     (name: string) => void
  setDescription:(desc: string) => void
  setFaction:  (factionId: number | null) => void
  setVisibility:(v: DeckVisibility) => void
  setOwnedOnly:(v: boolean) => void
  addCard:     (card: CardWithRelations) => { ok: boolean; reason?: string }
  removeCard:  (cardId: string) => void
  setQuantity: (cardId: string, qty: number) => void
  clearDeck:   () => void
  markSaved:   (deckId: string) => void
  setIsSaving: (v: boolean) => void
}

export const useDeckBuilderStore = create<DeckBuilderStore>((set, get) => ({
  deckId:      null,
  name:        'Nauja kaladė',
  description: '',
  factionId:   null,
  visibility:  'private',
  entries:     [],
  ownedOnly:   false,
  isDirty:     false,
  isSaving:    false,

  totalCards: () => get().entries.reduce((s, e) => s + e.quantity, 0),

  avgGold: () => {
    const { entries } = get()
    const total = entries.reduce((s, e) => s + e.quantity, 0)
    if (total === 0) return 0
    const sum = entries.reduce((s, e) => s + (e.card.gold_cost ?? 0) * e.quantity, 0)
    return Math.round(sum / total)
  },

  initNew: () => set({
    deckId: null, name: 'Nauja kaladė', description: '',
    factionId: null, visibility: 'private',
    entries: [], ownedOnly: false, isDirty: false, isSaving: false,
  }),

  loadExisting: (deckId, name, description, factionId, visibility, entries) =>
    set({ deckId, name, description, factionId, visibility, entries, isDirty: false }),

  setName:        (name)       => set({ name, isDirty: true }),
  setDescription: (description)=> set({ description, isDirty: true }),
  setFaction:     (factionId)  => set({ factionId, entries: [], isDirty: true }),
  setVisibility:  (visibility) => set({ visibility, isDirty: true }),
  setOwnedOnly:   (ownedOnly)  => set({ ownedOnly }),
  setIsSaving:    (isSaving)   => set({ isSaving }),

  addCard: (card) => {
    const { entries, factionId } = get()
    const result = canAddCard(card, entries, factionId)
    if (!result.ok) { playError(); return result }

    const idx = entries.findIndex((e) => e.card.id === card.id)
    if (idx >= 0) {
      const next = entries.map((e, i) =>
        i === idx ? { ...e, quantity: e.quantity + 1 } : e
      )
      set({ entries: next, isDirty: true })
    } else {
      set({ entries: [...entries, { card, quantity: 1 }], isDirty: true })
    }
    playCardPlace()
    return { ok: true }
  },

  removeCard: (cardId) => {
    playCardPick()
    set((s) => ({
      entries: s.entries.filter((e) => e.card.id !== cardId),
      isDirty: true,
    }))
  },

  setQuantity: (cardId, qty) => {
    if (qty <= 0) {
      get().removeCard(cardId)
      return
    }
    const limit = getCopyLimit(get().entries.find((e) => e.card.id === cardId)!.card)
    const capped = Math.min(qty, limit, DECK_MAX)
    playUiClick()
    set((s) => ({
      entries: s.entries.map((e) => e.card.id === cardId ? { ...e, quantity: capped } : e),
      isDirty: true,
    }))
  },

  clearDeck: () => set({ entries: [], isDirty: true }),

  markSaved: (deckId) => set({ deckId, isDirty: false }),
}))
