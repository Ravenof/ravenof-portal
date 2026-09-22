'use client'

// ═══════════════════════════════════════════════════════════
// DEV: Scenų FX peržiūra — ŽMK skrydis + Kovos šūksnis / Paskutinis noras / Trigeris.
// Viešas dev route (be žaidimo guard'ų), kad scenas būtų galima tikrinti telefone
// nepradėjus kovos. Aprobuotas vizualas: ravenof-fx-preview-zmk-keywords.html.
// ═══════════════════════════════════════════════════════════
import { useRef, useState } from 'react'
import { SceneFxLayer, type SceneFxHandle, type SceneKeywordKind, type SceneBox } from '@/components/tutorial/SceneFxLayer'

const KINDS: { id: SceneKeywordKind; label: string; title: string; card: string }[] = [
  { id: 'battlecry', label: 'Kovos šūksnis', title: 'KOVOS ŠŪKSNIS', card: 'Geležinis riksmas' },
  { id: 'lastwish', label: 'Paskutinis noras', title: 'PASKUTINIS NORAS', card: 'Sielos skola' },
  { id: 'trigger', label: 'Trigeris', title: 'TRIGERIS', card: 'Sargybos žvilgsnis' },
]
const ZMK_IMG: Record<string, string> = {
  '+0': '/rules/zmk/card-plus0-sm.webp', '+1': '/rules/zmk/card-plus1-sm.webp', '-1': '/rules/zmk/card-minus1-sm.webp',
  '+2': '/rules/zmk/card-plus2-sm.webp', '-2': '/rules/zmk/card-minus2-sm.webp',
  'x2': '/rules/zmk/card-x2-sm.webp', 'x0': '/rules/zmk/card-x0-sm.webp',
}

function MockCard({ id, label, foe }: { id: string; label: string; foe?: boolean }) {
  return (
    <div id={id} data-testid={id} className="relative rounded-lg select-none" style={{ width: 96, height: 132 }}>
      <div className="absolute inset-0 rounded-lg overflow-hidden"
        style={{ background: foe ? 'linear-gradient(160deg,#2a1820,#140d12)' : 'linear-gradient(160deg,#2a2138,#14101e)', border: `1.5px solid ${foe ? 'rgba(200,80,80,.55)' : 'rgba(139,109,47,.6)'}` }}>
        <div className="absolute inset-x-2 top-2 rounded" style={{ height: 62, background: foe ? 'rgba(150,70,70,.3)' : 'rgba(120,100,160,.35)' }} />
        <div className="absolute inset-x-0 bottom-6 text-center text-[11px] font-bold" style={{ color: '#f3ead3' }}>{label}</div>
        <div className="absolute bottom-1 inset-x-1 flex justify-between text-[10px] font-bold">
          <span style={{ color: '#e8c56a' }}>3</span><span style={{ color: '#f28b82' }}>4</span>
        </div>
      </div>
    </div>
  )
}
function MockPile({ id, label }: { id: string; label: string }) {
  return (
    <div id={id} className="flex flex-col items-center gap-1">
      <div className="rounded-md overflow-hidden" style={{ width: 48, height: 64, border: '1px solid rgba(240,180,41,.4)', background: '#0d0a14' }}>
        <img src="/card-backs/zmk.webp" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <span className="text-[9px] uppercase" style={{ color: '#8e84ab' }}>{label}</span>
    </div>
  )
}

