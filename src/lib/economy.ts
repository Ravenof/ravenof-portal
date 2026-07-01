// ── Ravenof Digital ekonomika (klientas) — auksas + pakuotės ─────────────────
// Auksas/pirkimas tvarkomi per Supabase RPC (rvn_award_gold / rvn_buy_pack).

import { createClient } from '@/lib/supabase/client'
import type { AiDifficulty } from '@/lib/tutorial/ai'

export type GoldReason = 'pve_easy' | 'pve_normal' | 'pve_hard' | 'pvp_unranked'

export const PVE_REWARD: Record<AiDifficulty, number> = { easy: 10, normal: 20, hard: 50 }
export const PVP_REWARD = 100

export type Wallet = { gold: number; packs: number }

/** Aukso balansas + bendras turimų pakuočių skaičius. */
export async function getWallet(): Promise<Wallet | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const [g, inv] = await Promise.all([
    supabase.from('profiles').select('gold').eq('id', user.id).maybeSingle(),
    supabase.from('user_pack_inventory').select('quantity').eq('user_id', user.id),
  ])
  const gold = (g.data as { gold?: number } | null)?.gold ?? 0
  const packs = ((inv.data as { quantity: number }[]) ?? []).reduce((s, r) => s + (r.quantity ?? 0), 0)
  return { gold, packs }
}

/** Skiria auksą (client-trusted; serveris riboja sumą pagal priežastį). */
export async function awardGold(reason: GoldReason, amount: number): Promise<number | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_award_gold', { p_reason: reason, p_amount: amount })
  if (error) { console.warn('[economy] awardGold:', error.message); return null }
  return (data as number) ?? null
}

export type MatchXpMode = 'pve_easy' | 'pve_normal' | 'pve_hard' | 'pvp'
export type MatchXpResult = { xpGained: number; totalBefore: number; totalAfter: number }

/** Skiria kovos XP (PvE/PvP unranked). Grąžina prieš/po sumas level-up aptikimui. */
export async function reportMatchXp(won: boolean, mode: MatchXpMode): Promise<MatchXpResult | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_report_match', { p_won: won, p_mode: mode })
  if (error) { console.warn('[economy] reportMatchXp:', error.message); return null }
  const d = data as { xpGained?: number; totalBefore?: number; totalAfter?: number } | null
  if (!d) return null
  return { xpGained: d.xpGained ?? 0, totalBefore: d.totalBefore ?? 0, totalAfter: d.totalAfter ?? 0 }
}

/** Perka pakuotę už auksą. Grąžina naują balansą arba klaidą. */
export async function buyPack(packId: string): Promise<{ gold: number; packs: number } | { error: string }> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_buy_pack', { p_pack_id: packId })
  if (error) return { error: error.message }
  return data as { gold: number; packs: number }
}

/** Aktyvi (numatytoji) pakuotė parduotuvei. */
export async function getActivePack(): Promise<{ id: string; name: string; price_gold: number } | null> {
  const supabase = createClient()
  const { data } = await supabase.from('card_packs').select('id, name, price_gold').eq('is_active', true).order('sort_order').limit(1).maybeSingle()
  return (data as { id: string; name: string; price_gold: number } | null) ?? null
}

export type Pack = { id: string; name: string; description: string | null; price_gold: number; sort_order: number; image_url: string | null }

/** Visos aktyvios pakuotės (boosteriai) parduotuvei. */
export async function getActivePacks(): Promise<Pack[]> {
  const supabase = createClient()
  const { data } = await supabase.from('card_packs').select('id, name, description, price_gold, sort_order, image_url').eq('is_active', true).order('sort_order')
  return (data as Pack[]) ?? []
}

/** Vartotojo turimų pakuočių kiekiai pagal pack_id (tik qty>0). */
export async function getPackInventory(): Promise<Record<string, number>> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return {}
  const { data } = await supabase.from('user_pack_inventory').select('pack_id, quantity').eq('user_id', user.id).gt('quantity', 0)
  const out: Record<string, number> = {}
  for (const r of ((data as { pack_id: string; quantity: number }[]) ?? [])) out[r.pack_id] = r.quantity
  return out
}

export type OpenedCard = {
  id: string
  name: string
  image_url: string | null
  rarity: string | null
  rarity_color: string | null
  sort_order: number | null
  faction: string | null
}

/** Atplėšia pakuotę: RPC sunaudoja pakuotę ir grąžina kortų ID; detales paimam atskirai. */
export async function openPack(packId: string): Promise<OpenedCard[] | { error: string }> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_open_pack_v3', { p_pack_id: packId })
  if (error) return { error: error.message }
  const ids = (data as string[]) ?? []
  if (ids.length === 0) return []
  const { data: rows, error: e2 } = await supabase
    .from('cards')
    .select('id, name, image_url, faction:factions ( name ), rarity:rarities ( name, color_hex, sort_order )')
    .in('id', ids)
  if (e2) return { error: e2.message }
  type Row = { id: string; name: string; image_url: string | null; faction: { name: string } | null; rarity: { name: string; color_hex: string; sort_order: number } | null }
  const byId = new Map<string, Row>()
  for (const r of ((rows as unknown as Row[]) ?? [])) byId.set(r.id, r)
  const cards: OpenedCard[] = ids.map((id) => {
    const r = byId.get(id)
    return {
      id,
      name: r?.name ?? '?',
      image_url: r?.image_url ?? null,
      rarity: r?.rarity?.name ?? null,
      rarity_color: r?.rarity?.color_hex ?? null,
      sort_order: r?.rarity?.sort_order ?? null,
      faction: r?.faction?.name ?? null,
    }
  })
  cards.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))  // dažnos pirma, rečiausios paskutinės
  return cards
}
