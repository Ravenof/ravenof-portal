// ── Kampanijos gyvos lentos efektai: spawnExternalUnit / forceBattleEnd per
//    TIKRĄ variklio createGame + scenarioCards/waveEngine grynosios dalys ─────
import { beforeAll, describe, expect, it } from 'vitest'
import { setLocale } from '@/lib/i18n/core'
beforeAll(() => setLocale('lt', { explicit: true, syncProfile: false }))
import { createGame, forceBattleEnd, spawnExternalUnit, type TutCard } from '@/lib/tutorial/engine'
import { collectScenarioCardIds } from '@/lib/campaign/scenarioCards'
import { allMustClearDefeated, initWaveState, wavesForTurn } from '@/lib/campaign/waveEngine'
import type { ScenarioConfig } from '@/lib/campaign/types'

let n = 0
const card = (name: string, over: Partial<TutCard> = {}): TutCard => ({
  id: 'id-' + name + '-' + n, uid: 'u-' + name + '-' + n++, name,
  image: null, gold: 100, attack: 2, health: 3, type: 'unit',
  subtype: null, championGroup: null, championPhase: null,
  keywords: [], effectText: '', rarityColor: '#fff', rarityName: null,
  factionColor: '#fff', factionId: 1, factionName: 'Testas',
  effect: undefined, gameplay: undefined, mappings: [], needsMapping: false,
  ...over,
} as unknown as TutCard)

const deck = (k: string) => Array.from({ length: 12 }, (_, i) => card(k + i))

describe('spawnExternalUnit (tikras variklis)', () => {
  it('padeda dalinį ant priešo lentos su log ir buff', () => {
    const g = createGame(deck('a'), deck('b'), 'you')
    const before = g.ai.units.filter(Boolean).length
    const uid = spawnExternalUnit(g, 'ai', card('Zombis', { attack: 1, health: 2 }), { buffs: { attack: 2, health: 3 } })
    expect(uid).toBeTruthy()
    const u = g.ai.units.find((x) => x?.uid === uid)!
    expect(u).toBeTruthy()
    expect(g.ai.units.filter(Boolean).length).toBe(before + 1)
    expect(u.atk).toBe(3)          // 1 + 2 buff
    expect(u.hp).toBe(5)           // 2 + 3 buff
    expect(u.maxHp).toBe(5)
    const ev = g.log[g.log.length - 1]
    expect(ev.t).toBe('play')
    expect(ev.key).toBe('battleLog.summonByEffect')
  })

  it('summonSick=false leidžia veikti iškart; pilna lenta → null + blocked log', () => {
    const g = createGame(deck('c'), deck('d'), 'you')
    const uid = spawnExternalUnit(g, 'you', card('Sargas'), { summonSick: false })
    const u = g.you.units.find((x) => x?.uid === uid)!
    expect(u.summonedOnTurn).toBe(-1)
    // pripildom lentą iki limito
    let last: string | null = uid
    for (let i = 0; i < 12 && last; i++) last = spawnExternalUnit(g, 'you', card('Pildytojas' + i))
    expect(last).toBeNull()
    expect(g.log.some((e) => e.t === 'blocked' && e.key === 'battleLog.zoneFullSummon')).toBe(true)
  })
})

describe('forceBattleEnd', () => {
  it('nustato winner ir įrašo win įvykį; antrą kartą — no-op', () => {
    const g = createGame(deck('e'), deck('f'), 'you')
    forceBattleEnd(g, 'you')
    expect(g.winner).toBe('you')
    const wins = g.log.filter((e) => e.t === 'win')
    expect(wins.length).toBe(1)
    expect(wins[0].key).toBe('battleLog.winYou')
    forceBattleEnd(g, 'ai')
    expect(g.winner).toBe('you')
    expect(g.log.filter((e) => e.t === 'win').length).toBe(1)
  })
})

describe('collectScenarioCardIds', () => {
  it('surenka bangų, startinių lentų ir spawn veiksmų kortas be dublikatų', () => {
    const cfg: ScenarioConfig = {
      waves: [{ id: 'w1', name: 'W', triggerType: 'turn', turn: 2, spawnSide: 'top', exactUnits: ['c1', 'c2'], unitPool: ['c2', 'c3'] }],
      startingBoard: [{ cardId: 'c4', side: 'player' }],
      startingEnemyBoard: [{ cardId: 'c5', side: 'enemy' }],
      rules: [{ trigger: 'onTurnStart', turn: 3, actions: [{ type: 'spawnUnit', unitCardId: 'c6', side: 'enemy' }] }],
    }
    expect(collectScenarioCardIds(cfg).sort()).toEqual(['c1', 'c2', 'c3', 'c4', 'c5', 'c6'])
    expect(collectScenarioCardIds({})).toEqual([])
  })
})

describe('waveEngine ėjimų bangos', () => {
  const cfg: ScenarioConfig = {
    waves: [
      { id: 'w1', name: 'Pirma', triggerType: 'turn', turn: 2, spawnSide: 'top', exactUnits: ['c1'], mustClear: true, warningText: 'Banga!' },
      { id: 'w2', name: 'Antra', triggerType: 'turn', turn: 4, spawnSide: 'top', exactUnits: ['c2'], mustClear: true },
    ],
  }
  it('bangos šauna savo ėjimą, mustClear pergalė tik įveikus visas', () => {
    const st = initWaveState()
    expect(wavesForTurn(cfg, st, 1)).toEqual([])
    const t2 = wavesForTurn(cfg, st, 2)
    expect(t2.length).toBe(1)
    expect(t2[0]).toMatchObject({ waveId: 'w1', mustClear: true, warningText: 'Banga!' })
    expect(t2[0].units).toEqual([{ cardId: 'c1' }])
    const defeated = new Set<string>(['w1'])
    expect(allMustClearDefeated(cfg, defeated)).toBe(false)
    defeated.add('w2')
    expect(allMustClearDefeated(cfg, defeated)).toBe(true)
  })
})
