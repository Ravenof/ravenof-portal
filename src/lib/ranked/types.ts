// ── Ravenof Reitingo kova — bendri TS tipai (atspindi DB lenteles) ───────────
import type { MedalTier } from './rank'

export type RankedSeason = {
  id: string
  name: string
  start_date: string
  end_date: string
  is_active: boolean
  reset_completed: boolean
  created_at: string
  updated_at: string
}

export type RankedProfile = {
  user_id: string
  season_id: string
  rank_step: number
  loss_counter: number
  wins: number
  losses: number
  wins_vs_real: number
  losses_vs_real: number
  win_streak: number
  best_win_streak: number
  best_rank_step: number
  reached_numbers: number[] // rango numeriai, pasiekti pirmą kartą šį sezoną
  portal_exp_earned: number
  ranked_gold_earned: number
  creatures_killed: number
  creatures_lost: number
  champions_killed: number
  champions_lost: number
  total_kills: number
  total_deaths: number
  total_damage_dealt: number
  total_damage_taken: number
  main_faction: string | null
  last_opponent_ids: string[]
  locked_deck_id: string | null
  created_at: string
  updated_at: string
}

export type PlayerMatchStats = {
  creaturesKilled: number
  creaturesLost: number
  championsKilled: number
  championsLost: number
  totalKills: number
  totalDeaths: number
  damageDealtToEnemyPlayer: number
  damageTaken: number
  cardsPlayed: number
  spellsPlayed: number
  effectsTriggered: number
  hpRemaining?: number
  hpLowest?: number
}

export type RankedMatchRow = {
  id: string
  season_id: string
  player_id: string
  opponent_kind: 'bot' | 'real'
  opponent_id: string | null
  opponent_name: string
  opponent_rank_step: number
  player_faction: string | null
  opponent_faction: string | null
  result: 'win' | 'loss'
  rank_step_before: number
  rank_step_after: number
  loss_counter_before: number
  loss_counter_after: number
  rank_change: 'up' | 'down' | 'same'
  duration_seconds: number
  turns_played: number
  player_stats: PlayerMatchStats
  exp_gained: number
  gold_gained: number
  created_at: string
}

export type LeaderboardRow = {
  position: number
  is_bot: boolean
  entity_id: string
  name: string
  avatar: string | null
  rank_step: number
  rank_number: number
  medal_tier: MedalTier
  wins: number
  losses: number
  win_rate: number
  kd_ratio: number
  wins_vs_real: number
  win_streak: number
  best_rank_step: number
  main_faction: string | null
  is_me: boolean
}

export type MatchReportResult = {
  rankStepBefore: number
  rankStepAfter: number
  rankChange: 'up' | 'down' | 'same'
  lossCounterBefore: number
  lossCounterAfter: number
  hitFloor: boolean
  hitCeiling: boolean
  expGained: number
  goldGained: number
  newRankNumberReached: number | null
  unlockedRewardKeys: string[]
  completedAchievementKeys: string[]
  matchId: string
}
