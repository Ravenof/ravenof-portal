// ════════════════════════════════════════════════════════════════════════════
// Flow editoriaus grafo modelis — GRYNOS funkcijos (be React Flow runtime):
// kampanijos duomenys (misijos + cutscenes + scenario taisyklės) ↔ grafo
// mazgai/briaunos. Testuojama vitest'u; UI sluoksnis — AdminCampaignFlow.tsx.
//
// Mazgo id konvencija:  m:<nodeId> | c:<cutsceneId> | t:<nodeId>:<ruleIdx>
// Layout saugomas campaign.metadata.flowLayout = { [grafoMazgoId]: {x,y} }.
// ════════════════════════════════════════════════════════════════════════════

import type { Campaign, CampaignNode, Cutscene, ScenarioRule } from '@/lib/campaign/types'

export type FlowXY = { x: number; y: number }
export type FlowLayout = Record<string, FlowXY>

export type FlowNodeData = {
  kind: 'mission' | 'cutscene' | 'trigger'
  label: string
  sub?: string
  refId: string          // nodeId / cutsceneId
  ruleIdx?: number       // trigger only
  isStart?: boolean
  missionType?: string
  iconType?: string
  cutsceneFormat?: 'vn' | 'motion_comic'
  status?: string
}

export type FlowNodeSpec = { id: string; type: FlowNodeData['kind']; position: FlowXY; data: FlowNodeData }
export type FlowEdgeSpec = {
  id: string; source: string; target: string
  sourceHandle?: string; targetHandle?: string
  kind: 'flow' | 'pre' | 'post' | 'fail' | 'ruleLink' | 'ruleCutscene'
  label?: string
  deletable: boolean
}

export const mId = (id: string) => `m:${id}`
export const cId = (id: string) => `c:${id}`
export const tId = (nodeId: string, idx: number) => `t:${nodeId}:${idx}`

export function parseFlowId(id: string):
  | { kind: 'mission'; refId: string }
  | { kind: 'cutscene'; refId: string }
  | { kind: 'trigger'; refId: string; ruleIdx: number }
  | null {
  if (id.startsWith('m:')) return { kind: 'mission', refId: id.slice(2) }
  if (id.startsWith('c:')) return { kind: 'cutscene', refId: id.slice(2) }
  if (id.startsWith('t:')) {
    const rest = id.slice(2)
    const at = rest.lastIndexOf(':')
    if (at < 0) return null
    return { kind: 'trigger', refId: rest.slice(0, at), ruleIdx: Number(rest.slice(at + 1)) }
  }
  return null
}

// ── Trigerio etiketė žmogui ─────────────────────────────────────────────────
export function triggerLabel(r: ScenarioRule): string {
  switch (r.trigger) {
    case 'onBattleStart': return 'Kovos pradžia'
    case 'onTurnStart': return r.turn != null ? `Ėjimas ${r.turn}` : r.everyTurns != null ? `Kas ${r.everyTurns} ėj.` : 'Ėjimo pradžia'
    case 'onTurnEnd': return r.turn != null ? `Ėjimo ${r.turn} pabaiga` : 'Ėjimo pabaiga'
    case 'onCardPlayed': return `Korta: ${r.cardName ?? r.cardId ?? '?'}`
    case 'onUnitDeath': return `Žūtis: ${r.cardName ?? r.cardId ?? 'bet kuri'}`
    case 'onCondition': {
      const c = r.conditions?.[0]
      if (!c) return 'Sąlyga'
      const who = c.lhs === 'playerHp' ? 'Tavo HP' : c.lhs === 'enemyHp' ? 'Priešo HP' : c.lhs
      return `${who} ${c.op} ${c.rhs}`
    }
    case 'onVictory': return 'Pergalė'
    case 'onDefeat': return 'Pralaimėjimas'
    default: return r.trigger
  }
}

/** Taisyklės dialogue veiksmo cutsceneId (pirmo dialogue veiksmo). */
export function ruleCutsceneId(r: ScenarioRule): string | null {
  for (const a of r.actions ?? []) {
    if (a.type === 'dialogue' && a['cutsceneId']) return String(a['cutsceneId'])
  }
  return null
}

