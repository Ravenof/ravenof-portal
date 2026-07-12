import { t } from '@/lib/i18n/core'
// ── Ravenof Reitingo kova — rangų (rankStep) modelis ─────────────────────────
// 150 žingsnių (rankStep 0–149). 50 rango numerių × 3 medalių pakopos.
//   rankStep 0   = 50 Bronza (žemiausias)
//   rankStep 149 = 1 Auksas  (aukščiausias)
// VIDINIAI laukomi: rankStep + lossCounter. Vartotojui rodoma: rankNumber + medalTier.
// NIEKADA neskaičiuoti rango iš (number,tier) be šių pagalbinių — viskas eina per rankStep.

export const RANK_STEPS = 150
export const MIN_RANK_STEP = 0
export const MAX_RANK_STEP = RANK_STEPS - 1 // 149
export const LOSSES_TO_DROP = 2

export type MedalTier = 'bronze' | 'silver' | 'gold'

export const MEDAL_TIERS: readonly MedalTier[] = ['bronze', 'silver', 'gold'] as const

/** i18n raktai (vidinė reikšmė lieka bronze/silver/gold). */
export const MEDAL_LABEL_KEY: Record<MedalTier, string> = {
  bronze: 'ranked.medal.bronze',
  silver: 'ranked.medal.silver',
  gold: 'ranked.medal.gold',
}
/** Medalio pavadinimas dabartine kalba. */
export function medalLabel(tier: MedalTier): string { return t(MEDAL_LABEL_KEY[tier]) }

export const MEDAL_COLOR: Record<MedalTier, string> = {
  bronze: '#b3793f', // nudilęs bronza
  silver: '#c7d0db', // šaltas poliruotas metalas
  gold: '#f0b429',   // prestižinis auksas
}

/** rankStep → rango numeris (50 → 1). */
export function rankNumberFromStep(step: number): number {
  const s = clampStep(step)
  return 50 - Math.floor(s / 3)
}

/** rankStep → medalio pakopa. */
export function medalTierFromStep(step: number): MedalTier {
  const s = clampStep(step)
  return MEDAL_TIERS[s % 3]
}

/** (numeris, pakopa) → rankStep. Naudoti tik seed'ui / admin įvedimui. */
export function stepFromRank(rankNumber: number, medal: MedalTier): number {
  const n = Math.min(Math.max(Math.round(rankNumber), 1), 50)
  const tierIdx = MEDAL_TIERS.indexOf(medal)
  return clampStep((50 - n) * 3 + (tierIdx < 0 ? 0 : tierIdx))
}

export function clampStep(step: number): number {
  if (!Number.isFinite(step)) return MIN_RANK_STEP
  return Math.min(Math.max(Math.round(step), MIN_RANK_STEP), MAX_RANK_STEP)
}

export const isMaxRank = (step: number): boolean => clampStep(step) >= MAX_RANK_STEP
export const isMinRank = (step: number): boolean => clampStep(step) <= MIN_RANK_STEP

/** Rodomas rango tekstas, pvz. „49 Bronza", „1 Auksas". */
export function formatRank(step: number): string {
  return `${rankNumberFromStep(step)} ${medalLabel(medalTierFromStep(step))}`
}

export type RankView = {
  step: number
  rankNumber: number
  medalTier: MedalTier
  label: string
  isMax: boolean
  isMin: boolean
}

export function rankView(step: number): RankView {
  const s = clampStep(step)
  return {
    step: s,
    rankNumber: rankNumberFromStep(s),
    medalTier: medalTierFromStep(s),
    label: formatRank(s),
    isMax: isMaxRank(s),
    isMin: isMinRank(s),
  }
}

/** Kitas (aukštesnis) žingsnis rodymui „progresas iki…". Maksimaliame rangą grąžina patį save. */
export function nextStepView(step: number): RankView {
  return rankView(Math.min(clampStep(step) + 1, MAX_RANK_STEP))
}

export type RankChangeKind = 'up' | 'down' | 'same'

export type RankUpdateResult = {
  stepBefore: number
  stepAfter: number
  lossCounterBefore: number
  lossCounterAfter: number
  change: RankChangeKind
  hitFloor: boolean // pralaimėjo, bet jau 50 Bronza
  hitCeiling: boolean // laimėjo, bet jau 1 Auksas
}

/** Pergalė: +1 žingsnis (iki lubų), loss counteris nunulinamas. */
export function applyWin(step: number, lossCounter: number): RankUpdateResult {
  const before = clampStep(step)
  const after = Math.min(before + 1, MAX_RANK_STEP)
  return {
    stepBefore: before,
    stepAfter: after,
    lossCounterBefore: lossCounter,
    lossCounterAfter: 0,
    change: after > before ? 'up' : 'same',
    hitFloor: false,
    hitCeiling: before === MAX_RANK_STEP,
  }
}

/** Pralaimėjimas: 1-as pralaimėjimas tik didina skaitiklį; 2-as nuleidžia 1 žingsnį ir nunulina. */
export function applyLoss(step: number, lossCounter: number): RankUpdateResult {
  const before = clampStep(step)
  const nextCounter = lossCounter + 1
  if (nextCounter >= LOSSES_TO_DROP) {
    const after = Math.max(before - 1, MIN_RANK_STEP)
    return {
      stepBefore: before,
      stepAfter: after,
      lossCounterBefore: lossCounter,
      lossCounterAfter: 0, // nunulinamas ir po kritimo, ir pasiekus dugną
      change: after < before ? 'down' : 'same',
      hitFloor: before === MIN_RANK_STEP,
      hitCeiling: false,
    }
  }
  return {
    stepBefore: before,
    stepAfter: before,
    lossCounterBefore: lossCounter,
    lossCounterAfter: nextCounter,
    change: 'same',
    hitFloor: false,
    hitCeiling: false,
  }
}

/** K/D santykio formatavimas pagal Ravenof taisykles. */
export function formatKD(kills: number, deaths: number): string {
  if (deaths > 0) return (kills / deaths).toFixed(2)
  if (kills > 0) return `${kills}.00`
  return '0.00'
}

export function kdRatio(kills: number, deaths: number): number {
  if (deaths > 0) return kills / deaths
  return kills
}
