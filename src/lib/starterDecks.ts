// ── Starter kaladės (kliento RPC apvalkalai) ──────────────────────────────────
import { createClient } from '@/lib/supabase/client'

export type StarterDeck = {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  priceGold: number
  faction: string | null
  factionId: number | null
  cardCount: number
  claimed: boolean
}

export async function getStarterDecks(): Promise<StarterDeck[]> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_get_starter_decks')
  if (error) { console.warn('[starter] get:', error.message); return [] }
  return ((data as { decks: StarterDeck[] })?.decks) ?? []
}

export async function claimStarterDeck(id: string): Promise<{ ok: true; deckId: string } | { error: string }> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_claim_starter_deck', { p_id: id })
  if (error) return { error: error.message }
  return data as { ok: true; deckId: string }
}
