// ── Veiksmų scoring: kortų žaidimas, AoE, buff ───────────────────────────────

import type { GameState, TutCard, TargetRef } from '../engine'
import { P, boardCreatureCap, effectiveAtk, canUnitAttack } from '../engine'
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
export function evaluateAoEValue(g: GameState, aoeDmg: number, w?: AiWeights): PlayScore {
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
  // Naudoti tik kai verta: 2+ killed, arba 1 vertingas, arba lethal prevention.
  // goodPlayer (hard): AoE NIEKADA neišmetamas ant 1 pigaus padaro – reikia
  // 2+ nužudymų, vieno tikrai vertingo (>=8) arba lethal prevention su 2+ taikiniais lentoje.
  const worth = w?.goodPlayer
    ? (killed >= 2 || (killed >= 1 && killedVal >= 8) || (risk && killed >= 1 && enemies.length >= 2))
    : (killed >= 2 || (killed >= 1 && killedVal >= 6) || (risk && killed >= 1))
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
      // goodPlayer: „variklio" kortos (burtų vampyrizmas / burtų žalos aura /
      // burtų pranašumas – pvz. Gydūnė Džilė) LAIKOMOS, kol rankoje susikaups
      // burst'as (2+ žalos burtai) arba prireiks gydymo (HP žemas). Kitaip jų
      // aura prastovi ir priešas spėja ją nuimti.
      if (w.goodPlayer) {
        const pa = card.gameplay?.passiveAura
        const spellEngine = !!pa && (!!pa.spellLifestealScope || (pa.auraSpellDamage ?? 0) > 0 || !!pa.advSpell)
        if (spellEngine) {
          const burst = me.hand.filter((c) => c.uid !== card.uid && c.type === 'spell')
            .map((c) => analyzeCard(c)).filter((x) => x.dmgEnemy > 0 || x.aoeDmg > 0).length
          if (burst >= 2 || me.hp <= 22) score += 3
          else return { score: score - 4, reason: `laikom „${card.name}" burst'ui (žalos burtų rankoje: ${burst})`, opts }
        }
      }
      // goodPlayer OVEREXTENSION: aiškiai pirmaujant lentoje nekraunam visos
      // rankos – 1-2 kortos lieka atsistatymui po galimo priešo AoE.
      if (w.goodPlayer) {
        const my = me.units.filter((u) => !!u && !u.isChampion)
        const foeU = P(g, 'you').units.filter((u) => !!u && !u.isChampion)
        const myAtk = my.reduce((t, u) => t + effectiveAtk(g, u!), 0)
        const foeAtk = foeU.reduce((t, u) => t + effectiveAtk(g, u!), 0)
        if (my.length >= foeU.length + 2 && myAtk >= foeAtk + 4 && me.hand.length <= 6) {
          score -= 3
        }
      }
      return { score, reason: `žaisti padarą „${card.name}" (tempo ${tempo})`, opts }
    }
    case 'spell': {
      // goodPlayer REACTION BAIT: kol priešas turi užverstų reakcijų, BRANGIAUSIAS
      // žalos/removal burtas pridengiamas – pirma „ištestuojama" pigesniu burtu
      // ar pigia ataka (DI nemato kortos, vertina tik tikimybę prarasti value).
      let baitPenalty = 0
      if (w.goodPlayer && (a.dmgEnemy > 0 || a.destroy)) {
        const foeReactions = P(g, 'you').reactions.filter((r) => !!r).length
        if (foeReactions > 0) {
          const spellsInHand = me.hand.filter((c) => c.type === 'spell' && c.uid !== card.uid)
          const cheaperExists = spellsInHand.some((c) => c.gold < card.gold)
          const priciest = spellsInHand.every((c) => c.gold <= card.gold)
          if (priciest && cheaperExists && card.gold >= 300) baitPenalty = 2
        }
      }
      if (a.isAoE && a.aoeDmg > 0) return tagReason(evaluateAoEValue(g, a.aoeDmg, w), card)
      if (a.dmgEnemy > 0) {
        const t = pickDamageTarget(g, a.dmgEnemy, a.targetsEnemyUnit, a.canHitFace, w, lethal)
        if (!t.target) return { ...SKIP, reason: `„${card.name}": ${t.reason}` }
        return { score: t.score - (lethal ? 0 : baitPenalty), reason: `„${card.name}": ${t.reason}`, opts: { target: t.target } }
      }
      if (a.destroy) {
        const t = pickThreatTarget(g, w, true)
        if (!t.target) return { ...SKIP, reason: `„${card.name}": ${t.reason}` }
        return { score: t.score + 1 - (lethal ? 0 : baitPenalty), reason: `„${card.name}": ${t.reason}`, opts: { target: t.target } }
      }
      if (a.status) {
        const t = pickThreatTarget(g, w, false, { skipNeutralized: w.goodPlayer && a.freezeStun })
        if (!t.target) return { ...SKIP, reason: `„${card.name}": nėra verto taikinio` }
        let sc = t.score * 0.7
        // goodPlayer: freeze/stun PRIEŠ atakas – užšaldytas neatsikerta, apsvaigintas
        // praleidžia ėjimą, tad premija pagal taikinio ATK (kiek žalos išvengiam).
        if (w.goodPlayer && a.freezeStun && t.target.kind === 'unit') {
          const def = P(g, 'you').units.find((x) => x?.uid === (t.target as { kind: 'unit'; side: 'you'; uid: string }).uid)
          if (def) sc += effectiveAtk(g, def) * 0.6 + 1
        }
        return { score: sc, reason: `„${card.name}": kontrolė`, opts: { target: t.target } }
      }
      if (a.heal > 0) {
        const t = pickHealTarget(g, a.heal)
        if (!t.target) return { ...SKIP, reason: `„${card.name}": ${t.reason}` }
        return { score: t.score, reason: `„${card.name}": ${t.reason}`, opts: { target: t.target } }
      }
      if (a.buffAtk > 0 || a.buffHp > 0) {
        const t = pickBuffTarget(g, a, w)
        if (!t.target) return { ...SKIP, reason: `„${card.name}": ${t.reason}` }
        let sc = t.score
        // goodPlayer: buff'as PRIEŠ ataką, ne po – jei taikinys dar gali pulti šį
        // ėjimą, buff'o prioritetas pakeliamas virš jo atakos (greedy ciklas tada
        // pirma sužaidžia buffą, o ataka perskaičiuojama jau su nauju ATK).
        if (w.goodPlayer && a.buffAtk > 0 && t.target.kind === 'unit') {
          const bu = P(g, 'ai').units.find((x) => x?.uid === (t.target as { kind: 'unit'; side: 'ai'; uid: string }).uid)
          if (bu && canUnitAttack(g, 'ai', bu).ok) sc += a.buffAtk * 1.2 + 2
        }
        return { score: sc, reason: `„${card.name}": ${t.reason}`, opts: { target: t.target } }
      }
      if (a.enemyDraw > 0 && a.draw === 0) {
        // Priešo traukimo kortos (Demonų mechanika): goodPlayer žaidžia TIK kai
        // traukimas baudžiamas – priešo kaladėje jau įmaišyti prakeiksmai ARBA
        // lentoje yra onAnyDraw bausmė (pvz. Ongromig'as: -2 HP už traukimą).
        if (w.goodPlayer) {
          const cursesPlanted = P(g, 'you').deck.some((c) => c.type === 'curse')
          const punisher = drawPunisherOnBoard(g)
          if (cursesPlanted || punisher) {
            return { score: 5 + a.enemyDraw, reason: `„${card.name}": priešo traukimas baudžiamas (${cursesPlanted ? 'prakeiksmai kaladėje' : 'onAnyDraw bausmė'})` }
          }
          return { ...SKIP, reason: `„${card.name}": laikom – priešo traukimui dar nėra sinergijos` }
        }
        return { score: 1, reason: `„${card.name}": priešas trauks kortų` }
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

/** Ar AI lentoje yra korta, baudžianti priešą už kortų traukimą (onAnyDraw). */
function drawPunisherOnBoard(g: GameState): boolean {
  const me = P(g, 'ai')
  const srcs = [
    ...me.units.filter((u) => !!u && !u.statuses.silenced),
    ...me.artifacts.filter((x) => !!x),
  ]
  return srcs.some((s2) => (s2!.card.mappings ?? []).some((m) =>
    m.trigger === 'onAnyDraw'
    && (m.triggerSide === 'enemy' || m.triggerSide === 'any' || !m.triggerSide)
    && ['damage', 'loseGold', 'burn', 'poison', 'mill', 'discard'].includes(m.effect)))
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
    if (!m || typeof m.effect !== 'string') continue
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
