// ── ImpactProfile: smūgio dramaturgija pagal žalos svorį (game-feel fazė 4) ──
// Iki šiol 1 žalos ir 12 žalos atrodė vienodai: tas pats projektilis, tas pats
// purtymas, tas pats skaičius. Dabar žala turi SVORĮ — penkios pakopos, kurios
// automatiškai valdo hit-stop, purtymą, garsą, skaičiaus dydį ir mirties stilių.
//
// Principas: dramaturgija ateina iš DUOMENŲ (galutinės žalos ir taikinio HP),
// ne iš hardcode'o kortoje. Admin gali perrašyti (`EffectMapping.impact`), bet
// default'as visada suskaičiuojamas — severity veikia ir be jokio admin darbo.
//
// Visos ms reikšmės — PIRMOS versijos, skirtos tiuningui. Jos gyvena ČIA, ne
// išbarstytos po komponentus.

import type { BattleSoundType } from './types'

export type ImpactSeverity = 'CHIP' | 'HIT' | 'HEAVY' | 'DEVASTATING' | 'LETHAL'

/** Pakopos didėjimo tvarka (naudinga palyginimams ir testams). */
export const SEVERITY_ORDER: ImpactSeverity[] = ['CHIP', 'HIT', 'HEAVY', 'DEVASTATING', 'LETHAL']

export type ImpactProfile = {
  severity: ImpactSeverity
  /** Vizualinio „sustojimo" trukmė smūgio kadre (fazė 5). 0 = be hit-stop. */
  hitStopMs: number
  /** Taikinio reakcija — esami unit shake lygiai (BattleFxLayer). */
  targetReaction: 'none' | 'soft' | 'normal' | 'hard'
  /** Lentos purtymas — esami board shake lygiai. */
  screenShake: 'none' | 'soft' | 'hard'
  /** Smūgio garsas. */
  impactSound: BattleSoundType
  /** Garsumas tam smūgiui (0..1). */
  impactVolume: number
  /** Muzikos duck dB (0 = be duck). */
  audioDuckDb: number
  /** Trumpas šviesos blyksnis ant taikinio (fazė 5). */
  flash: boolean
  /** Žalos skaičiaus stilius. */
  damageNumberStyle: 'small' | 'normal' | 'big' | 'critical'
  /** Mirties stiliaus užuomina (fazė 9). */
  deathStyle?: 'quiet' | 'normal' | 'heavy'
  /**
   * Žiežirbų kiekio daugiklis atakos smūgyje (fazė 2c). Tas pats skaičius
   * valdo ir smūgio bangos žiedo dydį — vienas svoris, ne du derinami.
   */
  sparkMul: number
}

export const IMPACT_PROFILES: Record<ImpactSeverity, ImpactProfile> = {
  CHIP: {
    severity: 'CHIP',
    hitStopMs: 0,
    targetReaction: 'soft',
    screenShake: 'none',
    impactSound: 'impact',
    impactVolume: 0.22,
    audioDuckDb: 0,
    flash: false,
    damageNumberStyle: 'small',
    sparkMul: 0.35,
  },
  HIT: {
    severity: 'HIT',
    hitStopMs: 35,
    targetReaction: 'normal',
    screenShake: 'soft',
    impactSound: 'impact',
    impactVolume: 0.38,
    audioDuckDb: 0,
    flash: true,
    damageNumberStyle: 'normal',
    sparkMul: 0.7,
  },
  HEAVY: {
    severity: 'HEAVY',
    hitStopMs: 60,
    targetReaction: 'hard',
    screenShake: 'soft',
    impactSound: 'impact',
    impactVolume: 0.55,
    audioDuckDb: -3,
    flash: true,
    damageNumberStyle: 'big',
    deathStyle: 'heavy',
    sparkMul: 1.0,
  },
  DEVASTATING: {
    severity: 'DEVASTATING',
    hitStopMs: 80,
    targetReaction: 'hard',
    screenShake: 'hard',
    impactSound: 'explosion',
    impactVolume: 0.7,
    audioDuckDb: -4,
    flash: true,
    damageNumberStyle: 'critical',
    deathStyle: 'heavy',
    sparkMul: 1.5,
  },
  LETHAL: {
    severity: 'LETHAL',
    hitStopMs: 85,
    targetReaction: 'hard',
    screenShake: 'hard',
    impactSound: 'death',
    impactVolume: 0.6,
    audioDuckDb: -4,
    flash: true,
    damageNumberStyle: 'critical',
    deathStyle: 'heavy',
    sparkMul: 1.8,
  },
}

/** Ribos — tiuninamos vienoje vietoje. */
export const SEVERITY_THRESHOLDS = {
  /** Absoliuti žala, nuo kurios smūgis „niokojantis". */
  devastatingAbs: 10,
  /**
   * Santykis žala/maxHP, nuo kurio smūgis „niokojantis".
   * NUKRYPIMAS nuo plano lentelės (0.8): planas §7.4 kaip priėmimo kriterijų
   * nurodo „5 dmg padarui su 6 HP → HEAVY", o 5/6 = 0.833 su 0.8 riba duotų
   * DEVASTATING. Priėmimo kriterijus konkretesnis už lentelę, tad riba = 0.9.
   * Praktiškai 0.9+ santykis beveik visada reiškia mirtį (→ LETHAL), tad ši
   * riba veikia kaip „išgyveno per plauką" atvejis.
   */
  devastatingRatio: 0.9,
  /** Absoliuti žala, nuo kurios smūgis „sunkus". */
  heavyAbs: 6,
  /** Santykis, nuo kurio smūgis „sunkus". */
  heavyRatio: 0.5,
  /** Absoliuti žala, nuo kurios smūgis nebe „įbrėžimas". */
  hitAbs: 3,
} as const

/**
 * Severity skaičiuojama PO ŽMK (galutinė žala) — pagal absoliutų dydį IR
 * santykį su taikinio maxHP. 5 žalos 6 HP padarui yra sunkus smūgis, net jei
 * herojui tai būtų vos įbrėžimas.
 *
 * `targetMaxHp <= 0` (nežinomas taikinys) → vertinama tik pagal absoliutų dydį.
 */
export function resolveSeverity(dmg: number, targetMaxHp: number, lethal: boolean): ImpactSeverity {
  if (lethal) return 'LETHAL'
  const d = Math.max(0, dmg)
  const ratio = targetMaxHp > 0 ? d / targetMaxHp : 0
  const T = SEVERITY_THRESHOLDS
  if (d >= T.devastatingAbs || ratio >= T.devastatingRatio) return 'DEVASTATING'
  if (d >= T.heavyAbs || ratio >= T.heavyRatio) return 'HEAVY'
  if (d >= T.hitAbs) return 'HIT'
  return 'CHIP'
}

/** Profilis pagal severity (su saugiu fallback'u). */
export function impactProfile(sev: ImpactSeverity | undefined | null): ImpactProfile {
  return IMPACT_PROFILES[sev ?? 'HIT'] ?? IMPACT_PROFILES.HIT
}

/** Ar `a` sunkesnis nei `b`. */
export function severityAtLeast(a: ImpactSeverity | undefined, b: ImpactSeverity): boolean {
  if (!a) return false
  return SEVERITY_ORDER.indexOf(a) >= SEVERITY_ORDER.indexOf(b)
}
