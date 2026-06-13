// ── Target resolver ───────────────────────────────────────────────────────────
// Iš TargetType apskaičiuoja konkrečius galiojančius taikinius žaidimo būsenoje.
// Be random pagal default: kai reikia automatinio pasirinkimo, imamas
// deterministinis "geriausias" taikinys; random tik kai allowRandomTarget=true.

import type { TargetType } from './types'
import type { GameState, Side, BoardUnit } from '@/lib/tutorial/engine'

export type ResolvedTarget =
  | { kind: 'player'; side: Side }
  | { kind: 'unit'; side: Side; uid: string }
  | { kind: 'artifact'; side: Side; uid: string }
  | { kind: 'field' }

function P(g: GameState, s: Side) { return s === 'you' ? g.you : g.ai }
function other(s: Side): Side { return s === 'you' ? 'ai' : 'you' }

function units(g: GameState, s: Side, opts?: { includeStealth?: boolean; championOnly?: boolean; noChampion?: boolean }): BoardUnit[] {
  return P(g, s).units.filter((u): u is BoardUnit => {
    if (!u) return false
    if (!opts?.includeStealth && u.stealth && s !== undefined) {
      // Sėlinimas saugo tik nuo priešo pasirenkamų efektų; savų – ne
    }
    if (opts?.championOnly && !u.isChampion) return false
    if (opts?.noChampion && u.isChampion) return false
    return true
  })
}

/**
 * Grąžina visus galiojančius taikinius pagal target tipą.
 * casterSide – kas atlieka efektą. Sėlinimas filtruojamas tik
 * pavieniams priešo taikiniams (AoE pasiekia visus pagal taisykles).
 */
export function resolveTargets(g: GameState, casterSide: Side, target: TargetType): ResolvedTarget[] {
  const foe = other(casterSide)
  const single = (arr: ResolvedTarget[]) => arr
  switch (target) {
    case 'self':           return [{ kind: 'player', side: casterSide }]
    case 'ownPlayer':      return [{ kind: 'player', side: casterSide }]
    case 'enemyPlayer':    return [{ kind: 'player', side: foe }]
    case 'anyPlayer':      return [{ kind: 'player', side: casterSide }, { kind: 'player', side: foe }]
    case 'ownUnit':
      return single(units(g, casterSide).map((u) => ({ kind: 'unit', side: casterSide, uid: u.uid })))
    case 'enemyUnit':
      return single(units(g, foe).filter((u) => !u.stealth).map((u) => ({ kind: 'unit', side: foe, uid: u.uid })))
    case 'anyUnit':
      return [
        ...units(g, casterSide).map((u): ResolvedTarget => ({ kind: 'unit', side: casterSide, uid: u.uid })),
        ...units(g, foe).filter((u) => !u.stealth).map((u): ResolvedTarget => ({ kind: 'unit', side: foe, uid: u.uid })),
      ]
    case 'ownChampion':
      return units(g, casterSide, { championOnly: true }).map((u) => ({ kind: 'unit', side: casterSide, uid: u.uid }))
    case 'enemyChampion':
      return units(g, foe, { championOnly: true }).filter((u) => !u.stealth).map((u) => ({ kind: 'unit', side: foe, uid: u.uid }))
    case 'anyChampion':
      return [
        ...units(g, casterSide, { championOnly: true }).map((u): ResolvedTarget => ({ kind: 'unit', side: casterSide, uid: u.uid })),
        ...units(g, foe, { championOnly: true }).filter((u) => !u.stealth).map((u): ResolvedTarget => ({ kind: 'unit', side: foe, uid: u.uid })),
      ]
    case 'ownArtifact':
      return P(g, casterSide).artifacts.filter((a): a is NonNullable<typeof a> => !!a).map((a) => ({ kind: 'artifact', side: casterSide, uid: a.uid }))
    case 'enemyArtifact':
      return P(g, foe).artifacts.filter((a): a is NonNullable<typeof a> => !!a).map((a) => ({ kind: 'artifact', side: foe, uid: a.uid }))
    case 'anyArtifact':
      return [...resolveTargets(g, casterSide, 'ownArtifact'), ...resolveTargets(g, casterSide, 'enemyArtifact')]
    case 'activeField':
      return g.field ? [{ kind: 'field' }] : []
    case 'allOwnUnits':
      return units(g, casterSide, { includeStealth: true }).map((u) => ({ kind: 'unit', side: casterSide, uid: u.uid }))
    case 'allEnemyUnits':
      return units(g, foe, { includeStealth: true }).map((u) => ({ kind: 'unit', side: foe, uid: u.uid }))
    case 'allUnits':
      return [...resolveTargets(g, casterSide, 'allOwnUnits'), ...resolveTargets(g, casterSide, 'allEnemyUnits')]
    case 'allEnemyTargets':
      return [
        ...resolveTargets(g, casterSide, 'allEnemyUnits'),
        ...resolveTargets(g, casterSide, 'enemyArtifact'),
        { kind: 'player', side: foe },
      ]
    case 'allOwnTargets':
      return [
        ...resolveTargets(g, casterSide, 'allOwnUnits'),
        ...resolveTargets(g, casterSide, 'ownArtifact'),
        { kind: 'player', side: casterSide },
      ]
  }
}

/** Ar target tipas yra AoE / be pasirinkimo (taikoma visiems iš karto)? */
export function isMultiTarget(t: TargetType): boolean {
  return ['self', 'allOwnUnits', 'allEnemyUnits', 'allUnits', 'allEnemyTargets', 'allOwnTargets', 'activeField'].includes(t)
}

/**
 * Automatinis taikinio parinkimas, kai žaidėjas nesirenka.
 * Deterministinis (be random), nebent allowRandom=true.
 * Žalai – mažiausio HP priešo padaras; gydymui – labiausiai sužeistas savas.
 */
export function autoPickTarget(
  g: GameState,
  casterSide: Side,
  candidates: ResolvedTarget[],
  intent: 'harm' | 'help',
  allowRandom?: boolean,
): ResolvedTarget | null {
  if (candidates.length === 0) return null
  if (allowRandom) return candidates[Math.floor(Math.random() * candidates.length)]
  const score = (t: ResolvedTarget): number => {
    if (t.kind === 'player') return intent === 'harm' ? 1000 : 999
    if (t.kind === 'field') return 500
    const p = t.side === 'you' ? g.you : g.ai
    const u = p.units.find((x) => x?.uid === t.uid)
    const a = p.artifacts.find((x) => x?.uid === t.uid)
    const hp = u?.hp ?? a?.hp ?? 99
    const maxHp = u?.maxHp ?? a?.maxHp ?? 99
    return intent === 'harm' ? hp : (maxHp - hp) > 0 ? -(maxHp - hp) : 998
  }
  return [...candidates].sort((a, b) => score(a) - score(b))[0]
}
