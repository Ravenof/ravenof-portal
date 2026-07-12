// ── Ravenof Reitingo kova — apdovanojimai (Source of Truth) ──────────────────
// Atspindi DB lentelę ranked_rewards. Vienkartiniai (per sezoną) milestone'ai
// pasiimami iš Apdovanojimų ekrano; pasiėmimas tikrinamas serveryje (RPC).

import { stepFromRank } from './rank'
import { t } from '@/lib/i18n/core'

export type RewardPayload = {
  exp?: number
  gold?: number
  boosters?: number
  /** Garantuotos kortos retumo riba arba geriau. */
  cardMin?: 'magic' | 'unique' | 'epic' | 'legendary'
  badge?: boolean
}

export type RankedReward = {
  /** Stabilus raktas (seed'inamas rewardId pamatui). */
  key: string
  /** rankStep, kurį pasiekus apdovanojimas atrakinamas. */
  requiredRankStep: number
  title: string
  description: string
  payload: RewardPayload
  kind: 'milestone'
}

// Pagrindinis pasikartojantis atlygis (skiriamas automatiškai per match RPC, ne milestone):
export const RECURRING = {
  winExp: 20,            // +20 EXP už kiekvieną pergalę
  rankStepExp: 50,       // +50 EXP už kiekvieną rango žingsnį
  bronzeStepExp: 25,
  silverStepExp: 50,
  goldStepExp: 75,
  newRankNumberGold: 100, // +100 aukso pirmą kartą pasiekus naują rango numerį sezone
} as const

const M = (n: number, title: string, description: string, payload: RewardPayload): RankedReward => ({
  key: `reach_${n}_bronze`,
  requiredRankStep: stepFromRank(n, 'bronze'),
  title,
  description,
  payload,
  kind: 'milestone',
})

export const MILESTONE_REWARDS: RankedReward[] = [
  M(45, 'ranked.milestone.rank45.title', 'ranked.milestone.rank45.desc', { exp: 250, gold: 100 }),
  M(40, 'ranked.milestone.rank40.title', 'ranked.milestone.rank40.desc', { exp: 400, gold: 200, boosters: 1 }),
  M(35, 'ranked.milestone.rank35.title', 'ranked.milestone.rank35.desc', { exp: 500, gold: 250 }),
  M(30, 'ranked.milestone.rank30.title', 'ranked.milestone.rank30.desc', { exp: 700, gold: 300, boosters: 1 }),
  M(25, 'ranked.milestone.rank25.title', 'ranked.milestone.rank25.desc', { exp: 800, gold: 400 }),
  M(20, 'ranked.milestone.rank20.title', 'ranked.milestone.rank20.desc', { exp: 1000, gold: 500, boosters: 1, cardMin: 'magic' }),
  M(15, 'ranked.milestone.rank15.title', 'ranked.milestone.rank15.desc', { exp: 1200, gold: 600 }),
  M(10, 'ranked.milestone.rank10.title', 'ranked.milestone.rank10.desc', { exp: 1500, gold: 800, boosters: 2, cardMin: 'unique' }),
  M(5, 'ranked.milestone.rank5.title', 'ranked.milestone.rank5.desc', { exp: 2000, gold: 1000, boosters: 2 }),
  M(1, 'ranked.milestone.rank1.title', 'ranked.milestone.rank1.desc', { exp: 2500, gold: 1500, boosters: 3, cardMin: 'epic' }),
  {
    key: 'reach_1_gold',
    requiredRankStep: stepFromRank(1, 'gold'),
    title: 'ranked.milestone.gold1.title',
    description: 'ranked.milestone.gold1.desc',
    payload: { exp: 5000, gold: 3000, boosters: 5, cardMin: 'legendary', badge: true },
    kind: 'milestone',
  },
]

export const MILESTONE_BY_KEY = new Map(MILESTONE_REWARDS.map((r) => [r.key, r]))

/** Trumpas atlygio santraukos tekstas (UI). */
export function summarizePayload(p: RewardPayload): string {
  const parts: string[] = []
  if (p.exp) parts.push(`+${p.exp} EXP`)
  if (p.gold) parts.push(`+${p.gold} 🪙`)
  if (p.boosters) parts.push(t('ranked.rewards.packs', { count: p.boosters }))
  if (p.cardMin) parts.push(t('ranked.rewards.card', { rarity: cardMinLabel(p.cardMin) }))
  if (p.badge) parts.push(t('ranked.rewards.badge'))
  return parts.join(' · ')
}

export function cardMinLabel(m: NonNullable<RewardPayload['cardMin']>): string {
  return t(`ranked.rarity.${m}`)
}
