'use client'

// ════════════════════════════════════════════════════════════════════════════
// AdminCampaignFlow — vizualus kampanijos srauto editorius (React Flow).
// Misijos, cutscenes ir trigeriai = sujungti burbulai:
//   • auksinės rodyklės — misijų seka (next/prev, atrakinimo srautas)
//   • mėlyna/žalia/raudona — pre / post / fail cutscene priskyrimas
//   • violetinės — trigeris → cutscene (grojama kovos metu)
// Tempi burbulą — layout išsaugomas campaign.metadata.flowLayout (💾 Išsaugoti
// viską). Tempi nuo handle iki taikinio — sukuriamas ryšys; paspaudus briauną —
// ryšys pašalinamas. Dešinėje — pažymėto elemento redaktorius (be JSON).
// Grynas komponentas: jokių Supabase kvietimų — viską daro per callback'us.
// ════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap, MarkerType,
  applyNodeChanges,
  type Connection, type Edge, type Node, type NodeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { AdminNodeEditor } from '../AdminNodeEditor'
import { AdminCutsceneEditor } from '../AdminCutsceneEditor'
import { TriggerEditor } from './TriggerEditor'
import { CutsceneFlowNode, EDGE_COLORS, MissionFlowNode, TriggerFlowNode } from './FlowNodes'
import {
  autoLayout, buildFlowGraph, getFlowLayout, mId, NEW_RULE, parseFlowId, resolveConnect, tId, withRuleCutscene,
  type FlowLayout, type FlowNodeData,
} from './flowModel'
import type { Campaign, CampaignChapter, CampaignNode, Cutscene, ScenarioRule } from '@/lib/campaign/types'

const GOLD = '240,180,41'
type RFNode = Node<FlowNodeData>

const nodeTypes = { mission: MissionFlowNode, cutscene: CutsceneFlowNode, trigger: TriggerFlowNode }

