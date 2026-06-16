// ── AI sprendimų variklis (scoring-based) ────────────────────────────────────
// Kiekvienas kvietimas grąžina VIENĄ geriausią veiksmą (mutuoja state); UI kviečia
// pakartotinai, kol grąžinama null – tada baigiamas ėjimas. Greedy + recompute
// efektyviai sudaro veiksmų seką (lethal → board control → value → veidas).

import { GameState, P, other, playCard, attack, discardForGold, useChampionAbility } from '../engine'
import type { AiAction, AiDifficulty } from './aiTypes'
import { DIFFICULTY_WEIGHTS, aiLog } from './aiTypes'
import { generateLegalActions, type ScoredAction } from './aiActions'
import { planFocusFire } from './aiFocusFire'
import { hasLethalThisTurn, evaluateSurvivalRisk, evaluateBoardThreat } from './aiThreatEvaluation'

export type { AiAction, AiDifficulty }

function resolveDifficulty(opts?: { difficulty?: AiDifficulty }): AiDifficulty {
  if (opts?.difficulty) return opts.difficulty
  try {
    const w = (typeof window !== 'undefined') ? (window as unknown as { __RAVENOF_AI_DIFFICULTY__?: AiDifficulty }).__RAVENOF_AI_DIFFICULTY__ : undefined
    if (w === 'easy' || w === 'normal' || w === 'hard') return w
  } catch { /* ignore */ }
  return 'normal'
}

/** Įvertina visus veiksmus ir grąžina rūšiuotą sąrašą (su jitter). Testavimui/debug. */
export function decideAiTurn(g: GameState, opts?: { difficulty?: AiDifficulty }): ScoredAction[] {
  const w = DIFFICULTY_WEIGHTS[resolveDifficulty(opts)]
  const actions = generateLegalActions(g, w)
  // Focus-fire planavimas (cumulative damage) – nebent jau turim lethal į veidą.
  if (!hasLethalThisTurn(g)) actions.push(...planFocusFire(g, w))
  for (const a of actions) a.score += Math.random() * w.jitter
  actions.sort((x, y) => y.score - x.score)
  return actions
}

/** Ar AI turi lethal šį ėjimą (spec: findLethalSequence). */
export function findLethalSequence(g: GameState): boolean {
  return hasLethalThisTurn(g)
}

/** Atlieka VIENĄ geriausią AI veiksmą. null – nebėra naudingų veiksmų (baigti ėjimą). */
export function aiNextAction(g: GameState, opts?: { difficulty?: AiDifficulty }): AiAction {
  if (g.winner || g.active !== 'ai') return null
  const difficulty = resolveDifficulty(opts)
  let ranked: ScoredAction[]
  try {
    ranked = decideAiTurn(g, { difficulty })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[AI] decideAiTurn klaida:', err)
    return null
  }

  if (ranked.length > 0) {
    const survival = evaluateSurvivalRisk(g)
    aiLog({
      turn: P(g, 'ai').turnNumber,
      difficulty,
      lethal: findLethalSequence(g),
      survivalRisk: survival.risk,
      incoming: survival.incoming,
      enemyThreat: Math.round(evaluateBoardThreat(g, 'you')),
      top: ranked.slice(0, 4).map((a) => ({ action: a.descriptor.type, score: Math.round(a.score * 10) / 10, reason: a.reason })),
    })
  }

  // Vykdom geriausią teigiamą veiksmą; jei engine atmeta – bandom kitą.
  for (const a of ranked) {
    if (a.score <= 0) break
    const d = a.descriptor
    if (d.type === 'ability') {
      const r = useChampionAbility(g, 'ai', d.skillIndex, { target: d.target })
      if (r.ok) { aiLog({ chosen: 'ability', reason: a.reason, target: d.target }); return { kind: 'ability' } }
    } else if (d.type === 'play') {
      const r = playCard(g, 'ai', d.uid, d.opts)
      if (r.ok) { aiLog({ chosen: 'play', card: d.cardName, reason: a.reason, target: d.opts?.target }); return { kind: 'play', cardName: d.cardName } }
    } else if (d.type === 'attack') {
      const r = attack(g, 'ai', d.uid, d.target)
      if (r.ok) { aiLog({ chosen: 'attack', card: d.cardName, reason: a.reason, target: d.target }); return { kind: 'attack', cardName: d.cardName } }
    } else if (d.type === 'discardGold') {
      const r = discardForGold(g, 'ai', d.uid)
      if (r.ok) { aiLog({ chosen: 'discardGold', card: d.cardName, reason: a.reason }); return { kind: 'discardGold', cardName: d.cardName } }
    }
  }
  return null
}

export { other }
