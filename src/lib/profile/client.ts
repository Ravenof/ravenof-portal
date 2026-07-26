// ── Profilio / pasiekimų kliento RPC apvalkalai ─────────────────────────────
// Serveris – vienintelis tiesos šaltinis (žr. asffa/PROFILE-DATA-CONTRACT.md):
// klientas NIEKADA neskaičiuoja XP ribų, atlygių ar progreso pats.
import { createClient } from '@/lib/supabase/client'
import type { AchievementCategory } from './achievements'

export type AchievementRow = {
  code: string
  sortOrder: number
  category: AchievementCategory
  nameLt: string
  requirementLt: string
  badgeFile: string | null
  status: 'generated' | 'pending'
  target: number
  rewards: Record<string, unknown>[]
  isSecret: boolean
  progress: number
  completedAt: string | null
}

export type AchievementsSnapshot = {
  achievements: AchievementRow[]
  completed: number
  total: number
  categories: Record<string, { total: number; done: number }>
  featured: string[]
}

/** Pasiekimų sąrašas + progresas + suvestinės (savo arba nurodyto žaidėjo). */
export async function getAchievements(userId?: string): Promise<AchievementsSnapshot | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_get_achievements', { p_user_id: userId ?? null })
  if (error) { console.warn('[profile] getAchievements:', error.message); return null }
  const d = data as AchievementsSnapshot & { error?: string }
  if (!d || d.error) return null
  return d
}

/** Prisegti iki 3 UŽBAIGTŲ pasiekimų prie profilio. */
export async function setFeaturedAchievements(codes: string[]): Promise<{ ok: true; featured: string[] } | { error: string }> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_set_featured_achievements', { p_codes: codes })
  if (error) return { error: error.message }
  return data as { ok: true; featured: string[] } | { error: string }
}