export function AdminCampaignFlow({ campaign, chapters, nodes, cutscenes, factions, onPatchCampaign, onPatchNode, onPatchCutscene, onAddNode, onAddCutscene, onDeleteNode, onDeleteCutscene, onSetStart }: {
  campaign: Campaign
  chapters: CampaignChapter[]
  nodes: CampaignNode[]
  cutscenes: Cutscene[]
  factions: { id: number; name: string }[]
  onPatchCampaign: (patch: Partial<Campaign>) => void
  onPatchNode: (id: string, patch: Partial<CampaignNode>) => void
  onPatchCutscene: (id: string, patch: Partial<Cutscene>) => void
  onAddNode: () => void
  onAddCutscene: () => void
  onDeleteNode: (id: string) => void
  onDeleteCutscene: (id: string) => void
  onSetStart: (id: string) => void
}) {
  const [selected, setSelected] = useState<string | null>(null)

  // ── grafo statyba iš duomenų; pozicijos gyvos drag'ui — vietinėje būsenoje ──
  const graph = useMemo(() => buildFlowGraph(campaign, nodes, cutscenes), [campaign, nodes, cutscenes])
  const [rfNodes, setRfNodes] = useState<RFNode[]>([])
  useEffect(() => {
    setRfNodes((prev) => graph.nodes.map((s) => {
      const old = prev.find((p) => p.id === s.id)
      return {
        id: s.id, type: s.type, position: old?.dragging ? old.position : s.position,
        data: s.data, selected: s.id === selected, deletable: false,
      }
    }))
  }, [graph, selected])

  const edges: Edge[] = useMemo(() => graph.edges.map((e) => ({
    id: e.id, source: e.source, target: e.target,
    sourceHandle: e.sourceHandle, targetHandle: e.targetHandle,
    label: e.label,
    animated: e.kind === 'flow',
    style: {
      stroke: EDGE_COLORS[e.kind], strokeWidth: e.kind === 'flow' ? 2 : 1.5,
      strokeDasharray: e.kind === 'ruleLink' ? '4 4' : undefined,
    },
    labelStyle: { fill: EDGE_COLORS[e.kind], fontSize: 9, fontWeight: 700 },
    labelBgStyle: { fill: '#0a0812', fillOpacity: 0.85 },
    markerEnd: e.kind === 'ruleLink' ? undefined : { type: MarkerType.ArrowClosed, color: EDGE_COLORS[e.kind], width: 16, height: 16 },
    data: { kind: e.kind, deletable: e.deletable },
  })), [graph])

  const onNodesChange = useCallback((changes: NodeChange<RFNode>[]) => {
    setRfNodes((ns) => applyNodeChanges(changes, ns))
    for (const ch of changes) {
      if (ch.type === 'select' && ch.selected) setSelected(ch.id)
    }
  }, [])

  const saveLayout = useCallback((patch: FlowLayout) => {
    const cur = getFlowLayout(campaign)
    onPatchCampaign({ metadata: { ...campaign.metadata, flowLayout: { ...cur, ...patch } } })
  }, [campaign, onPatchCampaign])

  const onNodeDragStop = useCallback((_: unknown, node: RFNode) => {
    saveLayout({ [node.id]: { x: Math.round(node.position.x), y: Math.round(node.position.y) } })
  }, [saveLayout])

  // ── jungtys ──
  const onConnect = useCallback((conn: Connection) => {
    if (!conn.source || !conn.target) return
    const r = resolveConnect(conn.source, conn.sourceHandle, conn.target)
    if (!r) return
    if (r.type === 'flow') {
      const from = nodes.find((n) => n.id === r.fromNodeId)
      const to = nodes.find((n) => n.id === r.toNodeId)
      if (!from || !to) return
      onPatchNode(from.id, { nextNodeIds: [...new Set([...from.nextNodeIds, to.id])] })
      onPatchNode(to.id, { prevNodeIds: [...new Set([...to.prevNodeIds, from.id])] })
    } else if (r.type === 'cutsceneLink') {
      const key = r.slot === 'pre' ? 'preCutsceneId' : r.slot === 'post' ? 'postCutsceneId' : 'failureCutsceneId'
      onPatchNode(r.nodeId, { [key]: r.cutsceneId })
    } else if (r.type === 'ruleCutscene') {
      const n = nodes.find((x) => x.id === r.nodeId)
      if (!n) return
      onPatchNode(n.id, { scenario: { ...n.scenario, rules: withRuleCutscene(n.scenario?.rules ?? [], r.ruleIdx, r.cutsceneId) } })
    }
  }, [nodes, onPatchNode])

  const onEdgeClick = useCallback((e: React.MouseEvent, edge: Edge) => {
    e.stopPropagation()
    const d = edge.data as { kind: string; deletable: boolean } | undefined
    if (!d?.deletable) return
    if (!confirm('Pašalinti šį ryšį?')) return
    const [tag, a, b] = edge.id.split(':')
    if (tag === 'ef') {
      const from = nodes.find((n) => n.id === a); const to = nodes.find((n) => n.id === b)
      if (from) onPatchNode(from.id, { nextNodeIds: from.nextNodeIds.filter((x) => x !== b) })
      if (to) onPatchNode(to.id, { prevNodeIds: to.prevNodeIds.filter((x) => x !== a) })
    } else if (tag === 'ec') {
      const key = a === 'pre' ? 'preCutsceneId' : a === 'post' ? 'postCutsceneId' : 'failureCutsceneId'
      onPatchNode(b, { [key]: null })
    } else if (tag === 'etc') {
      const n = nodes.find((x) => x.id === a)
      if (n) onPatchNode(n.id, { scenario: { ...n.scenario, rules: withRuleCutscene(n.scenario?.rules ?? [], Number(b), null) } })
    }
  }, [nodes, onPatchNode])

  // ── toolbar veiksmai ──
  const sel = selected ? parseFlowId(selected) : null
  const selMission = sel?.kind === 'mission' ? nodes.find((n) => n.id === sel.refId) ?? null : null
  const selCutscene = sel?.kind === 'cutscene' ? cutscenes.find((c) => c.id === sel.refId) ?? null : null
  const selTrigger = sel?.kind === 'trigger' ? nodes.find((n) => n.id === sel.refId) ?? null : null
  const selRule: ScenarioRule | null = sel?.kind === 'trigger' ? (selTrigger?.scenario?.rules ?? [])[sel.ruleIdx] ?? null : null

  const addTrigger = () => {
    if (!selMission) return
    const rules = [...(selMission.scenario?.rules ?? []), { ...NEW_RULE, actions: [{ type: 'dialogue' as const, text: '' }] }]
    onPatchNode(selMission.id, { scenario: { ...selMission.scenario, rules } })
    setSelected(tId(selMission.id, rules.length - 1))
  }

  const doAutoLayout = () => {
    onPatchCampaign({ metadata: { ...campaign.metadata, flowLayout: autoLayout(campaign, nodes, cutscenes) } })
  }

  const patchRule = (r: ScenarioRule) => {
    if (!selTrigger || sel?.kind !== 'trigger') return
    const rules = (selTrigger.scenario?.rules ?? []).map((x, i) => i === sel.ruleIdx ? r : x)
    onPatchNode(selTrigger.id, { scenario: { ...selTrigger.scenario, rules } })
  }
  const deleteRule = () => {
    if (!selTrigger || sel?.kind !== 'trigger') return
    const rules = (selTrigger.scenario?.rules ?? []).filter((_, i) => i !== sel.ruleIdx)
    onPatchNode(selTrigger.id, { scenario: { ...selTrigger.scenario, rules } })
    setSelected(mId(selTrigger.id))
  }

  const Btn = ({ onClick, children, disabled, title }: { onClick: () => void; children: React.ReactNode; disabled?: boolean; title?: string }) => (
    <button onClick={onClick} disabled={disabled} title={title}
      className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-40"
      style={{ background: `rgba(${GOLD},0.14)`, border: `1px solid rgba(${GOLD},0.35)`, color: 'var(--gold)' }}>
      {children}
    </button>
  )

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'minmax(0, 1fr) 360px' }}>
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--bg-border)', background: '#0a0812' }}>
        <div className="flex flex-wrap items-center gap-1.5 px-2.5 py-2" style={{ borderBottom: '1px solid var(--bg-border)' }}>
          <Btn onClick={onAddNode}>+ Misija</Btn>
          <Btn onClick={onAddCutscene}>+ Cutscene</Btn>
          <Btn onClick={addTrigger} disabled={!selMission} title="Pažymėk misiją">+ ⚡ Trigeris</Btn>
          <Btn onClick={() => selMission && onSetStart(selMission.id)} disabled={!selMission}>★ Pradinė</Btn>
          <span className="flex-1" />
          <Btn onClick={doAutoLayout} title="Išdėstyti automatiškai pagal seką">🧭 Auto-layout</Btn>
        </div>
        <div style={{ height: '68vh', minHeight: 480 }} data-testid="campaign-flow">
          <ReactFlow
            nodes={rfNodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onNodeDragStop={onNodeDragStop}
            onConnect={onConnect}
            onEdgeClick={onEdgeClick}
            onPaneClick={() => setSelected(null)}
            deleteKeyCode={null}
            fitView
            minZoom={0.2}
            maxZoom={1.6}
            proOptions={{ hideAttribution: true }}
            colorMode="dark"
            style={{ background: 'radial-gradient(120% 90% at 50% 0%, #16101f 0%, #0a0812 70%)' }}
          >
            <Background color="rgba(240,180,41,0.12)" gap={26} size={1.5} />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable style={{ background: '#0e0a16' }}
              nodeColor={(n) => n.type === 'mission' ? 'rgba(240,180,41,0.6)' : n.type === 'cutscene' ? 'rgba(167,139,250,0.6)' : 'rgba(167,139,250,0.3)'} />
          </ReactFlow>
        </div>
        <p className="px-3 py-1.5 text-[10px]" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--bg-border)' }}>
          Tempk nuo mazgo taškų: <span style={{ color: EDGE_COLORS.flow }}>dešinys → kita misija</span> ·{' '}
          <span style={{ color: EDGE_COLORS.pre }}>pre</span>/<span style={{ color: EDGE_COLORS.post }}>post</span>/<span style={{ color: EDGE_COLORS.fail }}>fail</span> → cutscene ·{' '}
          <span style={{ color: '#a78bfa' }}>⚡ → cutscene</span>. Paspaudus rodyklę — ryšys šalinamas. Pozicijas išsaugo „💾 Išsaugoti viską“.
        </p>
      </div>

      {/* ── šoninis redaktorius ── */}
      <div className="rounded-xl p-3 overflow-y-auto" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', maxHeight: '76vh' }}>
        {selMission ? (
          <AdminNodeEditor node={selMission} chapters={chapters} cutscenes={cutscenes} factions={factions}
            isStart={campaign.startNodeId === selMission.id}
            onChange={(p) => onPatchNode(selMission.id, p)}
            onSetStart={() => onSetStart(selMission.id)}
            onDelete={() => { onDeleteNode(selMission.id); setSelected(null) }} />
        ) : selCutscene ? (
          <AdminCutsceneEditor cutscene={selCutscene}
            onChange={(p) => onPatchCutscene(selCutscene.id, p)}
            onDelete={() => { onDeleteCutscene(selCutscene.id); setSelected(null) }} />
        ) : selRule && sel?.kind === 'trigger' ? (
          <TriggerEditor rule={selRule} cutscenes={cutscenes} onChange={patchRule} onDelete={deleteRule} />
        ) : (
          <div className="text-sm space-y-2" style={{ color: 'var(--text-muted)' }}>
            <p className="font-bold" style={{ color: 'var(--gold)' }}>Kampanijos srautas</p>
            <p>Pažymėk burbulą — čia atsidarys jo redaktorius:</p>
            <p>⚔️ misija — kova, tikslai, atlygiai;<br />🎬 cutscene — scena (VN arba motion-comic);<br />⚡ trigeris — įvykis kovos metu (ėjimas, korta, HP…).</p>
            <p>Naujus ryšius kurk tempdamas nuo spalvotų taškų.</p>
          </div>
        )}
      </div>
    </div>
  )
}
