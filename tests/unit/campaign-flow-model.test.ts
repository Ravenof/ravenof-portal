// ── Flow editoriaus grafo modelio testai (grynos funkcijos) ──────────────────
import { describe, expect, it } from 'vitest'
import {
  autoLayout, buildFlowGraph, mId, cId, tId, parseFlowId, resolveConnect,
  ruleCutsceneId, triggerLabel, withRuleCutscene,
} from '@/components/admin/campaign/flow/flowModel'
import type { Campaign, CampaignNode, Cutscene, ScenarioRule } from '@/lib/campaign/types'

const campaign = { id: 'cmp', startNodeId: 'a', metadata: {} } as unknown as Campaign

const node = (id: string, over: Partial<CampaignNode> = {}): CampaignNode => ({
  id, campaignId: 'cmp', chapterId: null, title: id.toUpperCase(), subtitle: null, description: null, loreText: null,
  posX: 50, posY: 50, iconType: 'battle', nodeColor: null, missionType: 'STANDARD_CARD_BATTLE',
  unlockRule: { type: 'all_prev' }, prevNodeIds: [], nextNodeIds: [], branchChoice: null, objectives: [],
  preCutsceneId: null, postCutsceneId: null, failureCutsceneId: null,
  battleConfig: { playerDeckMode: 'collection', enemyDeckMode: 'faction' }, scenario: {},
  rewardPayload: {}, replay: { allowed: true }, difficulty: {}, adminNotes: null, status: 'active', sortOrder: 0,
  ...over,
})

const cs = (id: string): Cutscene => ({
  id, campaignId: 'cmp', title: 'CS ' + id, type: 'dialogue', backgroundImageUrl: null, backgroundVideoUrl: null,
  musicUrl: null, ambientUrl: null, skippable: true, autoplay: false, steps: [], metadata: {},
})

describe('parseFlowId / id helpers', () => {
  it('round-trip', () => {
    expect(parseFlowId(mId('n1'))).toEqual({ kind: 'mission', refId: 'n1' })
    expect(parseFlowId(cId('c1'))).toEqual({ kind: 'cutscene', refId: 'c1' })
    expect(parseFlowId(tId('n1', 2))).toEqual({ kind: 'trigger', refId: 'n1', ruleIdx: 2 })
    expect(parseFlowId('junk')).toBeNull()
  })
})

describe('buildFlowGraph', () => {
  const rules: ScenarioRule[] = [
    { trigger: 'onTurnStart', turn: 3, once: true, actions: [{ type: 'dialogue', cutsceneId: 'c1' }] },
  ]
  const nodes = [
    node('a', { nextNodeIds: ['b'], preCutsceneId: 'c1', scenario: { rules } }),
    node('b', { prevNodeIds: ['a'], sortOrder: 1, failureCutsceneId: 'c2' }),
  ]
  const g = buildFlowGraph(campaign, nodes, [cs('c1'), cs('c2')])

  it('sukuria misijų, cutscene ir trigerių mazgus', () => {
    const ids = g.nodes.map((n) => n.id)
    expect(ids).toContain(mId('a')); expect(ids).toContain(mId('b'))
    expect(ids).toContain(cId('c1')); expect(ids).toContain(cId('c2'))
    expect(ids).toContain(tId('a', 0))
    expect(g.nodes.find((n) => n.id === mId('a'))?.data.isStart).toBe(true)
  })

  it('briaunos: flow, pre, fail, ruleLink, ruleCutscene', () => {
    const kinds = g.edges.map((e) => `${e.kind}:${e.source}>${e.target}`)
    expect(kinds).toContain(`flow:${mId('a')}>${mId('b')}`)
    expect(kinds).toContain(`pre:${mId('a')}>${cId('c1')}`)
    expect(kinds).toContain(`fail:${mId('b')}>${cId('c2')}`)
    expect(kinds).toContain(`ruleLink:${mId('a')}>${tId('a', 0)}`)
    expect(kinds).toContain(`ruleCutscene:${tId('a', 0)}>${cId('c1')}`)
    expect(g.edges.find((e) => e.kind === 'ruleLink')?.deletable).toBe(false)
  })

  it('autoLayout: BFS gylis nuo pradinio mazgo', () => {
    const l = autoLayout(campaign, nodes, [])
    expect(l[mId('a')].x).toBeLessThan(l[mId('b')].x)
    expect(l[tId('a', 0)].y).toBeGreaterThan(l[mId('a')].y)
  })
})

describe('resolveConnect', () => {
  it('misija → misija (next)', () => {
    expect(resolveConnect(mId('a'), 'next', mId('b'))).toEqual({ type: 'flow', fromNodeId: 'a', toNodeId: 'b' })
    expect(resolveConnect(mId('a'), 'next', mId('a'))).toBeNull()
  })
  it('misija (post) → cutscene', () => {
    expect(resolveConnect(mId('a'), 'post', cId('c1'))).toEqual({ type: 'cutsceneLink', nodeId: 'a', slot: 'post', cutsceneId: 'c1' })
  })
  it('trigeris → cutscene', () => {
    expect(resolveConnect(tId('a', 1), 'out', cId('c2'))).toEqual({ type: 'ruleCutscene', nodeId: 'a', ruleIdx: 1, cutsceneId: 'c2' })
  })
  it('neleistinos kombinacijos', () => {
    expect(resolveConnect(cId('c1'), null, mId('a'))).toBeNull()
    expect(resolveConnect(mId('a'), 'pre', mId('b'))).toBeNull()
  })
})

describe('withRuleCutscene', () => {
  const rules: ScenarioRule[] = [{ trigger: 'onVictory', actions: [{ type: 'dialogue', text: 'sveikas' }] }]
  it('prideda cutsceneId prie dialogue veiksmo', () => {
    const r = withRuleCutscene(rules, 0, 'c9')
    expect(r[0].actions[0]).toMatchObject({ type: 'dialogue', text: 'sveikas', cutsceneId: 'c9' })
    expect(ruleCutsceneId(r[0])).toBe('c9')
  })
  it('nuėmus cutsceneId, tekstinis dialogas lieka; tuščias — išmetamas', () => {
    const withCs = withRuleCutscene(rules, 0, 'c9')
    const cleared = withRuleCutscene(withCs, 0, null)
    expect(cleared[0].actions[0]).toMatchObject({ type: 'dialogue', text: 'sveikas' })
    expect(ruleCutsceneId(cleared[0])).toBeNull()
    const emptyDialogue: ScenarioRule[] = [{ trigger: 'onVictory', actions: [{ type: 'dialogue', cutsceneId: 'c9' }] }]
    expect(withRuleCutscene(emptyDialogue, 0, null)[0].actions).toEqual([])
  })
})

describe('triggerLabel', () => {
  it('žmogiškos etiketės', () => {
    expect(triggerLabel({ trigger: 'onTurnStart', turn: 5, actions: [] })).toBe('Ėjimas 5')
    expect(triggerLabel({ trigger: 'onCardPlayed', cardName: 'Belzatoras', actions: [] })).toBe('Korta: Belzatoras')
    expect(triggerLabel({ trigger: 'onCondition', conditions: [{ lhs: 'playerHp', op: '<=', rhs: 10 }], actions: [] })).toBe('Tavo HP <= 10')
    expect(triggerLabel({ trigger: 'onDefeat', actions: [] })).toBe('Pralaimėjimas')
  })
})
