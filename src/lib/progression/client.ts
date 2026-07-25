'use client'
// ════════════════════════════════════════════════════════════════════════════
//  PROGRESSION v2 — stabilus frontend integracijos sluoksnis
//  ─────────────────────────────────────────────────────────────────────────
//  • Kiekvienas veiksmas = vienas server-authoritative RPC. Sumos, laikai,
//    eligibility ir pasirinkimų seka VISADA ateina iš serverio.
//  • Kiekvienam mutuojančiam veiksmui generuojamas idempotency key →
//    dvigubas paspaudimas ar tinklo pakartojimas NEDUODA antro atlygio.
//  • Būsimas dizainas kviečia TIK šias funkcijas ir renderina DTO.
// ════════════════════════════════════════════════════════════════════════════
import { createClient } from '@/lib/supabase/client'
import type {
  BoosterResult, ClaimResult, DailyQuestsState, FullProgressionSnapshot,
  LoginRewardState, PendingRewardChoice, ProgressionConfig, ProgressionResult,
  SeasonPathState,
} from './types'

// ── Idempotency raktai ──────────────────────────────────────────────────────
/** Stabilus raktas vienam UI veiksmui — kartojant tą patį kvietimą atlygis nesidubliuoja. */
export function newIdempotencyKey(scope: string): string {
  const rnd = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)
  return `${scope}:${rnd}`
}

// Vienoje sesijoje „užrakinam" raktą, kol veiksmas vykdomas → apsauga nuo
// dvigubo paspaudimo net prieš serverio atsakymą.
const inFlight = new Map<string, string>()
function stickyKey(scope: string): string {
  const existing = inFlight.get(scope)
  if (existing) return existing
  const key = newIdempotencyKey(scope)
  inFlight.set(scope, key)
  return key
}
function releaseKey(scope: string) { inFlight.delete(scope) }

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<ProgressionResult<T> | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc(fn, args ?? {})
  if (error) { console.warn(`[progression] ${fn}:`, error.message); return { error: error.message } }
  return (data ?? null) as ProgressionResult<T> | null
}

async function mutate<T>(scope: string, fn: string, args: Record<string, unknown>): Promise<ProgressionResult<T> | null> {
  const key = stickyKey(scope)
  try {
    return await call<T>(fn, { ...args, p_idempotency_key: key })
  } finally {
    releaseKey(scope)
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  Daily Login (rolling 31 dienų ciklas)
// ════════════════════════════════════════════════════════════════════════════
export function getLoginRewards(): Promise<ProgressionResult<LoginRewardState> | null> {
  return call<LoginRewardState>('rvn_get_login_cycle')
}

export function claimLoginReward(): Promise<ProgressionResult<ClaimResult<LoginRewardState>> | null> {
  return mutate<ClaimResult<LoginRewardState>>('login', 'rvn_claim_login_reward', {})
}

// ════════════════════════════════════════════════════════════════════════════
//  Season Path
// ════════════════════════════════════════════════════════════════════════════
export function getSeasonPathV2(): Promise<ProgressionResult<SeasonPathState> | null> {
  return call<SeasonPathState>('rvn_get_season_path_v2')
}

export function claimSeasonRewardV2(level: number, track: 'free' | 'pass') {
  return mutate<ClaimResult<SeasonPathState>>(`season:${level}:${track}`,
    'rvn_claim_season_reward_v2', { p_level: level, p_track: track })
}

export function claimAllSeasonRewards() {
  return mutate<ClaimResult<SeasonPathState>>('season:all', 'rvn_claim_all_season_rewards', {})
}

export function unlockSeasonPassV2(currency: 'silver' | 'rubies') {
  return mutate<ClaimResult<SeasonPathState>>(`pass:${currency}`, 'rvn_unlock_season_pass_v2', { p_currency: currency })
}

// ════════════════════════════════════════════════════════════════════════════
//  Daily Quests
// ════════════════════════════════════════════════════════════════════════════
export function getDailyQuests(): Promise<ProgressionResult<DailyQuestsState> | null> {
  return call<DailyQuestsState>('rvn_get_daily_quests')
}

export function claimDailyQuest(questId: number) {
  return mutate<ClaimResult<DailyQuestsState>>(`quest:${questId}`, 'rvn_claim_daily_quest', { p_quest_id: questId })
}

export function claimDailyChestV2() {
  return mutate<ClaimResult<DailyQuestsState>>('chest', 'rvn_claim_daily_chest_v2', {})
}

/**
 * Reroll. Jei questas turi progresą, serveris grąžina `error: 'confirmation_required'`
 * — UI parodo patvirtinimą ir pakartoja su confirmProgressLoss = true.
 */
export function rerollDailyQuest(questId: number, confirmProgressLoss = false) {
  return mutate<ClaimResult<DailyQuestsState>>(`reroll:${questId}:${confirmProgressLoss}`,
    'rvn_reroll_daily_quest', { p_quest_id: questId, p_confirm_progress_loss: confirmProgressLoss })
}

// ════════════════════════════════════════════════════════════════════════════
//  Atlygio pasirinkimai
// ════════════════════════════════════════════════════════════════════════════
export function getPendingChoices(): Promise<ProgressionResult<{ pendingChoices: PendingRewardChoice[] }> | null> {
  return call<{ pendingChoices: PendingRewardChoice[] }>('rvn_get_pending_choices')
}

export function resolveFactionBoosterChoice(choiceId: string, factionId: number) {
  return mutate<{ status: 'completed'; booster: BoosterResult; pendingChoices: PendingRewardChoice[] }>(
    `choice:${choiceId}`, 'rvn_resolve_faction_booster_choice',
    { p_choice_id: choiceId, p_faction_id: factionId })
}

export function resolveCardChoice(choiceId: string, cardId: string) {
  return mutate<{ status: 'completed'; cardId: string; compensated: boolean; essence?: number; pendingChoices: PendingRewardChoice[] }>(
    `choice:${choiceId}`, 'rvn_resolve_card_choice',
    { p_choice_id: choiceId, p_card_id: cardId })
}

/** Tęsia nutrūkusį „Claim All" po to, kai pasirinkimai išspręsti. */
export function continuePendingClaims() {
  return mutate<ClaimResult<FullProgressionSnapshot>>('continue', 'rvn_continue_pending_claims', {})
}

// ════════════════════════════════════════════════════════════════════════════
//  Bendra būsena + konfigūracija
// ════════════════════════════════════════════════════════════════════════════
export function getProgressionSnapshot(): Promise<ProgressionResult<FullProgressionSnapshot> | null> {
  return call<FullProgressionSnapshot>('rvn_get_progression_snapshot')
}

export function getProgressionConfig(): Promise<ProgressionResult<ProgressionConfig> | null> {
  return call<ProgressionConfig>('rvn_get_progression_config')
}

// ════════════════════════════════════════════════════════════════════════════
//  Kovos telemetrija dienos questams (kortos / žala / kaladės frakcija)
//  Kviečiama PO to, kai kova jau užregistruota per rvn_report_match_v2.
//  Idempotentiška per matches eilutę.
// ════════════════════════════════════════════════════════════════════════════
export function reportMatchStats(
  clientMatchId: string,
  stats: { creaturesPlayed?: number; spellsPlayed?: number; damageDealt?: number },
  deckFactionId?: number | null,
) {
  return call<{ ok: true; duplicate: boolean }>('rvn_report_match_stats', {
    p_client_match_id: clientMatchId,
    p_stats: stats,
    p_deck_faction_id: deckFactionId ?? null,
  })
}
