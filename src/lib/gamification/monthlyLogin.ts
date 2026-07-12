// ── Mėnesio prisijungimo kalendorius (kliento RPC apvalkalai) ────────────────
import { createClient } from '@/lib/supabase/client'
import { t as tGlobal } from '@/lib/i18n/core'

export type LoginRewardItem = Record<string, unknown>
export type MonthlyDay = { day: number; payload: LoginRewardItem[]; milestone: boolean }
export type MonthlyLoginState = {
  monthKey: string; month: number; year: number; daysInMonth: number
  claimedDays: number[]; claimedToday: boolean; nextDay: number; rewards: MonthlyDay[]
}

export async function getMonthlyLogin(): Promise<MonthlyLoginState | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_get_monthly_login')
  if (error) { console.warn('[login] get:', error.message); return null }
  const d = data as (MonthlyLoginState & { error?: string }) | null
  if (!d || d.error) return null
  return d
}

export type ClaimResult = { claimedDay: number; payload: LoginRewardItem[] } | { error: string }
export async function claimMonthlyLogin(): Promise<ClaimResult | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_claim_monthly_login')
  if (error) return { error: error.message }
  return (data ?? null) as ClaimResult | null
}

/** Payload elementą paverčia trumpu {icon,label}. */
export function rewardChip(it: LoginRewardItem): { icon: string; label: string } {
  const t = it.type as string
  if (t === 'season_xp') return { icon: '🏵️', label: tGlobal('quests.monthly.seasonXp', { amount: it.amount as number }) }
  if (t === 'currency') {
    const c = it.currency as string
    const icon = c === 'silver' ? '🥈' : c === 'rubies' ? '💎' : '🔮'
    return { icon, label: `${it.amount}` }
  }
  if (t === 'item') {
    const kind = it.item_type as string
    if (kind === 'pack') return { icon: '🎁', label: tGlobal('ranked.rewards.packs', { count: (it.quantity as number) ?? 1 }) }
    if (kind === 'card_back') return { icon: '🎴', label: tGlobal('quests.monthly.cardBack') }
    if (kind === 'player_avatar') return { icon: '🧙', label: tGlobal('quests.monthly.avatar') }
    return { icon: '🎁', label: String(it.item_id ?? '') }
  }
  return { icon: '✦', label: '' }
}

