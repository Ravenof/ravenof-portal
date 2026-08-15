// ── Taikinių parinkimas + trade scoring ──────────────────────────────────────

import type { GameState, BoardUnit, TargetRef } from '../engine'
import { P, effectiveAtk } from '../engine'
import type { AiWeights, ScoredTarget } from './aiTypes'
import { unitValue, unitThreatBonus, type CardAnalysis } from './aiCardRole'
import { evaluateBoardThreat, hasLethalThisTurn } from './aiThreatEvaluation'
import { reverseLethalRisk } from './aiHardPlanner'

/** Hipotetinis trade'o įvertinimas duotomis puolėjo statomis prieš gynėją. */
export function scoreTradeStats(
  g: GameState,
  attacker: { atk: number; hp: number; shield: boolean },
  def: BoardUnit,
): number {
  const defAtk = def.isChampion ? 0 : effectiveAtk(g, def)
  const kills = !def.shield && attacker.atk >= def.hp
  const survives = !!def.statuses.frozen || attacker.shield || defAtk < attacker.hp
  const enemyVal = unitValue(g, def)
  const attackerVal = attacker.atk + attacker.hp + (attacker.shield ? 2 : 0)
  const threat = unitThreatBonus(g, def)
  if (def.shield && !kills) return 1 // tik nuima skydą
  if (kills && survives) return enemyVal + threat + 4
  if (kills) return enemyVal + threat - attackerVal * 0.6
  // dalinė žala – paprastai bloga (savižudiška), nebent nužudo grėsmę
  const ratio = Math.min(1, attacker.atk / Math.max(1, def.hp))
  return ratio * enemyVal * 0.3 - (survives ? 0 : attackerVal)
}

/** Veido (žaidėjo) atakos vertė. Didelė tik kai lethal / žaidėjas silpnas / lenta tuščia. */
export function faceScore(g: GameState, w: AiWeights): number {
  if (hasLethalThisTurn(g)) return 10000
  const foe = P(g, 'you')
  let s = 2 + w.faceBias
  if (foe.hp <= 15) s += (15 - foe.hp)
  s -= evaluateBoardThreat(g, 'you') * 0.8
  if (!foe.units.some((u) => u)) s += 3
  // goodPlayer REVERSE LETHAL: jei kitą ėjimą pats galiu žūti, o savo lethal
  // neturiu – nelenktyniaujam į veidą; verčiau blokeris/gydymas/removal.
  if (w.goodPlayer && reverseLethalRisk(g).lethalNext) s -= 6
  return s
}

/** Atakos veiksmo įvertinimas (padaras vs taikinys). */
export function scoreAttack(g: GameState, attacker: BoardUnit, target: TargetRef, w: AiWeights): number {
  if (target.kind === 'player') return faceScore(g, w)
  if (target.kind === 'artifact') {
    const a = P(g, 'you').artifacts.find((x) => x?.uid === target.uid)
    return a ? 2 : -999
  }
  const def = P(g, 'you').units.find((x) => x?.uid === target.uid)
  if (!def) return -999
  let s = scoreTradeStats(g, { atk: effectiveAtk(g, attacker), hp: attacker.hp, shield: attacker.shield }, def)
  if (w.goodPlayer) {
    // Reverse lethal: numušti DIDŽIAUSIĄ priešo puolėją, kai kitą ėjimą gresia mirtis
    const rl = reverseLethalRisk(g)
    if (rl.lethalNext && !def.shield && effectiveAtk(g, attacker) >= def.hp) {
      const topAtk = Math.max(...P(g, 'you').units.map((x) => x && !x.isChampion ? effectiveAtk(g, x) : 0))
      if (!def.isChampion && effectiveAtk(g, def) >= topAtk && topAtk > 0) s += 3
    }
    // Reaction read: kol priešas turi užverstų reakcijų – „ištestuok" jas PIGIU
    // padaru (spąstai suveiks ant mažos vertės), brangų puolėją saugok.
    const foeReactions = P(g, 'you').reactions.filter((r) => !!r).length
    const myReady = P(g, 'ai').units.filter((x) => !!x && !x.isChampion && x.attacksUsed === 0).length
    if (foeReactions > 0 && myReady >= 2) {
      const myVal = unitValue(g, attacker)
      if (myVal <= 7) s += 1
      else if (myVal >= 10) s -= 1
    }
    // Continuous efekto nešėjas – atakomis šalinamas pirmiau
    if (def.card.gameplay?.passiveAura && !def.statuses.silenced) s += 1.5
    // „Geras žaidėjas": neutralizuotas (frozen/stunned) priešas VIS TIEK praleis
    // ėjimą – pirmiausia žudom AKTYVIAS grėsmes; bet frozen neatsikerta, tad jei
    // vis tiek verta pulti, trade saugus (+1). Čempionas gynyboje daro 0 žalos
    // ir yra nuolatinė skill grėsmė – jį daužyti apsimoka.
    if (def.statuses.stunned || def.statuses.frozen) s -= 2.5
    if (def.statuses.frozen) s += 1
    if (def.isChampion) s += 2
  }
  return s
}