export function ruleInlineText(r: ScenarioRule): string | null {
  for (const a of r.actions ?? []) {
    if (a.type === 'dialogue' && !a['cutsceneId'] && a['text']) return String(a['text'])
  }
  return null
}

// ── Auto-layout: BFS sluoksniais nuo pradinio mazgo ─────────────────────────
export function autoLayout(campaign: Campaign, nodes: CampaignNode[], cutscenes: Cutscene[]): FlowLayout {
  const layout: FlowLayout = {}
  const depth = new Map<string, number>()
  const start = campaign.startNodeId && nodes.some((n) => n.id === campaign.startNodeId)
    ? campaign.startNodeId
    : nodes[0]?.id
  if (start) {
    const q: string[] = [start]
    depth.set(start, 0)
    while (q.length) {
      const id = q.shift()!
      const d = depth.get(id)!
      const n = nodes.find((x) => x.id === id)
      for (const nx of n?.nextNodeIds ?? []) {
        if (!depth.has(nx) && nodes.some((x) => x.id === nx)) { depth.set(nx, d + 1); q.push(nx) }
      }
    }
  }
  // nepasiekiami mazgai — po pasiektų, pagal sortOrder
  let extraDepth = (Math.max(-1, ...depth.values()) + 1)
  for (const n of [...nodes].sort((a, b) => a.sortOrder - b.sortOrder)) {
    if (!depth.has(n.id)) depth.set(n.id, extraDepth++)
  }
  const perDepth = new Map<number, number>()
  for (const n of [...nodes].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const d = depth.get(n.id) ?? 0
    const row = perDepth.get(d) ?? 0
    perDepth.set(d, row + 1)
    layout[mId(n.id)] = { x: 60 + d * 320, y: 60 + row * 190 }
  }
  // trigeriai — po savo misija
  for (const n of nodes) {
    const base = layout[mId(n.id)]
    ;(n.scenario?.rules ?? []).forEach((_, i) => {
      layout[tId(n.id, i)] = { x: base.x + 24, y: base.y + 96 + i * 64 }
    })
  }
  // cutscenes — apatinė juosta
  const maxY = Math.max(0, ...Object.values(layout).map((p) => p.y))
  cutscenes.forEach((c, i) => {
    layout[cId(c.id)] = { x: 60 + (i % 5) * 300, y: maxY + 220 + Math.floor(i / 5) * 150 }
  })
  return layout
}

export function getFlowLayout(campaign: Campaign): FlowLayout {
  return (campaign.metadata?.['flowLayout'] as FlowLayout | undefined) ?? {}
}

// ── Grafo statyba ───────────────────────────────────────────────────────────
export function buildFlowGraph(
  campaign: Campaign, nodes: CampaignNode[], cutscenes: Cutscene[],
): { nodes: FlowNodeSpec[]; edges: FlowEdgeSpec[] } {
  const saved = getFlowLayout(campaign)
  const auto = autoLayout(campaign, nodes, cutscenes)
  const pos = (id: string): FlowXY => saved[id] ?? auto[id] ?? { x: 0, y: 0 }
  const csById = new Map(cutscenes.map((c) => [c.id, c]))

  const out: FlowNodeSpec[] = []
  const edges: FlowEdgeSpec[] = []

  for (const n of nodes) {
    out.push({
      id: mId(n.id), type: 'mission', position: pos(mId(n.id)),
      data: {
        kind: 'mission', label: n.title, sub: n.subtitle ?? undefined, refId: n.id,
        isStart: campaign.startNodeId === n.id, missionType: n.missionType, iconType: n.iconType, status: n.status,
      },
    })
    for (const nx of n.nextNodeIds) {
      if (!nodes.some((x) => x.id === nx)) continue
      edges.push({ id: `ef:${n.id}:${nx}`, source: mId(n.id), target: mId(nx), sourceHandle: 'next', targetHandle: 'prev', kind: 'flow', deletable: true })
    }
    const csLink = (kind: 'pre' | 'post' | 'fail', csid: string | null | undefined) => {
      if (!csid || !csById.has(csid)) return
      edges.push({ id: `ec:${kind}:${n.id}`, source: mId(n.id), target: cId(csid), sourceHandle: kind, targetHandle: 'in', kind, label: kind.toUpperCase(), deletable: true })
    }
    csLink('pre', n.preCutsceneId); csLink('post', n.postCutsceneId); csLink('fail', n.failureCutsceneId)

    ;(n.scenario?.rules ?? []).forEach((r, i) => {
      const id = tId(n.id, i)
      out.push({
        id, type: 'trigger', position: pos(id),
        data: { kind: 'trigger', label: triggerLabel(r), sub: ruleInlineText(r) ?? undefined, refId: n.id, ruleIdx: i },
      })
      edges.push({ id: `et:${n.id}:${i}`, source: mId(n.id), target: id, sourceHandle: 'triggers', targetHandle: 'in', kind: 'ruleLink', deletable: false })
      const rc = ruleCutsceneId(r)
      if (rc && csById.has(rc)) {
        edges.push({ id: `etc:${n.id}:${i}`, source: id, target: cId(rc), sourceHandle: 'out', targetHandle: 'in', kind: 'ruleCutscene', deletable: true })
      }
    })
  }

  for (const c of cutscenes) {
    const mc = !!(c.metadata?.['motionComic'] as { shots?: unknown[] } | undefined)?.shots?.length
    out.push({
      id: cId(c.id), type: 'cutscene', position: pos(cId(c.id)),
      data: { kind: 'cutscene', label: c.title, refId: c.id, cutsceneFormat: mc ? 'motion_comic' : 'vn', sub: mc ? 'motion-comic' : `${(c.steps ?? []).length} žingsn.` },
    })
  }

  return { nodes: out, edges }
}

