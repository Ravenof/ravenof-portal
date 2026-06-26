'use client'

// ── Admin mission/node editor: friendly fields + Advanced JSON tab ────────────
import { useState } from 'react'
import { MISSION_TYPES } from '@/lib/campaign/types'
import type {
  CampaignNode, CampaignChapter, Cutscene, MissionObjective, ObjectiveKind,
  NodeIconType, BattleConfig, ScenarioConfig, RewardPayload, Visibility,
} from '@/lib/campaign/types'

type Faction = { id: number; name: string }
const inp: React.CSSProperties = { background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }
const ICONS: NodeIconType[] = ['battle', 'story', 'boss', 'siege', 'gate', 'wave', 'elite', 'reward', 'lock']
const OBJ_KINDS: ObjectiveKind[] = ['win', 'survive_turns', 'defeat_within', 'protect_objective', 'keep_unit_alive', 'kill_count', 'no_more_than', 'keep_alive_count', 'prevent_breach', 'custom']

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>{label}</label>{children}</div>
}

export function AdminNodeEditor({ node, chapters, cutscenes, factions, isStart, onChange, onSetStart, onDelete }: {
  node: CampaignNode
  chapters: CampaignChapter[]
  cutscenes: Cutscene[]
  factions: Faction[]
  isStart: boolean
  onChange: (patch: Partial<CampaignNode>) => void
  onSetStart: () => void
  onDelete: () => void
}) {
  const [tab, setTab] = useState<'basic' | 'battle' | 'objectives' | 'rewards' | 'json'>('basic')
  const bc = node.battleConfig ?? ({} as BattleConfig)
  const rw = node.rewardPayload ?? ({} as RewardPayload)
  const patchBc = (p: Partial<BattleConfig>) => onChange({ battleConfig: { ...bc, ...p } })
  const patchRw = (p: Partial<RewardPayload>) => onChange({ rewardPayload: { ...rw, ...p } })

  const [bcJson, setBcJson] = useState(JSON.stringify(node.battleConfig ?? {}, null, 2))
  const [scJson, setScJson] = useState(JSON.stringify(node.scenario ?? {}, null, 2))
  const [jsonErr, setJsonErr] = useState<string | null>(null)

  const objs = node.objectives ?? []
  const setObj = (i: number, p: Partial<MissionObjective>) => onChange({ objectives: objs.map((o, j) => j === i ? { ...o, ...p } : o) })
  const addObj = () => onChange({ objectives: [...objs, { id: 'obj' + (objs.length + 1), kind: 'win', label: 'Laimėk kovą', primary: objs.length === 0 }] })
  const delObj = (i: number) => onChange({ objectives: objs.filter((_, j) => j !== i) })

  const Tab = ({ id, label }: { id: typeof tab; label: string }) => (
    <button onClick={() => setTab(id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
      style={{ background: tab === id ? 'rgba(240,180,41,0.18)' : 'transparent', border: '1px solid ' + (tab === id ? 'rgba(240,180,41,0.4)' : 'var(--bg-border)'), color: tab === id ? 'var(--gold)' : 'var(--text-muted)' }}>{label}</button>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>Mazgas: {node.title}</h3>
        <div className="flex gap-1.5">
          <button onClick={onSetStart} disabled={isStart} className="px-2 py-1 rounded text-[10px] font-bold disabled:opacity-40"
            style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.4)', color: '#34d399' }}>{isStart ? '★ Pradinis' : 'Padaryti pradiniu'}</button>
          <button onClick={onDelete} className="px-2 py-1 rounded text-[10px] font-bold" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171' }}>Trinti</button>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        <Tab id="basic" label="Pagrindai" /><Tab id="battle" label="Kova" /><Tab id="objectives" label="Tikslai" /><Tab id="rewards" label="Atlygis" /><Tab id="json" label="Advanced JSON" />
      </div>

      {tab === 'basic' && (
        <div className="space-y-2">
          <Field label="Pavadinimas"><input value={node.title} onChange={(e) => onChange({ title: e.target.value })} className="w-full px-2 py-1.5 rounded text-sm" style={inp} /></Field>
          <Field label="Paantraštė"><input value={node.subtitle ?? ''} onChange={(e) => onChange({ subtitle: e.target.value })} className="w-full px-2 py-1.5 rounded text-sm" style={inp} /></Field>
          <Field label="Lore tekstas"><textarea value={node.loreText ?? ''} onChange={(e) => onChange({ loreText: e.target.value })} rows={2} className="w-full px-2 py-1.5 rounded text-sm" style={inp} /></Field>
          <Field label="Aprašymas"><textarea value={node.description ?? ''} onChange={(e) => onChange({ description: e.target.value })} rows={2} className="w-full px-2 py-1.5 rounded text-sm" style={inp} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Misijos tipas"><select value={node.missionType} onChange={(e) => onChange({ missionType: e.target.value as CampaignNode['missionType'] })} className="w-full px-2 py-1.5 rounded text-sm" style={inp}>{MISSION_TYPES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></Field>
            <Field label="Ikona"><select value={node.iconType} onChange={(e) => onChange({ iconType: e.target.value as NodeIconType })} className="w-full px-2 py-1.5 rounded text-sm" style={inp}>{ICONS.map((i) => <option key={i} value={i}>{i}</option>)}</select></Field>
            <Field label="Skyrius"><select value={node.chapterId ?? ''} onChange={(e) => onChange({ chapterId: e.target.value || null })} className="w-full px-2 py-1.5 rounded text-sm" style={inp}><option value="">—</option>{chapters.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></Field>
            <Field label="Būsena"><select value={node.status} onChange={(e) => onChange({ status: e.target.value as Visibility })} className="w-full px-2 py-1.5 rounded text-sm" style={inp}><option value="active">active</option><option value="draft">draft</option><option value="hidden">hidden</option></select></Field>
            <Field label="Atrakinimo taisyklė"><select value={node.unlockRule?.type ?? 'all_prev'} onChange={(e) => onChange({ unlockRule: { type: e.target.value as 'all_prev' | 'any_prev' | 'always' } })} className="w-full px-2 py-1.5 rounded text-sm" style={inp}><option value="all_prev">Visi ankstesni</option><option value="any_prev">Bet kuris ankstesnis</option><option value="always">Visada</option></select></Field>
            <Field label="Pozicija X% / Y%"><div className="flex gap-1"><input type="number" value={node.posX} onChange={(e) => onChange({ posX: Number(e.target.value) })} className="w-1/2 px-2 py-1.5 rounded text-sm" style={inp} /><input type="number" value={node.posY} onChange={(e) => onChange({ posY: Number(e.target.value) })} className="w-1/2 px-2 py-1.5 rounded text-sm" style={inp} /></div></Field>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Pre-cutscene"><CutSel cutscenes={cutscenes} value={node.preCutsceneId} onChange={(v) => onChange({ preCutsceneId: v })} /></Field>
            <Field label="Post-cutscene"><CutSel cutscenes={cutscenes} value={node.postCutsceneId} onChange={(v) => onChange({ postCutsceneId: v })} /></Field>
            <Field label="Fail-cutscene"><CutSel cutscenes={cutscenes} value={node.failureCutsceneId} onChange={(v) => onChange({ failureCutsceneId: v })} /></Field>
          </div>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Ankstesni: {node.prevNodeIds?.length ?? 0} · Kiti: {node.nextNodeIds?.length ?? 0}</p>
        </div>
      )}

      {tab === 'battle' && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Žaidėjo kaladė"><select value={bc.playerDeckMode ?? 'collection'} onChange={(e) => patchBc({ playerDeckMode: e.target.value as BattleConfig['playerDeckMode'] })} className="w-full px-2 py-1.5 rounded text-sm" style={inp}><option value="collection">Žaidėjo kaladė</option><option value="story">Istorinė kaladė (ID)</option><option value="faction">Pagal frakciją</option><option value="locked">Užrakinta</option></select></Field>
            <Field label="Istorinės kaladės ID"><input value={bc.storyDeckId ?? ''} onChange={(e) => patchBc({ storyDeckId: e.target.value || null })} className="w-full px-2 py-1.5 rounded text-sm" style={inp} /></Field>
            <Field label="Priešo šaltinis"><select value={bc.enemyDeckMode ?? 'faction'} onChange={(e) => patchBc({ enemyDeckMode: e.target.value as BattleConfig['enemyDeckMode'] })} className="w-full px-2 py-1.5 rounded text-sm" style={inp}><option value="faction">Pagal frakciją</option><option value="deck">Kaladės ID</option><option value="waves">Bangos (scenario)</option><option value="boss">Bosas</option><option value="mixed">Mišrus</option></select></Field>
            <Field label="Priešo frakcija"><select value={bc.enemyFactionId ?? ''} onChange={(e) => patchBc({ enemyFactionId: e.target.value ? Number(e.target.value) : null })} className="w-full px-2 py-1.5 rounded text-sm" style={inp}><option value="">—</option>{factions.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></Field>
            <Field label="Priešo kaladės ID"><input value={bc.enemyDeckId ?? ''} onChange={(e) => patchBc({ enemyDeckId: e.target.value || null })} className="w-full px-2 py-1.5 rounded text-sm" style={inp} /></Field>
            <Field label="Priešo vardas"><input value={bc.enemyName ?? ''} onChange={(e) => patchBc({ enemyName: e.target.value || null })} className="w-full px-2 py-1.5 rounded text-sm" style={inp} /></Field>
            <Field label="AI sunkumas"><select value={bc.difficulty ?? 'normal'} onChange={(e) => patchBc({ difficulty: e.target.value as 'easy' | 'normal' | 'hard' })} className="w-full px-2 py-1.5 rounded text-sm" style={inp}><option value="easy">Lengvas</option><option value="normal">Vidutinis</option><option value="hard">Sunkus</option></select></Field>
            <Field label="Ėjimų limitas"><input type="number" value={bc.turnLimit ?? ''} onChange={(e) => patchBc({ turnLimit: e.target.value ? Number(e.target.value) : null })} className="w-full px-2 py-1.5 rounded text-sm" style={inp} /></Field>
          </div>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Bangoms / vartų HP / pradinei lentai naudok „Advanced JSON“ → scenario lauką.</p>
        </div>
      )}

      {tab === 'objectives' && (
        <div className="space-y-2">
          {objs.map((o, i) => (
            <div key={i} className="rounded-lg p-2 space-y-1.5" style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)' }}>
              <div className="flex gap-1.5 items-center">
                <select value={o.kind} onChange={(e) => setObj(i, { kind: e.target.value as ObjectiveKind })} className="px-1.5 py-1 rounded text-xs" style={inp}>{OBJ_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}</select>
                <label className="text-[10px] flex items-center gap-1" style={{ color: 'var(--text-muted)' }}><input type="checkbox" checked={o.primary} onChange={(e) => setObj(i, { primary: e.target.checked })} />pagrindinis</label>
                <button onClick={() => delObj(i)} className="ml-auto text-[10px]" style={{ color: '#f87171' }}>✕</button>
              </div>
              <input value={o.label} onChange={(e) => setObj(i, { label: e.target.value })} placeholder="Tikslo tekstas" className="w-full px-2 py-1 rounded text-xs" style={inp} />
              <input value={JSON.stringify(o.params ?? {})} onChange={(e) => { try { setObj(i, { params: JSON.parse(e.target.value) }) } catch { /* */ } }} placeholder='{"turns":8}' className="w-full px-2 py-1 rounded text-xs font-mono" style={inp} />
            </div>
          ))}
          <button onClick={addObj} className="px-3 py-1.5 rounded text-xs font-bold" style={{ background: 'rgba(240,180,41,0.15)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}>+ Tikslas</button>
        </div>
      )}

      {tab === 'rewards' && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Auksas"><input type="number" value={rw.gold ?? ''} onChange={(e) => patchRw({ gold: e.target.value ? Number(e.target.value) : undefined })} className="w-full px-2 py-1.5 rounded text-sm" style={inp} /></Field>
          <Field label="XP"><input type="number" value={rw.exp ?? ''} onChange={(e) => patchRw({ exp: e.target.value ? Number(e.target.value) : undefined })} className="w-full px-2 py-1.5 rounded text-sm" style={inp} /></Field>
          <Field label="Boosteriai"><input type="number" value={rw.boosters ?? ''} onChange={(e) => patchRw({ boosters: e.target.value ? Number(e.target.value) : undefined })} className="w-full px-2 py-1.5 rounded text-sm" style={inp} /></Field>
          <Field label="Min. kortos retumas"><select value={rw.cardMin ?? ''} onChange={(e) => patchRw({ cardMin: (e.target.value || undefined) as RewardPayload['cardMin'] })} className="w-full px-2 py-1.5 rounded text-sm" style={inp}><option value="">—</option><option value="magic">magic</option><option value="unique">unique</option><option value="epic">epic</option><option value="legendary">legendary</option></select></Field>
          <Field label="Kortų ID (kableliais)"><input value={(rw.cards ?? []).join(',')} onChange={(e) => patchRw({ cards: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} className="w-full px-2 py-1.5 rounded text-sm" style={inp} /></Field>
          <Field label="Kodekso atrakinimai (kableliais)"><input value={(rw.codexUnlocks ?? []).join(',')} onChange={(e) => patchRw({ codexUnlocks: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} className="w-full px-2 py-1.5 rounded text-sm" style={inp} /></Field>
        </div>
      )}

      {tab === 'json' && (
        <div className="space-y-2">
          <Field label="battleConfig (JSON)"><textarea value={bcJson} onChange={(e) => setBcJson(e.target.value)} rows={6} className="w-full px-2 py-1.5 rounded text-xs font-mono" style={inp} /></Field>
          <Field label="scenario (JSON: rules, waves, objectives, startingBoard, battleMap)"><textarea value={scJson} onChange={(e) => setScJson(e.target.value)} rows={10} className="w-full px-2 py-1.5 rounded text-xs font-mono" style={inp} /></Field>
          {jsonErr && <p className="text-xs" style={{ color: '#f87171' }}>{jsonErr}</p>}
          <button onClick={() => { try { const b = JSON.parse(bcJson) as BattleConfig; const sc = JSON.parse(scJson) as ScenarioConfig; setJsonErr(null); onChange({ battleConfig: b, scenario: sc }) } catch (e) { setJsonErr('Netinkamas JSON: ' + (e as Error).message) } }}
            className="px-3 py-1.5 rounded text-xs font-bold" style={{ background: 'rgba(240,180,41,0.15)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}>Pritaikyti JSON</button>
        </div>
      )}
    </div>
  )
}

function CutSel({ cutscenes, value, onChange }: { cutscenes: Cutscene[]; value?: string | null; onChange: (v: string | null) => void }) {
  return <select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} className="w-full px-2 py-1.5 rounded text-sm" style={inp}><option value="">—</option>{cutscenes.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
}
