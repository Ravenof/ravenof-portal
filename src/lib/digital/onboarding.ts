// ── Digital onboarding būsena + starter kaladės turinys ───────────────────────
import { createClient } from '@/lib/supabase/client'

export type OnboardingState = 'anon' | 'pending' | 'done' | 'unknown'

/** Persistuota onboarding būsena (profiles.digital_onboarded_at).
 *  'unknown' — užklausa nepavyko (pvz. migracija dar nesuvesta): NIEKUR neredirectinam. */
export async function getOnboardingState(): Promise<OnboardingState> {
  const supabase = createClient()
  const { data } = await supabase.auth.getUser()
  const uid = data.user?.id
  if (!uid) return 'anon'
  const { data: p, error } = await supabase.from('profiles').select('digital_onboarded_at').eq('id', uid).maybeSingle()
  if (error) return 'unknown' // stulpelio dar nėra / tinklo klaida → fail-open (be softlock)
  return (p as { digital_onboarded_at?: string | null } | null)?.digital_onboarded_at ? 'done' : 'pending'
}

export type StarterCard = {
  cardId: string
  name: string
  imageUrl: string | null
  gold: number
  attack: number | null
  health: number | null
  effect: string | null
  isChampion: boolean
  quantity: number
  type: string | null
  rarity: string | null
  raritySort: number
  rarityColor: string | null
}

export async function getStarterDeckCards(starterId: string): Promise<StarterCard[] | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_get_starter_deck_cards', { p_id: starterId })
  if (error) { console.warn('[onboarding] cards:', error.message); return null }
  return ((data as { cards: StarterCard[] })?.cards) ?? []
}

export type FactionInfo = { id: number; name: string; colorHex: string | null; iconUrl: string | null }

export async function getFactions(): Promise<Record<number, FactionInfo>> {
  const supabase = createClient()
  const { data } = await supabase.from('factions').select('id, name, color_hex, icon_url')
  const out: Record<number, FactionInfo> = {}
  for (const f of (data as { id: number; name: string; color_hex: string | null; icon_url: string | null }[] | null) ?? []) {
    out[f.id] = { id: f.id, name: f.name, colorHex: f.color_hex, iconUrl: f.icon_url }
  }
  return out
}
