// ════════════════════════════════════════════════════════════════════════════
// Scenario Rule Engine (foundation)
// A pure, side-effect-free layer that sits ALONGSIDE the core card engine.
// It never mutates TutorialGame state directly — instead it consumes lightweight
// battle snapshots and emits a list of ScenarioEffects that the runtime applies.
// This keeps the 3.5k-line battle component untouched and regression-safe.
//
// HOW TO EXTEND: add a case to `runTrigger` for new ScenarioActionType values,
// or add evaluation in `evalCondition`. Everything else is generic.
// ════════════════════════════════════════════════════════════════════════════

import type {
  ScenarioConfig, ScenarioRule, ScenarioCondition, ScenarioAction,
  ScenarioObjectiveObject, MissionObjective,
} from './types'

/** A flat snapshot the runtime passes in on each battle event. */
export interface BattleSnapshot {
  turn: number
  phase: 'player' | 'enemy'
  playerHp: number
  enemyHp: number
  playerBoard: { cardId: string; tag?: string; attack: number; health: number }[]
  enemyBoard: { cardId: string; tag?: string; attack: number; health: number }[]
  spellsPlayed: number
  enemyKills: number
  killsByTag: Record<string, number>
  objectives: Record<string, ScenarioObjectiveObject>
  bossPhase: number
}

/** Mutable scenario state tracked across a battle (objectives, fired rules, waves). */
export interface ScenarioState {
  objectives: Record<string, ScenarioObjectiveObject>
  firedRuleKeys: Set<string>
  spawnedWaveIds: Set<string>
  bossPhase: number
  defeatedWaveIds: Set<string>
  ended: 'win' | 'lose' | null
}

/** A concrete effect the runtime must apply to the live battle. */
export type ScenarioEffect =
  | { kind: 'spawn'; side: 'player' | 'enemy'; cardId: string; slot?: number; buffs?: { attack?: number; health?: number } }
  | { kind: 'spawnWave'; waveId: string }
  | { kind: 'objectiveHp'; objectiveId: string; hp: number; delta: number }
  | { kind: 'dialogue'; text: string; characterName?: string; portraitUrl?: string }
  | { kind: 'restrictCardTypes'; types: string[] }
  | { kind: 'forceTargetPriority'; priority: string }
  | { kind: 'addField'; fieldId: string }
  | { kind: 'addBuff'; target: 'player' | 'enemy'; attack?: number; health?: number }
  | { kind: 'bossPhase'; phase: number }
  | { kind: 'end'; result: 'win' | 'lose' }

export function initScenarioState(cfg: ScenarioConfig): ScenarioState {
  const objectives: Record<string, ScenarioObjectiveObject> = {}
  for (const o of cfg.objectives ?? []) objectives[o.id] = { ...o }
  return {
    objectives,
    firedRuleKeys: new Set(),
    spawnedWaveIds: new Set(),
    bossPhase: 0,
    defeatedWaveIds: new Set(),
    ended: null,
  }
}

function readPath(snap: BattleSnapshot, st: ScenarioState, path: string): number | string {
  // supported paths: turn, playerHp, enemyHp, spellsPlayed, enemyKills,
  // bossPhase, objective.<id>.hp, kills.<tag>
  if (path === 'turn') return snap.turn
  if (path === 'playerHp') return snap.playerHp
  if (path === 'enemyHp') return snap.enemyHp
  if (path === 'spellsPlayed') return snap.spellsPlayed
  if (path === 'enemyKills') return snap.enemyKills
  if (path === 'bossPhase') return st.bossPhase
  const obj = path.match(/^objective\.([^.]+)\.hp$/)
  if (obj) return st.objectives[obj[1]]?.hp ?? 0
  const kill = path.match(/^kills\.(.+)$/)
  if (kill) return snap.killsByTag[kill[1]] ?? 0
  return 0
}

export function evalCondition(c: ScenarioCondition, snap: BattleSnapshot, st: ScenarioState): boolean {
  const lhs = readPath(snap, st, c.lhs)
  const rhs = c.rhs
  switch (c.op) {
    case '==': return lhs === rhs
    case '!=': return lhs !== rhs
    case '<':  return Number(lhs) < Number(rhs)
    case '<=': return Number(lhs) <= Number(rhs)
    case '>':  return Number(lhs) > Number(rhs)
    case '>=': return Number(lhs) >= Number(rhs)
    default:   return false
  }
}

function ruleKey(rule: ScenarioRule, idx: number, turn: number): string {
  return rule.once ? `r${idx}` : `r${idx}@${turn}`
}

/** Returns true if a turn-based rule should fire on this turn. */
function turnMatches(rule: ScenarioRule, turn: number): boolean {
  if (rule.turn != null) return rule.turn === turn
  if (rule.everyTurns != null) return turn > 0 && turn % rule.everyTurns === 0
  return true
}

