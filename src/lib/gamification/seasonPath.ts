// ── Sezono kelias v2 (20 lygių, free + pass) — kliento RPC apvalkalai ────────
import { createClient } from '@/lib/supabase/client'

export type SeasonSide = { payload: Record<string, unknown>[]; claimed: boolean }
export type SeasonRow = { level: number; xpRequired: number; reached: boolean; free: SeasonSide; pass: SeasonSide }
export type SeasonPath = {
  season: { id: string; title: string; theme: string | null; endsAt: string | null }
  xp: number; level: number; levels: number; xpPerLevel: number; hasPass: boolean
  priceSilver: number; priceRubies: number; rows: SeasonRow[]
}

export async function getSeasonPath(): Promise<SeasonPath | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_get_season_path')
  if (error) { console.warn('[season] get:', error.message); return null }
  const d = data as (SeasonPath & { error?: string }) | null
  if (!d || d.error) return null
  return d
}

type Ok = { ok: true; payload?: Record<string, unknown>[] } | { error: string }
export async function claimSeasonReward(level: number, track: 'free' | 'pass'): Promise<Ok | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_claim_season_reward', { p_level: level, p_track: track })
  if (error) return { error: error.message }
  return (data ?? null) as Ok | null
}
export async function unlockSeasonPass(currency: 'silver' | 'rubies'): Promise<Ok | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_unlock_season_pass', { p_currency: currency })
  if (error) return { error: error.message }
  return (data ?? null) as Ok | null
}
