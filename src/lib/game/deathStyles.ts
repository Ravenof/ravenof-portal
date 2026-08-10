// ── Mirties stilius pagal žalos šaltinį (game-feel fazė 9) ──────────────────
// Iki šiol kiekviena mirtis atrodė vienodai: `disintegrate` + blyksnis. Bet
// „sudegė", „sušalo ir subyrėjo", „ištraukta siela" ir „perkirstas per pusę"
// yra skirtingi pasakojimai — o duomenų jiems jau turim (`ProjectileType`,
// frakcija, ImpactProfile.deathStyle).
//
// SVARBU: dalis mirčių yra TYLIOS. Ne viskas turi sprogti — kai viskas sprogsta,
// nieko nebelieka. `quiet` stilius yra sąmoningas kontrastas sunkiam finišui.

import type { FxKind } from './effectAnimations'
import type { ImpactSeverity } from './impactProfiles'

export type DeathStyleId = 'fire' | 'ice' | 'necro' | 'holy' | 'physical' | 'poison' | 'arcane' | 'default'

export type DeathStyleSpec = {
  /** Pagrindinis FX (visada piešiamas). */
  kind: FxKind
  /** Papildomas sluoksnis (nebūtinas). */
  extra?: FxKind
  color: string
  color2: string
  /** Blyksnio spalva smūgio vietoje. */
  flash: string
  /** Lentos purtymas — `null` reiškia TYLIĄ mirtį. */
  shake: 'soft' | 'hard' | null
  durationS: number
}

export const DEATH_STYLES: Record<DeathStyleId, DeathStyleSpec> = {
  // Užsidegimas → pelenai. Tyli pabaiga po ryškaus žybsnio.
  fire:     { kind: 'burn',         extra: 'disintegrate', color: '#ff8a3a', color2: '#ffd24a', flash: '#ffb347', shake: 'soft', durationS: 1.0 },
  // Sušalimas → šukės.
  ice:      { kind: 'freeze',       extra: 'disintegrate', color: '#7cc4ff', color2: '#eaf6ff', flash: '#cfe6ff', shake: 'soft', durationS: 1.1 },
  // Sielos ištraukimas — TYLI mirtis, be purtymo.
  necro:    { kind: 'graveRise',    color: '#5ef0c0', color2: '#9ff5d8', flash: '#5ef0c0', shake: null, durationS: 1.4 },
  // Baltas išnykimas — irgi tylus.
  holy:     { kind: 'disintegrate', color: '#fff4c2', color2: '#ffe08a', flash: '#ffffff', shake: null, durationS: 1.1 },
  // Kirtis: aštrus, trumpas, su purtymu.
  physical: { kind: 'disintegrate', extra: 'slash',        color: '#e8e0c8', color2: '#ff4a4a', flash: '#ffffff', shake: 'soft', durationS: 0.85 },
  // Puvimas — lėtas, žalsvas, tylus.
  poison:   { kind: 'poison',       extra: 'disintegrate', color: '#84cc16', color2: '#3a6a0a', flash: '#a3e635', shake: null, durationS: 1.3 },
  // Arkaninis subyrėjimas.
  arcane:   { kind: 'disintegrate', extra: 'debuffDrain',  color: '#a78bfa', color2: '#c4b5fd', flash: '#c4b5fd', shake: 'soft', durationS: 1.0 },
  default:  { kind: 'disintegrate', color: '#d4af37', color2: '#2a2a35', flash: '#ffd24a', shake: 'soft', durationS: 0.95 },
}

/** ProjectileType → mirties stilius. */
const BY_PROJECTILE: Record<string, DeathStyleId> = {
  fireball: 'fire',
  freezeBurst: 'ice',
  darkCurse: 'necro',
  healingGlow: 'holy',
  destroyStrike: 'physical',
  arrow: 'physical',
  lightning: 'arcane',
  stunBurst: 'arcane',
  poisonGlob: 'poison',
}

/** Frakcijos vardas → mirties stilius (fallback, kai projektilo tipo nėra). */
const BY_FACTION: [RegExp, DeathStyleId][] = [
  [/mirt|mar[šs]/i, 'necro'],
  [/demon|orda/i, 'fire'],
  [/inkviz|legion/i, 'holy'],
  [/[šs]vies|pulk/i, 'holy'],
  [/mistik|melodij/i, 'arcane'],
  [/goblin|vryhiok|gauj/i, 'fire'],
  [/pl[ėe][šs]ik|nakt/i, 'physical'],
  [/ryt|v[ėe]j/i, 'physical'],
]

/**
 * Parenka mirties stilių. Prioritetas: elemento (projektilo) tipas → frakcija →
 * default. `melee` be elemento visada duoda `physical` (kirtis, ne magija).
 */
export function deathStyleFor(opts: {
  projectile?: string | null
  factionName?: string | null
  melee?: boolean
  severity?: ImpactSeverity | null
}): DeathStyleSpec {
  const { projectile, factionName, melee } = opts
  let id: DeathStyleId | null = null
  if (projectile && projectile !== 'none') id = BY_PROJECTILE[projectile] ?? null
  if (!id && melee) id = 'physical'
  if (!id && factionName) {
    for (const [re, v] of BY_FACTION) if (re.test(factionName)) { id = v; break }
  }
  const spec = DEATH_STYLES[id ?? 'default']
  // Sunkus finišas (DEVASTATING/LETHAL nuo stipraus smūgio) sustiprina purtymą,
  // bet TYLIŲ stilių netriukšmina — jų tyla yra dizaino sprendimas.
  if (opts.severity === 'DEVASTATING' && spec.shake === 'soft') return { ...spec, shake: 'hard' }
  return spec
}
