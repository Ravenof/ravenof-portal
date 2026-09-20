'use client'

// ══════════════════════════════════════════════════════════════════════════════
// DEV: Raktažodžių FX peržiūra — Kovos šūksnis / Paskutinis noras / Trigeris.
// Viešas dev route (be žaidimo guard'ų), kad animacijas būtų galima tikrinti
// nepradėjus kovos. Aprobuotas vizualas: ravenof-fx-preview-keywords.html.
// ══════════════════════════════════════════════════════════════════════════════
import { useRef, useState } from 'react'
import { KeywordFxLayer, type KeywordFxHandle, type KeywordFxKind } from '@/components/tutorial/KeywordFxLayer'

const KINDS: { id: KeywordFxKind; label: string; title: string; card: string }[] = [
  { id: 'battlecry', label: 'Kovos šūksnis', title: 'Kovos šūksnis', card: 'Geležinis riksmas' },
  { id: 'lastwish', label: 'Paskutinis noras', title: 'Paskutinis noras', card: 'Sielos skola' },
  { id: 'trigger', label: 'Trigeris', title: 'Trigeris · Ėjimo pradžia', card: 'Sargybos žvilgsnis' },
]

function MockCard({ id, label, foe }: { id: string; label: string; foe?: boolean }) {
  return (
    <div data-testid={id} id={id} className="relative rounded-lg select-none" style={{ width: 96, height: 132 }}>
      <div className="absolute inset-0 rounded-lg overflow-hidden"
        style={{ background: foe ? 'linear-gradient(160deg,#2a1820,#140d12)' : 'linear-gradient(160deg,#2a2138,#14101e)', border: `1.5px solid ${foe ? 'rgba(200,80,80,.55)' : 'rgba(240,180,41,.5)'}` }}>
        <div className="absolute inset-x-2 top-2 rounded" style={{ height: 62, background: foe ? 'rgba(150,70,70,.3)' : 'rgba(120,100,160,.35)' }} />
        <div className="absolute inset-x-0 bottom-6 text-center text-[11px] font-bold" style={{ color: '#f3ead3' }}>{label}</div>
        <div className="absolute bottom-1 inset-x-1 flex justify-between text-[10px] font-bold">
          <span style={{ color: '#e8c56a' }}>3</span><span style={{ color: '#f28b82' }}>4</span>
        </div>
      </div>
    </div>
  )
}

export default function KeywordFxDevPage() {
  const fx = useRef<KeywordFxHandle>(null)
  const [compact, setCompact] = useState(false)
  const [withTarget, setWithTarget] = useState(true)

  const center = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }

  const fire = (k: typeof KINDS[number]) => {
    const from = center('src-card'); const to = withTarget ? center('tgt-card') : null
    if (!from) return
    fx.current?.play({ kind: k.id, from, to, cardName: k.card, title: k.title, compact })
  }

  return (
    <div className="min-h-screen p-6" style={{ background: 'radial-gradient(120% 90% at 50% 40%,#171026 0%,#0a0711 60%,#06050a 100%)', color: '#f3ead3' }}>
      <h1 className="text-lg font-bold mb-1" style={{ fontFamily: 'Georgia,serif', color: '#ffd97a' }}>DEV · Raktažodžių FX</h1>
      <p className="text-xs mb-5" style={{ color: '#9d94b8' }}>
        Pirmas kartas per kovą rodo pilną antspaudą, vėliau — kompaktas. Čia tai valdo &bdquo;kompaktas&ldquo; jungiklis.
      </p>

      <div className="flex flex-wrap gap-2 mb-5">
        {KINDS.map((k) => (
          <button key={k.id} data-testid={'fire-' + k.id} onClick={() => fire(k)}
            className="px-3 py-2 rounded-lg text-xs font-bold"
            style={{ background: 'linear-gradient(135deg,#ffe9a8,#f0b429)', color: '#1a1206', border: 0 }}>
            ▶ {k.label}
          </button>
        ))}
        <button onClick={() => fx.current?.clear()} className="px-3 py-2 rounded-lg text-xs font-bold"
          style={{ background: '#2a2340', border: '1px solid #4c3a6e', color: '#d8ccff' }}>Valyti</button>
        <label className="flex items-center gap-2 text-xs px-2" style={{ color: '#bfb4dd' }}>
          <input type="checkbox" checked={compact} onChange={(e) => setCompact(e.target.checked)} /> kompaktas (be antspaudo)
        </label>
        <label className="flex items-center gap-2 text-xs px-2" style={{ color: '#bfb4dd' }}>
          <input type="checkbox" checked={withTarget} onChange={(e) => setWithTarget(e.target.checked)} /> su taikiniu
        </label>
      </div>

      <div className="flex flex-col items-center gap-16 py-10">
        <MockCard id="tgt-card" label="SARGAS" foe />
        <MockCard id="src-card" label="KOVOTOJAS" />
      </div>

      <KeywordFxLayer ref={fx} />
    </div>
  )
}
