// ── Sezono kelias (kliento RPC apvalkalai) ────────────────────────────────────
import { createClient } from '@/lib/supabase/client'

export type PassTier = {
  tier: number
  xpRequired: number
  title: string
  reward: Record<string, unknown>
}

export type SeasonPass = {
  season: { id: string; title: string; endsAt: string | null } | null
  xp: number
  claimedTiers: number[]
  tiers: PassTier[]
}

export async function getSeasonPass(): Promise<SeasonPass | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_get_season_pass')
  if (error) { console.warn('[pass] get:', error.message); return null }
  return (data as SeasonPass) ?? null
}

export async function claimPassTier(tier: number): Promise<{ ok: true; reward: Record<string, unknown> } | { error: string }> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_claim_pass_tier', { p_tier: tier })
  if (error) return { error: error.message }
  return data as { ok: true; reward: Record<string, unknown> }
}
