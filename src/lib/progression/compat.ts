'use client'
// ════════════════════════════════════════════════════════════════════════════
//  PROGRESSION v2 — suderinamumo adapteriai
//  ─────────────────────────────────────────────────────────────────────────
//  Senieji viešų wrapperių pavadinimai (getMonthlyLogin, claimDailyTask, ...)
//  nukreipiami į v2 RPC. Taip būsimas dizaino handoff'as gali importuoti
//  ĮPRASTUS pavadinimus iš `@/lib/progression` ir gauti naują backendą,
//  o senieji `@/lib/gamification/*` moduliai (v1 RPC) lieka nepaliesti,
//  kol dabartinis UI dar naudojamas.
// ════════════════════════════════════════════════════════════════════════════
import {
  claimAllSeasonRewards, claimDailyChestV2, claimDailyQuest, claimLoginReward,
  claimSeasonRewardV2, continuePendingClaims, getDailyQuests, getLoginRewards,
  getPendingChoices, getProgressionConfig, getProgressionSnapshot, getSeasonPathV2,
  rerollDailyQuest, resolveCardChoice, resolveFactionBoosterChoice,
} from './client'

// ── Daily Login ─────────────────────────────────────────────────────────────
/** @deprecated pavadinimas iš v1 — nauja semantika: rolling 31 dienos ciklas. */
export const getMonthlyLogin = getLoginRewards
/** @deprecated pavadinimas iš v1 — kviečia rvn_claim_login_reward. */
export const claimMonthlyLogin = claimLoginReward

// ── Season Path ─────────────────────────────────────────────────────────────
export const getSeasonPath = getSeasonPathV2
export const claimSeasonReward = claimSeasonRewardV2
export const unlockSeasonPass = (currency: 'silver' | 'rubies') => import('./client').then((m) => m.unlockSeasonPassV2(currency))

// ── Daily Quests ────────────────────────────────────────────────────────────
export const getDailyTasks = getDailyQuests
export const claimDailyTask = claimDailyQuest
export const claimDailyChest = claimDailyChestV2
export const rerollDailyTask = rerollDailyQuest

// ── Nauji veiksmai (v1 atitikmens neturi) ──────────────────────────────────
export {
  claimAllSeasonRewards, continuePendingClaims, getPendingChoices,
  getProgressionConfig, getProgressionSnapshot, resolveCardChoice,
  resolveFactionBoosterChoice,
}