export default function SceneFxDevPage() {
  const fx = useRef<SceneFxHandle>(null)
  const [compact, setCompact] = useState(false)
  const [reduced, setReduced] = useState(false)
  const [log, setLog] = useState<string[]>([])

  const box = (id: string): SceneBox | null => {
    const el = document.getElementById(id)
    if (!el) return null
    const m = () => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height } }
    return { ...m(), track: m }
  }
  const note = (s: string) => setLog((l) => [s, ...l].slice(0, 6))

  const fireKw = async (k: typeof KINDS[number], targets: string[]) => {
    const from = box(k.id === 'trigger' ? 'e1' : 'm1'); if (!from) return
    const tgs = targets.map(box).filter((b): b is SceneBox => !!b)
    const t0 = performance.now()
    await fx.current?.playKeyword({ kind: k.id, from, targets: tgs, title: k.title, cardName: k.card, compact, reduced })
    note(`${k.label}: vartai atsidarė po ${Math.round(performance.now() - t0)} ms`)
  }
  const fireZmk = async (draws: { pile: string; target: string; value: string; pair?: [string, string]; picked?: string }[]) => {
    const t0 = performance.now()
    await fx.current?.playZmk({
      backUrl: '/card-backs/zmk.webp', reduced,
      draws: draws.map((d) => ({ pile: box(d.pile)!, target: box(d.target)!, value: d.value, pair: d.pair, picked: d.picked, faceUrl: (v: string) => ZMK_IMG[v] ?? null })).filter((d) => d.pile && d.target),
    })
    note(`ŽMK: smūgis (vartai) po ${Math.round(performance.now() - t0)} ms`)
  }
  const fireCombo = async () => {
    await fireKw(KINDS[0], ['e2'])
    await fireZmk([{ pile: 'pile-m', target: 'e2', value: '+1' }])
  }

  const btn = 'px-3 py-2 rounded-lg text-xs font-bold'
  const bs = { background: 'rgba(240,180,41,.12)', border: '1px solid rgba(240,180,41,.4)', color: '#ffd97a' }
  return (
    <div className="min-h-screen p-6" style={{ background: 'radial-gradient(120% 90% at 50% 40%,#171026 0%,#0a0711 60%,#06050a 100%)', color: '#f3ead3' }}>
      <h1 className="text-lg font-bold mb-1" style={{ fontFamily: 'Georgia,serif', color: '#ffd97a' }}>DEV · Scenų FX (ŽMK + raktažodžiai)</h1>
      <p className="text-xs mb-4" style={{ color: '#9d94b8' }}>Promise išsisprendžia ties vartais (antspaudas / ŽMK smūgis) — žurnale apačioje matosi tikras laikas.</p>

      <div className="flex flex-wrap gap-2 mb-3">
        {KINDS.map((k) => (
          <button key={k.id} data-testid={'fire-' + k.id} className={btn} style={bs} onClick={() => void fireKw(k, k.id === 'trigger' ? ['m2'] : ['e2'])}>{k.label}</button>
        ))}
        <button className={btn} style={bs} onClick={() => void fireKw(KINDS[0], ['e1', 'e2', 'e3'])}>Šūksnis → 3 taikiniai</button>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        <button data-testid="fire-zmk" className={btn} style={bs} onClick={() => void fireZmk([{ pile: 'pile-m', target: 'e2', value: '+1' }])}>ŽMK +1</button>
        <button className={btn} style={bs} onClick={() => void fireZmk([{ pile: 'pile-m', target: 'e2', value: 'x2' }])}>ŽMK ×2</button>
        <button className={btn} style={bs} onClick={() => void fireZmk([{ pile: 'pile-m', target: 'e2', value: 'x0' }])}>ŽMK ×0</button>
        <button className={btn} style={bs} onClick={() => void fireZmk([{ pile: 'pile-m', target: 'e1', value: '+0' }, { pile: 'pile-m', target: 'e2', value: '+2' }, { pile: 'pile-m', target: 'e3', value: '-1' }])}>ŽMK AoE ×3</button>
        <button className={btn} style={bs} onClick={() => void fireZmk([{ pile: 'pile-m', target: 'e2', value: '+1' }, { pile: 'pile-e', target: 'm1', value: '-1' }])}>Ataka + atgalinė</button>
        <button className={btn} style={bs} onClick={() => void fireZmk([{ pile: 'pile-m', target: 'e2', value: '+2', pair: ['+2', '-1'], picked: '+2' }])}>Pranašumas (2 kortos)</button>
        <button className={btn} style={{ ...bs, background: 'rgba(167,139,250,.15)', borderColor: 'rgba(167,139,250,.5)', color: '#c4b5fd' }} onClick={() => void fireCombo()}>Šūksnis → ŽMK (pilna)</button>
      </div>
      <div className="flex flex-wrap gap-4 mb-6 text-xs" style={{ color: '#bfb4dd' }}>
        <label className="flex items-center gap-2"><input type="checkbox" checked={compact} onChange={(e) => setCompact(e.target.checked)} /> kompaktas (2-as kartas)</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={reduced} onChange={(e) => setReduced(e.target.checked)} /> reduced-motion</label>
      </div>

      <div className="mx-auto" style={{ maxWidth: 640 }}>
        <div className="flex items-center justify-center gap-4 mb-10">
          <MockCard id="e1" label="Ugnies šauklys" foe /><MockCard id="e2" label="Pelenų demonas" foe /><MockCard id="e3" label="Sielų rijikas" foe />
          <MockPile id="pile-e" label="ŽMK" />
        </div>
        <div className="flex items-center justify-center gap-4">
          <MockCard id="m1" label="Kaulų sargas" /><MockCard id="m2" label="Varnos kunigas" /><MockCard id="m3" label="Kapų vėlė" />
          <MockPile id="pile-m" label="ŽMK" />
        </div>
      </div>

      <div className="mt-8 text-[11px] font-mono" style={{ color: '#8e84ab' }}>{log.map((l, i) => <div key={i}>{l}</div>)}</div>
      <SceneFxLayer ref={fx} />
    </div>
  )
}
