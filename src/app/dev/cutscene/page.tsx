'use client'

// ══════════════════════════════════════════════════════════════════════════════
// DEV: Motion-comic cutscene peržiūra — scenų selektorius (demo + realios
// kampanijos scenos su placeholder asset'ais). Viešas dev route be guard'ų.
// „Kopijuoti JSON" — įklijuoti į admin cutscene „Motion-comic" sekciją.
// ══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { MotionComicPlayer } from '@/components/digital/campaign/MotionComicPlayer'
import { demoChapelCutscene } from '@/data/cutscenes/demoChapelCutscene'
import { raudonasisSignalasCutscene } from '@/data/cutscenes/raudonasisSignalas'
import { validateMotionComic, type MotionComicDef } from '@/lib/campaign/motionComic'
import { isReducedMotionEnabled, setReducedMotionEnabled } from '@/lib/settings'

const GOLD = '240,180,41'

const SCENES: { key: string; title: string; sub: string; def: MotionComicDef }[] = [
  { key: 'raudonasis', title: 'CUTSCENE 01 — Raudonasis signalas', sub: '16 scen. kadrų → 24 shots, ~2 min, Šiaurinis bokštas', def: raudonasisSignalasCutscene },
  { key: 'demo', title: 'Demo — Varngrado koplyčia', sub: '5 kadrai, sistemos demonstracija', def: demoChapelCutscene },
]

export default function DevCutscenePage() {
  const [playing, setPlaying] = useState<MotionComicDef | null>(null)
  const [doneCount, setDoneCount] = useState(0)
  const [lastDoneAt, setLastDoneAt] = useState<string | null>(null)
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && isReducedMotionEnabled())
  const [copied, setCopied] = useState<string | null>(null)

  const copyJson = async (key: string, def: MotionComicDef) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(def, null, 2))
      setCopied(key); setTimeout(() => setCopied((c) => c === key ? null : c), 1800)
    } catch { /* */ }
  }

  return (
    <div className="min-h-screen p-6" style={{ background: '#0a0812', color: '#e8dfc8' }}>
      <h1 className="text-xl font-bold mb-1" style={{ color: `rgb(${GOLD})`, fontFamily: 'var(--rvn-font-display)' }}>
        DEV — Motion-comic cutscenes
      </h1>
      <p className="text-sm mb-4" style={{ color: 'rgba(220,210,190,0.6)' }}>
        {'Placeholder asset’ai — galutinis artas keičiamas vien URL’ais. „Kopijuoti JSON“ → admin cutscene „Motion-comic“ sekcija.'}
      </p>

      <div className="space-y-3 max-w-xl">
        {SCENES.map((s) => {
          const errors = validateMotionComic(s.def)
          return (
            <div key={s.key} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(${GOLD},0.25)` }}>
              <p className="font-bold text-sm" style={{ color: '#f3ead3' }}>{s.title}</p>
              <p className="text-xs mb-3" style={{ color: 'rgba(220,210,190,0.55)' }}>{s.sub} · {s.def.shots.length} shots</p>
              <div className="flex flex-wrap gap-2">
                <button data-testid={`play-${s.key}`} onClick={() => setPlaying(s.def)}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm"
                  style={{ minHeight: 44, background: `rgba(${GOLD},0.14)`, border: `1px solid rgba(${GOLD},0.5)`, color: '#f3ead3' }}>
                  ▶ Paleisti
                </button>
                <button onClick={() => void copyJson(s.key, s.def)}
                  className="px-4 py-2.5 rounded-xl text-sm"
                  style={{ minHeight: 44, background: copied === s.key ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: copied === s.key ? '#4ade80' : 'rgba(220,210,190,0.8)' }}>
                  {copied === s.key ? '✓ Nukopijuota' : 'Kopijuoti JSON'}
                </button>
              </div>
              {errors.length > 0 && (
                <div className="mt-2 text-xs" style={{ color: '#f87171' }}>
                  {errors.map((e, i) => <p key={i}>• {e}</p>)}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-4 text-xs" style={{ color: 'rgba(220,210,190,0.55)' }}>
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ minHeight: 44, color: '#e8dfc8' }}>
          <input type="checkbox" checked={reduced}
            onChange={(e) => { setReduced(e.target.checked); setReducedMotionEnabled(e.target.checked) }} />
          Sumažinta animacija
        </label>
        <p data-testid="done-count">Completion callback: {doneCount}×{lastDoneAt ? ` (paskutinis ${lastDoneAt})` : ''}</p>
        <p>Valdymas: bakst / Space / Enter / → — toliau; Esc — praleisti; P — pauzė.</p>
      </div>

      {playing && (
        <MotionComicPlayer
          def={playing}
          skippable
          onDone={() => {
            setPlaying(null)
            setDoneCount((n) => n + 1)
            setLastDoneAt(new Date().toLocaleTimeString('lt-LT'))
          }}
        />
      )}
    </div>
  )
}
