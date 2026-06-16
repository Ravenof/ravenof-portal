// ── Kortos rolės + vertės analizė ────────────────────────────────────────────
// AI klasifikuoja kortą pagal efektų mapping'us (arba legacy parsed effect),
// kad žinotų ar tai removal / burn / buff / heal / AoE / draw / summon ir t.t.

import type { GameState, BoardUnit, TutCard } from '../engine'
import { effectiveAtk } from '../engine'
import type { EffectMapping, TargetType } from '@/lib/game/types'

export type CardRole =
  | 'aggro' | 'defensive' | 'taunt' | 'utility'
  | 'removal' | 'burn' | 'buff' | 'heal' | 'aoe' | 'draw'
  | 'summon' | 'control' | 'finisher' | 'artifact' | 'field' | 'curse' | 'champion'

export type CardAnalysis = {
  roles: CardRole[]
  dmgEnemy: number       // didžiausia pavienė žala priešo taikiniui
  aoeDmg: number         // žala visiems priešo padarams (AoE)
  heal: number
  buffAtk: number
  buffHp: number
  draw: number
  gainGold: number
  status: boolean        // uždeda freeze/stun/silence/poison/burn priešui
  destroy: boolean       // hard removal (sunaikina padarą)
  summon: boolean
  targetsEnemyUnit: boolean
  targetsOwnUnit: boolean
  canHitFace: boolean    // žala gali pataikyti į priešo žaidėją
  isAoE: boolean
  needsTarget: boolean   // ar reikia pasirinkti pavienį taikinį
}

const ENEMY_UNIT_TARGETS: TargetType[] = ['enemyUnit', 'anyUnit', 'enemyChampion', 'anyChampion', 'enemyArtifact', 'anyArtifact']
const ENEMY_AOE_TARGETS: TargetType[] = ['allEnemyUnits', 'allUnits', 'allEnemyTargets']
const OWN_UNIT_TARGETS: TargetType[] = ['ownUnit', 'anyUnit', 'ownChampion', 'anyChampion', 'allOwnUnits', 'allUnits', 'allOwnTargets', 'selfUnit']
const FACE_TARGETS: TargetType[] = ['enemyPlayer', 'anyPlayer', 'allEnemyTargets']

function hits(m: EffectMapping, set: TargetType[]): boolean {
  const ts: TargetType[] = (m.targetTypes && m.targetTypes.length > 0) ? m.targetTypes : [m.target]
  return ts.some((t) => set.includes(t))
}

const STATUS_EFFECTS = new Set(['silence', 'freeze', 'stun', 'poison', 'burn'])

/** Mapping'ų rinkinio analizė (kortai arba čempiono skill'ui). */
export function analyzeMappings(mappings: EffectMapping[]): CardAnalysis {
  const a: CardAnalysis = {
    roles: [], dmgEnemy: 0, aoeDmg: 0, heal: 0, buffAtk: 0, buffHp: 0, draw: 0, gainGold: 0,
    status: false, destroy: false, summon: false,
    targetsEnemyUnit: false, targetsOwnUnit: false, canHitFace: false, isAoE: false, needsTarget: false,
  }
  for (const m of mappings) {
    const v = m.value ?? (m.dynamicValue ? m.dynamicValue.base : 1)
    const e = m.effect
    if (e === 'damage') {
      if (hits(m, ENEMY_AOE_TARGETS)) { a.aoeDmg = Math.max(a.aoeDmg, v); a.isAoE = true }
      else { a.dmgEnemy = Math.max(a.dmgEnemy, v); a.targetsEnemyUnit = a.targetsEnemyUnit || hits(m, ENEMY_UNIT_TARGETS) }
      if (hits(m, FACE_TARGETS)) a.canHitFace = true
    } else if (e === 'heal') {
      a.heal = Math.max(a.heal, v); a.targetsOwnUnit = a.targetsOwnUnit || hits(m, OWN_UNIT_TARGETS)
    } else if (e === 'buffAttack') {
      a.buffAtk += v; a.targetsOwnUnit = true
    } else if (e === 'buffHealth') {
      a.buffHp += v; a.targetsOwnUnit = true
    } else if (e === 'destroy' || e === 'moveToGraveyard') {
      a.destroy = true; a.targetsEnemyUnit = a.targetsEnemyUnit || hits(m, ENEMY_UNIT_TARGETS)
    } else if (STATUS_EFFECTS.has(e)) {
      a.status = true; a.targetsEnemyUnit = a.targetsEnemyUnit || hits(m, ENEMY_UNIT_TARGETS)
    } else if (e === 'drawCards') {
      a.draw += v
    } else if (e === 'gainGold') {
      a.gainGold += v
    } else if (e.startsWith('summon') || e === 'revive') {
      a.summon = true
    }
  }
  // ar reikia rankinio pavienio taikinio (priešo arba savo padaro), bet ne AoE
  a.needsTarget = !a.isAoE && (a.targetsEnemyUnit || a.targetsOwnUnit)
  return a
}

