'use client'

// ── Admin cutscene editor: cutscene fields + step list (reorder/add/remove) ───
import type { Cutscene, CutsceneStep, CutsceneSide, CutsceneType } from '@/lib/campaign/types'

const inp: React.CSSProperties = { background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }
const SIDES: CutsceneSide[] = ['left', 'right', 'center', 'narrator']
const TYPES: CutsceneType[] = ['dialogue', 'cinematic', 'video', 'image_sequence', 'narration', 'mixed']

export function AdminCutsceneEditor({ cutscene, onChange, onDelete }: {
  cutscene: Cutscene
  onChange: (patch: Partial<Cutscene>) => void
  onDelete: () => void
}) {
  const steps = cutscene.steps ?? []
  const setStep = (i: number, p: Partial<CutsceneStep>) => onChange({ steps: steps.map((s, j) => j === i ? { ...s, ...p } : s) })
  const addStep = () => onChange({ steps: [...steps, { id: 'st' + (steps.length + 1), side: 'left', text: '' }] })
  const delStep = (i: number) => onChange({ steps: steps.filter((_, j) => j !== i) })
  const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= steps.length) return; const a = [...steps];[a[i], a[j]] = [a[j], a[i]]; onChange({ steps: a }) }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <input value={cutscene.title} onChange={(e) => onChange({ title: e.target.value })} className="flex-1 px-2 py-1.5 rounded text-sm font-bold" style={inp} />
        <button onClick={onDelete} className="px-2 py-1 rounded text-[10px] font-bold" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171' }}>Trinti</button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select value={cutscene.type} onChange={(e) => onChange({ type: e.target.value as CutsceneType })} className="px-2 py-1.5 rounded text-sm" style={inp}>{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
        <label className="text-[11px] flex items-center gap-2" style={{ color: 'var(--text-muted)' }}><input type="checkbox" checked={cutscene.skippable} onChange={(e) => onChange({ skippable: e.target.checked })} />praleidžiama</label>
        <label className="text-[11px] flex items-center gap-2" style={{ color: 'var(--text-muted)' }}><input type="checkbox" checked={cutscene.autoplay} onChange={(e) => onChange({ autoplay: e.target.checked })} />auto-play (garsas/balsas)</label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input value={cutscene.backgroundImageUrl ?? ''} onChange={(e) => onChange({ backgroundImageUrl: e.target.value || null })} placeholder="Fono paveikslo URL" className="px-2 py-1.5 rounded text-xs" style={inp} />
        <input value={cutscene.backgroundVideoUrl ?? ''} onChange={(e) => onChange({ backgroundVideoUrl: e.target.value || null })} placeholder="Fono video URL" className="px-2 py-1.5 rounded text-xs" style={inp} />
        <input value={cutscene.musicUrl ?? ''} onChange={(e) => onChange({ musicUrl: e.target.value || null })} placeholder="Muzikos URL" className="px-2 py-1.5 rounded text-xs" style={inp} />
        <input value={cutscene.ambientUrl ?? ''} onChange={(e) => onChange({ ambientUrl: e.target.value || null })} placeholder="Aplinkos garso URL" className="px-2 py-1.5 rounded text-xs" style={inp} />
      </div>

      <p className="text-[10px] uppercase tracking-wider mt-1" style={{ color: 'var(--text-muted)' }}>Žingsniai</p>
      {steps.map((s, i) => (
        <div key={i} className="rounded-lg p-2 space-y-1.5" style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)' }}>
          <div className="flex gap-1.5 items-center">
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>#{i + 1}</span>
            <select value={s.side} onChange={(e) => setStep(i, { side: e.target.value as CutsceneSide })} className="px-1.5 py-1 rounded text-xs" style={inp}>{SIDES.map((x) => <option key={x} value={x}>{x}</option>)}</select>
            <input value={s.characterName ?? ''} onChange={(e) => setStep(i, { characterName: e.target.value || null })} placeholder="Veikėjas" className="flex-1 px-2 py-1 rounded text-xs" style={inp} />
            <button onClick={() => move(i, -1)} className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>↑</button>
            <button onClick={() => move(i, 1)} className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>↓</button>
            <button onClick={() => delStep(i)} className="text-[10px]" style={{ color: '#f87171' }}>✕</button>
          </div>
          <textarea value={s.text} onChange={(e) => setStep(i, { text: e.target.value })} rows={2} placeholder="Tekstas" className="w-full px-2 py-1 rounded text-xs" style={inp} />
          <div className="grid grid-cols-2 gap-1.5">
            <input value={s.portraitUrl ?? ''} onChange={(e) => setStep(i, { portraitUrl: e.target.value || null })} placeholder="Portreto/iliustracijos URL" className="px-2 py-1 rounded text-xs" style={inp} />
            <input value={s.voiceUrl ?? ''} onChange={(e) => setStep(i, { voiceUrl: e.target.value || null })} placeholder="Balso įrašo URL" className="px-2 py-1 rounded text-xs" style={inp} />
          </div>
        </div>
      ))}
      <button onClick={addStep} className="px-3 py-1.5 rounded text-xs font-bold" style={{ background: 'rgba(240,180,41,0.15)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}>+ Žingsnis</button>
    </div>
  )
}
