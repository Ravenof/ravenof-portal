// ── Ravenof Reitingo kova — kliento RPC apvalkalai ───────────────────────────
// Visa rango/atlygio/sezono logika — serveryje (SECURITY DEFINER RPC). Klientas
// tik kviečia ir rodo. Boto kova paleidžiama per esamą TutorialGame engine.

import { createClient } from '@/lib/supabase/client'
import type {
  RankedSeason, RankedProfile, RankedMatchRow, LeaderboardRow,
  MatchReportResult, PlayerMatchStats,
} from './types'

export async function getActiveSeason(): Promise<RankedSeason | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_active_season')
  if (error) { console.warn('[ranked] active_season:', error.message); return null }
  return (data as RankedSeason) ?? null
}

export async function ensureProfile(): Promise<RankedProfile | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_ensure_ranked_profile')
  if (error) { console.warn('[ranked] ensure_profile:', error.message); return null }
  return (data as RankedProfile) ?? null
}

export async function lockDeck(deckId: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.rpc('rvn_lock_ranked_deck', { p_deck_id: deckId })
  if (error) { console.warn('[ranked] lock_deck:', error.message); return false }
  return true
}

export type BotOpponent = {
  slug: string
  name: string
  avatar: string
  faction: string
  faction_slug: string | null
  rank_step: number
  difficulty: 'easy' | 'normal' | 'hard'
}

/** Parenka botą po matchmaking timeout'o (gerbia anti-repeat per last_opponent_ids). */
export async function pickBot(): Promise<BotOpponent | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_pick_bot')
  if (error) { console.warn('[ranked] pick_bot:', error.message); return null }
  return (data as BotOpponent) ?? null
}

export type ReportMatchInput = {
  opponentKind: 'bot' | 'real'
  opponentId: string | null // bot slug arba real user id
  opponentName: string
  opponentRankStep: number
  result: 'win' | 'loss'
  playerFaction: string | null
  opponentFaction: string | null
  durationSeconds: number
  turnsPlayed: number
  stats: PlayerMatchStats
  /** Idempotencijos raktas (užkerta dvigubą pateikimą). */
  clientMatchId: string
}

export async function reportMatch(input: ReportMatchInput): Promise<MatchReportResult | { error: string }> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_report_ranked_match', { p_payload: input })
  if (error) return { error: error.message }
  return data as MatchReportResult
}

export async function claimReward(key: string): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const { error } = await supabase.rpc('rvn_claim_ranked_reward', { p_key: key })
  if (error) return { error: error.message }
  return { ok: true }
}

export async function claimAchievement(key: string): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const { error } = await supabase.rpc('rvn_claim_ranked_achievement', { p_key: key })
  if (error) return { error: error.message }
  return { ok: true }
}

export type ClaimedSets = { rewards: Set<string>; achievements: Record<string, { progress: number; completed: boolean; claimed: boolean }> }

export async function getClaimState(): Promise<ClaimedSets> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const out: ClaimedSets = { rewards: new Set(), achievements: {} }
  if (!user) return out
  const season = await getActiveSeason()
  if (!season) return out
  const [r, a] = await Promise.all([
    supabase.from('ranked_rewards_claimed').select('reward_key').eq('user_id', user.id).eq('season_id', season.id),
    supabase.from('ranked_user_achievements').select('achievement_key, progress, completed, claimed').eq('user_id', user.id).eq('season_id', season.id),
  ])
  for (const row of ((r.data as { reward_key: string }[]) ?? [])) out.rewards.add(row.reward_key)
  for (const row of ((a.data as { achievement_key: string; progress: number; completed: boolean; claimed: boolean }[]) ?? [])) {
    out.achievements[row.achievement_key] = { progress: row.progress, completed: row.completed, claimed: row.claimed }
  }
  return out
}

export async function getRecentMatches(limit = 10): Promise<RankedMatchRow[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('ranked_matches')
    .select('*')
    .eq('player_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data as RankedMatchRow[]) ?? []
}

export async function getLeaderboard(limit = 100, offset = 0): Promise<LeaderboardRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_leaderboard', { p_limit: limit, p_offset: offset })
  if (error) { console.warn('[ranked] leaderboard:', error.message); return [] }
  return (data as LeaderboardRow[]) ?? []
}

export type SeasonHistoryRow = {
  season_id: string
  season_name: string
  final_rank_step: number
  best_rank_step: number
  leaderboard_position: number | null
  wins: number
  losses: number
  win_rate: number
  kd_ratio: number
  rewards_earned: string[]
  created_at: string
}

export async function getSeasonHistory(): Promise<SeasonHistoryRow[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('ranked_season_history')
    .select('*, ranked_seasons(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  type Row = SeasonHistoryRow & { ranked_seasons: { name: string } | null }
  return ((data as unknown as Row[]) ?? []).map((r) => ({ ...r, season_name: r.ranked_seasons?.name ?? r.season_name ?? 'Sezonas' }))
}

/** Vartotojo galiojančios (ranked-tinkamos) kalades deck-lock'ui. */
export async function getRankedDecks(): Promise<{ id: string; name: string; faction: string | null }[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('decks')
    .select('id, name, faction:factions ( name )')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
  const rows = (data as unknown as { id: string; name: string; faction: { name: string } | null }[]) ?? []
  return rows.map((d) => ({ id: d.id, name: d.name, faction: d.faction?.name ?? null }))
}

// ── Matchmaking eilė ──────────────────────────────────────────────────────────
export async function queueJoin(deckId: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.rpc('rvn_queue_join', { p_deck_id: deckId })
  if (error) { console.warn('[ranked] queue_join:', error.message); return false }
  return true
}
export async function queueLeave(): Promise<void> {
  const supabase = createClient()
  await supabase.rpc('rvn_queue_leave')
}
export type QueuePoll = { status: 'waiting' | 'matched' | 'left'; opponent?: string }
export async function queuePoll(range: number): Promise<QueuePoll> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_queue_poll', { p_range: range })
  if (error) { console.warn('[ranked] queue_poll:', error.message); return { status: 'waiting' } }
  return data as QueuePoll
}

export type OpponentSummary = { name: string; avatar: string | null; rankStep: number; faction: string | null }
export async function getOpponentSummary(userId: string): Promise<OpponentSummary | null> {
  const supabase = createClient()
  const season = await getActiveSeason()
  if (!season) return null
  const [p, rp] = await Promise.all([
    supabase.from('profiles').select('display_name, username, avatar_url').eq('id', userId).maybeSingle(),
    supabase.from('ranked_profiles').select('rank_step, main_faction').eq('user_id', userId).eq('season_id', season.id).maybeSingle(),
  ])
  const pr = p.data as { display_name: string | null; username: string | null; avatar_url: string | null } | null
  const rpr = rp.data as { rank_step: number; main_faction: string | null } | null
  if (!pr) return null
  return { name: pr.display_name ?? pr.username ?? 'Žaidėjas', avatar: pr.avatar_url, rankStep: rpr?.rank_step ?? 0, faction: rpr?.main_faction ?? null }
}

/** factions slug → id (kovos paleidimui per engine opponentFaction). */
export async function getFactionIdMap(): Promise<Record<string, number>> {
  const supabase = createClient()
  const { data } = await supabase.from('factions').select('id, slug')
  const out: Record<string, number> = {}
  for (const f of ((data as { id: number; slug: string }[]) ?? [])) out[f.slug] = f.id
  return out
}
