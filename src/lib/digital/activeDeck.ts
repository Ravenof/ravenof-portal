// ══════════════════════════════════════════════════════════════════════════════
// GLOBALI AKTYVI KALADĖ — vienas autoritetinis šaltinis visam /digital.
// profiles.active_deck_id (serveris) + decks.bound_avatar (kaladės avataras).
// Zustand → visi ekranai (Home/PvE/Friendly/Ranked/modalas) mato tą patį,
// pakeitimas iš bet kur atsinaujina visur iškart (optimistic + revert).
// Validacija: 30 kortų + visos kortos turimos (missing=0).
// ══════════════════════════════════════════════════════════════════════════════
import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'

export type DeckValidity = { valid: boolean; reason: string | null }
export type ActiveDeckInfo = {
  id: string
  name: string
  faction: string | null
  factionIcon: string | null
  factionColor: string | null
  cardCount: number
  missing: number
  boundAvatar: string | null
  updatedAt: string | null
}

export function deckValidity(d: ActiveDeckInfo | null | undefined): DeckValidity {
  if (!d) return { valid: false, reason: 'Nepasirinkta aktyvi kaladė' }
  if (d.cardCount < 30) return { valid: false, reason: `Per mažai kortų (${d.cardCount}/30)` }
  if (d.cardCount > 30) return { valid: false, reason: `Per daug kortų (${d.cardCount}/30)` }
  if (d.missing > 0) return { valid: false, reason: `Trūksta ${d.missing} kortų kolekcijoje` }
  return { valid: true, reason: null }
}

type ActiveDeckState = {
  loaded: boolean
  loading: boolean
  error: boolean
  activeDeckId: string | null
  decks: ActiveDeckInfo[]
  refresh: () => Promise<void>
  setActive: (deckId: string) => Promise<{ ok: boolean }>
  setDeckAvatar: (deckId: string, avatarId: string | null) => Promise<{ ok: boolean }>
}

let inflight: Promise<void> | null = null

export const useActiveDeck = create<ActiveDeckState>((set, get) => ({
  loaded: false,
  loading: false,
  error: false,
  activeDeckId: null,
  decks: [],

  refresh: async () => {
    if (inflight) return inflight
    set({ loading: true })
    inflight = (async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { set({ loaded: true, loading: false, decks: [], activeDeckId: null }); return }
        const tester = false
        const [{ data: prof }, { data: rows }, { data: dc }, { data: col }] = await Promise.all([
          supabase.from('profiles').select('active_deck_id').eq('id', user.id).maybeSingle(),
          supabase.from('decks').select('id, name, card_count, bound_avatar, updated_at, faction:factions ( name, icon_url, color_hex )')
            .eq('user_id', user.id).not('name', 'ilike', '[Kampanija]%').order('updated_at', { ascending: false }),
          supabase.from('deck_cards').select('deck_id, card_id, quantity').eq('is_side_deck', false),
          supabase.from('user_collections').select('card_id, quantity').eq('user_id', user.id),
        ])
        const owned: Record<string, number> = Object.fromEntries(((col as { card_id: string; quantity: number }[]) ?? []).map((r) => [r.card_id, r.quantity]))
        const missingMap: Record<string, number> = {}
        for (const r of ((dc as { deck_id: string; card_id: string; quantity: number }[]) ?? [])) {
          const have = owned[r.card_id] ?? 0
          if (have < r.quantity) missingMap[r.deck_id] = (missingMap[r.deck_id] ?? 0) + (r.quantity - have)
        }
        type Row = { id: string; name: string; card_count: number | null; bound_avatar: string | null; updated_at: string | null; faction: { name: string; icon_url: string | null; color_hex: string | null } | null }
        const decks: ActiveDeckInfo[] = (((rows as unknown as Row[]) ?? [])).map((d) => ({
          id: d.id, name: d.name,
          faction: d.faction?.name ?? null, factionIcon: d.faction?.icon_url ?? null, factionColor: d.faction?.color_hex ?? null,
          cardCount: d.card_count ?? 0, missing: tester ? 0 : (missingMap[d.id] ?? 0),
          boundAvatar: d.bound_avatar ?? null, updatedAt: d.updated_at,
        }))
        let activeDeckId = (prof as { active_deck_id?: string | null } | null)?.active_deck_id ?? null
        if (activeDeckId && !decks.some((d) => d.id === activeDeckId)) activeDeckId = null // ištrinta kaladė
        set({ loaded: true, loading: false, error: false, decks, activeDeckId })
      } catch (e) {
        console.warn('[activeDeck] refresh:', e)
        set({ loaded: true, loading: false, error: true })
      } finally { inflight = null }
    })()
    return inflight
  },

  setActive: async (deckId) => {
    const prev = get().activeDeckId
    if (prev === deckId) return { ok: true }
    set({ activeDeckId: deckId }) // optimistic — visi ekranai atsinaujina iškart
    const { error } = await createClient().rpc('rvn_set_active_deck', { p_deck: deckId })
    if (error) { console.warn('[activeDeck] set:', error.message); set({ activeDeckId: prev }); return { ok: false } }
    return { ok: true }
  },

  setDeckAvatar: async (deckId, avatarId) => {
    const prevDecks = get().decks
    set({ decks: prevDecks.map((d) => (d.id === deckId ? { ...d, boundAvatar: avatarId } : d)) })
    const { error } = await createClient().rpc('rvn_set_deck_avatar', { p_deck: deckId, p_avatar: avatarId })
    if (error) { console.warn('[activeDeck] avatar:', error.message); set({ decks: prevDecks }); return { ok: false } }
    return { ok: true }
  },
}))

export function activeDeckOf(s: { activeDeckId: string | null; decks: ActiveDeckInfo[] }): ActiveDeckInfo | null {
  return s.decks.find((d) => d.id === s.activeDeckId) ?? null
}