/** Pilnos kortos analizė: onPlay/onCast/onSummon mapping'ai arba legacy parsed effect. */
export function analyzeCard(card: TutCard): CardAnalysis {
  const ms = (card.mappings ?? []).filter((m) => m.trigger === 'onPlay' || m.trigger === 'onCast' || m.trigger === 'onSummon')
  if (ms.length > 0) {
    const a = analyzeMappings(ms)
    a.roles = deriveRoles(card, a)
    return a
  }
  // Legacy: parsed effect
  const e = card.effect
  const a: CardAnalysis = {
    roles: [], dmgEnemy: 0, aoeDmg: 0, heal: 0, buffAtk: 0, buffHp: 0, draw: 0, gainGold: 0,
    status: false, destroy: false, summon: false,
    targetsEnemyUnit: false, targetsOwnUnit: false, canHitFace: false, isAoE: false, needsTarget: false,
  }
  if (e) {
    if (e.damage) {
      if (e.aoe) { a.aoeDmg = e.damage; a.isAoE = true }
      else { a.dmgEnemy = e.damage; a.targetsEnemyUnit = true; a.canHitFace = true }
    }
    if (e.heal) { a.heal = e.heal; a.targetsOwnUnit = true }
    if (e.buffAtk) { a.buffAtk += e.buffAtk; a.targetsOwnUnit = true }
    if (e.buffHp) { a.buffHp += e.buffHp; a.targetsOwnUnit = true }
    if (e.status) { a.status = true; a.targetsEnemyUnit = true }
    if (e.draw) a.draw += e.draw
    if (e.gold) a.gainGold += e.gold
    a.needsTarget = !a.isAoE && e.targeted && (a.targetsEnemyUnit || a.targetsOwnUnit)
  }
  a.roles = deriveRoles(card, a)
  return a
}

function deriveRoles(card: TutCard, a: CardAnalysis): CardRole[] {
  const r: CardRole[] = []
  if (card.type === 'artifact') r.push('artifact')
  if (card.type === 'field') r.push('field')
  if (card.type === 'curse') r.push('curse')
  if (card.type === 'champion') r.push('champion')
  if (a.isAoE && a.aoeDmg > 0) r.push('aoe')
  if (a.destroy) r.push('removal')
  if (a.dmgEnemy > 0 && a.canHitFace) r.push('burn')
  if (a.dmgEnemy > 0) r.push('removal')
  if (a.buffAtk > 0 || a.buffHp > 0) r.push('buff')
  if (a.heal > 0) r.push('heal')
  if (a.draw > 0) r.push('draw')
  if (a.summon) r.push('summon')
  if (card.type === 'unit') {
    if (card.keywords.includes('taunt')) r.push('taunt', 'defensive')
    if (card.keywords.includes('sprint')) r.push('aggro', 'finisher')
    if ((card.attack ?? 0) >= (card.health ?? 0)) r.push('aggro')
    else r.push('defensive')
  }
  return r
}

// ── Vertės skaičiavimas ──────────────────────────────────────────────────────

/** Padaro raktažodžių vertė (apytikslė „statų" punktais). */
export function keywordValue(u: BoardUnit): number {
  let v = 0
  const kw = u.card.keywords
  const aura = u.auraKw ?? []
  if (kw.includes('taunt') || aura.includes('taunt')) v += 1
  if (u.shield) v += 2
  if (u.stealth) v += 1
  if (kw.includes('sprint') || aura.includes('sprint')) v += 1
  if ((u.card.mappings ?? []).some((m) => m.trigger === 'onDeath')) v += 1.5
  return v
}

/** Bendra padaro vertė (kiek „brangu" jį prarasti / verta nužudyti). */
export function unitValue(g: GameState, u: BoardUnit): number {
  return effectiveAtk(g, u) + Math.max(1, u.hp) + keywordValue(u)
}

/** Papildoma grėsmės premija už pavojingą padarą (didelis atk, nuodai, pasyvai). */
export function unitThreatBonus(g: GameState, u: BoardUnit): number {
  let v = 0
  const atk = effectiveAtk(g, u)
  if (atk >= 6) v += 3
  else if (atk >= 4) v += 2
  if (u.card.gameplay?.passiveAura) v += 2
  const ms = u.card.mappings ?? []
  if (ms.some((m) => m.trigger.startsWith('onAny') || m.trigger === 'onTurnStart' || m.trigger === 'onTurnEnd')) v += 1.5
  if (ms.some((m) => m.trigger === 'onDeath')) v += 1
  return v
}

/** Pilna padaro grėsmė (atakos jėga + raktažodžiai + pasyvai). */
export function unitThreat(g: GameState, u: BoardUnit): number {
  return effectiveAtk(g, u) + keywordValue(u) + unitThreatBonus(g, u)
}
