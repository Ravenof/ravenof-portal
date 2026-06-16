// ── Veiksmų scoring: kortų žaidimas, AoE, buff ───────────────────────────────

import type { GameState, TutCard, TargetRef } from '../engine'
import { P, boardCreatureCap, effectiveAtk } from '../engine'
import type { AiWeights } from './aiTypes'
import { analyzeCard, unitValue, type CardAnalysis } from './aiCardRole'
import { pickDamageTarget, pickThreatTarget, pickHealTarget, pickBuffTarget } from './aiTargeting'
import { evaluateSurvivalRisk } from './aiThreatEvaluation'

export type PlayScore = {
  score: number
  reason: string
  opts?: { target?: TargetRef; sacrificeUid?: string }
}

const SKIP: PlayScore = { score: -Infinity, reason: 'skip' }

/** AoE burto vertė: kiek nužudo / pažeidžia, ar verta naudoti. */
export function evaluateAoEValue(g: GameState, aoeDmg: number): PlayScore {
  const foe = P(g, 'you')
  const enemies = foe.units.filter((u) => !!u)
  if (enemies.length === 0) return { ...SKIP, reason: 'AoE: nėra taikinių' }
  let killedVal = 0, damagedVal = 0, killed = 0
  for (const u of enemies) {
    if (!u) continue
    if (aoeDmg >= u.hp) { killedVal += unitValue(g, u); killed++ }
    else damagedVal += (aoeDmg / u.hp) * unitValue(g, u) * 0.3
  }
  const risk = evaluateSurvivalRisk(g).risk
  const lethalPrevention = risk ? killed * 2 : 0
  const score = killedVal + damagedVal + lethalPrevention
  // Naudoti tik kai verta: 2+ killed, arba 1 vertingas, arba lethal prevention
  const worth = killed >= 2 || (killed >= 1 && killedVal >= 6) || (risk && killed >= 1)
  if (!worth) return { ...SKIP, reason: `AoE neverta (nužudytų ${killed})` }
  return { score, reason: `AoE nužudo ${killed} padarą(-us)` }
}

function freeUnitSlots(g: GameState): number {
  const me = P(g, 'ai')
  const used = me.units.filter((u) => !!u).length
  return Math.max(0, boardCreatureCap(g, 'ai') - used)
}

function cheapestSacrifice(g: GameState): string | null {
  const me = P(g, 'ai')
  const c = me.units
    .filter((u) => !!u && !u.isChampion)
    .sort((a, b) => ((a!.atk + a!.hp) - (b!.atk + b!.hp)))[0]
  return c ? c.uid : null
}

