'use client'

// ── Admin cutscene editor: cutscene fields + step list (reorder/add/remove) ───
// + Motion-comic (JSON) sekcija: metadata.motionComic — naujo shot-based
//   formato redagavimas, kol atsiras vizualus flow editorius.
import { useState } from 'react'
import { validateMotionComic, type MotionComicDef } from '@/lib/campaign/motionComic'
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

      <MotionComicJsonSection cutscene={cutscene} onChange={onChange} />
    </div>
  )
}

// ── Motion-comic (shot-based) JSON editorius ─────────────────────────────────
const MC_TEMPLATE: MotionComicDef = {
  version: 1,
  musicUrl: null,
  ambientUrl: null,
  typewriter: true,
  autoAdvanceAfterVoice: false,
  characters: [
    { id: 'veikejas1', name: { lt: 'Veikėjas', en: 'Character' }, accentColor: 'rgb(200,150,60)', poses: { neutral: '/cutscene-demo/commander-neutral.svg', speaking: '/cutscene-demo/commander-speaking.svg' } },
  ],
  shots: [
    {
      id: 'shot1',
      background: '/cutscene-demo/chapel-wide.svg',
      effects: [{ kind: 'fog', intensity: 0.5 }],
      camera: { startScale: 1, endScale: 1.05, duration: 6 },
      transition: { type: 'cut' },
      speakerId: 'veikejas1',
      text: { lt: 'Tekstas...', en: 'Text...' },
      voiceUrl: null,
    },
  ],
}

function MotionComicJsonSection({ cutscene, onChange }: {
  cutscene: Cutscene
  onChange: (patch: Partial<Cutscene>) => void
}) {
  const existing = (cutscene.metadata?.['motionComic'] as MotionComicDef | undefined) ?? null
  const [open, setOpen] = useState(!!existing)
  const [text, setText] = useState<string | null>(null)
  const [err, setErr] = useState<string[]>([])
  const shown = text ?? (existing ? JSON.stringify(existing, null, 2) : '')

  const apply = () => {
    if (!shown.trim()) {
      const m = { ...cutscene.metadata }
      delete m['motionComic']
      onChange({ metadata: m }); setErr([]); return
    }
    try {
      const def = JSON.parse(shown) as MotionComicDef
      const problems = validateMotionComic(def)
      setErr(problems)
      if (problems.length === 0) { onChange({ metadata: { ...cutscene.metadata, motionComic: def } }); setText(null) }
    } catch (e) {
      setErr(['Neteisingas JSON: ' + (e instanceof Error ? e.message : String(e))])
    }
  }

  return (
    <div className="rounded-lg p-2 mt-2 space-y-1.5" style={{ background: 'var(--bg-base)', border: '1px dashed rgba(240,180,41,0.35)' }}>
      <button onClick={() => setOpen((o) => !o)} className="w-full text-left text-[11px] font-bold" style={{ color: 'var(--gold)' }}>
        🎞 Motion-comic formatas {existing ? '(AKTYVUS — groja vietoj žingsnių)' : '(neaktyvus)'} {open ? '▾' : '▸'}
      </button>
      {open && (
        <>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Shot-based „judančio komikso“ scenarijus (metadata.motionComic). Kai užpildyta — grotuvas naudoja jį, VN žingsniai ignoruojami. Peržiūra: /dev/cutscene.
          </p>
          <textarea value={shown} onChange={(e) => setText(e.target.value)} rows={10} spellCheck={false}
            placeholder="Motion-comic JSON..." className="w-full px-2 py-1 rounded text-[11px] font-mono" style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
          {err.map((x, i) => <p key={i} className="text-[10px]" style={{ color: '#f87171' }}>• {x}</p>)}
          <div className="flex gap-2">
            <button onClick={apply} className="px-3 py-1.5 rounded text-xs font-bold" style={{ background: 'rgba(240,180,41,0.15)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}>Pritaikyti JSON</button>
            <button onClick={() => { setText(JSON.stringify(MC_TEMPLATE, null, 2)); setErr([]) }} className="px-3 py-1.5 rounded text-xs" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--bg-border)', color: 'var(--text-muted)' }}>Įterpti šabloną</button>
          </div>
        </>
      )}
    </div>
  )
}
