'use client'

// ════════════════════════════════════════════════════════════════════════════
// AdminCampaignEditor — full Campaign Builder container.
// Tabs: Nustatymai | Žemėlapis ir mazgai | Cutscenes | Validacija.
// Loads the campaign (admin RLS), edits in local state, persists via Supabase.
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { loadFullCampaign } from '@/lib/campaign/missionLoader'
import { validateCampaign } from '@/lib/campaign/validate'
import { AdminCampaignMapEditor } from './AdminCampaignMapEditor'
import { AdminNodeEditor } from './AdminNodeEditor'
import { AdminCutsceneEditor } from './AdminCutsceneEditor'
import type { Campaign, CampaignChapter, CampaignNode, Cutscene, Visibility } from '@/lib/campaign/types'

const GOLD = '240,180,41'
const inp: React.CSSProperties = { background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'n-' + Math.random().toString(36).slice(2) + Date.now())

/* eslint-disable @typescript-eslint/no-explicit-any */
function nodeRow(n: CampaignNode): any {
  return {
    id: n.id, campaign_id: n.campaignId, chapter_id: n.chapterId, title: n.title, subtitle: n.subtitle,
    description: n.description, lore_text: n.loreText, pos_x: n.posX, pos_y: n.posY, icon_type: n.iconType,
    node_color: n.nodeColor, mission_type: n.missionType, unlock_rule: n.unlockRule, prev_node_ids: n.prevNodeIds,
    next_node_ids: n.nextNodeIds, branch_choice: n.branchChoice, objectives: n.objectives,
    pre_cutscene_id: n.preCutsceneId, post_cutscene_id: n.postCutsceneId, failure_cutscene_id: n.failureCutsceneId,
    battle_config: n.battleConfig, scenario: n.scenario, reward_payload: n.rewardPayload, replay: n.replay,
    difficulty: n.difficulty, admin_notes: n.adminNotes, status: n.status, sort_order: n.sortOrder,
  }
}
function cutsceneRow(c: Cutscene): any {
  return {
    id: c.id, campaign_id: c.campaignId, title: c.title, type: c.type, background_image_url: c.backgroundImageUrl,
    background_video_url: c.backgroundVideoUrl, music_url: c.musicUrl, ambient_url: c.ambientUrl,
    skippable: c.skippable, autoplay: c.autoplay, steps: c.steps, metadata: c.metadata,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function AdminCampaignEditor({ campaignId }: { campaignId: string }) {
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [chapters, setChapters] = useState<CampaignChapter[]>([])
  const [nodes, setNodes] = useState<CampaignNode[]>([])
  const [cutscenes, setCutscenes] = useState<Cutscene[]>([])
  const [factions, setFactions] = useState<{ id: number; name: string }[]>([])
  const [tab, setTab] = useState<'settings' | 'map' | 'cutscenes' | 'validate'>('settings')
  const [selNode, setSelNode] = useState<string | null>(null)
  const [connectFrom, setConnectFrom] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    loadFullCampaign(campaignId).then((f) => {
      if (!f) return
      setCampaign(f.campaign); setChapters(f.chapters); setNodes(f.nodes); setCutscenes(f.cutscenes)
    })
    createClient().from('factions').select('id, name').order('sort_order').then(({ data }) => setFactions((data as { id: number; name: string }[]) ?? []))
  }, [campaignId])

  if (!campaign) return <p className="p-8 text-sm" style={{ color: 'var(--text-muted)' }}>Kraunama…</p>

  const patchNode = (id: string, patch: Partial<CampaignNode>) => setNodes((ns) => ns.map((n) => n.id === id ? { ...n, ...patch } : n))

  const addNode = async (x: number, y: number) => {
    const n: CampaignNode = {
      id: uuid(), campaignId, chapterId: chapters[0]?.id ?? null, title: 'Nauja misija', subtitle: null,
      description: null, loreText: null, posX: Math.round(x * 10) / 10, posY: Math.round(y * 10) / 10,
      iconType: 'battle', nodeColor: null, missionType: 'STANDARD_CARD_BATTLE', unlockRule: { type: 'all_prev' },
      prevNodeIds: [], nextNodeIds: [], branchChoice: null, objectives: [{ id: 'obj1', kind: 'win', label: 'Laimėk kovą', primary: true }],
      preCutsceneId: null, postCutsceneId: null, failureCutsceneId: null,
      battleConfig: { playerDeckMode: 'collection', enemyDeckMode: 'faction', difficulty: 'normal' },
      scenario: {}, rewardPayload: { gold: 100, exp: 50 }, replay: { allowed: true }, difficulty: {},
      adminNotes: null, status: 'active', sortOrder: nodes.length,
    }
    await createClient().from('campaign_nodes').insert(nodeRow(n))
    setNodes((ns) => [...ns, n]); setSelNode(n.id)
  }

  const deleteNode = async (id: string) => {
    if (!confirm('Trinti mazgą?')) return
    await createClient().from('campaign_nodes').delete().eq('id', id)
    setNodes((ns) => ns.filter((n) => n.id !== id).map((n) => ({
      ...n, prevNodeIds: n.prevNodeIds.filter((p) => p !== id), nextNodeIds: n.nextNodeIds.filter((p) => p !== id),
    })))
    if (selNode === id) setSelNode(null)
  }

  const handleConnectClick = (id: string) => {
    if (!connectFrom) { setSelNode(id); return }
    if (connectFrom !== id) {
      setNodes((ns) => ns.map((n) => {
        if (n.id === connectFrom) return { ...n, nextNodeIds: [...new Set([...n.nextNodeIds, id])] }
        if (n.id === id) return { ...n, prevNodeIds: [...new Set([...n.prevNodeIds, connectFrom])] }
        return n
      }))
    }
    setConnectFrom(null)
  }

  const onSelectNodeMap = (id: string) => { if (connectFrom) handleConnectClick(id); else setSelNode(id) }

  const addChapter = () => {
    const c: CampaignChapter = { id: uuid(), campaignId, title: 'Naujas skyrius', description: null, sortOrder: chapters.length, backgroundImageUrl: null, backgroundVideoUrl: null, narration: null, metadata: {} }
    createClient().from('campaign_chapters').insert({ id: c.id, campaign_id: campaignId, title: c.title, sort_order: c.sortOrder }).then(() => setChapters((cs) => [...cs, c]))
  }

  const addCutscene = () => {
    const c: Cutscene = { id: uuid(), campaignId, title: 'Nauja cutscene', type: 'dialogue', backgroundImageUrl: null, backgroundVideoUrl: null, musicUrl: null, ambientUrl: null, skippable: true, autoplay: false, steps: [], metadata: {} }
    createClient().from('campaign_cutscenes').insert(cutsceneRow(c)).then(() => setCutscenes((cs) => [...cs, c]))
  }
  const patchCutscene = (id: string, patch: Partial<Cutscene>) => setCutscenes((cs) => cs.map((c) => c.id === id ? { ...c, ...patch } : c))
  const deleteCutscene = async (id: string) => { if (!confirm('Trinti cutscene?')) return; await createClient().from('campaign_cutscenes').delete().eq('id', id); setCutscenes((cs) => cs.filter((c) => c.id !== id)) }

  const saveAll = async () => {
    setSaving(true); setMsg(null)
    const supabase = createClient()
    const cr = {
      title: campaign.title, slug: campaign.slug, subtitle: campaign.subtitle, description: campaign.description,
      cover_image_url: campaign.coverImageUrl, campaign_type: campaign.campaignType, lore_period: campaign.lorePeriod,
      related_factions: campaign.relatedFactions, map_image_url: campaign.mapImageUrl, visibility: campaign.visibility,
      required_level: campaign.requiredLevel, start_node_id: campaign.startNodeId, sort_order: campaign.sortOrder,
    }
    const e1 = await supabase.from('campaigns').update(cr).eq('id', campaignId)
    const e2 = nodes.length ? await supabase.from('campaign_nodes').upsert(nodes.map(nodeRow)) : { error: null }
    const e3 = cutscenes.length ? await supabase.from('campaign_cutscenes').upsert(cutscenes.map(cutsceneRow)) : { error: null }
    setSaving(false)
    const err = e1.error || e2.error || e3.error
    setMsg(err ? ('Klaida: ' + err.message) : '✓ Išsaugota')
    setTimeout(() => setMsg(null), 3000)
  }

  const issues = validateCampaign(campaign, nodes, cutscenes)
  const node = nodes.find((n) => n.id === selNode) ?? null

  const TabBtn = ({ id, label }: { id: typeof tab; label: string }) => (
    <button onClick={() => setTab(id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
      style={{ background: tab === id ? 'rgba(240,180,41,0.18)' : 'transparent', border: '1px solid ' + (tab === id ? 'rgba(240,180,41,0.4)' : 'var(--bg-border)'), color: tab === id ? 'var(--gold)' : 'var(--text-muted)' }}>{label}</button>
  )

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <header className="sticky top-0 z-30 border-b px-4 py-3" style={{ background: 'rgba(7,7,15,0.97)', backdropFilter: 'blur(16px)', borderColor: 'rgba(240,180,41,0.1)' }}>
        <div className="max-w-screen-lg mx-auto flex items-center gap-3 flex-wrap">
          <Link href="/admin/campaigns" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>← Kampanijos</Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <h1 className="text-base font-bold flex-1 truncate" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>{campaign.title}</h1>
          {msg && <span className="text-xs" style={{ color: msg.startsWith('✓') ? '#34d399' : '#f87171' }}>{msg}</span>}
          <button onClick={saveAll} disabled={saving} className="px-4 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50" style={{ background: `rgba(${GOLD},0.9)`, color: '#1a1206', fontFamily: 'var(--rvn-font-display)' }}>{saving ? 'Saugoma…' : '💾 Išsaugoti viską'}</button>
        </div>
        <div className="max-w-screen-lg mx-auto flex gap-1.5 mt-2 flex-wrap">
          <TabBtn id="settings" label="⚙ Nustatymai" /><TabBtn id="map" label="🗺️ Žemėlapis ir mazgai" /><TabBtn id="cutscenes" label="🎬 Cutscenes" /><TabBtn id="validate" label={`✓ Validacija${issues.length ? ` (${issues.length})` : ''}`} />
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto px-4 py-5">
        {tab === 'settings' && (
          <div className="max-w-xl space-y-3">
            <L label="Pavadinimas"><input value={campaign.title} onChange={(e) => setCampaign({ ...campaign, title: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm" style={inp} /></L>
            <L label="Slug (URL)"><input value={campaign.slug} onChange={(e) => setCampaign({ ...campaign, slug: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm" style={inp} /></L>
            <L label="Paantraštė"><input value={campaign.subtitle ?? ''} onChange={(e) => setCampaign({ ...campaign, subtitle: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm" style={inp} /></L>
            <L label="Aprašymas"><textarea value={campaign.description ?? ''} onChange={(e) => setCampaign({ ...campaign, description: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg text-sm" style={inp} /></L>
            <div className="grid grid-cols-2 gap-3">
              <L label="Matomumas"><select value={campaign.visibility} onChange={(e) => setCampaign({ ...campaign, visibility: e.target.value as Visibility })} className="w-full px-3 py-2 rounded-lg text-sm" style={inp}><option value="draft">draft</option><option value="active">active</option><option value="hidden">hidden</option></select></L>
              <L label="Reikiamas lygis"><input type="number" value={campaign.requiredLevel} onChange={(e) => setCampaign({ ...campaign, requiredLevel: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg text-sm" style={inp} /></L>
            </div>
            <L label="Viršelio paveikslo URL"><input value={campaign.coverImageUrl ?? ''} onChange={(e) => setCampaign({ ...campaign, coverImageUrl: e.target.value || null })} className="w-full px-3 py-2 rounded-lg text-sm" style={inp} /></L>
            <L label="Žemėlapio paveikslo URL (tuščia = Atlaso pasaulio žemėlapis)"><input value={campaign.mapImageUrl ?? ''} onChange={(e) => setCampaign({ ...campaign, mapImageUrl: e.target.value || null })} className="w-full px-3 py-2 rounded-lg text-sm" style={inp} /></L>
            <L label="Susijusios frakcijos (kableliais)"><input value={campaign.relatedFactions.join(', ')} onChange={(e) => setCampaign({ ...campaign, relatedFactions: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} className="w-full px-3 py-2 rounded-lg text-sm" style={inp} /></L>
            <L label="Pradinis mazgas"><select value={campaign.startNodeId ?? ''} onChange={(e) => setCampaign({ ...campaign, startNodeId: e.target.value || null })} className="w-full px-3 py-2 rounded-lg text-sm" style={inp}><option value="">—</option>{nodes.map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}</select></L>

            <div className="pt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold" style={{ color: 'var(--gold)' }}>Skyriai / aktai</span>
                <button onClick={addChapter} className="text-[11px] px-2 py-1 rounded" style={{ background: 'rgba(240,180,41,0.12)', color: 'var(--gold)' }}>+ Skyrius</button>
              </div>
              {chapters.map((c, i) => (
                <input key={c.id} value={c.title} onChange={(e) => setChapters((cs) => cs.map((x) => x.id === c.id ? { ...x, title: e.target.value } : x))}
                  className="w-full px-3 py-1.5 rounded-lg text-sm mb-1.5" style={inp} placeholder={`Skyrius ${i + 1}`} />
              ))}
            </div>
          </div>
        )}

        {tab === 'map' && (
          <div className="grid lg:grid-cols-2 gap-4">
            <AdminCampaignMapEditor campaign={campaign} nodes={nodes} selectedId={selNode} connectFrom={connectFrom}
              onAddNode={addNode} onMoveNode={(id, x, y) => patchNode(id, { posX: x, posY: y })}
              onSelectNode={onSelectNodeMap} onToggleConnect={(id) => setConnectFrom(connectFrom ? null : id)} />
            <div className="rounded-xl p-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
              {node ? (
                <AdminNodeEditor node={node} chapters={chapters} cutscenes={cutscenes} factions={factions}
                  isStart={campaign.startNodeId === node.id}
                  onChange={(p) => patchNode(node.id, p)}
                  onSetStart={() => setCampaign({ ...campaign, startNodeId: node.id })}
                  onDelete={() => deleteNode(node.id)} />
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Spausk ant žemėlapio – sukursi mazgą; pažymėk mazgą redagavimui.</p>
              )}
            </div>
          </div>
        )}

        {tab === 'cutscenes' && (
          <div className="space-y-4 max-w-2xl">
            <button onClick={addCutscene} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: 'rgba(240,180,41,0.15)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}>+ Nauja cutscene</button>
            {cutscenes.length === 0 && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nėra cutscenių.</p>}
            {cutscenes.map((c) => (
              <div key={c.id} className="rounded-xl p-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
                <AdminCutsceneEditor cutscene={c} onChange={(p) => patchCutscene(c.id, p)} onDelete={() => deleteCutscene(c.id)} />
              </div>
            ))}
          </div>
        )}

        {tab === 'validate' && (
          <div className="max-w-2xl space-y-2">
            {issues.length === 0 ? <p className="text-sm" style={{ color: '#34d399' }}>✓ Klaidų nerasta.</p> : issues.map((iss, i) => (
              <div key={i} className="rounded-lg px-3 py-2 text-sm flex gap-2" style={{ background: 'var(--bg-surface)', border: '1px solid ' + (iss.level === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(240,180,41,0.3)') }}>
                <span>{iss.level === 'error' ? '⛔' : '⚠️'}</span>
                <span style={{ color: iss.level === 'error' ? '#f87171' : '#fcd34d' }}>{iss.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>{label}</label>{children}</div>
}