function applyAction(a: ScenarioAction, st: ScenarioState, out: ScenarioEffect[]) {
  switch (a.type) {
    case 'spawnUnit':
    case 'spawnRandomUnit':
      out.push({ kind: 'spawn', side: (a.side as 'player' | 'enemy') ?? 'enemy',
                 cardId: String(a.unitCardId ?? a.cardId ?? ''), slot: a.slot as number | undefined,
                 buffs: a.buffs as { attack?: number; health?: number } | undefined })
      break
    case 'spawnWave': {
      const wid = String(a.waveId ?? '')
      if (wid && !st.spawnedWaveIds.has(wid)) { st.spawnedWaveIds.add(wid); out.push({ kind: 'spawnWave', waveId: wid }) }
      break
    }
    case 'damageObjective':
    case 'healObjective': {
      const id = String(a.objectiveId ?? '')
      const obj = st.objectives[id]
      if (obj) {
        const delta = a.type === 'healObjective' ? Number(a.amount ?? 0) : -Number(a.amount ?? 0)
        obj.hp = Math.max(0, Math.min(obj.maxHp, obj.hp + delta))
        out.push({ kind: 'objectiveHp', objectiveId: id, hp: obj.hp, delta })
        if (obj.hp <= 0 && obj.side === 'player') { st.ended = 'lose'; out.push({ kind: 'end', result: 'lose' }) }
      }
      break
    }
    case 'dialogue':
      out.push({ kind: 'dialogue', text: String(a.text ?? ''),
                 characterName: a.characterName as string | undefined, portraitUrl: a.portraitUrl as string | undefined })
      break
    case 'restrictCardTypes':
      out.push({ kind: 'restrictCardTypes', types: (a.types as string[]) ?? [] })
      break
    case 'forceTargetPriority':
      out.push({ kind: 'forceTargetPriority', priority: String(a.priority ?? 'face') })
      break
    case 'addField':
      out.push({ kind: 'addField', fieldId: String(a.fieldId ?? '') })
      break
    case 'addBuff':
      out.push({ kind: 'addBuff', target: (a.target as 'player' | 'enemy') ?? 'enemy',
                 attack: a.attack as number | undefined, health: a.health as number | undefined })
      break
    case 'setBossPhase': {
      const p = Number(a.phase ?? st.bossPhase + 1); st.bossPhase = p
      out.push({ kind: 'bossPhase', phase: p })
      break
    }
    case 'win':  st.ended = 'win';  out.push({ kind: 'end', result: 'win' });  break
    case 'lose': st.ended = 'lose'; out.push({ kind: 'end', result: 'lose' }); break
    // lockZone / restrictAttacks / protectObjective are advisory — runtime may ignore safely.
    default: break
  }
}

/**
 * Evaluate all scenario rules whose trigger matches `trigger` against the
 * current snapshot, returning the effects to apply. Mutates `st` (fired rules,
 * objective HP, end state) so call once per engine event.
 */
export function runTrigger(
  cfg: ScenarioConfig, st: ScenarioState, trigger: ScenarioRule['trigger'], snap: BattleSnapshot,
): ScenarioEffect[] {
  const out: ScenarioEffect[] = []
  const rules = cfg.rules ?? []
  rules.forEach((rule, idx) => {
    if (rule.trigger !== trigger) return
    if ((trigger === 'onTurnStart' || trigger === 'onTurnEnd') && !turnMatches(rule, snap.turn)) return
    const key = ruleKey(rule, idx, snap.turn)
    if (st.firedRuleKeys.has(key)) return
    const conds = rule.conditions ?? []
    if (conds.length && !conds.every((c) => evalCondition(c, snap, st))) return
    st.firedRuleKeys.add(key)
    for (const a of rule.actions) applyAction(a, st, out)
  })
  // custom victory / defeat checks on every evaluation
  if (!st.ended && cfg.victory?.length && cfg.victory.every((c) => evalCondition(c, snap, st))) {
    st.ended = 'win'; out.push({ kind: 'end', result: 'win' })
  }
  if (!st.ended && cfg.defeat?.length && cfg.defeat.every((c) => evalCondition(c, snap, st))) {
    st.ended = 'lose'; out.push({ kind: 'end', result: 'lose' })
  }
  return out
}

/** Score primary/secondary objectives at battle end → 1..3 stars. */
export function scoreObjectives(
  objectives: MissionObjective[], snap: BattleSnapshot, st: ScenarioState, won: boolean,
): { completed: string[]; stars: number } {
  const completed: string[] = []
  for (const o of objectives) {
    if (objectiveMet(o, snap, st, won)) completed.push(o.id)
  }
  const primaries = objectives.filter((o) => o.primary)
  const primaryDone = primaries.every((o) => completed.includes(o.id))
  if (!primaryDone || !won) return { completed, stars: won ? 1 : 0 }
  const secondaries = objectives.filter((o) => !o.primary)
  const secDone = secondaries.filter((o) => completed.includes(o.id)).length
  // 1 star base for the win, +1 per up-to-two secondary objectives
  const stars = Math.min(3, 1 + Math.min(2, secondaries.length === 0 ? 2 : secDone))
  return { completed, stars }
}

export function objectiveMet(o: MissionObjective, snap: BattleSnapshot, st: ScenarioState, won: boolean): boolean {
  const p = o.params ?? {}
  switch (o.kind) {
    case 'win': return won
    case 'survive_turns': return snap.turn >= Number(p.turns ?? 0)
    case 'defeat_within': return won && snap.turn <= Number(p.turns ?? 99)
    case 'protect_objective': {
      const obj = st.objectives[String(p.objectiveId ?? '')]
      return !!obj && obj.hp >= Number(p.hp ?? 1)
    }
    case 'prevent_breach': {
      const obj = st.objectives[String(p.objectiveId ?? 'gate')]
      return !!obj && obj.hp > 0
    }
    case 'kill_count': return (snap.killsByTag[String(p.tag ?? '')] ?? snap.enemyKills) >= Number(p.count ?? 0)
    case 'no_more_than': return snap.spellsPlayed <= Number(p.count ?? 0)
    case 'keep_alive_count': {
      const tag = String(p.tag ?? '')
      const alive = snap.playerBoard.filter((u) => !tag || u.tag === tag).length
      return alive >= Number(p.count ?? 0)
    }
    case 'keep_unit_alive': {
      const id = String(p.cardId ?? '')
      return snap.playerBoard.some((u) => u.cardId === id)
    }
    default: return won // custom objectives default to win
  }
}