// ── Burtų taikiniai ──────────────────────────────────────────────────────────

function enemyUnits(g: GameState): BoardUnit[] {
  return P(g, 'you').units.filter((u): u is BoardUnit => !!u && !u.stealth)
}
function ownUnits(g: GameState): BoardUnit[] {
  return P(g, 'ai').units.filter((u): u is BoardUnit => !!u)
}

/** Žalos burto vertė konkrečiam priešo padarui. */
function scoreDamageOnUnit(g: GameState, dmg: number, def: BoardUnit, w: AiWeights): number {
  if (def.shield) return 0.5
  const enemyVal = unitValue(g, def)
  const threat = unitThreatBonus(g, def)
  const kills = dmg >= def.hp
  if (kills) {
    let s = enemyVal + threat
    // hard: negaišink stiprios žalos ant pigaus taikinio
    if (dmg >= 4 && enemyVal < w.removalMinValue) s -= 3
    // mažas overkill baudimas
    s -= Math.max(0, dmg - def.hp) * 0.2
    // goodPlayer KILL CONFIRMATION: užbaigti jau sužeistą – neleisti heal value
    if (w.goodPlayer && def.hp < def.maxHp) s += 1.5
    return s
  }
  // goodPlayer: dalinė žala be tikslo – „botiškas" žalos mėtymas, baudžiam papildomai
  const partial = (dmg / def.hp) * enemyVal * 0.35 * w.spellWasteGuard - 0.5
  return w.goodPlayer ? partial - 1 : partial
}

/** Geriausias žalos burto taikinys (padaras arba veidas), arba skip (score<=0). */
export function pickDamageTarget(g: GameState, dmg: number, canUnit: boolean, canFace: boolean, w: AiWeights, lethal: boolean): ScoredTarget {
  let best: ScoredTarget = { target: undefined, score: -Infinity, reason: 'nėra taikinio' }
  if (canUnit) {
    for (const def of enemyUnits(g)) {
      const sc = scoreDamageOnUnit(g, dmg, def, w)
      if (sc > best.score) best = { target: { kind: 'unit', side: 'you', uid: def.uid }, score: sc, reason: dmg >= def.hp ? `žala nužudo „${def.card.name}"` : `žala į „${def.card.name}"` }
    }
  }
  // veidas
  if (canFace) {
    const foe = P(g, 'you')
    let faceVal = -Infinity
    if (lethal) faceVal = 10000
    else if (foe.hp <= 12) faceVal = dmg * 1.0
    if (faceVal > best.score) best = { target: { kind: 'player', side: 'you' }, score: faceVal, reason: lethal ? 'burn į veidą – lethal' : 'burn į veidą (žaidėjas silpnas)' }
  }
  if (best.score <= 0) return { target: undefined, score: -Infinity, reason: 'nėra vertingo taikinio – burtas praleidžiamas' }
  return best
}

