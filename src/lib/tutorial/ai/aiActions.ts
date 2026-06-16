// ── Legalių veiksmų generavimas + įvertinimas ────────────────────────────────

import type { GameState, BoardUnit, TargetRef } from '../engine'
import { P, canUnitAttack, canAfford, legalTargets, championSkills } from '../engine'
import type { AiWeights } from './aiTypes'
import { scoreAttack } from './aiTargeting'
import { scorePlayCard, championAbilityTarget } from './aiScoring'
import { hasLethalThisTurn } from './aiThreatEvaluation'

export type ActionDescriptor =
  | { type: 'ability'; skillIndex: number; target?: TargetRef }
  | { type: 'play'; uid: string; cardName: string; opts?: { target?: TargetRef; sacrificeUid?: string } }
  | { type: 'attack'; uid: string; cardName: string; target: TargetRef }
  | { type: 'discardGold'; uid: string; cardName: string }

export type ScoredAction = { descriptor: ActionDescriptor; score: number; reason: string }

/** Sugeneruoja visus legalius AI veiksmus su įvertinimu. */
export function generateLegalActions(g: GameState, w: AiWeights): ScoredAction[] {
  const me = P(g, 'ai')
  const out: ScoredAction[] = []
  const lethal = hasLethalThisTurn(g)

  // 1) Čempiono gebėjimas
  const champ = me.units.find((u) => u?.isChampion && !u.abilityUsed && !u.statuses.silenced && !u.statuses.frozen && !u.statuses.stunned)
  if (champ) {
    const skills = championSkills(champ)
    const skillIndex = Math.max(0, champ.phase - 1)
    const sk = skills[skillIndex]
    if (sk && sk.unlocked) {
      const target = championAbilityTarget(g, sk.mappings, w, lethal)
      out.push({ descriptor: { type: 'ability', skillIndex, target }, score: lethal ? 9000 : 7, reason: `čempiono gebėjimas „${sk.name}"` })
    }
  }

  // 2) Kortų žaidimas
  for (const c of me.hand) {
    if (c.type === 'curse' || !canAfford(g, 'ai', c)) continue
    const ps = scorePlayCard(g, c, w, lethal)
    if (isFinite(ps.score)) {
      out.push({ descriptor: { type: 'play', uid: c.uid, cardName: c.name, opts: ps.opts }, score: ps.score, reason: ps.reason })
    }
  }

  // 3) Atakos
  for (const u of me.units) {
    if (!u || u.isChampion) continue
    if (!canUnitAttack(g, 'ai', u).ok) continue
    const targets = legalTargets(g, 'ai', u)
    let best: { t: TargetRef; score: number } | null = null
    for (const t of targets) {
      const sc = scoreAttack(g, u, t, w)
      if (!best || sc > best.score) best = { t, score: sc }
    }
    if (best) out.push({ descriptor: { type: 'attack', uid: u.uid, cardName: u.card.name, target: best.t }, score: best.score, reason: attackReason(g, u, best.t, best.score) })
  }

  // 4) Išmesti kortą dėl aukso (jei atrakina brangesnę kortą)
  if (!me.discardedForGold && me.hand.length > 2) {
    const cheapest = [...me.hand].sort((a, b) => a.gold - b.gold)[0]
    const wouldEnable = me.hand.some((c) => c.uid !== cheapest.uid && c.type !== 'curse' && c.gold <= me.gold + 100 && c.gold > me.gold)
    if (cheapest && wouldEnable) {
      out.push({ descriptor: { type: 'discardGold', uid: cheapest.uid, cardName: cheapest.name }, score: 0.6, reason: `išmesti „${cheapest.name}" dėl aukso` })
    }
  }

  return out
}

function attackReason(g: GameState, u: BoardUnit, t: TargetRef, score: number): string {
  if (t.kind === 'player') return `„${u.card.name}" → veidas (score ${score.toFixed(1)})`
  if (t.kind === 'artifact') return `„${u.card.name}" → artefaktas`
  const def = P(g, 'you').units.find((x) => x?.uid === t.uid)
  return `„${u.card.name}" trade su „${def?.card.name ?? '?'}" (score ${score.toFixed(1)})`
}
