'use client'

// ══════════════════════════════════════════════════════════════════════════════
// DEV: kampanijos srauto (React Flow) editoriaus peržiūra su mock duomenimis —
// be Supabase/auth. Viešas dev route kaip /dev/cutscene. Playwright smoke.
// ══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { AdminCampaignFlow } from '@/components/admin/campaign/flow/AdminCampaignFlow'
import type { Campaign, CampaignNode, Cutscene } from '@/lib/campaign/types'

const uuid = () => 'x-' + Math.random().toString(36).slice(2) + Date.now().toString(36)

const mkNode = (id: string, title: string, over: Partial<CampaignNode> = {}): CampaignNode => ({
  id, campaignId: 'demo', chapterId: null, title, subtitle: null, description: null, loreText: null,
  posX: 50, posY: 50, iconType: 'battle', nodeColor: null, missionType: 'STANDARD_CARD_BATTLE',
  unlockRule: { type: 'all_prev' }, prevNodeIds: [], nextNodeIds: [], branchChoice: null,
  objectives: [{ id: 'win', kind: 'win', label: 'Laimėk', primary: true }],
  preCutsceneId: null, postCutsceneId: null, failureCutsceneId: null,
  battleConfig: { playerDeckMode: 'collection', enemyDeckMode: 'faction' }, scenario: {},
  rewardPayload: {}, replay: { allowed: true }, difficulty: {}, adminNotes: null, status: 'active', sortOrder: 0,
  ...over,
})

const CS1: Cutscene = { id: 'cs1', campaignId: 'demo', title: 'Koplyčios įspėjimas', type: 'dialogue', backgroundImageUrl: null, backgroundVideoUrl: null, musicUrl: null, ambientUrl: null, skippable: true, autoplay: true, steps: [{ id: 's1', side: 'left', text: 'Demo' }], metadata: { motionComic: { version: 1, characters: [], shots: [{ id: 'sh1', background: '/cutscene-demo/chapel-wide.svg' }] } } }
const CS2: Cutscene = { id: 'cs2', campaignId: 'demo', title: 'Vartai krito', type: 'dialogue', backgroundImageUrl: null, backgroundVideoUrl: null, musicUrl: null, ambientUrl: null, skippable: true, autoplay: true, steps: [{ id: 's1', side: 'narrator', text: 'Demo' }], metadata: {} }

const N1 = mkNode('n1', 'Koplyčios gynyba', {
  sortOrder: 0, nextNodeIds: ['n2'], preCutsceneId: 'cs1',
  scenario: { rules: [
    { trigger: 'onTurnStart', turn: 3, once: true, actions: [{ type: 'dialogue', cutsceneId: 'cs2' }] },
    { trigger: 'onCondition', once: true, conditions: [{ lhs: 'playerHp', op: '<=', rhs: 10 }], actions: [{ type: 'dialogue', text: 'Laikykis!', characterName: 'Vadas' }] },
  ] },
})
const N2 = mkNode('n2', 'Vartų šturmas', { sortOrder: 1, prevNodeIds: ['n1'], nextNodeIds: ['n3'], postCutsceneId: 'cs2', iconType: 'gate', missionType: 'GATE_DEFENSE' })
const N3 = mkNode('n3', 'Belzatoro bokštas', { sortOrder: 2, prevNodeIds: ['n2'], iconType: 'boss', missionType: 'BOSS_BATTLE', failureCutsceneId: 'cs2' })

export default function DevCampaignFlowPage() {
  const [campaign, setCampaign] = useState<Campaign>({
    id: 'demo', slug: 'demo', title: 'DEV srauto peržiūra', subtitle: null, description: null,
    coverImageUrl: null, campaignType: 'story', lorePeriod: null, relatedFactions: [], mapImageUrl: null,
    mapNaturalW: 1920, mapNaturalH: 1080, startNodeId: 'n1', visibility: 'draft', requiredLevel: 1,
    requiredProgress: {}, sortOrder: 0, metadata: {},
  })
  const [nodes, setNodes] = useState<CampaignNode[]>([N1, N2, N3])
  const [cutscenes, setCutscenes] = useState<Cutscene[]>([CS1, CS2])

  return (
    <div className="min-h-screen p-4" style={{ background: 'var(--bg-base, #0a0812)' }}>
      <h1 className="text-lg font-bold mb-3" style={{ color: 'rgb(240,180,41)', fontFamily: 'var(--rvn-font-display)' }}>
        DEV — Kampanijos srauto editorius (mock duomenys, niekas nesisaugo)
      </h1>
      <AdminCampaignFlow
        campaign={campaign} chapters={[]} nodes={nodes} cutscenes={cutscenes} factions={[]}
        onPatchCampaign={(p) => setCampaign((c) => ({ ...c, ...p }))}
        onPatchNode={(id, p) => setNodes((ns) => ns.map((n) => n.id === id ? { ...n, ...p } : n))}
        onPatchCutscene={(id, p) => setCutscenes((cs) => cs.map((c) => c.id === id ? { ...c, ...p } : c))}
        onAddNode={() => setNodes((ns) => [...ns, mkNode(uuid(), 'Nauja misija', { sortOrder: ns.length })])}
        onAddCutscene={() => setCutscenes((cs) => [...cs, { ...CS2, id: uuid(), title: 'Nauja cutscene', metadata: {} }])}
        onDeleteNode={(id) => setNodes((ns) => ns.filter((n) => n.id !== id))}
        onDeleteCutscene={(id) => setCutscenes((cs) => cs.filter((c) => c.id !== id))}
        onSetStart={(id) => setCampaign((c) => ({ ...c, startNodeId: id }))}
      />
    </div>
  )
}
