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
