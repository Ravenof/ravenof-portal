// ── Profilio / pasiekimų kliento RPC apvalkalai ─────────────────────────────
// Serveris – vienintelis tiesos šaltinis (žr. asffa/PROFILE-DATA-CONTRACT.md):
// klientas NIEKADA neskaičiuoja XP ribų, atlygių ar progreso pats.
import { createClient } from '@/lib/supabase/client'
import type { AchievementCategory } from './achievements'
import type { Balances, PendingRewardChoice, RewardDefinition } from '@/lib/progression'

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

/**
 * Pasiekimų sąrašas + progresas + suvestinės.
 *
 * SAVO profiliui kviečiam `rvn_sync_achievements` — jis PIRMA perskaičiuoja
 * progresą iš esamų agregatų (kovos, kaladės, kolekcija, ranked, dienos užduotys)
 * ir tik tada grąžina momentinę nuotrauką. Be šito pasiekimai niekada
 * neatsirakindavo, nes `rvn_achievement_progress` niekas nerašė.
 * Svetimam profiliui – tik skaitymas.
 */
export async function getAchievements(userId?: string): Promise<AchievementsSnapshot | null> {
  const supabase = createClient()
  const { data, error } = userId
    ? await supabase.rpc('rvn_get_achievements', { p_user_id: userId })
    : await supabase.rpc('rvn_sync_achievements')
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

// ── Paskyros lygis 1–50 (ekranas 05) ────────────────────────────────────────
// Visos reikšmės — iš rvn_get_account_level(); UI neskaičiuoja nei XP ribų,
// nei atlygių, nei būsenų (žr. supabase/migrations/20260852_account_level_v3.sql).

export type AccountLevelCell = {
  level: number
  xpRequired: number
  rewards: RewardDefinition[]
  milestone: boolean
  /** claimed = jau atsiimta · pending = laukia pasirinkimo · next = kitas · future = ateityje */
  state: 'claimed' | 'pending' | 'next' | 'future'
}

export type AccountLevelState = {
  level: number
  maxLevel: number
  totalXp: number
  currentLevelXp: number
  nextLevelXp: number | null
  xpIntoLevel: number
  xpForNextLevel: number
  isMaxLevel: boolean
  track: AccountLevelCell[]
  pendingChoices: PendingRewardChoice[]
  balances: Balances
}

/** Lygio takelis + XP + laukiantys pasirinkimai (savo arba nurodyto žaidėjo). */
export async function getAccountLevel(userId?: string): Promise<AccountLevelState | { error: string } | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_get_account_level', { p_user_id: userId ?? null })
  if (error) { console.warn('[profile] getAccountLevel:', error.message); return { error: error.message } }
  const d = data as AccountLevelState & { error?: string }
  if (!d) return null
  if (d.error) return { error: d.error }
  return d
}

// ── Profilio apžvalga (ekranai 01 / 02) ─────────────────────────────────────
// Vienas RPC = visi apžvalgos duomenys. Svetimam profiliui serveris pats
// išima privatumo uždengtus blokus (grąžina null), UI jų net nemato.

export type ProfileDeck = { id: string; name: string; cardCount: number; score: number; faction: string | null }
export type ProfileMatch = {
  mode: string; result: string; opponent: string | null
  opponentKind: string | null; faction: string | null; turns: number | null; at: string
}
export type ProfileRarity = { rarity: string; sortOrder: number; owned: number; total: number }

export type ProfileOverview = {
  isSelf: boolean
  identity: {
    playerId: string | null; name: string | null; username: string | null
    avatarUrl: string | null; equippedAvatar: string | null; isPublic: boolean
  }
  level: { level: number; totalXp: number; xpIntoLevel: number | null; xpForNextLevel: number | null; isMaxLevel: boolean }
  ranked: {
    season: string | null; rankStep: number | null; bestRankStep: number | null
    wins: number; losses: number; winStreak: number; bestWinStreak: number
  }
  stats: { matches: number; wins: number; winRate: number; longestStreak: number }
  topFaction: { faction: string; matches: number; pct: number } | null
  /** null = žaidėjas paslėpė kolekciją */
  collection: { owned: number; total: number; pct: number; byRarity: ProfileRarity[] } | null
  publicDecks: ProfileDeck[] | null
  recentAchievements: { code: string; nameLt: string; completedAt: string }[] | null
  matchHistory: ProfileMatch[] | null
}

/** Profilio apžvalga (savo arba nurodyto žaidėjo). */
export async function getProfileOverview(userId?: string): Promise<ProfileOverview | { error: string } | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_get_profile_overview', { p_user_id: userId ?? null })
  if (error) { console.warn('[profile] getProfileOverview:', error.message); return { error: error.message } }
  const d = data as ProfileOverview & { error?: string }
  if (!d) return null
  if (d.error) return { error: d.error }
  return d
}
