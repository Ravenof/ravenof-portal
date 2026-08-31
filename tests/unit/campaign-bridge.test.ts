// ── Kampanijos in-battle trigeriai: battleBridge įvykių mapping'as +
//    scenarioEngine kortos-specifinės taisyklės ir dialogue cutsceneId ────────
import { describe, expect, it } from 'vitest'
import { buildCampaignSnapshot, emitCampaignEvents, type CampaignEngineEvent } from '@/lib/campaign/battleBridge'
import { initScenarioState, runTrigger, scoreObjectives, type BattleSnapshot } from '@/lib/campaign/scenarioEngine'
import type { MissionObjective, ScenarioConfig } from '@/lib/campaign/types'
import type { GameEvent, GameState, TutCard } from '@/lib/tutorial/engine'

// ── minimalūs fake'ai (tik bridge'ui reikalingi laukai) ──────────────────────
const card = (id: string, name: string, type: TutCard['type'] = 'unit', subtype: string | null = null): TutCard =>
  ({ id, uid: id + '-u', name, type, subtype, cost: 1, atk: 1, hp: 1, keywords: [] } as unknown as TutCard)

const KARYS = card('c-karys', 'Karys')
const ZOMBIS = card('c-zombis', 'Zombis', 'unit', 'ZOMBIE')
const UGNIS = card('c-ugnis', 'Ugnies pliūpsnis', 'spell')

function fakeGame(over: Partial<{ turn: number; youHp: number; aiHp: number; active: 'you' | 'ai' }> = {}): GameState {
  const player = (side: string, hp: number, units: (TutCard | null)[], discard: TutCard[]) => ({
    side, hp, maxHp: 30, deck: [], hand: [], discard,
    units: units.map((c, i) => c ? { uid: c.uid + i, card: c, atk: 1, hp: 1, maxHp: 1 } : null),
    artifacts: [null, null], reactions: [null, null, null],
  })
  return {
    you: player('you', over.youHp ?? 25, [KARYS, null, null, null, null], [UGNIS]),
    ai: player('ai', over.aiHp ?? 18, [ZOMBIS, null, null, null, null], [ZOMBIS]),
    active: over.active ?? 'you',
    globalTurn: over.turn ?? 3,
    winner: null, log: [], field: null,
  } as unknown as GameState
}

const findCard = (name?: string | null): TutCard | null =>
  [KARYS, ZOMBIS, UGNIS].find((c) => c.name === name) ?? null

const collect = (events: GameEvent[], g: GameState): CampaignEngineEvent[] => {
  const out: CampaignEngineEvent[] = []
  emitCampaignEvents(events, g, findCard, (e) => out.push(e))
  return out
}

describe('buildCampaignSnapshot', () => {
  it('sudeda lentas, HP, ėjimą ir statistiką iš GameState', () => {
    const snap = buildCampaignSnapshot(fakeGame())
    expect(snap.turn).toBe(3)
    expect(snap.phase).toBe('player')
    expect(snap.playerHp).toBe(25)
    expect(snap.enemyHp).toBe(18)
    expect(snap.playerBoard).toEqual([{ cardId: 'c-karys', tag: undefined, attack: 1, health: 1 }])
    expect(snap.enemyBoard[0]).toMatchObject({ cardId: 'c-zombis', tag: 'ZOMBIE' })
    expect(snap.spellsPlayed).toBe(1)   // Ugnis discard'e
    expect(snap.enemyKills).toBe(1)     // Zombis priešo discard'e
  })
})

describe('emitCampaignEvents', () => {
  it('mapina start / startTurn / play / death / damage / win', () => {
    const g = fakeGame()
    const out = collect([
      { t: 'start', side: 'you' },
      { t: 'startTurn', side: 'ai' },
      { t: 'play', side: 'you', cardName: 'Karys' },
      { t: 'spell', side: 'you', cardName: 'Ugnies pliūpsnis' },
      { t: 'death', side: 'ai', cardName: 'Zombis' },
      { t: 'damage', side: 'ai', value: 3 },
      { t: 'win', side: 'you' },
    ] as GameEvent[], g)
    expect(out.map((e) => e.t)).toEqual(['battleStart', 'turnStart', 'cardPlayed', 'cardPlayed', 'unitDeath', 'battleEnd', 'hpChange'])
    const played = out[2] as Extract<CampaignEngineEvent, { t: 'cardPlayed' }>
    expect(played).toMatchObject({ cardId: 'c-karys', side: 'player' })
    const death = out[4] as Extract<CampaignEngineEvent, { t: 'unitDeath' }>
    expect(death).toMatchObject({ cardId: 'c-zombis', tag: 'ZOMBIE', side: 'enemy' })
    const end = out[5] as Extract<CampaignEngineEvent, { t: 'battleEnd' }>
    expect(end.winner).toBe('player')
  })

  it('be įvykių — nieko nesiunčia', () => {
    expect(collect([], fakeGame())).toEqual([])
  })
})

