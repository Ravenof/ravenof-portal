// ── Starter kaladės (kliento RPC apvalkalai) ──────────────────────────────────
import { createClient } from '@/lib/supabase/client'
import { tContent, loadContentTranslations } from '@/lib/i18n/content'

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
  deckId: string | null
}

export async function getStarterDecks(): Promise<StarterDeck[]> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_get_starter_decks')
  if (error) { console.warn('[starter] get:', error.message); return [] }
  // Dėžutės paveikslėlis gali turėti kalbos variantą (content_translations: starter_deck / <id> / image_url)
  await loadContentTranslations()
  return (((data as { decks: StarterDeck[] })?.decks) ?? []).map((d) => ({ ...d, imageUrl: tContent('starter_deck', d.id, 'image_url', d.imageUrl) || null }))
}

export async function claimStarterDeck(id: string): Promise<{ ok: true; deckId: string } | { error: string }> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_claim_starter_deck', { p_id: id })
  if (error) return { error: error.message }
  return data as { ok: true; deckId: string }
}
