// ══════════════════════════════════════════════════════════════════════════════
// GLOBALI AKTYVI KALADĖ — vienas autoritetinis šaltinis visam /digital.
// profiles.active_deck_id (serveris) + decks.bound_avatar (kaladės avataras).
// Zustand → visi ekranai (Home/PvE/Friendly/Ranked/modalas) mato tą patį,
// pakeitimas iš bet kur atsinaujina visur iškart (optimistic + revert).
// Validacija: 30 kortų + visos kortos turimos (missing=0).
// ══════════════════════════════════════════════════════════════════════════════
import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { t } from '@/lib/i18n/core'
import { DECK_MIN, DECK_MAX, isDeckSizeValid } from '@/lib/deck-validation'

export type DeckValidity = { valid: boolean; reason: string | null }
export type ActiveDeckInfo = {
  id: string
  name: string
  faction: string | null
  /** frakcijos ID – vertimams (content_translations owner_type='faction'). */
  factionId: number | null
  factionIcon: string | null
  factionColor: string | null
  cardCount: number
  missing: number
  boundAvatar: string | null
  updatedAt: string | null
}

export function deckValidity(d: ActiveDeckInfo | null | undefined): DeckValidity {
  // KANONINĖ žaidimo taisyklė: kaladė žaidžiama, jei (1) jos dydis 30–40 kortų
  // (žr. deck-validation.ts DECK_MIN/DECK_MAX) ir (2) visos kortos turimos
  // kolekcijoje (missing=0). Tas pats tikrinimas vykdomas ir serveryje
  // (migr. 20260856_deck_size_enforcement) — UI čia tik atspindi taisyklę.
  if (!d) return { valid: false, reason: t('decks.validity.noActive') }
  if (d.cardCount === 0) return { valid: false, reason: t('decks.validity.empty') }
  if (d.cardCount < DECK_MIN) return { valid: false, reason: t('decks.validity.tooSmall', { count: d.cardCount, min: DECK_MIN, max: DECK_MAX }) }
  if (d.cardCount > DECK_MAX) return { valid: false, reason: t('decks.validity.tooLarge', { count: d.cardCount, min: DECK_MIN, max: DECK_MAX }) }
  if (d.missing > 0) return { valid: false, reason: t('decks.validity.missingCards', { count: d.missing }) }
  return { valid: true, reason: null }
}

/** Ar kaladę galima aktyvuoti / naudoti kovai (dydis + kolekcija). */
export function isDeckPlayable(d: ActiveDeckInfo | null | undefined): boolean {
  return deckValidity(d).valid
}
export { isDeckSizeValid }

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
        const [{ data: prof }, { data: rows }, { data: col }] = await Promise.all([
          supabase.from('profiles').select('active_deck_id, role').eq('id', user.id).maybeSingle(),
          supabase.from('decks').select('id, name, card_count, bound_avatar, updated_at, faction:factions ( id, name, icon_url, color_hex )')
            .eq('user_id', user.id).not('name', 'ilike', '[Kampanija]%').order('updated_at', { ascending: false }),
          supabase.from('user_collections').select('card_id, quantity').eq('user_id', user.id),
        ])
        const deckIds = (((rows as unknown as { id: string }[]) ?? [])).map((d) => d.id)
        // deck_cards — TIK šio vartotojo kaladėms (anksčiau traukta viskas, ką RLS leidžia,
        // ir svetimų viešų kaladžių eilutės teršdavo missingMap).
        const { data: dc } = deckIds.length
          ? await supabase.from('deck_cards').select('deck_id, card_id, quantity, is_side_deck').in('deck_id', deckIds)
          : { data: [] as { deck_id: string; card_id: string; quantity: number }[] }
        // Tester/admin gali žaisti su bet kokia kalade, net jei kortų kolekcijoje nėra (kaip senas PvE filtras)
        const tester = ['tester', 'admin'].includes((prof as { role?: string } | null)?.role ?? '')
        const owned: Record<string, number> = Object.fromEntries(((col as { card_id: string; quantity: number }[]) ?? []).map((r) => [r.card_id, r.quantity]))
        const missingMap: Record<string, number> = {}
        const mainCountMap: Record<string, number> = {}
        for (const r of ((dc as { deck_id: string; card_id: string; quantity: number; is_side_deck?: boolean | null }[]) ?? [])) {
          const have = owned[r.card_id] ?? 0
          if (have < r.quantity) missingMap[r.deck_id] = (missingMap[r.deck_id] ?? 0) + (r.quantity - have)
          if (!r.is_side_deck) mainCountMap[r.deck_id] = (mainCountMap[r.deck_id] ?? 0) + r.quantity
        }
        type Row = { id: string; name: string; card_count: number | null; bound_avatar: string | null; updated_at: string | null; faction: { id: number; name: string; icon_url: string | null; color_hex: string | null } | null }
        const decks: ActiveDeckInfo[] = (((rows as unknown as Row[]) ?? [])).map((d) => ({
          id: d.id, name: d.name,
          faction: d.faction?.name ?? null, factionId: d.faction?.id ?? null,
          factionIcon: d.faction?.icon_url ?? null, factionColor: d.faction?.color_hex ?? null,
          // Tikras pagrindinės kalados dydis iš deck_cards (card_count stulpelis gali būti pasenęs)
          cardCount: mainCountMap[d.id] ?? d.card_count ?? 0, missing: tester ? 0 : (missingMap[d.id] ?? 0),
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
    // Netinkamos kalados (dydis / trūkstamos kortos) neaktyvuojamos — serveris irgi atmes.
    const target = get().decks.find((d) => d.id === deckId)
    if (target && !deckValidity(target).valid) return { ok: false }
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