// ── Jungčių taikymas (grąžina patch'us, mutacijų nedaro) ────────────────────
export type FlowConnectResult =
  | { type: 'flow'; fromNodeId: string; toNodeId: string }
  | { type: 'cutsceneLink'; nodeId: string; slot: 'pre' | 'post' | 'fail'; cutsceneId: string }
  | { type: 'ruleCutscene'; nodeId: string; ruleIdx: number; cutsceneId: string }
  | null

export function resolveConnect(sourceId: string, sourceHandle: string | null | undefined, targetId: string): FlowConnectResult {
  const src = parseFlowId(sourceId)
  const tgt = parseFlowId(targetId)
  if (!src || !tgt) return null
  if (src.kind === 'mission' && tgt.kind === 'mission' && src.refId !== tgt.refId && (sourceHandle === 'next' || !sourceHandle)) {
    return { type: 'flow', fromNodeId: src.refId, toNodeId: tgt.refId }
  }
  if (src.kind === 'mission' && tgt.kind === 'cutscene' && (sourceHandle === 'pre' || sourceHandle === 'post' || sourceHandle === 'fail')) {
    return { type: 'cutsceneLink', nodeId: src.refId, slot: sourceHandle, cutsceneId: tgt.refId }
  }
  if (src.kind === 'trigger' && tgt.kind === 'cutscene') {
    return { type: 'ruleCutscene', nodeId: src.refId, ruleIdx: src.ruleIdx, cutsceneId: tgt.refId }
  }
  return null
}

/** Taisyklės masyvo atnaujinimas: dialogue veiksmo cutsceneId nustatymas/valymas. */
export function withRuleCutscene(rules: ScenarioRule[], idx: number, cutsceneId: string | null): ScenarioRule[] {
  return rules.map((r, i) => {
    if (i !== idx) return r
    const actions = [...(r.actions ?? [])]
    const di = actions.findIndex((a) => a.type === 'dialogue')
    if (cutsceneId) {
      if (di >= 0) actions[di] = { ...actions[di], cutsceneId }
      else actions.push({ type: 'dialogue', cutsceneId })
    } else if (di >= 0) {
      const a = { ...actions[di] }
      delete a['cutsceneId']
      // jei liko tuščias dialogue be teksto — išmetam veiksmą
      if (!a['text']) actions.splice(di, 1)
      else actions[di] = a
    }
    return { ...r, actions }
  })
}

export const NEW_RULE: ScenarioRule = {
  trigger: 'onTurnStart', turn: 2, once: true,
  actions: [{ type: 'dialogue', text: '' }],
}
