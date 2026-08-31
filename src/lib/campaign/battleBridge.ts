// ════════════════════════════════════════════════════════════════════════════
// Campaign battle bridge — plonas, grynas sluoksnis tarp gyvos kovos variklio
// (TutorialGame / lib/tutorial/engine) ir kampanijos scenarioEngine.
//
// TutorialGame, gavęs optional `onCampaignEvent` prop'ą, per šį tiltą siunčia
// struktūrizuotus įvykius (ėjimo pradžia, sulošta korta, mirtis, HP pokytis,
// kovos pabaiga) + lengvą BattleSnapshot. CampaignRuntime iš jų leidžia
// scenario taisykles (cutscene prie HP / kortos / ėjimo, tikslų sekimas).
// Prop'o nepadavus — elgesys 100% nepakitęs (zero regression).
// ════════════════════════════════════════════════════════════════════════════

import type { GameEvent, GameState, TutCard } from '@/lib/tutorial/engine'
import type { BattleSnapshot } from './scenarioEngine'

export type CampaignSide = 'player' | 'enemy'

export type CampaignEngineEvent =
  | { t: 'battleStart' }
  | { t: 'turnStart'; turn: number; side: CampaignSide }
  | { t: 'cardPlayed'; cardId: string | null; cardName: string; cardType?: string | null; tag?: string | null; side: CampaignSide }
  | { t: 'unitDeath'; cardId: string | null; cardName: string; tag?: string | null; side: CampaignSide }
  | { t: 'hpChange'; playerHp: number; enemyHp: number }
  | { t: 'battleEnd'; winner: CampaignSide }

export type CampaignEventHandler = (e: CampaignEngineEvent, snap: BattleSnapshot) => void

const toSide = (s: GameEvent['side']): CampaignSide => (s === 'you' || s === 'ally' ? 'player' : 'enemy')

/** Kortos „tag" scenarijui: subtype (ZOMBIE/DEMON/...), fallback — frakcija. */
function cardTag(c: TutCard | null): string | null {
  return c?.subtype ?? c?.factionName ?? null
}

/**
 * Lengvas snapshot'as scenarioEngine'ui iš gyvos GameState.
 * killsByTag / objectives / bossPhase čia TUŠTI — juos kaupia ir įmerge'ina
 * CampaignRuntime (variklis apie scenarijaus būseną nieko nežino).
 */
export function buildCampaignSnapshot(g: GameState): BattleSnapshot {
  const mapBoard = (units: (import('@/lib/tutorial/engine').BoardUnit | null)[]) =>
    units.flatMap((u) => u ? [{ cardId: u.card.id, tag: cardTag(u.card) ?? undefined, attack: u.atk, health: u.hp }] : [])
  return {
    turn: g.globalTurn,
    phase: g.active === 'you' || g.active === 'ally' ? 'player' : 'enemy',
    playerHp: g.you.hp,
    enemyHp: g.ai.hp,
    playerBoard: mapBoard(g.you.units),
    enemyBoard: mapBoard(g.ai.units),
    spellsPlayed: g.you.discard.filter((c) => c.type === 'spell').length,
    enemyKills: g.ai.discard.filter((c) => c.type === 'unit' || c.type === 'champion').length,
    killsByTag: {},
    objectives: {},
    bossPhase: 0,
  }
}

const PLAY_EVENTS = new Set<GameEvent['t']>(['play', 'spell', 'artifact', 'champion', 'field', 'ability'])

/**
 * Iš šviežių žurnalo įvykių (log slice) padaro kampanijos įvykius.
 * Kviečiama TutorialGame įvykių efekte po tutorial.onEvents fanout'o.
 * `findCard` — TutorialGame kortų paieška pagal vardą (vardas → TutCard su id).
 */
export function emitCampaignEvents(
  fresh: GameEvent[],
  g: GameState,
  findCard: (name?: string | null) => TutCard | null,
  emit: CampaignEventHandler,
): void {
  if (!fresh.length) return
  const snap = buildCampaignSnapshot(g)
  let hpDirty = false
  for (const e of fresh) {
    if (e.t === 'start') {
      emit({ t: 'battleStart' }, snap)
    } else if (e.t === 'startTurn') {
      emit({ t: 'turnStart', turn: g.globalTurn, side: toSide(e.side) }, snap)
    } else if (PLAY_EVENTS.has(e.t) && e.cardName) {
      const c = findCard(e.cardName)
      emit({ t: 'cardPlayed', cardId: c?.id ?? null, cardName: e.cardName, cardType: c?.type ?? null, tag: cardTag(c), side: toSide(e.side) }, snap)
    } else if (e.t === 'death' && e.cardName) {
      const c = findCard(e.cardName)
      emit({ t: 'unitDeath', cardId: c?.id ?? null, cardName: e.cardName, tag: cardTag(c), side: toSide(e.side) }, snap)
    } else if (e.t === 'damage' || e.t === 'heal' || e.t === 'fatigue') {
      hpDirty = true
    } else if (e.t === 'win') {
      emit({ t: 'battleEnd', winner: toSide(e.side) }, snap)
    }
  }
  if (hpDirty) emit({ t: 'hpChange', playerHp: g.you.hp, enemyHp: g.ai.hp }, snap)
}
