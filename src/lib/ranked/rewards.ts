// ── Ravenof Reitingo kova — apdovanojimai (Source of Truth) ──────────────────
// Atspindi DB lentelę ranked_rewards. Vienkartiniai (per sezoną) milestone'ai
// pasiimami iš Apdovanojimų ekrano; pasiėmimas tikrinamas serveryje (RPC).

import { stepFromRank } from './rank'

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
  M(45, 'Pasiektas 45 rangas', 'Pasiek 45 Bronza', { exp: 250, gold: 100 }),
  M(40, 'Pasiektas 40 rangas', 'Pasiek 40 Bronza', { exp: 400, gold: 200, boosters: 1 }),
  M(35, 'Pasiektas 35 rangas', 'Pasiek 35 Bronza', { exp: 500, gold: 250 }),
  M(30, 'Pasiektas 30 rangas', 'Pasiek 30 Bronza', { exp: 700, gold: 300, boosters: 1 }),
  M(25, 'Pasiektas 25 rangas', 'Pasiek 25 Bronza', { exp: 800, gold: 400 }),
  M(20, 'Pasiektas 20 rangas', 'Pasiek 20 Bronza', { exp: 1000, gold: 500, boosters: 1, cardMin: 'magic' }),
  M(15, 'Pasiektas 15 rangas', 'Pasiek 15 Bronza', { exp: 1200, gold: 600 }),
  M(10, 'Pasiektas 10 rangas', 'Pasiek 10 Bronza', { exp: 1500, gold: 800, boosters: 2, cardMin: 'unique' }),
  M(5, 'Pasiektas 5 rangas', 'Pasiek 5 Bronza', { exp: 2000, gold: 1000, boosters: 2 }),
  M(1, 'Pasiektas 1 rangas', 'Pasiek 1 Bronza', { exp: 2500, gold: 1500, boosters: 3, cardMin: 'epic' }),
  {
    key: 'reach_1_gold',
    requiredRankStep: stepFromRank(1, 'gold'),
    title: 'Aukso viršūnė',
    description: 'Pasiek 1 Auksas — aukščiausią rangą',
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
  if (p.boosters) parts.push(`${p.boosters} pak.`)
  if (p.cardMin) parts.push(`korta (${cardMinLabel(p.cardMin)}+)`)
  if (p.badge) parts.push('ženklas')
  return parts.join(' · ')
}

export function cardMinLabel(m: NonNullable<RewardPayload['cardMin']>): string {
  return { magic: 'Magiška', unique: 'Unikali', epic: 'Epiška', legendary: 'Legendinė' }[m]
}
