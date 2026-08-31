'use client'

// ══════════════════════════════════════════════════════════════════════════════
// DEV: Motion-comic cutscene peržiūra — demo „Varngrado koplyčia" su placeholder
// asset'ais. Viešas dev route (be guard'ų), kaip /dev/status-vfx.
// Rodo completion callback rezultatą, reduced-motion perjungiklį, replay.
// ══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { MotionComicPlayer } from '@/components/digital/campaign/MotionComicPlayer'
import { demoChapelCutscene } from '@/data/cutscenes/demoChapelCutscene'
import { validateMotionComic } from '@/lib/campaign/motionComic'
import { isReducedMotionEnabled, setReducedMotionEnabled } from '@/lib/settings'

const GOLD = '240,180,41'

export default function DevCutscenePage() {
  const [playing, setPlaying] = useState(false)
  const [doneCount, setDoneCount] = useState(0)
  const [lastDoneAt, setLastDoneAt] = useState<string | null>(null)
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && isReducedMotionEnabled())
  const errors = validateMotionComic(demoChapelCutscene)

  return (
    <div className="min-h-screen p-6" style={{ background: '#0a0812', color: '#e8dfc8' }}>
      <h1 className="text-xl font-bold mb-1" style={{ color: `rgb(${GOLD})`, fontFamily: 'var(--rvn-font-display)' }}>
        DEV — Motion-comic cutscene
      </h1>
      <p className="text-sm mb-4" style={{ color: 'rgba(220,210,190,0.6)' }}>
        {'Demo: „Vadas įspėja, kad už Varngrado mirusieji pradėjo vaikščioti“ (5 kadrai, placeholder SVG asset’ai).'}
      </p>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button data-testid="play-cutscene" onClick={() => setPlaying(true)}
          className="px-5 py-3 rounded-xl font-bold text-sm"
          style={{ minHeight: 44, background: `rgba(${GOLD},0.14)`, border: `1px solid rgba(${GOLD},0.5)`, color: '#f3ead3' }}>
          ▶ Paleisti cutscene
        </button>
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ minHeight: 44 }}>
          <input type="checkbox" checked={reduced}
            onChange={(e) => { setReduced(e.target.checked); setReducedMotionEnabled(e.target.checked) }} />
          Sumažinta animacija (reduced motion)
        </label>
      </div>

      <div className="text-xs space-y-1" style={{ color: 'rgba(220,210,190,0.55)' }}>
        <p data-testid="done-count">Completion callback: {doneCount}×{lastDoneAt ? ` (paskutinis ${lastDoneAt})` : ''}</p>
        <p>Valdymas: bakstelėjimas / Space / Enter / → — toliau; Esc — praleisti; P — pauzė.</p>
        {errors.length > 0 && (
          <div style={{ color: '#f87171' }}>
            <p className="font-bold">Validacijos klaidos:</p>
            {errors.map((e, i) => <p key={i}>• {e}</p>)}
          </div>
        )}
      </div>

      {playing && (
        <MotionComicPlayer
          def={demoChapelCutscene}
          skippable
          onDone={() => {
            setPlaying(false)
            setDoneCount((n) => n + 1)
            setLastDoneAt(new Date().toLocaleTimeString('lt-LT'))
          }}
        />
      )}
    </div>
  )
}
