// ── Kosmetika + dienos kortų pasiūlymas (kliento RPC apvalkalai) ──────────────
import { createClient } from '@/lib/supabase/client'

export type CosmeticKind = 'card_back' | 'board' | 'avatar'

export type Cosmetic = {
  id: string
  kind: CosmeticKind
  name: string
  description: string | null
  priceGold: number
  css: string | null
  emoji: string | null
  imageUrl: string | null
  rarity?: 'common' | 'rare' | 'epic' | 'legendary' | null
  ownedByDefault?: boolean
  videos?: string[]
  portraitFit?: { x: number; y: number; zoom: number } | null
}

export type CosmeticsState = {
  items: Cosmetic[]
  owned: string[]
  equippedCardBack: string | null
  equippedBoard: string | null
  equippedAvatar: string | null
}

export async function getCosmetics(): Promise<CosmeticsState | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_get_cosmetics')
  if (error) { console.warn('[cosmetics] get:', error.message); return null }
  return (data as CosmeticsState) ?? null
}

// ── Kovos skins: pasirinkta nugarėlė + lentos fonas (sessionStorage cache,
//    kad kova gautų skins iškart be RPC laukimo) ─────────────────────────────
export type SkinVisual = { url: string | null; css: string | null }
export type BattleSkins = { cardBack: SkinVisual | null; board: SkinVisual | null }
const SKINS_KEY = 'rvn-battle-skins'

export function cachedBattleSkins(): BattleSkins | null {
  try { const c = sessionStorage.getItem(SKINS_KEY); return c ? (JSON.parse(c) as BattleSkins) : null } catch { return null }
}

export async function getEquippedBattleSkins(): Promise<BattleSkins> {
  const st = await getCosmetics()
  const find = (id: string | null): SkinVisual | null => {
    if (!id || !st) return null
    const it = st.items.find((i) => i.id === id)
    if (!it || (!it.imageUrl && !it.css)) return null
    return { url: it.imageUrl ?? null, css: it.css ?? null }
  }
  const out: BattleSkins = { cardBack: find(st?.equippedCardBack ?? null), board: find(st?.equippedBoard ?? null) }
  try { sessionStorage.setItem(SKINS_KEY, JSON.stringify(out)) } catch { /* */ }
  return out
}

export async function buyCosmetic(id: string): Promise<{ ok: true; gold: number } | { error: string }> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_buy_cosmetic', { p_id: id })
  if (error) return { error: error.message }
  return data as { ok: true; gold: number }
}

export async function equipCosmetic(kind: CosmeticKind, id: string | null): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.rpc('rvn_equip_cosmetic', { p_kind: kind, p_id: id })
  if (error) { console.warn('[cosmetics] equip:', error.message); return false }
  return true
}

export type DealCard = {
  id: string
  name: string
  imageUrl: string | null
  rarity: string | null
  rarityColor: string | null
  sortOrder: number | null
  faction: string | null
  priceGold: number
  bought: boolean
}

export type DailyDeal = { date: string; cards: DealCard[] }

export async function getDailyDeal(): Promise<DailyDeal | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_get_daily_deal')
  if (error) { console.warn('[deal] get:', error.message); return null }
  return (data as DailyDeal) ?? null
}

export async function buyDailyDealCard(cardId: string): Promise<{ ok: true; gold: number } | { error: string }> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_buy_daily_deal_card', { p_card_id: cardId })
  if (error) return { error: error.message }
  return data as { ok: true; gold: number }
}

// ── Avatar audio (battle balsai) ─────────────────────────────────────────────
export type AvatarAudioEvent = 'fightStart' | 'hit' | 'defeat' | 'victory' | 'spellCast' | 'lowHp' | 'selected'
export type AvatarAudioClip = { url: string; weight: number }
/** { [cosmeticId]: { [eventType]: AvatarAudioClip[] } } */
export type AvatarAudioMap = Record<string, Partial<Record<AvatarAudioEvent, AvatarAudioClip[]>>>

/** Battle pradžioje – paimam friendly+enemy avatarų garsus vienu RPC. */
export async function getAvatarAudio(ids: (string | null | undefined)[]): Promise<AvatarAudioMap> {
  const clean = Array.from(new Set(ids.filter((x): x is string => !!x)))
  if (clean.length === 0) return {}
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_get_avatar_audio', { p_ids: clean })
  if (error) { console.warn('[avatar audio] get:', error.message); return {} }
  return (data as AvatarAudioMap) ?? {}
}