/** Kortos žaidimo įvertinimas. lethal – ar AI dabar turi mirtiną smūgį. */
export function scorePlayCard(g: GameState, card: TutCard, w: AiWeights, lethal: boolean): PlayScore {
  const me = P(g, 'ai')
  const a = analyzeCard(card)

  switch (card.type) {
    case 'unit': {
      if (freeUnitSlots(g) <= 0) return { ...SKIP, reason: 'nėra vietos padarui' }
      const tempo = (card.attack ?? 0) + (card.health ?? 0)
      let score = tempo + (card.gold / 100) * 0.5
      const opts: { target?: TargetRef } = {}
      // Kovos šūksnis su taikiniu
      if (a.dmgEnemy > 0 && a.targetsEnemyUnit) {
        const t = pickDamageTarget(g, a.dmgEnemy, a.targetsEnemyUnit, a.canHitFace, w, lethal)
        if (t.target) { opts.target = t.target; score += Math.max(0, t.score) * 0.6 }
      } else if (a.heal > 0 && a.targetsOwnUnit) {
        const t = pickHealTarget(g, a.heal)
        if (t.target) opts.target = t.target
      } else if (a.status || a.destroy) {
        const t = pickThreatTarget(g, w, a.destroy)
        if (t.target) { opts.target = t.target; score += Math.max(0, t.score) * 0.5 }
      }
      if (card.keywords.includes('sprint')) score += (card.attack ?? 0) * 0.5
      return { score, reason: `žaisti padarą „${card.name}" (tempo ${tempo})`, opts }
    }
    case 'spell': {
      if (a.isAoE && a.aoeDmg > 0) return tagReason(evaluateAoEValue(g, a.aoeDmg), card)
      if (a.dmgEnemy > 0) {
        const t = pickDamageTarget(g, a.dmgEnemy, a.targetsEnemyUnit, a.canHitFace, w, lethal)
        if (!t.target) return { ...SKIP, reason: `„${card.name}": ${t.reason}` }
        return { score: t.score, reason: `„${card.name}": ${t.reason}`, opts: { target: t.target } }
      }
      if (a.destroy) {
        const t = pickThreatTarget(g, w, true)
        if (!t.target) return { ...SKIP, reason: `„${card.name}": ${t.reason}` }
        return { score: t.score + 1, reason: `„${card.name}": ${t.reason}`, opts: { target: t.target } }
      }
      if (a.status) {
        const t = pickThreatTarget(g, w, false)
        if (!t.target) return { ...SKIP, reason: `„${card.name}": nėra verto taikinio` }
        return { score: t.score * 0.7, reason: `„${card.name}": kontrolė`, opts: { target: t.target } }
      }
      if (a.heal > 0) {
        const t = pickHealTarget(g, a.heal)
        if (!t.target) return { ...SKIP, reason: `„${card.name}": ${t.reason}` }
        return { score: t.score, reason: `„${card.name}": ${t.reason}`, opts: { target: t.target } }
      }
      if (a.buffAtk > 0 || a.buffHp > 0) {
        const t = pickBuffTarget(g, a, w)
        if (!t.target) return { ...SKIP, reason: `„${card.name}": ${t.reason}` }
        return { score: t.score, reason: `„${card.name}": ${t.reason}`, opts: { target: t.target } }
      }
      if (a.draw > 0) {
        const playable = me.hand.filter((c) => c.uid !== card.uid).length
        const score = (me.gold >= card.gold + 200 ? 3 : 1) + (playable <= 2 ? 2 : 0)
        return { score, reason: `„${card.name}": kortų traukimas` }
      }
      if (a.gainGold > 0) return { score: 2, reason: `„${card.name}": auksas` }
      // neatpažintas efektas – kuklus prioritetas (žaidžiam tik jei nieko geriau)
      return { score: 1, reason: `„${card.name}": utility (neaiškus efektas)` }
    }
    case 'artifact': {
      if (!me.artifacts.some((x) => x === null)) return { ...SKIP, reason: 'nėra vietos artefaktui' }
      return { score: 4, reason: `žaisti artefaktą „${card.name}"` }
    }
    case 'field': {
      if (g.field && g.field.owner === 'ai') return { ...SKIP, reason: 'jau turiu lauką' }
      return { score: 3, reason: `žaisti lauką „${card.name}"` }
    }
    case 'reaction': {
      if (!me.reactions.some((x) => x === null)) return { ...SKIP, reason: 'nėra vietos reakcijai' }
      if (me.gold < card.gold + 100) return { ...SKIP, reason: 'per mažai aukso reakcijai + ėjimui' }
      return { score: 2, reason: `padėti reakciją „${card.name}"` }
    }
    case 'champion': {
      const hasChamp = me.units.some((u) => u?.isChampion)
      const nonChamp = me.units.filter((u) => u && !u.isChampion).length
      const sac = cheapestSacrifice(g)
      if (!sac || (!hasChamp && nonChamp < 2)) return { ...SKIP, reason: 'nėra ko aukoti čempionui' }
      return { score: 8 + (card.health ?? 0) * 0.2, reason: `iškviesti čempioną „${card.name}"`, opts: { sacrificeUid: sac } }
    }
    default:
      return SKIP
  }
}

function tagReason(p: PlayScore, card: TutCard): PlayScore {
  return { ...p, reason: `„${card.name}": ${p.reason}` }
}

/** Čempiono skill taikinys pagal jo mapping'us. */
export function championAbilityTarget(g: GameState, mappings: TutCard['mappings'], w: AiWeights, lethal: boolean): TargetRef | undefined {
  const a = mappings && mappings.length > 0
    ? analyzeMappingsLite(mappings)
    : { dmg: 1, heal: 0, buff: false, status: false }
  if (a.dmg > 0) {
    const t = pickDamageTarget(g, a.dmg, true, true, w, lethal)
    return t.target
  }
  if (a.heal > 0) {
    const t = pickHealTarget(g, a.heal)
    return t.target
  }
  if (a.status) {
    const t = pickThreatTarget(g, w, false)
    return t.target
  }
  return undefined
}

function analyzeMappingsLite(mappings: NonNullable<TutCard['mappings']>): { dmg: number; heal: number; buff: boolean; status: boolean } {
  let dmg = 0, heal = 0, buff = false, status = false
  for (const m of mappings) {
    const v = m.value ?? 1
    if (m.effect === 'damage') dmg = Math.max(dmg, v)
    else if (m.effect === 'heal') heal = Math.max(heal, v)
    else if (m.effect === 'buffAttack' || m.effect === 'buffHealth') buff = true
    else if (['silence', 'freeze', 'stun', 'poison', 'burn'].includes(m.effect)) status = true
  }
  return { dmg, heal, buff, status }
}

export type { CardAnalysis }
export { effectiveAtk }
