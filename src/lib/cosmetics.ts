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