const baseSnap = (over: Partial<BattleSnapshot> = {}): BattleSnapshot => ({
  turn: 2, phase: 'player', playerHp: 20, enemyHp: 15,
  playerBoard: [], enemyBoard: [], spellsPlayed: 0, enemyKills: 0,
  killsByTag: {}, objectives: {}, bossPhase: 0, ...over,
})

describe('runTrigger — kortos-specifinės taisyklės ir cutscene', () => {
  const cfg: ScenarioConfig = {
    rules: [
      { trigger: 'onCardPlayed', cardId: 'c-ugnis', once: true, actions: [{ type: 'dialogue', cutsceneId: 'cs-fire' }] },
      { trigger: 'onCondition', once: true, conditions: [{ lhs: 'playerHp', op: '<=', rhs: 10 }], actions: [{ type: 'dialogue', text: 'Laikykis!' }] },
      { trigger: 'onTurnStart', turn: 4, once: true, actions: [{ type: 'dialogue', cutsceneId: 'cs-turn4' }] },
    ],
  }

  it('onCardPlayed šauna tik nurodytai kortai ir tik kartą', () => {
    const st = initScenarioState(cfg)
    expect(runTrigger(cfg, st, 'onCardPlayed', baseSnap(), { cardId: 'c-karys' })).toEqual([])
    const fx = runTrigger(cfg, st, 'onCardPlayed', baseSnap(), { cardId: 'c-ugnis' })
    expect(fx).toEqual([{ kind: 'dialogue', text: '', characterName: undefined, portraitUrl: undefined, cutsceneId: 'cs-fire' }])
    expect(runTrigger(cfg, st, 'onCardPlayed', baseSnap(), { cardId: 'c-ugnis' })).toEqual([])
  })

  it('onCondition HP slenkstis šauna tik kirtus ribą', () => {
    const st = initScenarioState(cfg)
    expect(runTrigger(cfg, st, 'onCondition', baseSnap({ playerHp: 15 }))).toEqual([])
    const fx = runTrigger(cfg, st, 'onCondition', baseSnap({ playerHp: 9 }))
    expect(fx[0]).toMatchObject({ kind: 'dialogue', text: 'Laikykis!' })
    expect(runTrigger(cfg, st, 'onCondition', baseSnap({ playerHp: 5 }))).toEqual([])
  })

  it('onTurnStart konkretų ėjimą', () => {
    const st = initScenarioState(cfg)
    expect(runTrigger(cfg, st, 'onTurnStart', baseSnap({ turn: 3 }))).toEqual([])
    expect(runTrigger(cfg, st, 'onTurnStart', baseSnap({ turn: 4 }))[0]).toMatchObject({ cutsceneId: 'cs-turn4' })
  })
})

describe('scoreObjectives su gyvu snapshot’u', () => {
  it('keep_unit_alive + kill_count pagal tag', () => {
    const objectives: MissionObjective[] = [
      { id: 'win', kind: 'win', label: 'Laimėk', primary: true },
      { id: 'keep', kind: 'keep_unit_alive', label: 'Išsaugok Karį', primary: false, params: { cardId: 'c-karys' } },
      { id: 'kills', kind: 'kill_count', label: '3 zombiai', primary: false, params: { tag: 'ZOMBIE', count: 3 } },
    ]
    const st = initScenarioState({})
    const snap = baseSnap({
      playerBoard: [{ cardId: 'c-karys', attack: 2, health: 1 }],
      killsByTag: { ZOMBIE: 3 },
    })
    const { completed, stars } = scoreObjectives(objectives, snap, st, true)
    expect(completed.sort()).toEqual(['keep', 'kills', 'win'])
    expect(stars).toBe(3)

    const bad = scoreObjectives(objectives, baseSnap({ killsByTag: { ZOMBIE: 1 } }), st, true)
    expect(bad.completed).toEqual(['win'])
    expect(bad.stars).toBe(1)
  })
})