/** Status (freeze/stun/silence) ar destroy burto taikinys – stipriausias priešo padaras. */
export function pickThreatTarget(g: GameState, w: AiWeights, isDestroy: boolean, opts?: { skipNeutralized?: boolean }): ScoredTarget {
  let best: ScoredTarget = { target: undefined, score: -Infinity, reason: 'nėra taikinio' }
  for (const def of enemyUnits(g)) {
    // freeze/stun setup: nešaldyk to, kas JAU neutralizuotas – rink aktyvų
    if (opts?.skipNeutralized && (def.statuses.frozen || def.statuses.stunned)) continue
    let val = unitValue(g, def) + unitThreatBonus(g, def)
    if (w.goodPlayer) {
      // Continuous efektai (auros, kartotiniai trigeriai) – removal/kontrolė PIRMIAUSIA jiems
      if (def.card.gameplay?.passiveAura) val += 2
      const dms = def.card.mappings ?? []
      if (dms.some((m) => m.trigger === 'onTurnStart' || m.trigger === 'onTurnEnd' || m.trigger.startsWith('onAny'))) val += 2
    }
    if (isDestroy && val < w.removalMinValue) continue // hard: laikyk removal vertingiems
    // goodPlayer REMOVAL BIUDŽETAS: jei taikinį galima nuimti PAPRASTU pelningu
    // trade'u (mūsų padaras nužudo ir išgyvena) – premium removal taupomas.
    if (w.goodPlayer && isDestroy && !def.shield) {
      const cheapTrade = P(g, 'ai').units.some((u) => u && !u.isChampion && u.attacksUsed === 0
        && effectiveAtk(g, u) >= def.hp && (def.statuses.frozen || effectiveAtk(g, def) < u.hp))
      if (cheapTrade) val -= 4
    }
    if (val > best.score) best = { target: { kind: 'unit', side: 'you', uid: def.uid }, score: val, reason: isDestroy ? `removal ant „${def.card.name}"` : `kontrolė ant „${def.card.name}"` }
  }
  if (best.score <= 0 || !isFinite(best.score)) return { target: undefined, score: -Infinity, reason: 'nėra verto taikinio' }
  return best
}

/** Heal burto taikinys – tik sužeistas padaras (arba žaidėjas, jei stipriai praradęs HP). */
export function pickHealTarget(g: GameState, heal: number): ScoredTarget {
  const me = P(g, 'ai')
  let best: ScoredTarget = { target: undefined, score: -Infinity, reason: 'nieko gydyti' }
  for (const u of ownUnits(g)) {
    const missing = u.maxHp - u.hp
    if (missing <= 0) continue
    const val = Math.min(heal, missing) + unitValue(g, u) * 0.2
    if (val > best.score) best = { target: { kind: 'unit', side: 'ai', uid: u.uid }, score: val, reason: `gydo „${u.card.name}" (${missing} trūksta)` }
  }
  if (me.hp < me.maxHp - heal) {
    const val = heal * 0.5
    if (val > best.score) best = { target: { kind: 'player', side: 'ai' }, score: val, reason: 'gydo AI žaidėją' }
  }
  if (best.score <= 0 || !isFinite(best.score)) return { target: undefined, score: -Infinity, reason: 'heal bevertis (pilnas HP) – praleidžiama' }
  return best
}

/** Buff taikinys – savas padaras, kuriam buffas duoda geriausią trade'ą/išgyvenimą. */
export function pickBuffTarget(g: GameState, a: CardAnalysis, w: AiWeights): ScoredTarget {
  let best: ScoredTarget = { target: undefined, score: -Infinity, reason: 'nėra ką buffinti' }
  const foeUnits = enemyUnits(g)
  for (const u of ownUnits(g)) {
    if (u.isChampion) continue
    const baseAtk = effectiveAtk(g, u)
    const before = bestTradeFor(g, { atk: baseAtk, hp: u.hp, shield: u.shield }, foeUnits, w)
    const after = bestTradeFor(g, { atk: baseAtk + a.buffAtk, hp: u.hp + a.buffHp, shield: u.shield }, foeUnits, w)
    let gain = after - before
    // buffas ant stipraus / raktažodinio padaro – papildomai vertingas (finisher/apsauga)
    if (u.card.keywords.includes('sprint')) gain += a.buffAtk * 0.5
    // nešvaistyk ant padaro, kuris tuoj mirs (labai mažas HP ir didelė grėsmė) – jau atspindi before/after
    if (gain > best.score) best = { target: { kind: 'unit', side: 'ai', uid: u.uid }, score: gain, reason: `buff „${u.card.name}" pagerina trade'ą` }
  }
  if (best.score < w.tradeThreshold) return { target: undefined, score: -Infinity, reason: 'buffas nesukuria vertės – praleidžiama' }
  return best
}

/** Geriausias įmanomas trade score duotam (hipotetiniam) padarui prieš priešo lentą. */
function bestTradeFor(g: GameState, stats: { atk: number; hp: number; shield: boolean }, foeUnits: BoardUnit[], w: AiWeights): number {
  let best = 0
  for (const def of foeUnits) {
    const sc = scoreTradeStats(g, stats, def)
    if (sc > best) best = sc
  }
  void w
  return best
}
